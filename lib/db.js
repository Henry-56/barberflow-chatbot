import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS chatbot_sessions (
      phone TEXT PRIMARY KEY,
      nombre TEXT,
      estado TEXT DEFAULT 'inicio',
      clientes_perdidos INTEGER,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS chatbot_citas (
      id SERIAL PRIMARY KEY,
      phone TEXT UNIQUE,
      nombre TEXT,
      slot_id TEXT,
      slot_label TEXT,
      slot_dia TEXT,
      slot_meet TEXT,
      booked_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      phone TEXT NOT NULL,
      direction TEXT NOT NULL,
      content TEXT NOT NULL,
      msg_type TEXT DEFAULT 'text',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_phone ON chat_messages(phone)`;
  await sql`ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS manual_mode BOOLEAN DEFAULT FALSE`;

  await sql`
    CREATE TABLE IF NOT EXISTS prospects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      city TEXT NOT NULL,
      owner_name TEXT,
      status TEXT DEFAULT 'pending',
      msg1_sent_at TIMESTAMPTZ,
      msg2_sent_at TIMESTAMPTZ,
      msg3_sent_at TIMESTAMPTZ,
      replied_at TIMESTAMPTZ,
      converted_at TIMESTAMPTZ,
      last_message_at TIMESTAMPTZ,
      message_count INTEGER DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS prospects_status_idx ON prospects(status, created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS prospects_phone_idx ON prospects(phone)`;

  await sql`
    CREATE TABLE IF NOT EXISTS prospect_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prospect_id UUID REFERENCES prospects(id),
      template_name TEXT NOT NULL,
      message_preview TEXT,
      status TEXT DEFAULT 'sent',
      meta_message_id TEXT,
      sent_at TIMESTAMPTZ DEFAULT now()
    )
  `;
}

export async function getSession(phone) {
  const rows = await sql`SELECT * FROM chatbot_sessions WHERE phone = ${phone}`;
  if (rows.length > 0) return rows[0];
  await sql`INSERT INTO chatbot_sessions (phone, estado) VALUES (${phone}, 'inicio')`;
  return { phone, nombre: null, estado: 'inicio', clientes_perdidos: null };
}

export async function updateSession(phone, fields) {
  const { nombre, estado, clientes_perdidos } = fields;
  await sql`
    UPDATE chatbot_sessions
    SET nombre = ${nombre}, estado = ${estado},
        clientes_perdidos = ${clientes_perdidos ?? null}, updated_at = NOW()
    WHERE phone = ${phone}
  `;
}

export async function saveAppointment(phone, nombre, slot) {
  await sql`
    INSERT INTO chatbot_citas (phone, nombre, slot_id, slot_label, slot_dia, slot_meet)
    VALUES (${phone}, ${nombre}, ${slot.id}, ${slot.label}, ${slot.dia}, ${slot.meet})
    ON CONFLICT (phone) DO UPDATE SET
      nombre = ${nombre}, slot_id = ${slot.id}, slot_label = ${slot.label},
      slot_dia = ${slot.dia}, slot_meet = ${slot.meet}, booked_at = NOW()
  `;
}

export async function getCitas() {
  return await sql`SELECT * FROM chatbot_citas ORDER BY booked_at DESC`;
}

export async function saveMessage(phone, direction, content, msgType = 'text') {
  const p = phone.replace(/^\+/, '');
  await sql`
    INSERT INTO chat_messages (phone, direction, content, msg_type)
    VALUES (${p}, ${direction}, ${content}, ${msgType})
  `;
}

export async function getMessages(phone) {
  return await sql`
    SELECT * FROM chat_messages
    WHERE phone = ${phone}
    ORDER BY created_at ASC
  `;
}

export async function setManualMode(phone, manual) {
  await sql`UPDATE chatbot_sessions SET manual_mode = ${manual} WHERE phone = ${phone}`;
}

// ─── PROSPECTS ────────────────────────────────────────────────

export async function getProspectsByStatus(status, limit = 20) {
  return await sql`
    SELECT * FROM prospects
    WHERE status = ${status}
    ORDER BY
      CASE WHEN city = 'Arequipa' THEN 0 ELSE 1 END,
      created_at ASC
    LIMIT ${limit}
  `;
}

export async function getProspectsForMsg2(limit = 20) {
  return await sql`
    SELECT * FROM prospects
    WHERE status = 'sent_msg1'
    AND msg1_sent_at <= NOW() - INTERVAL '3 days'
    ORDER BY msg1_sent_at ASC
    LIMIT ${limit}
  `;
}

export async function getProspectsForMsg3(limit = 20) {
  return await sql`
    SELECT * FROM prospects
    WHERE status = 'sent_msg2'
    AND msg2_sent_at <= NOW() - INTERVAL '3 days'
    ORDER BY msg2_sent_at ASC
    LIMIT ${limit}
  `;
}

export async function updateProspectStatus(phone, status, extra = {}) {
  await sql`
    UPDATE prospects SET
      status          = ${status},
      msg1_sent_at    = COALESCE(${extra.msg1_sent_at    ?? null}::timestamptz, msg1_sent_at),
      msg2_sent_at    = COALESCE(${extra.msg2_sent_at    ?? null}::timestamptz, msg2_sent_at),
      msg3_sent_at    = COALESCE(${extra.msg3_sent_at    ?? null}::timestamptz, msg3_sent_at),
      replied_at      = COALESCE(${extra.replied_at      ?? null}::timestamptz, replied_at),
      last_message_at = COALESCE(${extra.last_message_at ?? null}::timestamptz, last_message_at),
      message_count   = COALESCE(${extra.message_count   ?? null}::int,         message_count)
    WHERE phone = ${phone}
  `;
}

export async function getProspectByPhone(phone) {
  const rows = await sql`SELECT * FROM prospects WHERE phone = ${phone}`;
  return rows[0] || null;
}

export async function saveProspectMessage(prospectId, templateName, preview, metaMessageId) {
  await sql`
    INSERT INTO prospect_messages (prospect_id, template_name, message_preview, status, meta_message_id)
    VALUES (${prospectId}, ${templateName}, ${preview ?? null}, 'sent', ${metaMessageId ?? null})
  `;
}

export async function countSentToday() {
  // CURRENT_DATE es UTC — usar medianoche Lima (UTC-5) para el corte real
  const rows = await sql`
    SELECT COUNT(*) AS total FROM prospect_messages
    WHERE sent_at >= date_trunc('day', now() AT TIME ZONE 'America/Lima') AT TIME ZONE 'America/Lima'
    AND status = 'sent'
  `;
  return parseInt(rows[0].total);
}

export async function getOutreachStats() {
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending')        AS pending,
      COUNT(*) FILTER (WHERE status = 'sent_msg1')      AS sent_msg1,
      COUNT(*) FILTER (WHERE status = 'sent_msg2')      AS sent_msg2,
      COUNT(*) FILTER (WHERE status = 'sent_msg3')      AS sent_msg3,
      COUNT(*) FILTER (WHERE status = 'replied')        AS replied,
      COUNT(*) FILTER (WHERE status = 'converted')      AS converted,
      COUNT(*) FILTER (WHERE status = 'not_interested') AS not_interested,
      COUNT(*) FILTER (WHERE status = 'invalid')        AS invalid,
      COUNT(*)                                          AS total
    FROM prospects
  `;
  return rows[0];
}

export async function getProspectThread(prospectId, phone) {
  const sent = await sql`
    SELECT id::text, template_name, message_preview, sent_at AS created_at
    FROM prospect_messages
    WHERE prospect_id = ${prospectId}
    ORDER BY sent_at ASC
  `;
  // chat_messages stores phones without '+' (raw from WhatsApp msg.from)
  const chatPhone = phone ? phone.replace(/^\+/, '') : null;
  const replies = chatPhone ? await sql`
    SELECT id::text, content, direction, created_at
    FROM chat_messages
    WHERE phone = ${chatPhone}
    ORDER BY created_at ASC
  ` : [];
  return { sent, replies };
}

export async function getAllProspects(limit = 500, offset = 0) {
  return await sql`
    SELECT p.*,
      (SELECT sent_at FROM prospect_messages
       WHERE prospect_id = p.id
       ORDER BY sent_at DESC LIMIT 1) AS last_message_at
    FROM prospects p
    ORDER BY
      CASE p.status
        WHEN 'replied'       THEN 0
        WHEN 'converted'     THEN 1
        WHEN 'sent_msg3'     THEN 2
        WHEN 'sent_msg2'     THEN 3
        WHEN 'sent_msg1'     THEN 4
        WHEN 'not_interested'THEN 5
        WHEN 'invalid'       THEN 6
        ELSE                      7
      END,
      COALESCE(p.last_message_at, p.created_at) DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
}

export async function importProspects(rows) {
  let imported = 0;
  let skipped = 0;
  for (const row of rows) {
    try {
      const result = await sql`
        INSERT INTO prospects (name, phone, city)
        VALUES (${row.name.trim()}, ${normalizePhone(row.phone)}, ${row.city.trim()})
        ON CONFLICT (phone) DO NOTHING
        RETURNING id
      `;
      if (result.length > 0) imported++;
      else skipped++;
    } catch (e) {
      console.error('[import]', e.message);
      skipped++;
    }
  }
  return { imported, skipped };
}

export function normalizePhone(phone) {
  let p = String(phone).replace(/[\s\-\(\)]/g, '');
  if (p.startsWith('0051')) p = '+51' + p.slice(4);
  if (p.startsWith('51') && p.length === 11) p = '+' + p;
  if (/^9\d{8}$/.test(p)) p = '+51' + p;
  if (!p.startsWith('+')) p = '+51' + p;
  return p;
}

export async function getLeads() {
  return await sql`
    SELECT
      s.phone,
      s.nombre,
      s.estado,
      s.clientes_perdidos,
      s.manual_mode,
      s.updated_at,
      m.content  AS last_message,
      m.direction AS last_direction,
      m.created_at AS last_message_at,
      c.slot_label,
      c.slot_id,
      c.booked_at
    FROM chatbot_sessions s
    LEFT JOIN LATERAL (
      SELECT content, direction, created_at
      FROM chat_messages
      WHERE phone = s.phone
      ORDER BY created_at DESC
      LIMIT 1
    ) m ON true
    LEFT JOIN chatbot_citas c ON c.phone = s.phone
    WHERE s.phone NOT IN (
      SELECT REPLACE(phone, '+', '') FROM prospects
    )
    ORDER BY COALESCE(m.created_at, s.updated_at) DESC
  `;
}

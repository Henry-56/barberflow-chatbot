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
  await sql`
    INSERT INTO chat_messages (phone, direction, content, msg_type)
    VALUES (${phone}, ${direction}, ${content}, ${msgType})
  `;
}

export async function getMessages(phone) {
  return await sql`
    SELECT * FROM chat_messages
    WHERE phone = ${phone}
    ORDER BY created_at ASC
  `;
}

export async function getLeads() {
  return await sql`
    SELECT
      s.phone,
      s.nombre,
      s.estado,
      s.clientes_perdidos,
      s.updated_at,
      m.content  AS last_message,
      m.direction AS last_direction,
      m.created_at AS last_message_at,
      c.slot_label,
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
    ORDER BY s.updated_at DESC
  `;
}

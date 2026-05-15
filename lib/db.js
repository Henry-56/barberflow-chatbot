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

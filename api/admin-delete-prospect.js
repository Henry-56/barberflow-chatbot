import { neon } from '@neondatabase/serverless';

const ADMIN_KEY = process.env.ADMIN_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!ADMIN_KEY || req.body.key !== ADMIN_KEY) return res.status(401).json({ error: 'No autorizado' });

  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'phone requerido' });

  const sql = neon(process.env.DATABASE_URL);
  const phoneClean = phone.replace(/^\+/, '');
  const phoneWithPlus = phone.startsWith('+') ? phone : '+' + phone;

  await sql`DELETE FROM chat_messages WHERE phone = ${phoneClean}`;
  await sql`DELETE FROM chatbot_citas WHERE phone = ${phoneClean}`;
  await sql`DELETE FROM chatbot_sessions WHERE phone = ${phoneClean}`;
  await sql`DELETE FROM prospect_messages WHERE prospect_id = (SELECT id FROM prospects WHERE phone = ${phoneWithPlus} LIMIT 1)`;
  await sql`DELETE FROM prospects WHERE phone = ${phoneWithPlus}`;

  return res.status(200).json({ ok: true, deleted: phone });
}

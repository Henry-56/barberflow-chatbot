import { initDB } from '../lib/db.js';
import { sendMessage } from '../lib/whatsapp.js';

const ADMIN_KEY = process.env.ADMIN_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!ADMIN_KEY || req.body?.key !== ADMIN_KEY) return res.status(401).json({ error: 'No autorizado' });

  const { phone, message } = req.body;
  if (!phone || !message?.trim()) return res.status(400).json({ error: 'Faltan datos' });

  await initDB();
  await sendMessage(phone, message.trim());

  res.status(200).json({ ok: true });
}

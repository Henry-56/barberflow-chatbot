import { initDB, setManualMode } from '../lib/db.js';

const ADMIN_KEY = process.env.ADMIN_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!ADMIN_KEY || req.body?.key !== ADMIN_KEY) return res.status(401).json({ error: 'No autorizado' });

  const { phone, manual } = req.body;
  if (!phone || typeof manual !== 'boolean') return res.status(400).json({ error: 'Faltan datos' });

  await initDB();
  await setManualMode(phone, manual);

  res.status(200).json({ ok: true, manual });
}

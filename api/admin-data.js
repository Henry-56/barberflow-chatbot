import { initDB, getLeads, getMessages } from '../lib/db.js';

const ADMIN_KEY = process.env.ADMIN_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  if (!ADMIN_KEY || req.query.key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  await initDB();

  const { phone } = req.query;

  if (phone) {
    const messages = await getMessages(phone);
    return res.status(200).json(messages);
  }

  const leads = await getLeads();
  return res.status(200).json(leads);
}

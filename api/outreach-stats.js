import { initDB, getOutreachStats, getAllProspects, countSentToday } from '../lib/db.js';

const ADMIN_KEY = process.env.ADMIN_KEY;
const DAILY_LIMIT = 20;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!ADMIN_KEY || req.query.key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  await initDB();

  const [stats, prospects, sentToday] = await Promise.all([
    getOutreachStats(),
    getAllProspects(),
    countSentToday()
  ]);

  return res.json({
    stats,
    prospects,
    sentToday,
    dailyLimit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - sentToday)
  });
}

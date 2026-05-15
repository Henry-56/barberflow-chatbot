import { getCitas } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const citas = await getCitas();
  res.status(200).json(citas);
}

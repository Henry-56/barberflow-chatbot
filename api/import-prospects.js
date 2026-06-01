import { importProspects } from '../lib/db.js';

const ADMIN_KEY = process.env.ADMIN_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!ADMIN_KEY || req.headers.authorization !== `Bearer ${ADMIN_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows debe ser un array no vacío' });
    }
    const result = await importProspects(rows);
    return res.json({ success: true, imported: result.imported, skipped: result.skipped, total: rows.length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

import { procesarMensaje } from '../lib/chatbot.js';
import { initDB, getCitas } from '../lib/db.js';

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

export default async function handler(req, res) {
  // Verificación del webhook (Meta llama una sola vez al configurarlo)
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[WEBHOOK] Verificado ✅');
      return res.status(200).send(challenge);
    }
    return res.status(403).end();
  }

  // Mensajes entrantes
  if (req.method === 'POST') {
    try {
      await initDB();
      const body = req.body;

      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            const value = change.value;
            if (!value.messages) continue;

            for (const msg of value.messages) {
              if (msg.type !== 'text') continue;

              const phone    = msg.from;
              const texto    = msg.text.body;
              const contacto = value.contacts?.find(c => c.wa_id === phone);
              const nombre   = contacto?.profile?.name || null;

              console.log(`[MSG] ${phone} (${nombre}): ${texto}`);
              await procesarMensaje(phone, texto, nombre);
            }
          }
        }
      }
    } catch (err) {
      console.error('[ERROR]', err.message);
    }

    res.status(200).end(); // Responder a Meta al final
  }
}

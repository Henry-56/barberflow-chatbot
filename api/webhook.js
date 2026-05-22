import { procesarMensaje, procesarSlotElegido } from '../lib/chatbot.js';
import { initDB, saveMessage } from '../lib/db.js';

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).end();
  }

  if (req.method === 'POST') {
    try {
      await initDB();
      const body = req.body;
      if (body.object !== 'whatsapp_business_account') return res.status(200).end();

      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value;
          if (!value.messages) continue;

          for (const msg of value.messages) {
            const phone    = msg.from;
            const contacto = value.contacts?.find(c => c.wa_id === phone);
            const nombre   = contacto?.profile?.name || null;

            // Mensaje de texto normal
            if (msg.type === 'text') {
              await saveMessage(phone, 'in', msg.text.body, 'text');
              await procesarMensaje(phone, msg.text.body, nombre);
            }

            // Respuesta interactiva — el lead tocó un horario de la lista
            if (msg.type === 'interactive' && msg.interactive?.type === 'list_reply') {
              const slotId = msg.interactive.list_reply.id;
              const label  = msg.interactive.list_reply.title || slotId;
              await saveMessage(phone, 'in', `✅ Horario elegido: ${label}`, 'interactive');
              await procesarSlotElegido(phone, slotId, nombre);
            }
          }
        }
      }
    } catch (err) {
      console.error('[ERROR]', err.message);
    }

    res.status(200).end();
  }
}

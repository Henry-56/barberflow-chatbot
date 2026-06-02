import { procesarMensaje, procesarSlotElegido } from '../lib/chatbot.js';
import { initDB, saveMessage, getProspectByPhone, updateProspectStatus, normalizePhone } from '../lib/db.js';
import { sendMessage } from '../lib/whatsapp.js';

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
              const wasProspect = await checkIfProspect(phone, msg.text.body, nombre);
              if (!wasProspect) await procesarMensaje(phone, msg.text.body, nombre);
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

async function checkIfProspect(phone, messageText, nombre) {
  const normalizedPhone = normalizePhone(phone);
  const prospect = await getProspectByPhone(normalizedPhone);
  if (!prospect) return false;

  const activeStatuses = ['sent_msg1', 'sent_msg2', 'sent_msg3'];

  // Prospecto que ya respondió antes → agente IA continúa la conversación
  if (!activeStatuses.includes(prospect.status)) {
    if (prospect.status === 'replied') {
      await procesarMensaje(phone, messageText, nombre || prospect.name);
    }
    // not_interested / invalid / converted → silenciar
    return true;
  }

  // Primera respuesta → marcar replied + notificar + agente IA responde
  await updateProspectStatus(normalizedPhone, 'replied', { replied_at: new Date() });

  const teamPhone = process.env.TEAM_PHONE;
  if (teamPhone) {
    await sendMessage(teamPhone,
      `🔔 *Prospecto respondió*\n\n` +
      `*Barbería:* ${prospect.name}\n` +
      `*Ciudad:* ${prospect.city}\n` +
      `*Teléfono:* ${normalizedPhone}\n` +
      `*Mensaje:* "${messageText}"\n\n` +
      `Responde en el panel: https://chatbot-ochre-mu.vercel.app/api/admin`
    );
  }

  await procesarMensaje(phone, messageText, nombre || prospect.name);
  return true;
}

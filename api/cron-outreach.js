import {
  getProspectsByStatus, getProspectsForMsg2, getProspectsForMsg3,
  updateProspectStatus, countSentToday, saveProspectMessage
} from '../lib/db.js';
import { sendTemplate } from '../lib/whatsapp.js';

const PER_RUN_LIMIT = 2;  // mensajes por ejecución (cada hora)
const DAILY_LIMIT = 20;   // tope diario total (10 horas × 2)
const HORA_INICIO = 9;
const HORA_FIN = 18;
const DELAY_MS = 1500;
const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000; // UTC-5, sin DST

const MSG_CONFIG = {
  msg1: { template: 'barberflow_outreach_m1b', params: p => [p.name, p.city], nextStatus: 'sent_msg1', field: 'msg1_sent_at' },
  msg2: { template: 'barberflow_outreach_m2', params: p => [p.name],          nextStatus: 'sent_msg2', field: 'msg2_sent_at' },
  msg3: { template: 'barberflow_outreach_m3', params: p => [p.name, p.city], nextStatus: 'sent_msg3', field: 'msg3_sent_at' },
};

export default async function handler(req, res) {
  const auth = req.headers.authorization;
  const validCron = auth === `Bearer ${process.env.CRON_SECRET}`;
  const validAdmin = auth === `Bearer ${process.env.ADMIN_KEY}`;
  if (!validCron && !validAdmin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const horaLima = new Date(Date.now() + LIMA_OFFSET_MS).getUTCHours();
  if (horaLima < HORA_INICIO || horaLima >= HORA_FIN) {
    return res.json({ skipped: true, reason: `Fuera de horario — son las ${horaLima}h en Lima` });
  }

  const sentToday = await countSentToday();
  if (sentToday >= DAILY_LIMIT) {
    return res.json({ skipped: true, reason: `Límite diario alcanzado (${sentToday}/${DAILY_LIMIT})` });
  }

  const remaining = Math.min(PER_RUN_LIMIT, DAILY_LIMIT - sentToday);
  let sent = 0;
  const results = [];

  // Prioridad 1: msg2 (llevan 3 días sin responder)
  if (sent < remaining) {
    const list = await getProspectsForMsg2(remaining - sent);
    for (const p of list) {
      if (sent >= remaining) break;
      const r = await enviarMensaje(p, 'msg2');
      results.push(r);
      if (r.success) sent++;
      await sleep(DELAY_MS);
    }
  }

  // Prioridad 2: msg3 (llevan 6 días sin responder)
  if (sent < remaining) {
    const list = await getProspectsForMsg3(remaining - sent);
    for (const p of list) {
      if (sent >= remaining) break;
      const r = await enviarMensaje(p, 'msg3');
      results.push(r);
      if (r.success) sent++;
      await sleep(DELAY_MS);
    }
  }

  // Prioridad 3: nuevos (primer mensaje)
  if (sent < remaining) {
    const list = await getProspectsByStatus('pending', remaining - sent);
    for (const p of list) {
      if (sent >= remaining) break;
      const r = await enviarMensaje(p, 'msg1');
      results.push(r);
      if (r.success) sent++;
      await sleep(DELAY_MS);
    }
  }

  return res.json({ success: true, sent, totalHoy: sentToday + sent, limitePorRun: PER_RUN_LIMIT, limiteDiario: DAILY_LIMIT, resultados: results });
}

async function enviarMensaje(prospect, msgNum) {
  const { template, params, nextStatus, field } = MSG_CONFIG[msgNum];
  try {
    const metaId = await sendTemplate(prospect.phone, template, params(prospect));
    const now = new Date();
    await updateProspectStatus(prospect.phone, nextStatus, {
      [field]: now,
      last_message_at: now,
      message_count: (prospect.message_count || 0) + 1
    });
    await saveProspectMessage(prospect.id, template, `${msgNum} → ${prospect.name} (${prospect.city})`, metaId);
    console.log(`✅ ${msgNum} enviado a ${prospect.name} (${prospect.city}) — ${prospect.phone}`);
    return { success: true, phone: prospect.phone, name: prospect.name, city: prospect.city, msg: msgNum };
  } catch (err) {
    if (err.code === 131026 || err.code === 131047) {
      await updateProspectStatus(prospect.phone, 'invalid');
    }
    await saveProspectMessage(prospect.id, template, `ERROR: ${err.message}`, null);
    console.error(`❌ Error con ${prospect.phone}: ${err.message}`);
    return { success: false, phone: prospect.phone, error: err.message };
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

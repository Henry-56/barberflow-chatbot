import { saveMessage } from './db.js';

const TOKEN   = (process.env.WHATSAPP_TOKEN || '').replace(/^﻿/, '');
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const API_URL  = `https://graph.facebook.com/v21.0/${PHONE_ID}/messages`;

async function post(body) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) console.error('[WA ERROR]', JSON.stringify(data));
  return data;
}

export async function sendMessage(to, text) {
  await saveMessage(to, 'out', text, 'text');
  return post({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } });
}

// ─── TEMPLATES PARA OUTREACH ──────────────────────────────────

export async function sendTemplate(to, templateName, parameters) {
  const phone = to.startsWith('+') ? to.slice(1) : to;
  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'es' },
      components: [
        {
          type: 'body',
          parameters: parameters.map(p => ({ type: 'text', text: p }))
        }
      ]
    }
  };
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.message || 'Meta API error');
    err.code = data.error?.code;
    throw err;
  }
  return data.messages?.[0]?.id;
}

export async function sendFollowUp(to, barberyName) {
  return sendMessage(to,
    `Gracias por responder ${barberyName} 🙌\n\n` +
    `Desarrollamos BarberFlow — una herramienta para barberías que ayuda a:\n` +
    `✂️ Reducir los clientes que no llegan a sus citas\n` +
    `📱 Recuperar clientes que dejaron de venir\n` +
    `⭐ Fidelización digital (5 cortes → 1 gratis)\n\n` +
    `Son 21 días completamente gratis, sin tarjeta ni compromiso.\n` +
    `¿Quieres que te muestre cómo funciona?`
  );
}

// Envía lista interactiva con los horarios disponibles agrupados por día
export async function sendListaHorarios(to, sections) {
  await saveMessage(to, 'out', JSON.stringify(sections), 'interactive');
  return post({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: '📅 Horarios disponibles' },
      body:   { text: 'Elige el horario que mejor te va para la demo de 20 minutos:' },
      footer: { text: 'BarberFlow — Lima, Perú' },
      action: {
        button: 'Ver horarios',
        sections: sections.map(s => ({
          title: s.title,
          rows:  s.rows.map(r => ({ id: r.id, title: r.title, description: r.description })),
        })),
      },
    },
  });
}

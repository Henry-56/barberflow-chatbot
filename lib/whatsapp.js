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

// Envía lista interactiva con los horarios disponibles agrupados por día
export async function sendListaHorarios(to, sections) {
  await saveMessage(to, 'out', '📅 [Lista de horarios disponibles]', 'interactive');
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

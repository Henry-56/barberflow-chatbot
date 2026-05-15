import { sendMessage } from './whatsapp.js';
import { getSession, updateSession, saveAppointment } from './db.js';
import { getSlots, PRECIO_CORTE, VISITAS_MES } from './config.js';

const E = {
  INICIO:             'inicio',
  ESPERANDO_DOLOR:    'esperando_dolor',
  ESPERANDO_DECISION: 'esperando_decision',
  ELIGIENDO_HORARIO:  'eligiendo_horario',
  AGENDADO:           'agendado',
};

function extraerNumero(texto) {
  const match = texto.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

function norm(t) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function esAfirmativo(texto) {
  const t = norm(texto);
  return ['si', 'dale', 'claro', 'ok', 'bueno', 'quiero', 'me interesa', 'genial',
          'muestra', 'yes', 'perfecto', 'obvio', 'por supuesto', 'excelente', 'listo'].some(p => t.includes(p));
}

// Intenta identificar cuál slot eligió el lead por hora, día o número
function matchSlot(texto, slots) {
  const t = norm(texto);

  // Por número explícito: "1" o "2"
  if (/\b1\b/.test(t) && !/\b1[02]\b/.test(t)) return slots[0];
  if (/\b2\b/.test(t) && !/\b2[0-9]\b/.test(t)) return slots[1];

  // Por hora mencionada: "9am", "las 9", "9:00", "a las 9"
  for (let i = 0; i < slots.length; i++) {
    const horaMatch = slots[i].label.match(/(\d+):\d+/);
    if (!horaMatch) continue;
    const h = horaMatch[1];
    if (new RegExp(`\\b${h}\\b`).test(t) || t.includes(`${h}am`) || t.includes(`${h}:00`)) {
      return slots[i];
    }
  }

  // Por nombre del día: "viernes", "sabado", "lunes"...
  for (const slot of slots) {
    const dia = norm(slot.label).split(' ').find(w => w.length > 4 && !['mañana', 'tarde'].includes(w));
    if (dia && t.includes(dia)) return slot;
  }

  return null;
}

function esNegativo(texto) {
  const t = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return t === 'no' || t.startsWith('no ') || t.startsWith('no,');
}

function preguntaPrecio(texto) {
  const t = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return ['precio', 'cuesta', 'costo', 'cuanto', 'cuánto', 'vale', 'cobran'].some(p => t.includes(p));
}

export async function procesarMensaje(phone, texto, nombreContacto) {
  const s = await getSession(phone);
  if (!s.nombre && nombreContacto) s.nombre = nombreContacto;
  const nombre = s.nombre || 'amigo';
  const SLOTS = getSlots();

  console.log(`[${phone}] estado=${s.estado} | msg="${texto}"`);

  // ── INICIO ───────────────────────────────────────────────────────────
  if (s.estado === E.INICIO) {
    await updateSession(phone, { ...s, nombre, estado: E.ESPERANDO_DOLOR });

    await sendMessage(phone,
      `Hola ${nombre} 👋 soy el asistente de BarberFlow.\n` +
      `Dame 2 minutos, te va a interesar. ¡No te muevas! 💈`
    );
    await new Promise(r => setTimeout(r, 1500));
    await sendMessage(phone,
      `¿Sabías que el 60% de clientes no regresa a una barbería... ` +
      `no porque encuentren otra, sino porque nadie les escribió nunca más? 😮\n\n` +
      `BarberFlow detecta qué clientes llevan semanas sin venir y les manda ` +
      `un WhatsApp automático y personalizado en el momento exacto. ` +
      `Sin que tú hagas nada. ✂️\n\n` +
      `→ ¿Cuántos clientes crees que dejaron de venir en los últimos 2 meses?`
    );
    return;
  }

  // ── ESPERANDO_DOLOR ──────────────────────────────────────────────────
  if (s.estado === E.ESPERANDO_DOLOR) {
    const num = extraerNumero(texto);
    await updateSession(phone, { ...s, nombre, estado: E.ESPERANDO_DECISION, clientes_perdidos: num });

    const ingresoExtra = num
      ? `${num} clientes... si cada uno vuelve aunque sea ${VISITAS_MES} veces al mes ` +
        `a S/ ${PRECIO_CORTE}, son *S/ ${num * VISITAS_MES * PRECIO_CORTE}* que podrías ` +
        `estar cobrando de más cada mes`
      : `Esos clientes... son cientos de soles que podrías estar recuperando cada mes`;

    await sendMessage(phone,
      `${ingresoExtra} 💸\n\n` +
      `Con BarberFlow el sistema les escribe solo, en el momento justo. ` +
      `Además acumulan visitas en su cel → cada 5 cortes uno es gratis. ` +
      `Eso los fideliza sin que tú estés pendiente. 💈\n\n` +
      `Estamos en fase de lanzamiento en Lima y trabajamos solo con barberías seleccionadas 🔒\n\n` +
      `¿Te muestro en 20 min cómo quedaría en tu barbería específicamente? ` +
      `Puedo *${SLOTS[0].label}* o *${SLOTS[1].label}*. ¿Cuál te va?`
    );
    return;
  }

  // ── ESPERANDO_DECISION ───────────────────────────────────────────────
  if (s.estado === E.ESPERANDO_DECISION) {
    // Intentar matchear un slot directamente desde la respuesta
    const slotElegido = matchSlot(texto, SLOTS);
    if (slotElegido) return await confirmarCita(phone, s, nombre, slotElegido);

    if (preguntaPrecio(texto)) {
      await sendMessage(phone,
        `Son *S/ 350 al mes* y se paga solo con recuperar un par de clientes. 💡\n\n` +
        `Por eso mejor te lo muestro en vivo → así ves exactamente cuánto genera ` +
        `en tu caso. ¿*${SLOTS[0].label}* o *${SLOTS[1].label}*?`
      );
      return;
    }

    if (esAfirmativo(texto)) {
      await updateSession(phone, { ...s, nombre, estado: E.ELIGIENDO_HORARIO });
      await sendMessage(phone,
        `¡Perfecto! ¿Cuál horario te va mejor?\n\n` +
        `*1️⃣* ${SLOTS[0].label}\n` +
        `*2️⃣* ${SLOTS[1].label}`
      );
      return;
    }

    if (esNegativo(texto)) {
      await sendMessage(phone,
        `Sin problema 🙏 Si en algún momento quieres ver cómo funciona, ` +
        `aquí estaré. ¡Éxitos con tu barbería! 💈`
      );
      return;
    }

    await sendMessage(phone,
      `¿Te muestro cómo funciona? Tengo:\n\n` +
      `*1️⃣* ${SLOTS[0].label}\n` +
      `*2️⃣* ${SLOTS[1].label}\n\n` +
      `¿Cuál te va?`
    );
    return;
  }

  // ── ELIGIENDO_HORARIO ────────────────────────────────────────────────
  if (s.estado === E.ELIGIENDO_HORARIO) {
    const slotElegido = matchSlot(texto, SLOTS);
    if (slotElegido) return await confirmarCita(phone, s, nombre, slotElegido);

    await sendMessage(phone,
      `Responde *1* o *2* para confirmar:\n\n` +
      `*1️⃣* ${SLOTS[0].label}\n` +
      `*2️⃣* ${SLOTS[1].label}`
    );
    return;
  }

  // ── AGENDADO ─────────────────────────────────────────────────────────
  if (s.estado === E.AGENDADO) {
    await sendMessage(phone,
      `Ya tienes tu demo agendada 📅\n` +
      `Si necesitas cambiar algo escríbeme y lo resolvemos. 🙌`
    );
  }
}

async function confirmarCita(phone, s, nombre, slot) {
  await saveAppointment(phone, nombre, slot);
  await updateSession(phone, { ...s, nombre, estado: E.AGENDADO });

  await sendMessage(phone,
    `¡Perfecto ${nombre}! 🙌\n\n` +
    `📅 ${slot.label}\n` +
    `🔗 Te mando el link de Meet 1 hora antes\n` +
    `📊 Para la reunión preparo un estimado de cuánto podrías ` +
    `recuperar con tus clientes específicamente\n\n` +
    `¡Hasta ${slot.dia}! 💈`
  );
}

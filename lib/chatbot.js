import { sendMessage, sendListaHorarios } from './whatsapp.js';
import { getSession, updateSession, saveAppointment } from './db.js';
import { getSlotsParaLista, decodeSlotId, PRECIO_CORTE, VISITAS_MES } from './config.js';

const E = {
  INICIO:             'inicio',
  ESPERANDO_DOLOR:    'esperando_dolor',
  ESPERANDO_DECISION: 'esperando_decision',
  ELIGIENDO_HORARIO:  'eligiendo_horario',
  AGENDADO:           'agendado',
};

function norm(t) {
  return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function extraerNumero(texto) {
  const match = texto.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

function esAfirmativo(texto) {
  const t = norm(texto);
  return ['si', 'dale', 'claro', 'ok', 'bueno', 'quiero', 'me interesa', 'genial',
          'muestra', 'yes', 'perfecto', 'obvio', 'por supuesto', 'excelente', 'listo',
          'adelante', 'va', 'show'].some(p => t.includes(p));
}

function esNegativo(texto) {
  const t = norm(texto);
  return t === 'no' || t.startsWith('no ') || t.startsWith('no,');
}

function preguntaPrecio(texto) {
  const t = norm(texto);
  return ['precio', 'cuesta', 'costo', 'cuanto', 'vale', 'cobran'].some(p => t.includes(p));
}

async function enviarHorarios(phone) {
  const sections = getSlotsParaLista();
  if (sections.length === 0) {
    await sendMessage(phone, `No tengo horarios disponibles para hoy ni mañana. Escríbeme el lunes y coordinamos. 🙏`);
    return false;
  }
  await sendListaHorarios(phone, sections);
  return true;
}

export async function procesarMensaje(phone, texto, nombreContacto) {
  const s = await getSession(phone);
  if (!s.nombre && nombreContacto) s.nombre = nombreContacto;
  const nombre = s.nombre || 'amigo';

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
    await updateSession(phone, { ...s, nombre, estado: E.ELIGIENDO_HORARIO, clientes_perdidos: num });

    const ingresoExtra = num
      ? `${num} clientes... si cada uno vuelve aunque sea ${VISITAS_MES} veces al mes ` +
        `a S/ ${PRECIO_CORTE}, son *S/ ${num * VISITAS_MES * PRECIO_CORTE}* que podrías ` +
        `estar cobrando de más cada mes`
      : `Esos clientes... son cientos de soles que podrías estar recuperando cada mes`;

    await sendMessage(phone,
      `${ingresoExtra} 💸\n\n` +
      `Con BarberFlow el sistema les escribe solo, en el momento exacto. ` +
      `Además tus clientes acumulan visitas digitalmente → cada 5 cortes uno es gratis. ` +
      `Se fidelizan solos. 💈\n\n` +
      `Estamos en lanzamiento en Lima y trabajamos con barberías seleccionadas 🔒\n\n` +
      `Elige un horario y te muestro en 20 min cómo quedaría en tu caso específico 👇`
    );
    await new Promise(r => setTimeout(r, 800));
    await enviarHorarios(phone);
    return;
  }

  // ── ESPERANDO_DECISION (por si alguien escribe texto en vez de tocar el botón) ──
  if (s.estado === E.ESPERANDO_DECISION) {
    if (preguntaPrecio(texto)) {
      await sendMessage(phone,
        `Son *S/ 350 al mes* y se paga solo con recuperar un par de clientes. 💡\n\n` +
        `Por eso mejor te lo muestro en vivo → así ves exactamente cuánto genera en tu caso.`
      );
      await enviarHorarios(phone);
      return;
    }
    if (esNegativo(texto)) {
      await sendMessage(phone, `Sin problema 🙏 Si en algún momento quieres ver cómo funciona, aquí estaré. ¡Éxitos! 💈`);
      return;
    }
    if (esAfirmativo(texto)) {
      await updateSession(phone, { ...s, nombre, estado: E.ELIGIENDO_HORARIO });
      await enviarHorarios(phone);
      return;
    }
    await enviarHorarios(phone);
    return;
  }

  // ── ELIGIENDO_HORARIO (escribió texto en vez de tocar la lista) ──────
  if (s.estado === E.ELIGIENDO_HORARIO) {
    await sendMessage(phone, `Toca el botón *"Ver horarios"* para elegir tu horario 👇`);
    await enviarHorarios(phone);
    return;
  }

  // ── AGENDADO ─────────────────────────────────────────────────────────
  if (s.estado === E.AGENDADO) {
    await sendMessage(phone,
      `Ya tienes tu demo agendada 📅\nSi necesitas cambiar algo escríbeme y lo resolvemos. 🙌`
    );
  }
}

// Llamado cuando el lead toca una opción de la lista interactiva
export async function procesarSlotElegido(phone, slotId, nombreContacto) {
  const s      = await getSession(phone);
  const nombre = s.nombre || nombreContacto || 'amigo';
  const slot   = decodeSlotId(slotId);

  if (!slot) {
    await sendMessage(phone, `No pude procesar ese horario. Intenta de nuevo por favor.`);
    return;
  }

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

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

function esAfirmativo(texto) {
  const t = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return ['si', 'dale', 'claro', 'ok', 'bueno', 'quiero', 'me interesa',
          'muestra', 'yes', 'perfecto', 'obvio', 'por supuesto'].some(p => t.includes(p));
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
    const t = texto.toLowerCase();

    if (t.includes('1') || t.includes(SLOTS[0].dia)) return await confirmarCita(phone, s, nombre, SLOTS[0]);
    if (t.includes('2') || t.includes(SLOTS[1].dia)) return await confirmarCita(phone, s, nombre, SLOTS[1]);

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
    const t = texto.toLowerCase();
    if (t.includes('1') || t.includes(SLOTS[0].dia)) return await confirmarCita(phone, s, nombre, SLOTS[0]);
    if (t.includes('2') || t.includes(SLOTS[1].dia)) return await confirmarCita(phone, s, nombre, SLOTS[1]);

    await sendMessage(phone, `Responde *1* o *2* para confirmar tu horario. ¿Cuál te va mejor?`);
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

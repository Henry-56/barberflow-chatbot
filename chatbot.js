import { sendMessage } from './whatsapp.js';
import { bookAppointment } from './appointments.js';
import { getSlots, PRECIO_CORTE, VISITAS_MES } from './config.js';

const sessions = new Map();

const E = {
  INICIO: 'inicio',
  ESPERANDO_DOLOR: 'esperando_dolor',
  ESPERANDO_DECISION: 'esperando_decision',
  ELIGIENDO_HORARIO: 'eligiendo_horario',
  AGENDADO: 'agendado',
};

function sesion(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, { estado: E.INICIO, nombre: null, clientesPerdidos: null });
  }
  return sessions.get(phone);
}

function extraerNumero(texto) {
  const match = texto.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}

function esAfirmativo(texto) {
  const t = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return ['si', 'dale', 'claro', 'ok', 'bueno', 'quiero', 'me interesa', 'muestra', 'yes', 'perfecto', 'obvio', 'por supuesto'].some(p => t.includes(p));
}

function esNegativo(texto) {
  const t = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return t === 'no' || t.startsWith('no ') || t.startsWith('no,');
}

export async function procesarMensaje(phone, texto, nombreContacto) {
  const s = sesion(phone);
  s.nombre = s.nombre || nombreContacto || 'amigo';
  const SLOTS = getSlots();

  console.log(`[${phone}] estado=${s.estado} | msg="${texto}"`);

  // ── INICIO: primer contacto ──────────────────────────────────────────
  if (s.estado === E.INICIO) {
    s.estado = E.ESPERANDO_DOLOR;

    await sendMessage(phone,
      `Hola ${s.nombre} 👋 soy el asistente de BarberFlow.\n` +
      `Dame 2 minutos, te va a interesar. ¡No te muevas! 💈`
    );

    // Pequeña pausa para que lleguen como dos mensajes separados
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

  // ── ESPERANDO_DOLOR: responden cuántos clientes perdieron ────────────
  if (s.estado === E.ESPERANDO_DOLOR) {
    const num = extraerNumero(texto);
    s.clientesPerdidos = num;
    s.estado = E.ESPERANDO_DECISION;

    const recuperable = num ? `S/ ${num * VISITAS_MES * PRECIO_CORTE}` : 'cientos de soles';
    const clientesTexto = num ? `${num} clientes` : 'Esos clientes';
    const ingresoExtra = num
      ? `si cada uno vuelve aunque sea ${VISITAS_MES} veces al mes a S/ ${PRECIO_CORTE}, ` +
        `son *${recuperable}* que podrías estar cobrando de más cada mes`
      : `son cientos de soles que podrías estar recuperando cada mes`;

    await sendMessage(phone,
      `${clientesTexto}... ${ingresoExtra} 💸\n\n` +
      `Con BarberFlow el sistema les escribe solo, en el momento justo. ` +
      `Además acumulan visitas en su cel → cada 5 cortes uno es gratis. ` +
      `Eso los fideliza sin que tú estés pendiente. 💈\n\n` +
      `Estamos en fase de lanzamiento en Lima y trabajamos solo con barberías seleccionadas 🔒\n\n` +
      `¿Te muestro en 20 min cómo quedaría en tu barbería específicamente? ` +
      `Puedo *${SLOTS[0].label}* o *${SLOTS[1].label}*. ¿Cuál te va?`
    );
    return;
  }

  // ── ESPERANDO_DECISION: ¿quiere la demo? ────────────────────────────
  if (s.estado === E.ESPERANDO_DECISION) {
    const t = texto.toLowerCase();

    // Eligió directamente un horario
    if (t.includes('1') || t.includes(SLOTS[0].dia)) {
      return await confirmarCita(phone, s, SLOTS[0]);
    }
    if (t.includes('2') || t.includes(SLOTS[1].dia)) {
      return await confirmarCita(phone, s, SLOTS[1]);
    }

    // Mostró interés pero no eligió
    if (esAfirmativo(texto)) {
      s.estado = E.ELIGIENDO_HORARIO;
      await sendMessage(phone,
        `¡Perfecto! ¿Cuál horario te va mejor?\n\n` +
        `*1️⃣* ${SLOTS[0].label}\n` +
        `*2️⃣* ${SLOTS[1].label}`
      );
      return;
    }

    // Preguntó por el precio
    if (t.includes('precio') || t.includes('cuesta') || t.includes('costo') || t.includes('cuanto') || t.includes('cuánto')) {
      await sendMessage(phone,
        `Son *S/ 350 al mes* y se paga solo con recuperar un par de clientes. 💡\n\n` +
        `Por eso mejor te lo muestro en vivo → así ves exactamente cuánto genera ` +
        `en tu caso específico. ¿${SLOTS[0].label} o ${SLOTS[1].label}?`
      );
      return;
    }

    // No le interesa
    if (esNegativo(texto)) {
      await sendMessage(phone,
        `Sin problema 🙏 Si en algún momento quieres ver cómo funciona, ` +
        `aquí estaré. ¡Éxitos con tu barbería! 💈`
      );
      sessions.delete(phone);
      return;
    }

    // No entendió o dijo algo raro
    await sendMessage(phone,
      `¿Te muestro cómo funciona? Tengo:\n\n` +
      `*1️⃣* ${SLOTS[0].label}\n` +
      `*2️⃣* ${SLOTS[1].label}\n\n` +
      `¿Cuál te va?`
    );
    return;
  }

  // ── ELIGIENDO_HORARIO: ya pidió ver demo, elige slot ────────────────
  if (s.estado === E.ELIGIENDO_HORARIO) {
    const t = texto.toLowerCase();
    if (t.includes('1') || t.includes(SLOTS[0].dia)) return await confirmarCita(phone, s, SLOTS[0]);
    if (t.includes('2') || t.includes(SLOTS[1].dia)) return await confirmarCita(phone, s, SLOTS[1]);

    await sendMessage(phone, `Responde *1* o *2* para confirmar tu horario. ¿Cuál te va mejor?`);
    return;
  }

  // ── AGENDADO: ya tiene cita ──────────────────────────────────────────
  if (s.estado === E.AGENDADO) {
    await sendMessage(phone,
      `Ya tienes tu demo agendada 📅\n` +
      `Si necesitas cambiar algo escríbeme y lo resolvemos. 🙌`
    );
    return;
  }
}

async function confirmarCita(phone, s, slot) {
  bookAppointment(phone, s.nombre, slot);
  s.estado = E.AGENDADO;

  await sendMessage(phone,
    `¡Perfecto ${s.nombre}! 🙌\n\n` +
    `📅 ${slot.label}\n` +
    `🔗 Te mando el link de Meet 1 hora antes\n` +
    `📊 Para la reunión preparo un estimado de cuánto podrías ` +
    `recuperar con tus clientes específicamente\n\n` +
    `¡Hasta ${slot.dia}! 💈`
  );
}

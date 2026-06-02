import { sendMessage, sendListaHorarios } from './whatsapp.js';
import { getSession, updateSession, saveAppointment, getMessages } from './db.js';
import { getSlotsParaLista, decodeSlotId } from './config.js';
import { callGemini } from './agent.js';

async function enviarHorarios(phone) {
  const sections = getSlotsParaLista();
  if (!sections.length) {
    await sendMessage(phone, `No tengo horarios disponibles hoy ni mañana. Escríbeme el lunes y coordinamos. 🙏`);
    return;
  }
  await sendListaHorarios(phone, sections);
}

export async function procesarMensaje(phone, texto, nombreContacto) {
  const s = await getSession(phone);
  if (s.manual_mode) return;

  if (!s.nombre && nombreContacto) {
    await updateSession(phone, { ...s, nombre: nombreContacto });
    s.nombre = nombreContacto;
  }

  if (s.estado === 'agendado') {
    await sendMessage(phone, `Ya tienes tu demo agendada 📅\nSi necesitas cambiar algo escríbeme y lo resolvemos. 🙌`);
    return;
  }

  const historial = await getMessages(phone);
  const respuesta = await callGemini(historial, s.nombre);

  if (!respuesta) {
    await sendMessage(phone, `Disculpa, tuve un problema técnico. ¿Me repites eso? 🙏`);
    return;
  }

  if (respuesta.includes('[MOSTRAR_HORARIOS]')) {
    const textoLimpio = respuesta.replace('[MOSTRAR_HORARIOS]', '').trim();
    if (textoLimpio) await sendMessage(phone, textoLimpio);
    await enviarHorarios(phone);
  } else {
    await sendMessage(phone, respuesta);
  }
}

// Sin cambios — se llama cuando el lead toca un horario en la lista interactiva
export async function procesarSlotElegido(phone, slotId, nombreContacto) {
  const s = await getSession(phone);
  if (s.manual_mode) return;
  const nombre = s.nombre || nombreContacto || 'amigo';
  const slot = decodeSlotId(slotId);

  if (!slot) {
    await sendMessage(phone, `No pude procesar ese horario. Intenta de nuevo por favor.`);
    return;
  }

  await saveAppointment(phone, nombre, slot);
  await updateSession(phone, { ...s, nombre, estado: 'agendado' });

  await sendMessage(phone,
    `¡Perfecto ${nombre}! 🙌\n\n` +
    `📅 ${slot.label}\n` +
    `🔗 Te mando el link de Meet 1 hora antes\n` +
    `📊 Para la reunión preparo un estimado de cuánto podrías ` +
    `recuperar con tus clientes específicamente\n\n` +
    `Toda la información se te va a brindar en la reunión virtual, ` +
    `ahí puedes hacer cualquier consulta o duda que tengas.\n\n` +
    `¡Hasta ${slot.dia}! 💈`
  );
}

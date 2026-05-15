// Disponibilidad semanal de Henry para demos (hora Perú UTC-5)
// Formato: [hora_inicio, hora_fin] en formato 24h
const DISPONIBILIDAD = {
  0: [],                                    // Domingo: no disponible
  1: [[14, 15], [16, 19]],                  // Lunes: 2-3pm y 4-7pm
  2: [[14, 15], [16, 19]],                  // Martes: 2-3pm y 4-7pm
  3: [[9, 20]],                             // Miércoles: todo el día
  4: [[14, 15], [16, 17]],                  // Jueves: 2-3pm y 4-5pm
  5: [[9, 19]],                             // Viernes: todo el día (excepto 7-8pm)
  6: [[14, 15]],                            // Sábado: 2-3pm
};

const DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function horaDisponible(diaSemana, hora) {
  return DISPONIBILIDAD[diaSemana]?.some(([ini, fin]) => hora >= ini && hora < fin) ?? false;
}

function formatoSlot(fecha, hora) {
  const diaSemana = fecha.getDay();
  const dia = fecha.getDate();
  const mes = MESES_ES[fecha.getMonth()];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaSolo = new Date(fecha);
  fechaSolo.setHours(0, 0, 0, 0);

  const diffDias = Math.round((fechaSolo - hoy) / 86400000);

  let prefijo;
  if (diffDias === 0) prefijo = 'hoy';
  else if (diffDias === 1) prefijo = 'mañana';
  else prefijo = `el ${DIAS_ES[diaSemana]} ${dia} de ${mes}`;

  const horaStr = `${hora}:00 pm`.replace('12:00 pm', '12:00 m').replace(/^(\d+)/, h => h > 12 ? h - 12 : h);

  return {
    label: `${prefijo} a las ${hora < 12 ? hora + ':00 am' : (hora === 12 ? '12:00 m' : (hora - 12) + ':00 pm')}`,
    dia: prefijo,
    fecha: `${dia} de ${mes}`,
  };
}

export function getSlots() {
  // Hora actual en Perú (UTC-5)
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }));
  const horaActual = ahora.getHours() + ahora.getMinutes() / 60;

  const slots = [];
  let diaOffset = 0;

  while (slots.length < 2 && diaOffset < 14) {
    const fecha = new Date(ahora);
    fecha.setDate(ahora.getDate() + diaOffset);
    const diaSemana = fecha.getDay();
    const franjas = DISPONIBILIDAD[diaSemana] || [];

    for (const [ini, fin] of franjas) {
      for (let hora = ini; hora < fin; hora++) {
        // Si es hoy, solo horas que tengan al menos 1h de margen
        if (diaOffset === 0 && hora <= horaActual + 1) continue;

        const { label, dia, fecha: fechaStr } = formatoSlot(fecha, hora);
        slots.push({
          id: String(slots.length + 1),
          label,
          dia,
          meet: 'https://meet.google.com/tiu-avtv-xxh',
        });

        if (slots.length === 2) break;
      }
      if (slots.length === 2) break;
    }

    diaOffset++;
  }

  return slots;
}

export const PRECIO_CORTE = 22;
export const VISITAS_MES = 2;

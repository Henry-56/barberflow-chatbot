const DISPONIBILIDAD = {
  0: [],                          // Domingo: no disponible
  1: [[14, 15], [16, 19]],        // Lunes: 2-3pm y 4-7pm
  2: [[14, 15], [16, 19]],        // Martes: 2-3pm y 4-7pm
  3: [[9, 20]],                   // Miércoles: todo el día
  4: [[14, 15], [16, 17]],        // Jueves: 2-3pm y 4-5pm
  5: [[9, 19]],                   // Viernes: todo el día (hasta 7pm)
  6: [[14, 15]],                  // Sábado: 2-3pm
};

const DIAS_ES  = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MEET_LINK        = 'https://meet.google.com/tiu-avtv-xxh';
const LIMA_OFFSET_MS   = -5 * 60 * 60 * 1000; // UTC-5, sin depender del servidor

function horaLabel(hora) {
  if (hora < 12)  return `${hora}:00 am`;
  if (hora === 12) return `12:00 m`;
  return `${hora - 12}:00 pm`;
}

export function getSlots() {
  // Lima time usando UTC directo — funciona igual en Vercel (UTC) y local (Windows)
  const ahoraLima  = new Date(Date.now() + LIMA_OFFSET_MS);
  const horaActual = ahoraLima.getUTCHours() + ahoraLima.getUTCMinutes() / 60;

  const slots = [];
  let diaOffset = 0;

  while (slots.length < 2 && diaOffset < 14) {
    const fechaLima = new Date(ahoraLima.getTime() + diaOffset * 86400000);
    const diaSemana = fechaLima.getUTCDay();
    const diaNum    = fechaLima.getUTCDate();
    const mesNum    = fechaLima.getUTCMonth();
    const franjas   = DISPONIBILIDAD[diaSemana] || [];

    for (const [ini, fin] of franjas) {
      for (let hora = ini; hora < fin; hora++) {
        if (diaOffset === 0 && hora <= horaActual + 1) continue;

        let prefijo;
        if (diaOffset === 0)      prefijo = 'hoy';
        else if (diaOffset === 1) prefijo = 'mañana';
        else prefijo = `el ${DIAS_ES[diaSemana]} ${diaNum} de ${MESES_ES[mesNum]}`;

        const dia = diaOffset === 0 ? 'hoy' : diaOffset === 1 ? 'mañana' : `el ${DIAS_ES[diaSemana]}`;

        slots.push({
          id:    String(slots.length + 1),
          label: `${prefijo} a las ${horaLabel(hora)}`,
          dia,
          meet:  MEET_LINK,
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
export const VISITAS_MES  = 2;

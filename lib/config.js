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

export const MEET_LINK      = 'https://meet.google.com/tiu-avtv-xxh';
export const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;
export const PRECIO_CORTE   = 22;
export const VISITAS_MES    = 2;

export function horaLabel(h) {
  if (h < 12)   return `${h}:00 am`;
  if (h === 12) return `12:00 m`;
  return `${h - 12}:00 pm`;
}

// Devuelve todos los slots de hoy y mañana agrupados por sección para el desplegable
export function getSlotsParaLista() {
  const ahoraLima  = new Date(Date.now() + LIMA_OFFSET_MS);
  const horaActual = ahoraLima.getUTCHours() + ahoraLima.getUTCMinutes() / 60;
  const sections   = [];

  for (let diaOffset = 0; diaOffset <= 1; diaOffset++) {
    const fechaLima = new Date(ahoraLima.getTime() + diaOffset * 86400000);
    const diaSemana = fechaLima.getUTCDay();
    const diaNum    = fechaLima.getUTCDate();
    const mesNum    = fechaLima.getUTCMonth();
    const franjas   = DISPONIBILIDAD[diaSemana] || [];
    const rows      = [];

    for (const [ini, fin] of franjas) {
      for (let hora = ini; hora < fin; hora++) {
        if (diaOffset === 0 && hora <= horaActual + 1) continue;
        if (rows.length >= 5) break; // max 5 por día

        const prefijo = diaOffset === 0 ? 'hoy' : 'mañana';
        const dia     = diaOffset === 0 ? 'hoy' : 'mañana';

        // ID codificado con fecha y hora para recuperarlo sin BD
        const y = fechaLima.getUTCFullYear();
        const m = String(fechaLima.getUTCMonth() + 1).padStart(2, '0');
        const d = String(diaNum).padStart(2, '0');
        const h = String(hora).padStart(2, '0');

        rows.push({
          id:          `slot_${y}${m}${d}_${h}`,
          title:       horaLabel(hora),          // max 24 chars
          description: 'Demo de 20 min por Meet',
          // metadata para confirmarCita
          slotLabel:   `${prefijo} a las ${horaLabel(hora)}`,
          dia,
          meet:        MEET_LINK,
        });
      }
    }

    if (rows.length > 0) {
      const diaLabel = diaOffset === 0 ? 'Hoy' : 'Mañana';
      const diaNombre = DIAS_ES[diaSemana];
      sections.push({
        title: `${diaLabel} — ${diaNombre} ${diaNum}`,  // max 24 chars
        rows,
      });
    }
  }

  return sections; // array de { title, rows[] }
}

// Decodifica un slot ID de vuelta a objeto slot (stateless, sin BD)
export function decodeSlotId(id) {
  const match = id.match(/^slot_(\d{4})(\d{2})(\d{2})_(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hStr] = match;
  const hora    = parseInt(hStr);
  const diaNum  = parseInt(day);
  const mesNum  = parseInt(month) - 1;

  const ahoraLima   = new Date(Date.now() + LIMA_OFFSET_MS);
  const mananaLima  = new Date(ahoraLima.getTime() + 86400000);

  let dia;
  if (diaNum === ahoraLima.getUTCDate() && mesNum === ahoraLima.getUTCMonth()) dia = 'hoy';
  else if (diaNum === mananaLima.getUTCDate() && mesNum === mananaLima.getUTCMonth()) dia = 'mañana';
  else {
    const f = new Date(Date.UTC(parseInt(year), mesNum, diaNum));
    dia = `el ${DIAS_ES[f.getUTCDay()]} ${diaNum} de ${MESES_ES[mesNum]}`;
  }

  return {
    id,
    label: `${dia} a las ${horaLabel(hora)}`,
    dia,
    meet: MEET_LINK,
  };
}

// Disponibilidad en minutos desde medianoche [ini, fin)
const DISPONIBILIDAD = {
  0: [],                                    // Domingo:   cerrado
  1: [],                                    // Lunes:     cerrado
  2: [[17 * 60 + 30, 21 * 60]],            // Martes:    5:30pm – 9pm
  3: [[ 8 * 60,      12 * 60]],            // Miércoles: 8am – 12pm
  4: [[17 * 60,      18 * 60]],            // Jueves:    5pm – 6pm
  5: [[ 8 * 60,      11 * 60]],            // Viernes:   8am – 11am
  6: [[ 8 * 60,      11 * 60]],            // Sábado:    8am – 11am
};

const DIAS_ES  = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const MEET_LINK      = 'https://meet.google.com/tiu-avtv-xxh';
export const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;
export const PRECIO_CORTE   = 22;
export const VISITAS_MES    = 2;

export function horaLabel(h, m = 0) {
  const minStr = m > 0 ? `:${String(m).padStart(2, '0')}` : ':00';
  if (h < 12)   return `${h}${minStr} am`;
  if (h === 12) return `12${minStr} m`;
  return `${h - 12}${minStr} pm`;
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
    const franjas   = DISPONIBILIDAD[diaSemana] || [];
    const rows      = [];

    for (const [iniMin, finMin] of franjas) {
      for (let minutos = iniMin; minutos < finMin; minutos += 60) {
        const hora = Math.floor(minutos / 60);
        const min  = minutos % 60;
        if (diaOffset === 0 && (hora + min / 60) <= horaActual + 1) continue;
        if (rows.length >= 5) break;

        const prefijo = diaOffset === 0 ? 'hoy' : 'mañana';
        const dia     = diaOffset === 0 ? 'hoy' : 'mañana';

        const y  = fechaLima.getUTCFullYear();
        const mo = String(fechaLima.getUTCMonth() + 1).padStart(2, '0');
        const d  = String(diaNum).padStart(2, '0');
        const hh = String(hora).padStart(2, '0');
        const mm = String(min).padStart(2, '0');

        const diaNombreCapital = DIAS_ES[diaSemana][0].toUpperCase() + DIAS_ES[diaSemana].slice(1);
        rows.push({
          id:          `slot_${y}${mo}${d}_${hh}${mm}`,
          title:       `${diaNombreCapital} ${diaNum} - ${horaLabel(hora, min)}`,
          description: 'Demo de 20 min por Meet',
          slotLabel:   `${prefijo} a las ${horaLabel(hora, min)}`,
          dia,
          meet:        MEET_LINK,
        });
      }
    }

    if (rows.length > 0) {
      const diaLabel  = diaOffset === 0 ? 'Hoy' : 'Mañana';
      const diaNombre = DIAS_ES[diaSemana];
      sections.push({
        title: `${diaLabel} — ${diaNombre} ${diaNum}`,
        rows,
      });
    }
  }

  return sections;
}

// Decodifica un slot ID — soporta formato nuevo (HHMM) y viejo (HH) para compatibilidad
export function decodeSlotId(id) {
  let hora, min, year, month, day;

  // Formato nuevo: slot_YYYYMMDD_HHMM
  let match = id.match(/^slot_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/);
  if (match) {
    [, year, month, day, hora, min] = match;
    hora = parseInt(hora);
    min  = parseInt(min);
  } else {
    // Formato viejo: slot_YYYYMMDD_HH
    match = id.match(/^slot_(\d{4})(\d{2})(\d{2})_(\d{2})$/);
    if (!match) return null;
    [, year, month, day, hora] = match;
    hora = parseInt(hora);
    min  = 0;
  }

  const diaNum = parseInt(day);
  const mesNum = parseInt(month) - 1;

  const ahoraLima  = new Date(Date.now() + LIMA_OFFSET_MS);
  const mananaLima = new Date(ahoraLima.getTime() + 86400000);

  let dia;
  if (diaNum === ahoraLima.getUTCDate() && mesNum === ahoraLima.getUTCMonth()) dia = 'hoy';
  else if (diaNum === mananaLima.getUTCDate() && mesNum === mananaLima.getUTCMonth()) dia = 'mañana';
  else {
    const f = new Date(Date.UTC(parseInt(year), mesNum, diaNum));
    dia = `el ${DIAS_ES[f.getUTCDay()]} ${diaNum} de ${MESES_ES[mesNum]}`;
  }

  return {
    id,
    label: `${dia} a las ${horaLabel(hora, min)}`,
    dia,
    meet: MEET_LINK,
  };
}

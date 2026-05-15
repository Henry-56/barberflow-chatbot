const appointments = new Map();

export function bookAppointment(phone, name, slot) {
  const appointment = { phone, name, slot, bookedAt: new Date().toISOString() };
  appointments.set(phone, appointment);
  console.log('[CITA AGENDADA]', appointment);
  return appointment;
}

export function getAppointment(phone) {
  return appointments.get(phone) || null;
}

export function listAppointments() {
  return [...appointments.values()];
}

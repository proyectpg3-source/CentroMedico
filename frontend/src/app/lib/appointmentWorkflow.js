// Una propuesta o una etiqueta heredada nunca equivale a una prioridad validada.
export function summarizeActivePriorities(appointments = []) {
  const counts = { P1: 0, P2: 0, P3: 0, P4: 0, SIN_VALIDAR: 0 };
  for (const appointment of appointments) {
    if (!["pendiente", "confirmada", "en_curso"].includes(appointment.estado)) continue;
    const level = appointment.prioridad_final;
    if (appointment.estado_prioridad === "validado" && ["P1", "P2", "P3", "P4"].includes(level)) counts[level]++;
    else counts.SIN_VALIDAR++;
  }
  return counts;
}

// Las citas antiguas podían guardar hora de llegada al programarlas.
// Su estado pendiente sigue requiriendo check-in aunque tengan esa marca.
export function needsCheckIn(appointment) {
  return appointment.estado === "pendiente" ||
    (appointment.estado === "confirmada" && !appointment.hora_llegada);
}

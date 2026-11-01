const assert = require("node:assert/strict");
(async () => {
  const { summarizeActivePriorities, needsCheckIn } = await import("../../frontend/src/app/lib/appointmentWorkflow.js");
  const pending = { estado: "confirmada", prioridad_clinica: "baja", estado_prioridad: "propuesto" };
  const summary = summarizeActivePriorities([
    pending,
    { ...pending, nivel_propuesto: "P1", prioridad_clinica: "critica" },
    { ...pending, estado: "en_curso", estado_prioridad: "validado", prioridad_final: null },
    ...["P1", "P2", "P3", "P4"].map(prioridad_final => ({ ...pending, estado_prioridad: "validado", prioridad_final })),
    { ...pending, estado: "completada", estado_prioridad: "validado", prioridad_final: "P1" },
    { ...pending, estado: "cancelada", estado_prioridad: "validado", prioridad_final: "P2" },
  ]);
  assert.deepEqual(summary, { P1: 1, P2: 1, P3: 1, P4: 1, SIN_VALIDAR: 3 });
  assert.deepEqual(summarizeActivePriorities(), { P1: 0, P2: 0, P3: 0, P4: 0, SIN_VALIDAR: 0 });
  assert.equal(Object.values(summary).reduce((sum, n) => sum+n, 0), 7);
  assert.equal(needsCheckIn({ estado: "pendiente", hora_llegada: "2026-10-01T09:00:00Z" }), true);
  assert.equal(needsCheckIn({ estado: "confirmada", hora_llegada: null }), true);
  for (const estado of ["en_curso", "completada", "cancelada"]) assert.equal(needsCheckIn({ estado, hora_llegada: null }), false);
  assert.equal(needsCheckIn({ estado: "confirmada", hora_llegada: "2026-10-01T09:00:00Z" }), false);
  console.log("APROBADO: resumen separa propuestas y etiquetas heredadas de niveles validados; excluye citas cerradas.");
})().catch(error => { console.error(error); process.exitCode=1; });

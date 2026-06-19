// ─── SELECT queries enriquecidos ──────────────────────────────────────────────

const CITA_SELECT = `
  SELECT
    c.id_cita, c.id_paciente, c.id_medico, c.fecha_hora, c.motivo, c.estado,
    c.triaje_notas, c.prioridad_clinica, c.puntaje_prioridad, c.motivos_prioridad,
    c.hora_llegada, c.hora_inicio_atencion, c.hora_fin_atencion,
    vm.id_visita,
    p.nombre AS paciente_nombre, p.dni AS paciente_dni,
    p.telefono AS paciente_telefono, p.email AS paciente_email,
    m.nombre AS medico_nombre, m.especialidad AS medico_especialidad,
    m.licencia AS medico_licencia
  FROM citas c
  LEFT JOIN visitas_medicas vm ON vm.id_cita = c.id_cita
  LEFT JOIN pacientes p ON p.id_paciente = c.id_paciente
  LEFT JOIN medicos m ON m.id_medico = c.id_medico
`;

const VISITA_SELECT = `
  SELECT
    v.id_visita, v.id_cita, v.id_paciente, v.id_medico,
    v.fecha_visita, v.motivo, v.historia_enfermedad_actual,
    v.antecedentes_medicos, v.antecedentes_quirurgicos,
    v.antecedentes_alergicos, v.antecedentes_traumaticos,
    v.antecedentes_ginecologicos, v.examen_fisico,
    v.presion_arterial, v.frecuencia_cardiaca, v.frecuencia_respiratoria,
    v.temperatura, v.saturacion_oxigeno, v.impresion_clinica,
    v.diagnostico, v.tratamiento, v.conducta, v.tipo_atencion,
    v.dieta, v.soluciones, v.ultrasonido, v.rayos_x,
    v.ordenes_especiales, v.diagnostico_egreso, v.fecha_egreso,
    v.observaciones, v.costo_consulta, v.created_at, v.updated_at,
    p.nombre AS paciente_nombre, p.dni AS paciente_dni,
    p.telefono AS paciente_telefono, p.email AS paciente_email,
    m.nombre AS medico_nombre, m.especialidad AS medico_especialidad,
    m.licencia AS medico_licencia,
    c.fecha_hora AS cita_fecha_hora, c.estado AS cita_estado,
    COUNT(DISTINCT o.id_orden)::int AS total_ordenes_laboratorio,
    COUNT(DISTINCT pr.id_prescripcion)::int AS total_prescripciones
  FROM visitas_medicas v
  LEFT JOIN pacientes p ON p.id_paciente = v.id_paciente
  LEFT JOIN medicos m ON m.id_medico = v.id_medico
  LEFT JOIN citas c ON c.id_cita = v.id_cita
  LEFT JOIN ordenes_laboratorio o ON o.id_visita = v.id_visita
  LEFT JOIN prescripciones pr ON pr.id_visita = v.id_visita
`;

const LAB_ORDER_SELECT = `
  SELECT
    o.id_orden, o.id_paciente, o.id_cita, o.id_visita,
    o.examen, o.prioridad, o.estado, o.costo, o.created_at, o.updated_at,
    p.nombre AS paciente_nombre, p.dni AS paciente_dni,
    p.telefono AS paciente_telefono, p.email AS paciente_email,
    v.fecha_visita, v.diagnostico AS visita_diagnostico,
    COALESCE(vm.nombre, cm.nombre) AS medico_nombre,
    COALESCE(vm.especialidad, cm.especialidad) AS medico_especialidad,
    r.id_resultado, r.resultado, r.observaciones AS resultado_observaciones,
    r.fecha_resultado, r.validado_por
  FROM ordenes_laboratorio o
  LEFT JOIN pacientes p ON p.id_paciente = o.id_paciente
  LEFT JOIN visitas_medicas v ON v.id_visita = o.id_visita
  LEFT JOIN citas c ON c.id_cita = o.id_cita
  LEFT JOIN medicos vm ON vm.id_medico = v.id_medico
  LEFT JOIN medicos cm ON cm.id_medico = c.id_medico
  LEFT JOIN resultados_laboratorio r ON r.id_orden = o.id_orden
`;

const RESULTADO_SELECT = `
  SELECT
    r.id_resultado, r.id_orden, r.resultado, r.observaciones,
    r.fecha_resultado, r.validado_por, r.created_at, r.updated_at,
    o.id_paciente, o.id_cita, o.id_visita, o.examen, o.prioridad, o.estado, o.costo,
    p.nombre AS paciente_nombre, p.dni AS paciente_dni,
    COALESCE(vm.nombre, cm.nombre) AS medico_nombre
  FROM resultados_laboratorio r
  INNER JOIN ordenes_laboratorio o ON o.id_orden = r.id_orden
  LEFT JOIN pacientes p ON p.id_paciente = o.id_paciente
  LEFT JOIN visitas_medicas v ON v.id_visita = o.id_visita
  LEFT JOIN citas c ON c.id_cita = o.id_cita
  LEFT JOIN medicos vm ON vm.id_medico = v.id_medico
  LEFT JOIN medicos cm ON cm.id_medico = c.id_medico
`;

const PRESCRIPTION_SELECT = `
  SELECT
    pr.id_prescripcion, pr.id_visita, pr.medicamento, pr.dosis,
    pr.frecuencia, pr.duracion, pr.instrucciones, pr.costo,
    pr.created_at, pr.updated_at,
    v.id_paciente, v.id_medico, v.fecha_visita,
    p.nombre AS paciente_nombre, p.dni AS paciente_dni,
    m.nombre AS medico_nombre, m.especialidad AS medico_especialidad
  FROM prescripciones pr
  INNER JOIN visitas_medicas v ON v.id_visita = pr.id_visita
  INNER JOIN pacientes p ON p.id_paciente = v.id_paciente
  INNER JOIN medicos m ON m.id_medico = v.id_medico
`;

const CARGO_SELECT = `
  SELECT
    cp.id_cargo, cp.id_paciente, cp.origen, cp.referencia_tipo, cp.referencia_id,
    cp.descripcion, cp.subtotal, cp.total, cp.saldo, cp.estado_pago,
    cp.created_at, cp.updated_at,
    p.nombre AS paciente_nombre, p.dni AS paciente_dni,
    COALESCE(SUM(pg.monto), 0)::numeric(10,2) AS total_pagado
  FROM cargos_paciente cp
  INNER JOIN pacientes p ON p.id_paciente = cp.id_paciente
  LEFT JOIN pagos pg ON pg.id_cargo = cp.id_cargo
`;

const PAGO_SELECT = `
  SELECT
    pg.id_pago, pg.id_paciente, pg.id_cargo, pg.monto,
    pg.fecha_pago, pg.metodo, pg.referencia, pg.observaciones, pg.created_at,
    cp.descripcion AS cargo_descripcion, cp.origen AS cargo_origen,
    cp.total AS cargo_total, cp.saldo AS cargo_saldo,
    cp.estado_pago AS cargo_estado_pago,
    p.nombre AS paciente_nombre, p.dni AS paciente_dni
  FROM pagos pg
  INNER JOIN cargos_paciente cp ON cp.id_cargo = pg.id_cargo
  INNER JOIN pacientes p ON p.id_paciente = pg.id_paciente
`;

module.exports = {
  CITA_SELECT,
  VISITA_SELECT,
  LAB_ORDER_SELECT,
  RESULTADO_SELECT,
  PRESCRIPTION_SELECT,
  CARGO_SELECT,
  PAGO_SELECT,
};

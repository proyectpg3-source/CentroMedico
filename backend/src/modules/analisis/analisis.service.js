const pool = require("../../config/db");

const URGENT_KEYWORDS = [
  "dificultad respiratoria",
  "dolor de pecho",
  "convulsion",
  "perdida de conciencia",
  "sangrado",
  "trombocitopenia",
  "dengue con signos de alarma",
];

const WARNING_KEYWORDS = [
  "fiebre alta",
  "fiebre",
  "dolor abdominal",
  "vomito",
  "deshidratacion",
  "hipertension",
  "diabetes",
  "embarazo",
  "dolor intenso",
];

const CHRONIC_KEYWORDS = [
  "hipertension",
  "diabetes",
  "asma",
  "cardiopatia",
  "renal",
  "epilepsia",
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function pushUnique(items, value) {
  if (value && !items.includes(value)) {
    items.push(value);
  }
}

function getPriorityLevel(score) {
  if (score >= 75) return "critica";
  if (score >= 50) return "alta";
  if (score >= 25) return "media";
  return "baja";
}

function calculatePriority(input, history = []) {
  const reasons = [];
  let score = 10;
  const text = normalizeText(
    [
      input.motivo,
      input.motivo_consulta,
      input.triaje_notas,
      input.historia_enfermedad_actual,
      input.antecedentes_relevantes,
      input.alergias_referidas,
      input.diagnostico,
      input.tratamiento,
      input.observaciones,
    ].join(" ")
  );

  for (const keyword of URGENT_KEYWORDS) {
    if (text.includes(keyword)) {
      score += 35;
      pushUnique(reasons, `Se identifica ${keyword} como signo de alarma.`);
    }
  }

  for (const keyword of WARNING_KEYWORDS) {
    if (keyword === "fiebre" && text.includes("fiebre alta")) {
      continue;
    }
    if (text.includes(keyword)) {
      score += 16;
      pushUnique(reasons, `El motivo menciona ${keyword}.`);
    }
  }

  const historyText = normalizeText(
    history
      .map((item) => [item.motivo, item.diagnostico, item.tratamiento, item.observaciones].join(" "))
      .join(" ")
  );

  for (const keyword of CHRONIC_KEYWORDS) {
    if (historyText.includes(keyword)) {
      score += 8;
      pushUnique(reasons, `El historial registra antecedente relacionado con ${keyword}.`);
    }
  }

  const repeatedPattern = history.some((item) => {
    const itemText = normalizeText([item.motivo, item.diagnostico].join(" "));
    return WARNING_KEYWORDS.some((keyword) => text.includes(keyword) && itemText.includes(keyword));
  });

  if (repeatedPattern) {
    score += 12;
    pushUnique(reasons, "Existen consultas previas con sintomas similares.");
  }

  if (history.length >= 5) {
    score += 6;
    pushUnique(reasons, "Paciente con historial clinico frecuente en el centro medico.");
  }

  const temperature = Number(input.temperatura);
  const oxygen = Number(input.saturacion_oxigeno);
  const heartRate = Number(input.frecuencia_cardiaca);
  const respiratoryRate = Number(input.frecuencia_respiratoria);
  const systolicPressure = Number.parseInt(String(input.presion_arterial || "").split("/")[0], 10);

  if (Number.isFinite(temperature) && temperature >= 39) {
    score += 20;
    pushUnique(reasons, "Temperatura elevada registrada en triaje.");
  } else if (Number.isFinite(temperature) && temperature > 0 && temperature < 35) {
    score += 20;
    pushUnique(reasons, "Temperatura baja registrada en triaje.");
  }

  if (Number.isFinite(oxygen) && oxygen > 0 && oxygen < 92) {
    score += 35;
    pushUnique(reasons, "Saturacion de oxigeno en rango de alerta.");
  } else if (Number.isFinite(oxygen) && oxygen >= 92 && oxygen < 95) {
    score += 15;
    pushUnique(reasons, "Saturacion de oxigeno que requiere vigilancia.");
  }

  if (Number.isFinite(heartRate) && heartRate > 0 && (heartRate >= 120 || heartRate <= 40)) {
    score += 15;
    pushUnique(reasons, "Frecuencia cardiaca fuera del rango esperado.");
  }

  if (Number.isFinite(respiratoryRate) && respiratoryRate > 0) {
    if (respiratoryRate >= 30 || respiratoryRate <= 8) {
      score += 25;
      pushUnique(reasons, "Frecuencia respiratoria en rango de alerta.");
    } else if (respiratoryRate >= 21) {
      score += 10;
      pushUnique(reasons, "Frecuencia respiratoria que requiere vigilancia.");
    }
  }

  if (Number.isFinite(systolicPressure) && systolicPressure > 0 && (systolicPressure >= 180 || systolicPressure < 90)) {
    score += 20;
    pushUnique(reasons, "Presion arterial sistolica en rango de alerta.");
  }

  const finalScore = Math.min(score, 100);
  return {
    puntaje_prioridad: finalScore,
    prioridad_clinica: getPriorityLevel(finalScore),
    motivos_prioridad: reasons.length
      ? reasons.join(" ")
      : "No se identifican datos de alarma inmediata con la informacion registrada.",
  };
}

async function getPatientHistory(idPaciente, queryRunner = pool) {
  const result = await queryRunner.query(
    `SELECT motivo, diagnostico, tratamiento, observaciones, fecha_visita
     FROM visitas_medicas
     WHERE id_paciente = $1
     ORDER BY fecha_visita DESC
     LIMIT 12`,
    [idPaciente]
  );
  return result.rows;
}

async function calcularPrioridadParaPaciente(idPaciente, input, queryRunner = pool) {
  const history = await getPatientHistory(idPaciente, queryRunner);
  return calculatePriority(input, history);
}

async function aplicarPrioridadACita(idCita, queryRunner = pool) {
  const citaResult = await queryRunner.query(
    `SELECT
       c.id_cita, c.id_paciente, c.motivo, c.triaje_notas,
       t.motivo_consulta, t.historia_enfermedad_actual,
       t.antecedentes_relevantes, t.alergias_referidas,
       t.presion_arterial, t.frecuencia_cardiaca,
       t.frecuencia_respiratoria, t.temperatura, t.saturacion_oxigeno,
       t.observaciones
     FROM citas c
     LEFT JOIN triajes t ON t.id_cita = c.id_cita
     WHERE c.id_cita = $1`,
    [idCita]
  );
  const cita = citaResult.rows[0];
  if (!cita) return null;

  const prioridad = await calcularPrioridadParaPaciente(cita.id_paciente, cita, queryRunner);
  await queryRunner.query(
    `UPDATE citas
     SET prioridad_clinica = $2,
         puntaje_prioridad = $3,
         motivos_prioridad = $4
     WHERE id_cita = $1`,
    [
      idCita,
      prioridad.prioridad_clinica,
      prioridad.puntaje_prioridad,
      prioridad.motivos_prioridad,
    ]
  );

  return prioridad;
}

async function recalcularCitasAbiertas() {
  const result = await pool.query(
    `SELECT id_cita
     FROM citas
     WHERE estado IN ('pendiente', 'confirmada', 'en_curso')
     ORDER BY fecha_hora ASC`
  );

  for (const row of result.rows) {
    await aplicarPrioridadACita(row.id_cita);
  }

  return { total_recalculadas: result.rowCount };
}

async function getColaPriorizada() {
  const result = await pool.query(
    `SELECT
       c.id_cita,
       c.id_paciente,
       c.id_medico,
       c.fecha_hora,
       c.motivo,
       c.estado,
       c.prioridad_clinica,
       c.puntaje_prioridad,
       c.motivos_prioridad,
       c.triaje_notas,
       c.hora_llegada,
       c.hora_inicio_atencion,
       c.hora_fin_atencion,
       t.id_triaje,
       t.fecha_triaje,
       t.motivo_consulta,
       t.historia_enfermedad_actual,
       t.antecedentes_relevantes,
       t.alergias_referidas,
       t.presion_arterial,
       t.frecuencia_cardiaca,
       t.frecuencia_respiratoria,
       t.temperatura,
       t.saturacion_oxigeno,
       t.peso,
       GREATEST(
         0,
         ROUND(EXTRACT(EPOCH FROM (COALESCE(c.hora_inicio_atencion, NOW()) - COALESCE(c.hora_llegada, c.fecha_hora))) / 60)
       )::int AS minutos_espera,
       p.nombre AS paciente_nombre,
       p.dni AS paciente_dni,
       p.telefono AS paciente_telefono,
       m.nombre AS medico_nombre,
       m.especialidad AS medico_especialidad,
       (
         SELECT COUNT(*)::int
         FROM visitas_medicas v
         WHERE v.id_paciente = c.id_paciente
       ) AS visitas_previas,
       (
         SELECT MAX(v.fecha_visita)
         FROM visitas_medicas v
         WHERE v.id_paciente = c.id_paciente
       ) AS ultima_visita
     FROM citas c
     LEFT JOIN pacientes p ON p.id_paciente = c.id_paciente
     LEFT JOIN medicos m ON m.id_medico = c.id_medico
     LEFT JOIN triajes t ON t.id_cita = c.id_cita
     WHERE c.estado IN ('pendiente', 'confirmada', 'en_curso')
     ORDER BY
       c.puntaje_prioridad DESC,
       CASE c.prioridad_clinica
         WHEN 'critica' THEN 1
         WHEN 'alta' THEN 2
         WHEN 'media' THEN 3
         ELSE 4
       END,
       c.fecha_hora ASC`
  );

  return result.rows;
}

async function getIndicadores() {
  const [
    queue,
    highPriority,
    averageWait,
    diagnosis,
    symptoms,
  ] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM citas
       WHERE estado IN ('pendiente', 'confirmada', 'en_curso')`
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM citas
       WHERE estado IN ('pendiente', 'confirmada', 'en_curso')
         AND prioridad_clinica IN ('alta', 'critica')`
    ),
    pool.query(
      `SELECT COALESCE(
         ROUND(AVG(EXTRACT(EPOCH FROM (hora_inicio_atencion - hora_llegada)) / 60)),
         0
       )::int AS minutos
       FROM citas
       WHERE hora_llegada IS NOT NULL
         AND hora_inicio_atencion IS NOT NULL`
    ),
    pool.query(
      `SELECT diagnostico, COUNT(*)::int AS total
       FROM visitas_medicas
       WHERE diagnostico IS NOT NULL AND diagnostico <> ''
       GROUP BY diagnostico
       ORDER BY total DESC, diagnostico ASC
       LIMIT 5`
    ),
    pool.query(
      `SELECT motivo, COUNT(*)::int AS total
       FROM citas
       WHERE motivo IS NOT NULL AND motivo <> ''
       GROUP BY motivo
       ORDER BY total DESC, motivo ASC
       LIMIT 5`
    ),
  ]);

  return {
    citas_activas: queue.rows[0].total,
    citas_alta_prioridad: highPriority.rows[0].total,
    espera_promedio_minutos: averageWait.rows[0].minutos,
    diagnosticos_frecuentes: diagnosis.rows,
    motivos_frecuentes: symptoms.rows,
  };
}

module.exports = {
  calculatePriority,
  calcularPrioridadParaPaciente,
  aplicarPrioridadACita,
  recalcularCitasAbiertas,
  getColaPriorizada,
  getIndicadores,
};

const pool = require("../../config/db");
const { assessTriagePriority } = require("../../services/microservices");

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

// Equivalencias TEWS -> P1-P4 según propuesta institucional
function mapTewsToP(score) {
  if (score >= 7) return "P1";
  if (score >= 5) return "P2";
  if (score >= 3) return "P3";
  return "P4";
}

// Catálogo de Discriminadores SATS (Elevan la prioridad independientemente del TEWS)
const SATS_DISCRIMINATORS = {
  P1: ["convulsion activa", "parada cardiorrespiratoria", "estado de coma", "shock anafilactico"],
  P2: ["dolor toracico", "dificultad respiratoria grave", "sangrado activo masivo", "dolor intenso"],
  P3: ["fiebre alta persistente", "dolor abdominal agudo", "deshidratacion moderada"],
  P4: []
};

function calculatePriority(input, history = []) {
  const reasons = [];
  let tewsScore = 0; // Puntaje fisiológico puro

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

  // 1. Cálculo de Puntaje Fisiológico (Simulación TEWS)
  const temperature = Number(input.temperatura);
  const oxygen = Number(input.saturacion_oxigeno);
  const heartRate = Number(input.frecuencia_cardiaca);
  const respiratoryRate = Number(input.frecuencia_respiratoria);
  const systolicPressure = Number.parseInt(String(input.presion_arterial || "").split("/")[0], 10);

  if (Number.isFinite(temperature) && (temperature >= 39 || temperature < 35)) tewsScore += 2;
  if (Number.isFinite(oxygen) && oxygen < 92) tewsScore += 3;
  if (Number.isFinite(heartRate) && (heartRate >= 120 || heartRate <= 40)) tewsScore += 2;
  if (Number.isFinite(respiratoryRate) && (respiratoryRate >= 30 || respiratoryRate <= 8)) tewsScore += 3;
  if (Number.isFinite(systolicPressure) && (systolicPressure >= 180 || systolicPressure < 90)) tewsScore += 2;

  // 2. Propuesta Preliminar basada en TEWS
  let proposedP = mapTewsToP(tewsScore);
  let evidence = `Puntaje TEWS: ${tewsScore} (Propuesta preliminar: ${proposedP})`;

  // 3. Aplicación de Discriminadores SATS (Elevación de Prioridad)
  let finalP = proposedP;
  let discriminatorFound = null;

  // Revisamos desde la prioridad más alta (P1) hacia abajo
  for (const [level, keywords] of Object.entries(SATS_DISCRIMINATORS)) {
    for (const keyword of keywords) {
      if (text.includes(normalizeText(keyword))) {
        // Solo elevamos la prioridad, nunca la bajamos mediante discriminador
        const priorityRank = { "P1": 1, "P2": 2, "P3": 3, "P4": 4 };
        if (priorityRank[level] < priorityRank[finalP]) {
          finalP = level;
          discriminatorFound = keyword;
        }
        break;
      }
    }
  }

  if (discriminatorFound) {
    evidence += ` | Discriminador detectado: '${discriminatorFound}'. Prioridad elevada a ${finalP}.`;
  }

  // Mantenemos compatibilidad con la columna 'prioridad_clinica' (critica, alta, media, baja)
  const clinicalMapping = { "P1": "critica", "P2": "alta", "P3": "media", "P4": "baja" };

  return {
    puntaje_prioridad: tewsScore,
    prioridad_clinica: clinicalMapping[finalP],
    motivos_prioridad: evidence,
    propuesta_p: finalP, // Nueva propiedad para la propuesta P1-P4
    evidencia_SATS: evidence
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

async function getPatientBirthDate(idPaciente, queryRunner = pool) {
  const result = await queryRunner.query(
    "SELECT fecha_nacimiento FROM pacientes WHERE id_paciente = $1",
    [idPaciente]
  );
  return result.rows[0]?.fecha_nacimiento || null;
}

async function calcularPrioridadDesdeEntrada(input) {
  const localPriority = calculatePriority(input);

  try {
    const servicePriority = await assessTriagePriority(input);
    return servicePriority || {
      ...localPriority,
      fuente_prioridad: "fallback-local",
    };
  } catch (error) {
    return {
      ...localPriority,
      fuente_prioridad: "fallback-local",
      advertencia_microservicio: error.message,
    };
  }
}

async function calcularPrioridadParaPaciente(idPaciente, input, queryRunner = pool) {
  const history = await getPatientHistory(idPaciente, queryRunner);
  const fechaNacimiento = await getPatientBirthDate(idPaciente, queryRunner);
  const localPriority = calculatePriority(input, history);

  try {
    const servicePriority = await assessTriagePriority({
      ...input,
      fecha_nacimiento: fechaNacimiento,
    });
    return servicePriority || {
      ...localPriority,
      fuente_prioridad: "fallback-local",
    };
  } catch (error) {
    return {
      ...localPriority,
      fuente_prioridad: "fallback-local",
      advertencia_microservicio: error.message,
    };
  }
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

async function getTriageConcordance() {
  const result = await pool.query(`
    SELECT
      t.id_triaje,
      t.prioridad_clinica as prioridad_final,
      c.prioridad_clinica as prioridad_propuesta,
      t.justificacion_cambio,
      t.fecha_triaje
    FROM triajes t
    JOIN citas c ON t.id_cita = c.id_cita
    WHERE t.estado_prioridad = 'validado'
  `);

  const rows = result.rows;
  const total = rows.length;
  if (total === 0) return { accuracy: 0, total, adjustments: [], trend: "sin_datos" };

  const matches = rows.filter(r => r.prioridad_final === r.prioridad_propuesta).length;
  const accuracy = (matches / total) * 100;

  const priorityRank = { "critica": 1, "alta": 2, "media": 3, "baja": 4 };
  let totalShift = 0;

  const adjustments = rows
    .filter(r => r.prioridad_final !== r.prioridad_propuesta)
    .map(r => {
      const shift = priorityRank[r.prioridad_propuesta] - priorityRank[r.prioridad_final];
      totalShift += shift;
      return {
        id: r.id_triaje,
        from: r.prioridad_propuesta,
        to: r.prioridad_final,
        justification: r.justificacion_cambio,
        date: r.fecha_triaje
      };
    });

  // trend: > 0 significa que el médico suele subir la prioridad (algoritmo conservador)
  // trend: < 0 significa que el médico suele bajar la prioridad (algoritmo alarmista)
  let trend = "neutra";
  if (totalShift > 0) trend = "conservador";
  if (totalShift < 0) trend = "alarmista";

  return {
    accuracy,
    total,
    trend,
    adjustments: adjustments.slice(0, 10) // Top 10 ajustes recientes
  };
}

async function getFullClinicalHistory(idPaciente) {
  const [patient, triages, visits, prescriptions, labs] = await Promise.all([
    pool.query("SELECT * FROM pacientes WHERE id_paciente = $1", [idPaciente]),
    pool.query("SELECT * FROM triajes WHERE id_paciente = $1 ORDER BY fecha_triaje DESC LIMIT 5", [idPaciente]),
    pool.query("SELECT * FROM visitas_medicas WHERE id_paciente = $1 ORDER BY fecha_visita DESC LIMIT 10", [idPaciente]),
    pool.query(`
      SELECT pr.*, v.fecha_visita
      FROM prescripciones pr
      JOIN visitas_medicas v ON pr.id_visita = v.id_visita
      WHERE v.id_paciente = $1
      ORDER BY v.fecha_visita DESC LIMIT 20`, [idPaciente]),
    pool.query(`
      SELECT orl.*, rl.resultado, rl.fecha_resultado
      FROM ordenes_laboratorio orl
      LEFT JOIN resultados_laboratorio rl ON orl.id_orden = rl.id_orden
      WHERE orl.id_paciente = $1
      ORDER BY orl.created_at DESC LIMIT 10`, [idPaciente])
  ]);

  const patientData = patient.rows[0];
  if (!patientData) throw new Error("Paciente no encontrado");

  // Consolidar alertas de alergias de todas las fuentes
  const allAllergies = [
    ...triages.rows.map(t => t.alergias_referidas),
    ...visits.rows.map(v => v.antecedentes_alergicos)
  ].filter(Boolean).join("; ");

  return {
    patient: patientData,
    currentTriage: triages.rows[0] || null,
    history: {
      triages: triages.rows,
      visits: visits.rows,
      prescriptions: prescriptions.rows,
      labs: labs.rows
    },
    alerts: {
      hasAllergies: !!allAllergies,
      allergies: allAllergies
    }
  };
}

module.exports = {
  calculatePriority,
  calcularPrioridadDesdeEntrada,
  calcularPrioridadParaPaciente,
  aplicarPrioridadACita,
  recalcularCitasAbiertas,
  getColaPriorizada,
  getIndicadores,
  getTriageConcordance,
  getFullClinicalHistory,
};

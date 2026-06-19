const pool = require("../../config/db");
const {
  getTrimmedString,
  getOptionalString,
  getOptionalId,
  parsePagination,
  buildPaginatedResponse,
} = require("../../utils/validators");
const { calcularPrioridadParaPaciente } = require("../analisis/analisis.service");

function optionalInteger(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function optionalDecimal(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitize(body) {
  return {
    id_cita: getOptionalId(body.id_cita),
    motivo_consulta: getTrimmedString(body.motivo_consulta),
    historia_enfermedad_actual: getOptionalString(body.historia_enfermedad_actual),
    antecedentes_relevantes: getOptionalString(body.antecedentes_relevantes),
    alergias_referidas: getOptionalString(body.alergias_referidas),
    presion_arterial: getOptionalString(body.presion_arterial),
    frecuencia_cardiaca: optionalInteger(body.frecuencia_cardiaca),
    frecuencia_respiratoria: optionalInteger(body.frecuencia_respiratoria),
    temperatura: optionalDecimal(body.temperatura),
    saturacion_oxigeno: optionalInteger(body.saturacion_oxigeno),
    peso: optionalDecimal(body.peso),
    observaciones: getOptionalString(body.observaciones),
  };
}

function validate(triaje, res) {
  if (!triaje.id_cita || !triaje.motivo_consulta) {
    res.status(400).json({ message: "La cita y el motivo de consulta son obligatorios." });
    return false;
  }
  if (triaje.saturacion_oxigeno !== null && (triaje.saturacion_oxigeno < 0 || triaje.saturacion_oxigeno > 100)) {
    res.status(400).json({ message: "La saturacion de oxigeno debe estar entre 0 y 100." });
    return false;
  }
  if (triaje.temperatura !== null && (triaje.temperatura < 25 || triaje.temperatura > 45)) {
    res.status(400).json({ message: "La temperatura registrada no es valida." });
    return false;
  }
  return true;
}

const TRIAGE_SELECT = `
  SELECT
    t.*,
    c.fecha_hora, c.estado AS cita_estado, c.id_medico,
    p.nombre AS paciente_nombre, p.dni AS paciente_dni,
    p.telefono AS paciente_telefono, p.fecha_nacimiento,
    p.sexo, p.residencia,
    m.nombre AS medico_nombre, m.especialidad AS medico_especialidad
  FROM triajes t
  INNER JOIN citas c ON c.id_cita = t.id_cita
  INNER JOIN pacientes p ON p.id_paciente = t.id_paciente
  LEFT JOIN medicos m ON m.id_medico = c.id_medico
`;

async function getAll(query) {
  const { page, limit, offset } = parsePagination(query);
  const search = getTrimmedString(query.q);
  const params = [];
  let where = "";

  if (search) {
    params.push(`%${search}%`);
    where = `WHERE p.nombre ILIKE $1 OR p.dni ILIKE $1
             OR COALESCE(t.motivo_consulta, '') ILIKE $1`;
  }

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `${TRIAGE_SELECT} ${where}
       ORDER BY t.puntaje_prioridad DESC, t.fecha_triaje DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM triajes t
       INNER JOIN pacientes p ON p.id_paciente = t.id_paciente
       ${where}`,
      params
    ),
  ]);

  return buildPaginatedResponse(dataResult.rows, countResult.rows[0].total, page, limit);
}

async function getByAppointment(idCita, queryRunner = pool) {
  const result = await queryRunner.query(`${TRIAGE_SELECT} WHERE t.id_cita = $1`, [idCita]);
  return result.rows[0] || null;
}

async function upsert(body) {
  const triaje = sanitize(body);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const appointmentResult = await client.query(
      "SELECT id_cita, id_paciente, estado FROM citas WHERE id_cita = $1",
      [triaje.id_cita]
    );
    const appointment = appointmentResult.rows[0];
    if (!appointment) {
      throw Object.assign(new Error("Cita no encontrada."), { status: 404 });
    }
    if (appointment.estado === "cancelada" || appointment.estado === "completada") {
      throw Object.assign(new Error("No se puede registrar triaje para una cita cerrada."), { status: 400 });
    }

    const prioridad = await calcularPrioridadParaPaciente(
      appointment.id_paciente,
      triaje,
      client
    );

    await client.query(
      `INSERT INTO triajes (
         id_cita,id_paciente,fecha_triaje,motivo_consulta,historia_enfermedad_actual,
         antecedentes_relevantes,alergias_referidas,presion_arterial,
         frecuencia_cardiaca,frecuencia_respiratoria,temperatura,
         saturacion_oxigeno,peso,observaciones,prioridad_clinica,
         puntaje_prioridad,motivos_prioridad,created_at,updated_at
       )
       VALUES ($1,$2,NOW(),$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
       ON CONFLICT (id_cita) DO UPDATE SET
         fecha_triaje=NOW(),motivo_consulta=EXCLUDED.motivo_consulta,
         historia_enfermedad_actual=EXCLUDED.historia_enfermedad_actual,
         antecedentes_relevantes=EXCLUDED.antecedentes_relevantes,
         alergias_referidas=EXCLUDED.alergias_referidas,
         presion_arterial=EXCLUDED.presion_arterial,
         frecuencia_cardiaca=EXCLUDED.frecuencia_cardiaca,
         frecuencia_respiratoria=EXCLUDED.frecuencia_respiratoria,
         temperatura=EXCLUDED.temperatura,
         saturacion_oxigeno=EXCLUDED.saturacion_oxigeno,
         peso=EXCLUDED.peso,observaciones=EXCLUDED.observaciones,
         prioridad_clinica=EXCLUDED.prioridad_clinica,
         puntaje_prioridad=EXCLUDED.puntaje_prioridad,
         motivos_prioridad=EXCLUDED.motivos_prioridad,updated_at=NOW()`,
      [
        triaje.id_cita, appointment.id_paciente, triaje.motivo_consulta,
        triaje.historia_enfermedad_actual, triaje.antecedentes_relevantes,
        triaje.alergias_referidas, triaje.presion_arterial,
        triaje.frecuencia_cardiaca, triaje.frecuencia_respiratoria,
        triaje.temperatura, triaje.saturacion_oxigeno, triaje.peso,
        triaje.observaciones, prioridad.prioridad_clinica,
        prioridad.puntaje_prioridad, prioridad.motivos_prioridad,
      ]
    );

    await client.query(
      `UPDATE citas SET
         triaje_notas=$2,
         prioridad_clinica=$3,
         puntaje_prioridad=$4,
         motivos_prioridad=$5,
         hora_llegada=COALESCE(hora_llegada, NOW())
       WHERE id_cita=$1`,
      [
        triaje.id_cita,
        triaje.observaciones || triaje.historia_enfermedad_actual,
        prioridad.prioridad_clinica,
        prioridad.puntaje_prioridad,
        prioridad.motivos_prioridad,
      ]
    );

    await client.query("COMMIT");
    return getByAppointment(triaje.id_cita);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { sanitize, validate, getAll, getByAppointment, upsert };

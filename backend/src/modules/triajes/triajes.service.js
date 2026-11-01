// Evaluación de Enfermería, propuesta P1–P4, validación profesional y cola médica.
//
// Flujo:
//   Recepción (check-in) → Evaluación de Enfermería (signos vitales, TEWS y SATS)
//   → Motor de priorización (propuesta P1–P4 cuando corresponde)
//   → Validación profesional (confirma o modifica con justificación)
//   → Cola médica (orden por prioridad validada y hora de ingreso)
//   → Consulta médica.
const pool = require("../../config/db");
const {
  getTrimmedString,
  getOptionalString,
  getOptionalId,
  parsePagination,
  buildPaginatedResponse,
} = require("../../utils/validators");
const { parseNumber, validateVitals, buildEvidence } = require("./calidadDatos");
const sats = require("./evaluacionSats");
const { VALIDATION_CASES } = require("../../engines/priorityValidationCases");
const { runValidationCase } = require("../../engines/runValidationCase");
const { getRuleset } = require("../../engines/priorityRules.config");

function httpError(message, status, extra = {}) {
  return Object.assign(new Error(message), { status, ...extra });
}

function optionalInteger(value) {
  if (value === undefined || value === null || value === "") return null;
  return parseNumber(value, true);
}

function optionalDecimal(value) {
  if (value === undefined || value === null || value === "") return null;
  return parseNumber(value);
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
    glucometria: optionalDecimal(body.glucometria),
    observaciones: getOptionalString(body.observaciones),
  };
}

function validate(triaje, res) {
  const vitalError = validateVitals(triaje);
  if (vitalError) {
    res.status(400).json({ message: vitalError });
    return false;
  }
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
  if (triaje.glucometria !== null && !(Number.isFinite(triaje.glucometria) && triaje.glucometria >= 10 && triaje.glucometria <= 1000)) {
    res.status(400).json({ message: "La glucometría debe estar entre 10 y 1000 mg/dL." });
    return false;
  }
  return true;
}

// Lanza en lugar de responder: se usa dentro del servicio.
function assertValid(triaje) {
  validate(triaje, {
    status(status) {
      return {
        json(result) {
          throw httpError(result.message, status);
        },
      };
    },
  });
}

const TRIAGE_SELECT = `
  SELECT
    t.*,
    c.fecha_hora, c.estado AS cita_estado, c.id_medico, c.hora_llegada,
    c.hora_inicio_atencion, c.hora_fin_atencion,
    p.nombre AS paciente_nombre, p.dni AS paciente_dni,
    p.telefono AS paciente_telefono, p.fecha_nacimiento,
    p.sexo, p.residencia,
    m.nombre AS medico_nombre, m.especialidad AS medico_especialidad,
    ur.nombre AS usuario_registro_nombre,
    uv.nombre AS usuario_validacion_nombre
  FROM triajes t
  INNER JOIN citas c ON c.id_cita = t.id_cita
  INNER JOIN pacientes p ON p.id_paciente = t.id_paciente
  LEFT JOIN medicos m ON m.id_medico = c.id_medico
  LEFT JOIN usuarios ur ON ur.id_usuario = t.id_usuario_registro
  LEFT JOIN usuarios uv ON uv.id_usuario = t.id_usuario_validacion
`;

function decorate(row) {
  if (!row) return null;
  return {
    ...row,
    revision_discriminadores: sats.readJson(row.revision_discriminadores, null),
    datos_no_obtenibles: sats.readJson(row.datos_no_obtenibles, {}),
    clasificacion_sats: sats.readJson(row.clasificacion_sats, null),
    propuesta: sats.readJson(row.propuesta, null),
    evidencia_priorizacion: buildEvidence(row),
  };
}

async function getAll(query) {
  const { page, limit, offset } = parsePagination(query);
  const search = getTrimmedString(query.q);
  const params = [];
  const where = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(p.nombre ILIKE $${params.length} OR p.dni ILIKE $${params.length}
             OR COALESCE(t.motivo_consulta, '') ILIKE $${params.length})`);
  }
  const estado = getTrimmedString(query.estado_prioridad);
  if (estado === "propuesto" || estado === "validado") {
    params.push(estado);
    where.push(`t.estado_prioridad = $${params.length}`);
  }
  if (query.abiertas === "1") {
    where.push(`c.estado IN ('pendiente', 'confirmada', 'en_curso')`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `${TRIAGE_SELECT} ${whereSql}
       ORDER BY
         CASE COALESCE(t.prioridad_final, t.nivel_propuesto)
           WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 WHEN 'P4' THEN 4 ELSE 0
         END,
         t.fecha_triaje ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM triajes t
       INNER JOIN citas c ON c.id_cita = t.id_cita
       INNER JOIN pacientes p ON p.id_paciente = t.id_paciente
       ${whereSql}`,
      params
    ),
  ]);

  return buildPaginatedResponse(dataResult.rows.map(decorate), countResult.rows[0].total, page, limit);
}

async function getByAppointment(idCita, queryRunner = pool) {
  const result = await queryRunner.query(`${TRIAGE_SELECT} WHERE t.id_cita = $1`, [idCita]);
  return decorate(result.rows[0]);
}

async function logHistory(queryRunner, { idTriaje, idUsuario, accion, datos }) {
  await queryRunner.query(
    `INSERT INTO triajes_historial (id_triaje, id_usuario, accion, datos)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [idTriaje, idUsuario || null, accion, JSON.stringify(datos || {})]
  );
}

// Vista previa: evalúa sin guardar ni tocar la cola.
async function preview(body) {
  const triaje = sanitize(body);
  const vitalError = validateVitals(triaje);
  if (vitalError) throw httpError(vitalError, 400);
  const satsData = sats.sanitizeSats(body);

  let fechaNacimiento = body.fecha_nacimiento || null;
  if (triaje.id_cita) {
    const result = await pool.query(
      `SELECT p.fecha_nacimiento
       FROM citas c JOIN pacientes p ON p.id_paciente = c.id_paciente
       WHERE c.id_cita = $1`,
      [triaje.id_cita]
    );
    if (!result.rows[0]) throw httpError("Cita no encontrada.", 404);
    fechaNacimiento = result.rows[0].fecha_nacimiento;
  }

  const evaluation = sats.evaluate({ triaje, sats: satsData, fechaNacimiento });
  return {
    edad: evaluation.edad,
    clasificacion_sats: evaluation.structured,
    propuesta: evaluation.proposal,
    revision: evaluation.summary,
    evidencia_priorizacion: buildEvidence(triaje),
    guardado: false,
  };
}

async function upsert(body, usuario = null) {
  const vitalError = validateVitals(body);
  if (vitalError) throw httpError(vitalError, 400);
  const triaje = sanitize(body);
  assertValid(triaje);
  const satsData = sats.sanitizeSats(body);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const appointmentResult = await client.query(
      `SELECT c.id_cita, c.id_paciente, c.estado, c.hora_inicio_atencion, p.fecha_nacimiento
       FROM citas c JOIN pacientes p ON p.id_paciente = c.id_paciente
       WHERE c.id_cita = $1
       FOR UPDATE OF c`,
      [triaje.id_cita]
    );
    const appointment = appointmentResult.rows[0];
    if (!appointment) throw httpError("Cita no encontrada.", 404);
    if (appointment.estado === "cancelada" || appointment.estado === "completada") {
      throw httpError("No se puede registrar triaje para una cita cerrada.", 400);
    }
    if (appointment.hora_inicio_atencion) {
      throw httpError("La consulta médica ya inició; la evaluación de Enfermería no puede modificarse.", 409);
    }

    const existing = await client.query("SELECT id_triaje, estado_prioridad FROM triajes WHERE id_cita = $1", [triaje.id_cita]);
    const wasValidated = existing.rows[0]?.estado_prioridad === "validado";

    const evaluation = sats.evaluate({ triaje, sats: satsData, fechaNacimiento: appointment.fecha_nacimiento });
    const cols = sats.toColumns(evaluation);
    const idUsuario = usuario?.id_usuario || null;

    // Cualquier cambio en la evaluación anula la validación previa: la nueva
    // propuesta debe volver a confirmarse antes de ingresar a la cola.
    const saved = await client.query(
      `INSERT INTO triajes (
         id_cita, id_paciente, fecha_triaje, motivo_consulta, historia_enfermedad_actual,
         antecedentes_relevantes, alergias_referidas, presion_arterial,
         frecuencia_cardiaca, frecuencia_respiratoria, temperatura,
         saturacion_oxigeno, peso, glucometria, observaciones,
         movilidad, estado_conciencia, trauma, edad_evaluacion,
         revision_discriminadores, datos_no_obtenibles, version_catalogo, revision_completa,
         clasificacion_sats, propuesta, estado_propuesta, nivel_propuesto,
         nivel_maximo_posible, version_reglas, requiere_justificacion,
         prioridad_clinica, puntaje_prioridad, motivos_prioridad, estado_prioridad,
         id_usuario_registro, id_usuario_actualizacion, created_at, updated_at
       )
       VALUES (
         $1,$2,NOW(),$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
         $15,$16,$17,$18,$19::jsonb,$20::jsonb,$21,$22,$23::jsonb,$24::jsonb,$25,$26,
         $27,$28,$29,$30,$31,$32,'propuesto',$33,$33,NOW(),NOW()
       )
       ON CONFLICT (id_cita) DO UPDATE SET
         fecha_triaje=NOW(),
         motivo_consulta=EXCLUDED.motivo_consulta,
         historia_enfermedad_actual=EXCLUDED.historia_enfermedad_actual,
         antecedentes_relevantes=EXCLUDED.antecedentes_relevantes,
         alergias_referidas=EXCLUDED.alergias_referidas,
         presion_arterial=EXCLUDED.presion_arterial,
         frecuencia_cardiaca=EXCLUDED.frecuencia_cardiaca,
         frecuencia_respiratoria=EXCLUDED.frecuencia_respiratoria,
         temperatura=EXCLUDED.temperatura,
         saturacion_oxigeno=EXCLUDED.saturacion_oxigeno,
         peso=EXCLUDED.peso,
         glucometria=EXCLUDED.glucometria,
         observaciones=EXCLUDED.observaciones,
         movilidad=EXCLUDED.movilidad,
         estado_conciencia=EXCLUDED.estado_conciencia,
         trauma=EXCLUDED.trauma,
         edad_evaluacion=EXCLUDED.edad_evaluacion,
         revision_discriminadores=EXCLUDED.revision_discriminadores,
         datos_no_obtenibles=EXCLUDED.datos_no_obtenibles,
         version_catalogo=EXCLUDED.version_catalogo,
         revision_completa=EXCLUDED.revision_completa,
         clasificacion_sats=EXCLUDED.clasificacion_sats,
         propuesta=EXCLUDED.propuesta,
         estado_propuesta=EXCLUDED.estado_propuesta,
         nivel_propuesto=EXCLUDED.nivel_propuesto,
         nivel_maximo_posible=EXCLUDED.nivel_maximo_posible,
         version_reglas=EXCLUDED.version_reglas,
         requiere_justificacion=EXCLUDED.requiere_justificacion,
         prioridad_clinica=EXCLUDED.prioridad_clinica,
         puntaje_prioridad=EXCLUDED.puntaje_prioridad,
         motivos_prioridad=EXCLUDED.motivos_prioridad,
         estado_prioridad='propuesto',
         prioridad_final=NULL,
         origen_clasificacion=NULL,
         motivo_confirmacion=NULL,
         id_usuario_validacion=NULL,
         fecha_validacion=NULL,
         llamado_at=NULL,
         llamados=0,
         id_usuario_actualizacion=EXCLUDED.id_usuario_actualizacion,
         updated_at=NOW()
       RETURNING id_triaje, (xmax = 0) AS insertado`,
      [
        triaje.id_cita, appointment.id_paciente, triaje.motivo_consulta,
        triaje.historia_enfermedad_actual, triaje.antecedentes_relevantes,
        triaje.alergias_referidas, triaje.presion_arterial,
        triaje.frecuencia_cardiaca, triaje.frecuencia_respiratoria,
        triaje.temperatura, triaje.saturacion_oxigeno, triaje.peso, triaje.glucometria,
        triaje.observaciones,
        satsData.movilidad, satsData.estado_conciencia, satsData.trauma, cols.edad_evaluacion,
        JSON.stringify(satsData.revision_discriminadores), JSON.stringify(satsData.datos_no_obtenibles),
        cols.version_catalogo, cols.revision_completa,
        JSON.stringify(cols.clasificacion_sats), JSON.stringify(cols.propuesta),
        cols.estado_propuesta, cols.nivel_propuesto, cols.nivel_maximo_posible,
        cols.version_reglas, cols.requiere_justificacion,
        cols.prioridad_clinica, cols.puntaje_prioridad, cols.motivos_prioridad,
        idUsuario,
      ]
    );

    const { id_triaje: idTriaje, insertado } = saved.rows[0];

    // La cita refleja el estado del flujo: aún no hay prioridad validada.
    await client.query(
      `UPDATE citas SET
         triaje_notas=$2,
         prioridad_clinica=$3,
         puntaje_prioridad=$4,
         motivos_prioridad=$5,
         hora_llegada=COALESCE(hora_llegada, NOW()),
         estado=CASE WHEN estado = 'pendiente' THEN 'confirmada' ELSE estado END
       WHERE id_cita=$1`,
      [
        triaje.id_cita,
        triaje.observaciones || triaje.historia_enfermedad_actual,
        cols.prioridad_clinica,
        cols.puntaje_prioridad,
        cols.motivos_prioridad,
      ]
    );

    await logHistory(client, {
      idTriaje,
      idUsuario,
      accion: insertado ? "REGISTRO" : "ACTUALIZACION",
      datos: {
        estado_propuesta: cols.estado_propuesta,
        nivel_propuesto: cols.nivel_propuesto,
        nivel_maximo_posible: cols.nivel_maximo_posible,
        revision_completa: cols.revision_completa,
        validacion_anulada: wasValidated,
        version_reglas: cols.version_reglas,
      },
    });

    await client.query("COMMIT");
    return getByAppointment(triaje.id_cita);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// VALIDACIÓN PROFESIONAL
//
// - Confirmar la propuesta: solo exige justificación si la propuesta es
//   provisional o tiene alertas de inconsistencia.
// - Modificar el nivel propuesto: exige justificación.
// - Sin propuesta: clasificación MANUAL, siempre justificada.
async function validarPrioridad(body, usuario) {
  const idCita = getOptionalId(body.id_cita);
  const prioridadFinal = getTrimmedString(body.prioridad_final).toUpperCase();
  const justificacion = getTrimmedString(body.justificacion);

  if (!idCita) throw httpError("Indica la cita a validar.", 400);
  if (!sats.LEVELS.includes(prioridadFinal)) throw httpError("La prioridad final debe ser P1, P2, P3 o P4.", 400);
  if (justificacion.length > 1000) throw httpError("La justificación no puede superar 1000 caracteres.", 400);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT id_cita FROM citas WHERE id_cita=$1 FOR UPDATE", [idCita]);
    const result = await client.query(
      `SELECT t.id_triaje, t.estado_prioridad, t.estado_propuesta, t.nivel_propuesto,
              t.nivel_maximo_posible, t.requiere_justificacion,
              c.estado AS cita_estado, c.hora_inicio_atencion
       FROM triajes t JOIN citas c ON c.id_cita = t.id_cita
       WHERE t.id_cita = $1
       FOR UPDATE OF t, c`,
      [idCita]
    );
    const row = result.rows[0];
    if (!row) throw httpError("La cita no tiene evaluación de Enfermería registrada.", 409);
    if (["cancelada", "completada"].includes(row.cita_estado)) throw httpError("La cita está cerrada.", 409);
    if (row.hora_inicio_atencion) throw httpError("La consulta ya inició; la prioridad no puede cambiarse.", 409);
    if (row.estado_prioridad === "validado") {
      throw httpError("La prioridad ya fue validada. Si la evaluación cambia, Enfermería debe actualizarla y volverá a requerir validación.", 409);
    }

    const hasProposal = Boolean(row.nivel_propuesto) && row.estado_propuesta !== "SIN_PROPUESTA";
    const origen = hasProposal ? "AUTOMATICA" : "MANUAL";
    const modificada = hasProposal && prioridadFinal !== row.nivel_propuesto;

    const motivos = [];
    if (!hasProposal) motivos.push("el motor no generó propuesta y la clasificación es manual");
    if (modificada) motivos.push(`se modifica la propuesta ${row.nivel_propuesto} a ${prioridadFinal}`);
    if (hasProposal && row.requiere_justificacion) motivos.push("la propuesta es provisional o tiene alertas de inconsistencia");

    if (motivos.length > 0 && justificacion.length < 10) {
      throw httpError(`Escribe una justificación clínica (mínimo 10 caracteres): ${motivos.join("; ")}.`, 400);
    }

    await client.query(
      `UPDATE triajes SET
         prioridad_final=$2,
         origen_clasificacion=$3,
         motivo_confirmacion=$4,
         estado_prioridad='validado',
         id_usuario_validacion=$5,
         fecha_validacion=NOW(),
         prioridad_clinica=$6,
         updated_at=NOW()
       WHERE id_triaje=$1`,
      [row.id_triaje, prioridadFinal, origen, justificacion || null, usuario?.id_usuario || null, sats.LEGACY_PRIORITY[prioridadFinal]]
    );
    await client.query(
      `UPDATE citas SET prioridad_clinica=$2,
         motivos_prioridad=$3
       WHERE id_cita=$1`,
      [
        idCita,
        sats.LEGACY_PRIORITY[prioridadFinal],
        `${prioridadFinal} validada (${origen === "MANUAL" ? "clasificación manual" : modificada ? `modificada desde ${row.nivel_propuesto}` : "propuesta confirmada"}).${justificacion ? ` ${justificacion}` : ""}`,
      ]
    );
    await logHistory(client, {
      idTriaje: row.id_triaje,
      idUsuario: usuario?.id_usuario,
      accion: "VALIDACION",
      datos: {
        nivel_propuesto: row.nivel_propuesto,
        prioridad_final: prioridadFinal,
        origen,
        modificada,
        justificacion: justificacion || null,
      },
    });
    await client.query("COMMIT");
    return getByAppointment(idCita);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// COLA MÉDICA: pacientes con prioridad validada, ordenados por nivel y hora de
// ingreso a la cola (validación). EN_ESPERA → LLAMADO → EN_ATENCION.
async function getCola() {
  const result = await pool.query(
    `SELECT
       t.id_triaje, t.id_cita, t.id_paciente, t.prioridad_final, t.origen_clasificacion,
       t.nivel_propuesto, t.fecha_validacion AS ingreso_cola, t.llamado_at, t.llamados,
       t.motivo_consulta, t.fecha_triaje,
       c.estado AS cita_estado, c.hora_llegada, c.hora_inicio_atencion, c.id_medico,
       p.nombre AS paciente_nombre, p.dni AS paciente_dni,
       m.nombre AS medico_nombre,
       CASE
         WHEN c.hora_inicio_atencion IS NOT NULL THEN 'EN_ATENCION'
         WHEN t.llamado_at IS NOT NULL THEN 'LLAMADO'
         ELSE 'EN_ESPERA'
       END AS estado_cola,
       GREATEST(0, ROUND(EXTRACT(EPOCH FROM (COALESCE(c.hora_inicio_atencion, NOW()) - t.fecha_validacion)) / 60))::int AS minutos_en_cola,
       GREATEST(0, ROUND(EXTRACT(EPOCH FROM (COALESCE(c.hora_inicio_atencion, NOW()) - COALESCE(c.hora_llegada, t.created_at))) / 60))::int AS minutos_desde_llegada
     FROM triajes t
     JOIN citas c ON c.id_cita = t.id_cita
     JOIN pacientes p ON p.id_paciente = t.id_paciente
     LEFT JOIN medicos m ON m.id_medico = c.id_medico
     WHERE t.estado_prioridad = 'validado'
       AND c.estado NOT IN ('completada', 'cancelada')
     ORDER BY
       CASE WHEN c.hora_inicio_atencion IS NOT NULL THEN 1 ELSE 0 END,
       CASE t.prioridad_final WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END,
       t.fecha_validacion ASC,
       t.id_triaje ASC`
  );

  let position = 0;
  return result.rows.map((row) => {
    const objetivo = sats.LEVEL_DETAILS[row.prioridad_final]?.objetivo_minutos ?? null;
    const enEspera = row.estado_cola !== "EN_ATENCION";
    if (enEspera) position += 1;
    return {
      ...row,
      posicion: enEspera ? position : null,
      objetivo_minutos: objetivo,
      objetivo: sats.LEVEL_DETAILS[row.prioridad_final]?.objetivo ?? null,
      fuera_de_objetivo: enEspera && objetivo !== null && row.minutos_en_cola > objetivo,
    };
  });
}

async function lockQueueEntry(client, idCita) {
  await client.query("SELECT id_cita FROM citas WHERE id_cita=$1 FOR UPDATE", [idCita]);
  const result = await client.query(
    `SELECT t.id_triaje, t.estado_prioridad, t.llamado_at, c.estado AS cita_estado, c.hora_inicio_atencion
     FROM triajes t JOIN citas c ON c.id_cita = t.id_cita
     WHERE t.id_cita = $1
     FOR UPDATE OF t, c`,
    [idCita]
  );
  const row = result.rows[0];
  if (!row || row.estado_prioridad !== "validado") {
    throw httpError("El paciente no está en la cola médica: su prioridad aún no fue validada.", 409);
  }
  if (["completada", "cancelada"].includes(row.cita_estado)) throw httpError("La cita está cerrada.", 409);
  return row;
}

async function llamarPaciente(idCita, usuario) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = await lockQueueEntry(client, idCita);
    if (row.hora_inicio_atencion) throw httpError("El paciente ya está en atención.", 409);
    await client.query(
      `UPDATE triajes SET llamado_at=NOW(), llamados=llamados+1, updated_at=NOW() WHERE id_triaje=$1`,
      [row.id_triaje]
    );
    await logHistory(client, { idTriaje: row.id_triaje, idUsuario: usuario?.id_usuario, accion: "LLAMADO", datos: {} });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return (await getCola()).find((item) => item.id_cita === idCita) || null;
}

async function iniciarAtencion(idCita, usuario) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const row = await lockQueueEntry(client, idCita);
    if (!row.hora_inicio_atencion) {
      await client.query(
        `UPDATE citas SET estado='en_curso',
           hora_llegada=COALESCE(hora_llegada, NOW()),
           hora_inicio_atencion=NOW()
         WHERE id_cita=$1`,
        [idCita]
      );
      await logHistory(client, { idTriaje: row.id_triaje, idUsuario: usuario?.id_usuario, accion: "INICIO_ATENCION", datos: {} });
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return { id_cita: idCita, estado: "en_curso" };
}

async function getHistorial(idCita) {
  const result = await pool.query(
    `SELECT h.id_historial, h.accion, h.datos, h.registrado_en, u.nombre AS usuario
     FROM triajes_historial h
     JOIN triajes t ON t.id_triaje = h.id_triaje
     LEFT JOIN usuarios u ON u.id_usuario = h.id_usuario
     WHERE t.id_cita = $1
     ORDER BY h.id_historial DESC
     LIMIT 100`,
    [idCita]
  );
  return result.rows;
}

// REGLAS P1–P4: conjunto versionado, batería de validación y aprobación médica.
function runValidationBattery() {
  const casos = VALIDATION_CASES.map((validationCase) => {
    const result = runValidationCase(validationCase);
    const expected = validationCase.esperado;
    const correcto =
      result.estado === expected.estado &&
      result.nivel_propuesto === expected.nivel &&
      (expected.maximo === undefined || result.nivel_maximo_posible === expected.maximo);
    return {
      id: validationCase.id,
      titulo: validationCase.titulo,
      esperado: { estado: expected.estado, nivel: expected.nivel },
      obtenido: {
        estado: result.estado,
        nivel: result.nivel_propuesto,
        nivel_maximo_posible: result.nivel_maximo_posible,
        reglas: result.reglas_cumplidas.map((r) => r.codigo),
        alertas: result.alertas.map((a) => a.codigo),
      },
      correcto,
    };
  });
  const correctos = casos.filter((c) => c.correcto).length;
  return {
    version_reglas: sats.RULESET_VERSION,
    total: casos.length,
    correctos,
    todos_correctos: correctos === casos.length,
    casos,
  };
}

async function getReglas() {
  const approvals = await pool.query(
    `SELECT a.id_aprobacion, a.version_reglas, a.decision, a.observaciones,
            a.casos_validados, a.casos_correctos, a.registrado_en, u.nombre AS usuario
     FROM aprobacion_reglas_prioridad a
     LEFT JOIN usuarios u ON u.id_usuario = a.id_usuario
     WHERE a.version_reglas = $1
     ORDER BY a.id_aprobacion DESC
     LIMIT 50`,
    [sats.RULESET_VERSION]
  );
  return {
    ...getRuleset(),
    catalogo: sats.getCatalog(),
    validacion: runValidationBattery(),
    aprobacion: {
      estado: approvals.rows[0]?.decision ?? "PENDIENTE_APROBACION_MEDICA",
      ultima: approvals.rows[0] ?? null,
    },
    historial_aprobaciones: approvals.rows,
  };
}

async function registrarAprobacion(body, usuario) {
  const decision = getTrimmedString(body.decision).toUpperCase();
  const observaciones = getTrimmedString(body.observaciones);
  if (!["APROBADA", "OBSERVADA"].includes(decision)) throw httpError("La decisión debe ser APROBADA u OBSERVADA.", 400);
  if (observaciones.length > 2000) throw httpError("Las observaciones no pueden superar 2000 caracteres.", 400);
  if (decision === "OBSERVADA" && observaciones.length < 10) {
    throw httpError("Describe las observaciones (mínimo 10 caracteres).", 400);
  }
  const battery = runValidationBattery();
  if (decision === "APROBADA" && !battery.todos_correctos) {
    throw httpError("No se puede aprobar: la batería de validación tiene casos con resultado distinto al esperado.", 409);
  }
  const result = await pool.query(
    `INSERT INTO aprobacion_reglas_prioridad
       (version_reglas, decision, observaciones, casos_validados, casos_correctos, id_usuario)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [sats.RULESET_VERSION, decision, observaciones || null, battery.total, battery.correctos, usuario.id_usuario]
  );
  return result.rows[0];
}

// Recalcula con el motor vigente las evaluaciones abiertas que aún no fueron
// validadas (por ejemplo, las registradas antes del registro SATS). No toca
// las prioridades ya validadas.
async function reevaluarPendientes() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const candidates = await client.query(`SELECT t.id_cita FROM triajes t
      JOIN citas c ON c.id_cita=t.id_cita
      WHERE t.estado_prioridad='propuesto' AND c.estado IN ('pendiente','confirmada')
        AND c.hora_inicio_atencion IS NULL ORDER BY c.id_cita`);
    let total = 0;
    for (const candidate of candidates.rows) {
      await client.query("SELECT id_cita FROM citas WHERE id_cita=$1 FOR UPDATE", [candidate.id_cita]);
      const current = await client.query(`SELECT t.*, p.fecha_nacimiento FROM triajes t
        JOIN citas c ON c.id_cita=t.id_cita JOIN pacientes p ON p.id_paciente=t.id_paciente
        WHERE t.id_cita=$1 AND t.estado_prioridad='propuesto'
          AND c.estado IN ('pendiente','confirmada') AND c.hora_inicio_atencion IS NULL
        FOR UPDATE OF t`, [candidate.id_cita]);
      const row = current.rows[0];
      if (!row) continue;
      const satsData = {
        movilidad: row.movilidad,
        estado_conciencia: row.estado_conciencia,
        trauma: row.trauma,
        revision_discriminadores: sats.sanitizeSats({ revision_discriminadores: sats.readJson(row.revision_discriminadores, {}) || {} }).revision_discriminadores,
        datos_no_obtenibles: sats.readJson(row.datos_no_obtenibles, {}) || {},
      };
      const evaluation = sats.evaluate({ triaje: row, sats: satsData, fechaNacimiento: row.fecha_nacimiento });
      const cols = sats.toColumns(evaluation);
      await client.query(
        `UPDATE triajes SET
           edad_evaluacion=$2, version_catalogo=$3, revision_completa=$4,
           clasificacion_sats=$5::jsonb, propuesta=$6::jsonb, estado_propuesta=$7,
           nivel_propuesto=$8, nivel_maximo_posible=$9, version_reglas=$10,
           requiere_justificacion=$11, prioridad_clinica=$12, puntaje_prioridad=$13,
           motivos_prioridad=$14, revision_discriminadores=COALESCE(revision_discriminadores, $15::jsonb),
           updated_at=NOW()
         WHERE id_triaje=$1 AND estado_prioridad='propuesto'`,
        [
          row.id_triaje, cols.edad_evaluacion, cols.version_catalogo, cols.revision_completa,
          JSON.stringify(cols.clasificacion_sats), JSON.stringify(cols.propuesta), cols.estado_propuesta,
          cols.nivel_propuesto, cols.nivel_maximo_posible, cols.version_reglas,
          cols.requiere_justificacion, cols.prioridad_clinica, cols.puntaje_prioridad,
          cols.motivos_prioridad, JSON.stringify(satsData.revision_discriminadores),
        ]
      );
      await client.query(
        `UPDATE citas SET prioridad_clinica=$2, puntaje_prioridad=$3, motivos_prioridad=$4 WHERE id_cita=$1`,
        [row.id_cita, cols.prioridad_clinica, cols.puntaje_prioridad, cols.motivos_prioridad]
      );
      total += 1;
    }
    await client.query("COMMIT");
    return { total_recalculadas: total };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function getStats() {
  const priorityDist = await pool.query(
    `SELECT COALESCE(prioridad_final, 'SIN_VALIDAR') AS prioridad, COUNT(*)::int AS total
     FROM triajes
     GROUP BY 1`
  );
  return { distribution: priorityDist.rows };
}

module.exports = {
  sanitize,
  validate,
  getAll,
  getByAppointment,
  preview,
  upsert,
  validarPrioridad,
  getCola,
  llamarPaciente,
  iniciarAtencion,
  getHistorial,
  getReglas,
  registrarAprobacion,
  runValidationBattery,
  reevaluarPendientes,
  getStats,
};

const pool = require("../../config/db");
const {
  getTrimmedString, getOptionalString, getOptionalId,
  isValidDateTime, parseMoney, parsePagination, buildPaginatedResponse,
} = require("../../utils/validators");
const { VISITA_SELECT } = require("../../utils/queries");
const { upsertChargeForRecord } = require("../../utils/cargosService");

function sanitize(body) {
  const optionalInteger = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : null;
  };
  const optionalDecimal = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    id_cita: getOptionalId(body.id_cita),
    id_paciente: getOptionalId(body.id_paciente),
    id_medico: getOptionalId(body.id_medico),
    fecha_visita: getTrimmedString(body.fecha_visita),
    motivo: getTrimmedString(body.motivo),
    historia_enfermedad_actual: getOptionalString(body.historia_enfermedad_actual),
    antecedentes_medicos: getOptionalString(body.antecedentes_medicos),
    antecedentes_quirurgicos: getOptionalString(body.antecedentes_quirurgicos),
    antecedentes_alergicos: getOptionalString(body.antecedentes_alergicos),
    antecedentes_traumaticos: getOptionalString(body.antecedentes_traumaticos),
    antecedentes_ginecologicos: getOptionalString(body.antecedentes_ginecologicos),
    examen_fisico: getOptionalString(body.examen_fisico),
    presion_arterial: getOptionalString(body.presion_arterial),
    frecuencia_cardiaca: optionalInteger(body.frecuencia_cardiaca),
    frecuencia_respiratoria: optionalInteger(body.frecuencia_respiratoria),
    temperatura: optionalDecimal(body.temperatura),
    saturacion_oxigeno: optionalInteger(body.saturacion_oxigeno),
    impresion_clinica: getOptionalString(body.impresion_clinica),
    diagnostico: getTrimmedString(body.diagnostico),
    tratamiento: getOptionalString(body.tratamiento),
    conducta: getOptionalString(body.conducta),
    tipo_atencion: getOptionalString(body.tipo_atencion),
    dieta: getOptionalString(body.dieta),
    soluciones: getOptionalString(body.soluciones),
    ultrasonido: getOptionalString(body.ultrasonido),
    rayos_x: getOptionalString(body.rayos_x),
    ordenes_especiales: getOptionalString(body.ordenes_especiales),
    diagnostico_egreso: getOptionalString(body.diagnostico_egreso),
    fecha_egreso: getOptionalString(body.fecha_egreso),
    observaciones: getOptionalString(body.observaciones),
    costo_consulta: parseMoney(body.costo_consulta),
  };
}

function validate(v, res) {
  if (!v.id_paciente || !v.id_medico || !v.fecha_visita) {
    res.status(400).json({ message: "Paciente, medico y fecha de visita son obligatorios." });
    return false;
  }
  if (!v.motivo || !v.diagnostico) {
    res.status(400).json({ message: "Motivo y diagnostico son obligatorios para la visita." });
    return false;
  }
  if (!isValidDateTime(v.fecha_visita)) {
    res.status(400).json({ message: "La fecha de visita no tiene un formato valido." });
    return false;
  }
  if (v.fecha_egreso && !isValidDateTime(v.fecha_egreso)) {
    res.status(400).json({ message: "La fecha de egreso no tiene un formato valido." });
    return false;
  }
  if (v.saturacion_oxigeno !== null && (v.saturacion_oxigeno < 0 || v.saturacion_oxigeno > 100)) {
    res.status(400).json({ message: "La saturacion de oxigeno debe estar entre 0 y 100." });
    return false;
  }
  if (v.costo_consulta === null) {
    res.status(400).json({ message: "El costo de consulta debe ser un numero valido." });
    return false;
  }
  return true;
}

async function resolvePayload(visita, client) {
  if (!visita.id_cita) return visita;

  const citaResult = await client.query("SELECT * FROM citas WHERE id_cita=$1", [visita.id_cita]);
  const cita = citaResult.rows[0];
  if (!cita) return { _notFound: "cita" };
  if (cita.estado === "cancelada") return { _cancelled: true };
  if ((visita.id_paciente && visita.id_paciente !== cita.id_paciente) ||
      (visita.id_medico && visita.id_medico !== cita.id_medico)) {
    throw Object.assign(new Error("El paciente y el médico deben coincidir con la cita seleccionada."), { status: 400 });
  }

  return {
    ...visita,
    id_paciente: visita.id_paciente || cita.id_paciente,
    id_medico: visita.id_medico || cita.id_medico,
    fecha_visita: visita.fecha_visita || cita.fecha_hora || new Date().toISOString(),
    motivo: visita.motivo || cita.motivo || "Atencion medica",
  };
}

function validateResolved(visita) {
  // Validate after deriving the appointment's patient, doctor, date and motive.
  validate(visita, { status(status) { return { json(body) { throw Object.assign(new Error(body.message), { status }); } }; } });
}

async function getById(id, queryRunner = pool) {
  const result = await queryRunner.query(
    `${VISITA_SELECT} WHERE v.id_visita=$1 GROUP BY v.id_visita,p.id_paciente,m.id_medico,c.id_cita`,
    [id]
  );
  return result.rows[0] || null;
}

async function getAll(query) {
  const { page, limit, offset } = parsePagination(query);
  const search = getTrimmedString(query.q);
  const pacienteId = getOptionalId(query.id_paciente);
  const medicoId = getOptionalId(query.id_medico);
  const citaId = getOptionalId(query.id_cita);
  const params = [];
  const where = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(COALESCE(p.nombre,'') ILIKE $${params.length} OR COALESCE(m.nombre,'') ILIKE $${params.length} OR COALESCE(v.motivo,'') ILIKE $${params.length} OR COALESCE(v.diagnostico,'') ILIKE $${params.length})`);
  }
  if (pacienteId) { params.push(pacienteId); where.push(`v.id_paciente=$${params.length}`); }
  if (medicoId) { params.push(medicoId); where.push(`v.id_medico=$${params.length}`); }
  if (citaId) { params.push(citaId); where.push(`v.id_cita=$${params.length}`); }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `${VISITA_SELECT} ${whereClause}
       GROUP BY v.id_visita,p.id_paciente,m.id_medico,c.id_cita
       ORDER BY v.fecha_visita DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(DISTINCT v.id_visita)::int AS total FROM visitas_medicas v
       LEFT JOIN pacientes p ON p.id_paciente=v.id_paciente
       LEFT JOIN medicos m ON m.id_medico=v.id_medico
       LEFT JOIN citas c ON c.id_cita=v.id_cita ${whereClause}`,
      params
    ),
  ]);

  return buildPaginatedResponse(dataResult.rows, countResult.rows[0].total, page, limit);
}

async function create(body) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let visita = sanitize(body);
    if (visita.id_cita) {
      const locked = await client.query("SELECT estado FROM citas WHERE id_cita=$1 FOR UPDATE", [visita.id_cita]);
      if (locked.rows[0] && locked.rows[0].estado !== "cancelada") {
        const validated = await client.query("SELECT id_triaje FROM triajes WHERE id_cita=$1 AND estado_prioridad='validado'", [visita.id_cita]);
        if (locked.rows[0].estado !== "en_curso" || !validated.rows.length) throw Object.assign(new Error("La consulta requiere prioridad validada e inicio desde la cola médica."), { status: 409 });
      }
    }
    const resolved = await resolvePayload(visita, client);

    if (resolved._notFound) throw Object.assign(new Error("Cita no encontrada."), { status: 404 });
    if (resolved._cancelled) throw Object.assign(new Error("No se puede convertir en visita una cita cancelada."), { status: 400 });
    visita = resolved;
    validateResolved(visita);

    const result = await client.query(
      `INSERT INTO visitas_medicas (
         id_cita,id_paciente,id_medico,fecha_visita,motivo,
         historia_enfermedad_actual,antecedentes_medicos,antecedentes_quirurgicos,
         antecedentes_alergicos,antecedentes_traumaticos,antecedentes_ginecologicos,
         examen_fisico,presion_arterial,frecuencia_cardiaca,frecuencia_respiratoria,
         temperatura,saturacion_oxigeno,impresion_clinica,diagnostico,tratamiento,
         conducta,tipo_atencion,dieta,soluciones,ultrasonido,rayos_x,
         ordenes_especiales,diagnostico_egreso,fecha_egreso,observaciones,
         costo_consulta,created_at,updated_at
       )
       VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
         $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,NOW(),NOW()
       ) RETURNING id_visita`,
      [
        visita.id_cita, visita.id_paciente, visita.id_medico, visita.fecha_visita,
        visita.motivo, visita.historia_enfermedad_actual, visita.antecedentes_medicos,
        visita.antecedentes_quirurgicos, visita.antecedentes_alergicos,
        visita.antecedentes_traumaticos, visita.antecedentes_ginecologicos,
        visita.examen_fisico, visita.presion_arterial, visita.frecuencia_cardiaca,
        visita.frecuencia_respiratoria, visita.temperatura, visita.saturacion_oxigeno,
        visita.impresion_clinica, visita.diagnostico, visita.tratamiento,
        visita.conducta, visita.tipo_atencion, visita.dieta, visita.soluciones,
        visita.ultrasonido, visita.rayos_x, visita.ordenes_especiales,
        visita.diagnostico_egreso, visita.fecha_egreso, visita.observaciones,
        visita.costo_consulta,
      ]
    );
    const idVisita = result.rows[0].id_visita;

    if (visita.id_cita) {
      await client.query(
        `UPDATE citas
         SET estado='completada',
             hora_inicio_atencion=COALESCE(hora_inicio_atencion, NOW()),
             hora_fin_atencion=COALESCE(hora_fin_atencion, NOW())
         WHERE id_cita=$1`,
        [visita.id_cita]
      );
      await client.query(
        "UPDATE ordenes_laboratorio SET id_visita=$1,updated_at=NOW() WHERE id_cita=$2 AND id_visita IS NULL",
        [idVisita, visita.id_cita]
      );
    }

    await upsertChargeForRecord(client, {
      id_paciente: visita.id_paciente, origen: "consulta", referencia_tipo: "visita",
      referencia_id: idVisita, descripcion: `Consulta medica - ${visita.motivo}`,
      subtotal: visita.costo_consulta, total: visita.costo_consulta,
    });

    await client.query("COMMIT");
    return getById(idVisita, pool);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function update(id, body) {
  const client = await pool.connect();
  try {
    const current = await getById(id, client);
    if (!current) return null;

    let visita = sanitize({ ...current, ...body });
    const resolved = await resolvePayload(visita, client);
    if (resolved._notFound) throw Object.assign(new Error("Cita no encontrada."), { status: 404 });
    if (resolved._cancelled) throw Object.assign(new Error("No se puede usar una cita cancelada."), { status: 400 });
    visita = resolved;
    validateResolved(visita);

    await client.query("BEGIN");
    await client.query(
      `UPDATE visitas_medicas SET
         id_cita=$1,id_paciente=$2,id_medico=$3,fecha_visita=$4,motivo=$5,
         historia_enfermedad_actual=$6,antecedentes_medicos=$7,
         antecedentes_quirurgicos=$8,antecedentes_alergicos=$9,
         antecedentes_traumaticos=$10,antecedentes_ginecologicos=$11,
         examen_fisico=$12,presion_arterial=$13,frecuencia_cardiaca=$14,
         frecuencia_respiratoria=$15,temperatura=$16,saturacion_oxigeno=$17,
         impresion_clinica=$18,diagnostico=$19,tratamiento=$20,conducta=$21,
         tipo_atencion=$22,dieta=$23,soluciones=$24,ultrasonido=$25,
         rayos_x=$26,ordenes_especiales=$27,diagnostico_egreso=$28,
         fecha_egreso=$29,observaciones=$30,costo_consulta=$31,updated_at=NOW()
       WHERE id_visita=$32`,
      [
        visita.id_cita, visita.id_paciente, visita.id_medico, visita.fecha_visita,
        visita.motivo, visita.historia_enfermedad_actual, visita.antecedentes_medicos,
        visita.antecedentes_quirurgicos, visita.antecedentes_alergicos,
        visita.antecedentes_traumaticos, visita.antecedentes_ginecologicos,
        visita.examen_fisico, visita.presion_arterial, visita.frecuencia_cardiaca,
        visita.frecuencia_respiratoria, visita.temperatura, visita.saturacion_oxigeno,
        visita.impresion_clinica, visita.diagnostico, visita.tratamiento,
        visita.conducta, visita.tipo_atencion, visita.dieta, visita.soluciones,
        visita.ultrasonido, visita.rayos_x, visita.ordenes_especiales,
        visita.diagnostico_egreso, visita.fecha_egreso, visita.observaciones,
        visita.costo_consulta, id,
      ]
    );

    if (visita.id_cita) {
      await client.query(
        "UPDATE ordenes_laboratorio SET id_visita=$1,updated_at=NOW() WHERE id_cita=$2 AND id_visita IS NULL",
        [id, visita.id_cita]
      );
    }

    await upsertChargeForRecord(client, {
      id_paciente: visita.id_paciente, origen: "consulta", referencia_tipo: "visita",
      referencia_id: id, descripcion: `Consulta medica - ${visita.motivo}`,
      subtotal: visita.costo_consulta, total: visita.costo_consulta,
    });

    await client.query("COMMIT");
    return getById(id, pool);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { sanitize, validate, getAll, getById, create, update };

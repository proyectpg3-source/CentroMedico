require("dotenv").config({ quiet: true });

const pool = require("../db");
const { ensureSchema } = require("../schema");

function buildDateWithOffset(dayOffset, hour, minute) {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function buildDateOnlyWithOffset(dayOffset) {
  return buildDateWithOffset(dayOffset, 12, 0).toISOString().slice(0, 10);
}

async function seedPacientesIfEmpty(client) {
  const existingPatients = await client.query(
    "SELECT id_paciente FROM pacientes ORDER BY id_paciente"
  );

  if (existingPatients.rowCount > 0) {
    return existingPatients.rows;
  }

  const patientsToInsert = [
    {
      nombre: "Juan Perez",
      dni: "10000001",
      telefono: "55510001",
      email: "juan.perez@example.com",
    },
    {
      nombre: "Ana Lopez",
      dni: "10000002",
      telefono: "55510002",
      email: "ana.lopez@example.com",
    },
    {
      nombre: "Carlos Ramirez",
      dni: "10000003",
      telefono: "55510003",
      email: "carlos.ramirez@example.com",
    },
  ];

  for (const patient of patientsToInsert) {
    await client.query(
      `INSERT INTO pacientes (nombre, dni, telefono, email)
       VALUES ($1, $2, $3, $4)`,
      [patient.nombre, patient.dni, patient.telefono, patient.email]
    );
  }

  const seededPatients = await client.query(
    "SELECT id_paciente FROM pacientes ORDER BY id_paciente"
  );
  return seededPatients.rows;
}

async function seedMedicosIfEmpty(client) {
  const existingMedicos = await client.query(
    "SELECT id_medico, nombre, especialidad FROM medicos ORDER BY id_medico"
  );

  if (existingMedicos.rowCount > 0) {
    return existingMedicos.rows;
  }

  const doctorsToInsert = [
    {
      nombre: "Dra. Maria Gonzalez",
      especialidad: "Cardiologia",
      licencia: "MED-CAR-001",
    },
    {
      nombre: "Dr. Carlos Ramirez",
      especialidad: "Neurologia",
      licencia: "MED-NEU-002",
    },
    {
      nombre: "Dra. Laura Soto",
      especialidad: "Medicina General",
      licencia: "MED-GEN-003",
    },
    {
      nombre: "Dr. Andres Morales",
      especialidad: "Cirugia",
      licencia: "MED-CIR-004",
    },
    {
      nombre: "Dra. Valentina Perez",
      especialidad: "Pediatria",
      licencia: "MED-PED-005",
    },
  ];

  for (const doctor of doctorsToInsert) {
    await client.query(
      `INSERT INTO medicos (nombre, especialidad, licencia)
       VALUES ($1, $2, $3)`,
      [doctor.nombre, doctor.especialidad, doctor.licencia]
    );
  }

  const seededMedicos = await client.query(
    "SELECT id_medico, nombre, especialidad FROM medicos ORDER BY id_medico"
  );
  return seededMedicos.rows;
}

async function seedCitasIfEmpty(client, pacientes, medicos) {
  const existingCitas = await client.query("SELECT id_cita FROM citas LIMIT 1");
  if (existingCitas.rowCount > 0) {
    return 0;
  }

  if (!pacientes.length || !medicos.length) {
    throw new Error("No hay pacientes o medicos suficientes para sembrar citas.");
  }

  const citasToInsert = [
    {
      id_paciente: pacientes[0].id_paciente,
      id_medico: medicos[0].id_medico,
      fecha_hora: buildDateWithOffset(0, 9, 0),
      motivo: "Control de presion arterial",
      estado: "confirmada",
      triaje_notas: "Presion arterial en observacion.",
      prioridad_clinica: "media",
      puntaje_prioridad: 34,
      motivos_prioridad: "Paciente con control por hipertension, requiere seguimiento ordenado.",
    },
    {
      id_paciente: pacientes[1 % pacientes.length].id_paciente,
      id_medico: medicos[2 % medicos.length].id_medico,
      fecha_hora: buildDateWithOffset(0, 10, 30),
      motivo: "Fiebre alta y dolor abdominal",
      estado: "pendiente",
      triaje_notas: "Paciente refiere dos dias de fiebre.",
      prioridad_clinica: "alta",
      puntaje_prioridad: 58,
      motivos_prioridad: "El motivo menciona fiebre alta y dolor abdominal.",
    },
    {
      id_paciente: pacientes[2 % pacientes.length].id_paciente,
      id_medico: medicos[1 % medicos.length].id_medico,
      fecha_hora: buildDateWithOffset(1, 11, 0),
      motivo: "Revision neurologica",
      estado: "pendiente",
      triaje_notas: null,
      prioridad_clinica: "baja",
      puntaje_prioridad: 14,
      motivos_prioridad: "No se identifican datos de alarma inmediata con la informacion registrada.",
    },
    {
      id_paciente: pacientes[0].id_paciente,
      id_medico: medicos[3 % medicos.length].id_medico,
      fecha_hora: buildDateWithOffset(-1, 14, 0),
      motivo: "Control post operatorio",
      estado: "completada",
      triaje_notas: null,
      prioridad_clinica: "media",
      puntaje_prioridad: 28,
      motivos_prioridad: "Control posterior a procedimiento, se recomienda seguimiento.",
    },
    {
      id_paciente: pacientes[1 % pacientes.length].id_paciente,
      id_medico: medicos[4 % medicos.length].id_medico,
      fecha_hora: buildDateWithOffset(2, 16, 0),
      motivo: "Consulta pediatrica",
      estado: "cancelada",
      triaje_notas: null,
      prioridad_clinica: "baja",
      puntaje_prioridad: 10,
      motivos_prioridad: "Cita cancelada.",
    },
    {
      id_paciente: pacientes[2 % pacientes.length].id_paciente,
      id_medico: medicos[0].id_medico,
      fecha_hora: buildDateWithOffset(3, 8, 30),
      motivo: "Electrocardiograma",
      estado: "pendiente",
      triaje_notas: null,
      prioridad_clinica: "media",
      puntaje_prioridad: 26,
      motivos_prioridad: "Estudio cardiologico programado para seguimiento.",
    },
  ];

  for (const cita of citasToInsert) {
    await client.query(
      `INSERT INTO citas (
         id_paciente, id_medico, fecha_hora, motivo, estado, triaje_notas,
         prioridad_clinica, puntaje_prioridad, motivos_prioridad
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        cita.id_paciente,
        cita.id_medico,
        cita.fecha_hora,
        cita.motivo,
        cita.estado,
        cita.triaje_notas,
        cita.prioridad_clinica,
        cita.puntaje_prioridad,
        cita.motivos_prioridad,
      ]
    );
  }

  return citasToInsert.length;
}

async function seedClinicalFlowIfEmpty(client) {
  const existingVisits = await client.query("SELECT id_visita FROM visitas_medicas LIMIT 1");
  if (existingVisits.rowCount > 0) {
    return {
      visitas_creadas: 0,
      ordenes_creadas: 0,
      resultados_creados: 0,
      prescripciones_creadas: 0,
      pagos_creados: 0,
    };
  }

  const citasResult = await client.query(`
    SELECT id_cita, id_paciente, id_medico, fecha_hora, motivo
    FROM citas
    WHERE estado <> 'cancelada'
    ORDER BY fecha_hora ASC, id_cita ASC
  `);

  if (citasResult.rowCount === 0) {
    return {
      visitas_creadas: 0,
      ordenes_creadas: 0,
      resultados_creados: 0,
      prescripciones_creadas: 0,
      pagos_creados: 0,
    };
  }

  const citas = citasResult.rows;
  const primaryVisit = await client.query(
    `INSERT INTO visitas_medicas (
       id_cita,
       id_paciente,
       id_medico,
       fecha_visita,
       motivo,
       diagnostico,
       tratamiento,
       observaciones,
       costo_consulta,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING id_visita`,
    [
      citas[0].id_cita,
      citas[0].id_paciente,
      citas[0].id_medico,
      citas[0].fecha_hora,
      citas[0].motivo || "Consulta general",
      "Hipertension arterial controlada",
      "Ajuste de medicamento, dieta baja en sodio y control semanal.",
      "Paciente estable, sin datos de alarma al cierre de consulta.",
      350,
    ]
  );

  const secondarySource = citas[1] || citas[0];
  const secondaryVisit = await client.query(
    `INSERT INTO visitas_medicas (
       id_cita,
       id_paciente,
       id_medico,
       fecha_visita,
       motivo,
       diagnostico,
       tratamiento,
       observaciones,
       costo_consulta,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
     RETURNING id_visita`,
    [
      secondarySource.id_cita,
      secondarySource.id_paciente,
      secondarySource.id_medico,
      secondarySource.fecha_hora,
      secondarySource.motivo || "Seguimiento clinico",
      "Infeccion respiratoria leve",
      "Reposo relativo, hidratacion, antipiretico y vigilancia de sintomas.",
      "Se solicita seguimiento si persiste fiebre o dificultad respiratoria.",
      300,
    ]
  );

  await client.query(
    `UPDATE citas
     SET estado = 'completada',
         hora_inicio_atencion = COALESCE(hora_inicio_atencion, NOW()),
         hora_fin_atencion = COALESCE(hora_fin_atencion, NOW())
     WHERE id_cita = ANY($1::int[])`,
    [[citas[0].id_cita, secondarySource.id_cita]]
  );

  const firstVisitId = primaryVisit.rows[0].id_visita;
  const secondVisitId = secondaryVisit.rows[0].id_visita;

  const firstOrder = await client.query(
    `INSERT INTO ordenes_laboratorio (
       id_paciente,
       id_cita,
       id_visita,
       examen,
       prioridad,
       estado,
       costo,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING id_orden`,
    [
      citas[0].id_paciente,
      citas[0].id_cita,
      firstVisitId,
      "Quimica sanguinea",
      "alta",
      "validado",
      420,
    ]
  );

  const secondOrder = await client.query(
    `INSERT INTO ordenes_laboratorio (
       id_paciente,
       id_cita,
       id_visita,
       examen,
       prioridad,
       estado,
       costo,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING id_orden`,
    [
      secondarySource.id_paciente,
      secondarySource.id_cita,
      secondVisitId,
      "Biometria hematica",
      "normal",
      "pendiente",
      280,
    ]
  );

  await client.query(
    `INSERT INTO resultados_laboratorio (
       id_orden,
       resultado,
       observaciones,
       fecha_resultado,
       validado_por,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, NOW(), $4, NOW(), NOW())`,
    [
      firstOrder.rows[0].id_orden,
      "Parametros dentro de rango, glucosa ligeramente elevada sin criterio de urgencia.",
      "Correlacionar con control dietetico y repetir en proxima valoracion.",
      "Dra. Maria Gonzalez",
    ]
  );

  const firstPrescription = await client.query(
    `INSERT INTO prescripciones (
       id_visita,
       medicamento,
       dosis,
       frecuencia,
       duracion,
       instrucciones,
       costo,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING id_prescripcion`,
    [
      firstVisitId,
      "Losartan",
      "50 mg",
      "Cada 24 horas",
      "30 dias",
      "Tomar por la manana y registrar presion arterial tres veces por semana.",
      180,
    ]
  );

  const secondPrescription = await client.query(
    `INSERT INTO prescripciones (
       id_visita,
       medicamento,
       dosis,
       frecuencia,
       duracion,
       instrucciones,
       costo,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     RETURNING id_prescripcion`,
    [
      secondVisitId,
      "Paracetamol",
      "500 mg",
      "Cada 8 horas",
      "5 dias",
      "Tomar solo si hay fiebre o malestar general.",
      95,
    ]
  );

  const chargeDefinitions = [
    {
      id_paciente: citas[0].id_paciente,
      origen: "consulta",
      referencia_tipo: "visita",
      referencia_id: firstVisitId,
      descripcion: "Consulta medica - Control de hipertension",
      subtotal: 350,
      total: 350,
    },
    {
      id_paciente: citas[0].id_paciente,
      origen: "laboratorio",
      referencia_tipo: "orden_laboratorio",
      referencia_id: firstOrder.rows[0].id_orden,
      descripcion: "Laboratorio - Quimica sanguinea",
      subtotal: 420,
      total: 420,
    },
    {
      id_paciente: citas[0].id_paciente,
      origen: "farmacia",
      referencia_tipo: "prescripcion",
      referencia_id: firstPrescription.rows[0].id_prescripcion,
      descripcion: "Prescripcion - Losartan",
      subtotal: 180,
      total: 180,
    },
    {
      id_paciente: secondarySource.id_paciente,
      origen: "consulta",
      referencia_tipo: "visita",
      referencia_id: secondVisitId,
      descripcion: "Consulta medica - Seguimiento respiratorio",
      subtotal: 300,
      total: 300,
    },
    {
      id_paciente: secondarySource.id_paciente,
      origen: "laboratorio",
      referencia_tipo: "orden_laboratorio",
      referencia_id: secondOrder.rows[0].id_orden,
      descripcion: "Laboratorio - Biometria hematica",
      subtotal: 280,
      total: 280,
    },
    {
      id_paciente: secondarySource.id_paciente,
      origen: "farmacia",
      referencia_tipo: "prescripcion",
      referencia_id: secondPrescription.rows[0].id_prescripcion,
      descripcion: "Prescripcion - Paracetamol",
      subtotal: 95,
      total: 95,
    },
  ];

  const createdCharges = [];
  for (const charge of chargeDefinitions) {
    const insertedCharge = await client.query(
      `INSERT INTO cargos_paciente (
         id_paciente,
         origen,
         referencia_tipo,
         referencia_id,
         descripcion,
         subtotal,
         total,
         saldo,
         estado_pago,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 'pendiente', NOW(), NOW())
       RETURNING id_cargo, total`,
      [
        charge.id_paciente,
        charge.origen,
        charge.referencia_tipo,
        charge.referencia_id,
        charge.descripcion,
        charge.subtotal,
        charge.total,
      ]
    );

    createdCharges.push(insertedCharge.rows[0]);
  }

  if (createdCharges.length >= 2) {
    await client.query(
      `INSERT INTO pagos (
         id_paciente,
         id_cargo,
         monto,
         fecha_pago,
         metodo,
         referencia,
         observaciones,
         created_at
       )
       VALUES ($1, $2, $3, NOW(), $4, $5, $6, NOW())`,
      [
        citas[0].id_paciente,
        createdCharges[0].id_cargo,
        350,
        "Efectivo",
        "PAGO-CONS-001",
        "Consulta liquidada al cierre de la visita.",
      ]
    );

    await client.query(
      `UPDATE cargos_paciente
       SET saldo = 0,
           estado_pago = 'pagado',
           updated_at = NOW()
       WHERE id_cargo = $1`,
      [createdCharges[0].id_cargo]
    );

    await client.query(
      `INSERT INTO pagos (
         id_paciente,
         id_cargo,
         monto,
         fecha_pago,
         metodo,
         referencia,
         observaciones,
         created_at
       )
       VALUES ($1, $2, $3, NOW(), $4, $5, $6, NOW())`,
      [
        secondarySource.id_paciente,
        createdCharges[4].id_cargo,
        120,
        "Tarjeta",
        "PAGO-LAB-001",
        "Abono parcial para mostrar el estado de saldo pendiente.",
      ]
    );

    await client.query(
      `UPDATE cargos_paciente
       SET saldo = total - 120,
           estado_pago = 'parcial',
           updated_at = NOW()
       WHERE id_cargo = $1`,
      [createdCharges[4].id_cargo]
    );
  }

  return {
    visitas_creadas: 2,
    ordenes_creadas: 2,
    resultados_creados: 1,
    prescripciones_creadas: 2,
    pagos_creados: 2,
  };
}

async function seedInsumosIfEmpty(client) {
  const existingInsumos = await client.query("SELECT id_insumo FROM insumos_laboratorio LIMIT 1");
  if (existingInsumos.rowCount > 0) {
    return 0;
  }

  const insumos = [
    {
      nombre: "Tubos Vacutainer tapa roja",
      categoria: "Toma de muestra",
      unidad: "unidad",
      stock: 120,
      stock_minimo: 40,
      fecha_vencimiento: buildDateOnlyWithOffset(240),
    },
    {
      nombre: "Reactivo de glucosa",
      categoria: "Quimica clinica",
      unidad: "ml",
      stock: 8,
      stock_minimo: 20,
      fecha_vencimiento: buildDateOnlyWithOffset(35),
    },
    {
      nombre: "Tiras reactivas de orina",
      categoria: "Uroanalisis",
      unidad: "tira",
      stock: 0,
      stock_minimo: 30,
      fecha_vencimiento: buildDateOnlyWithOffset(-12),
    },
  ];

  for (const insumo of insumos) {
    const inserted = await client.query(
      `INSERT INTO insumos_laboratorio
         (nombre, categoria, unidad, stock, stock_minimo, fecha_vencimiento, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id_insumo`,
      [
        insumo.nombre,
        insumo.categoria,
        insumo.unidad,
        insumo.stock,
        insumo.stock_minimo,
        insumo.fecha_vencimiento,
      ]
    );

    if (insumo.stock > 0) {
      await client.query(
        `INSERT INTO movimientos_insumos_laboratorio
           (id_insumo, tipo, cantidad, motivo, id_usuario, created_at)
         VALUES ($1, 'entrada', $2, $3, NULL, NOW())`,
        [inserted.rows[0].id_insumo, insumo.stock, "Carga inicial de demostracion."]
      );
    }
  }

  return insumos.length;
}

async function main() {
  const client = await pool.connect();

  try {
    await ensureSchema(pool);
    await client.query("BEGIN");

    const pacientes = await seedPacientesIfEmpty(client);
    const medicos = await seedMedicosIfEmpty(client);
    const citasCreadas = await seedCitasIfEmpty(client, pacientes, medicos);
    const clinicalFlow = await seedClinicalFlowIfEmpty(client);
    const insumosCreados = await seedInsumosIfEmpty(client);

    await client.query("COMMIT");

    console.log(
      JSON.stringify(
        {
          pacientes: pacientes.length,
          medicos: medicos.length,
          citas_creadas: citasCreadas,
          ...clinicalFlow,
          insumos_creados: insumosCreados,
          message: "Seed completado correctamente.",
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();

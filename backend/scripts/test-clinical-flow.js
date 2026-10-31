require("dotenv").config({ quiet: true });

if (process.env.RUN_DB_INTEGRATION !== "true" || !/_test$/i.test(process.env.DB_NAME || "")) {
  throw new Error("Usa una base desechable DB_NAME terminada en _test y RUN_DB_INTEGRATION=true, o npm run test:postgres-isolated.");
}

const app = require("../src/app");
const pool = require("../src/config/db");
const { ensureSchema } = require("../schema");
const bcrypt = require("bcryptjs");
const assert = require("node:assert/strict");

let patientId = null;
let doctorId = null;
let userId = null;
let productId = null;

async function cleanup() {
  // Primero el paciente: sus prescripciones referencian al producto.
  if (patientId) {
  await pool.query("DELETE FROM documentos_paciente WHERE id_paciente=$1", [patientId]);
  await pool.query("DELETE FROM pagos WHERE id_paciente=$1", [patientId]);
  await pool.query("DELETE FROM cargos_paciente WHERE id_paciente=$1", [patientId]);
  await pool.query("DELETE FROM visitas_medicas WHERE id_paciente=$1", [patientId]);
  await pool.query("DELETE FROM citas WHERE id_paciente=$1", [patientId]);
  await pool.query("DELETE FROM pacientes WHERE id_paciente=$1", [patientId]);
  }
  if (productId) {
    await pool.query("DELETE FROM movimientos_productos WHERE id_producto=$1", [productId]);
    await pool.query("DELETE FROM productos WHERE id=$1", [productId]);
  }
  if (userId) await pool.query("DELETE FROM usuarios WHERE id_usuario=$1", [userId]);
  if (doctorId) await pool.query("DELETE FROM medicos WHERE id_medico=$1", [doctorId]);
}

async function main() {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await ensureSchema(pool);
    const marker = require("node:crypto").randomUUID();
    const password = require("node:crypto").randomUUID();
    const email = `test-${marker}@example.invalid`;
    const user = await pool.query(
      "INSERT INTO usuarios (nombre,email,password,rol,activo) VALUES ($1,$2,$3,'admin',TRUE) RETURNING id_usuario",
      ["PRUEBA TEMPORAL", email, await bcrypt.hash(password, 4)]
    );
    userId = user.rows[0].id_usuario;
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(loginResponse.status, 200, "El usuario temporal debe poder iniciar sesion");
    const { token } = await loginResponse.json();
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    const anonymousResponse = await fetch(`${baseUrl}/api/triajes`);
    assert.equal(anonymousResponse.status, 401, "Triaje debe requerir autenticacion");
    const doctor = (await pool.query(
      "INSERT INTO medicos (nombre,especialidad,licencia) VALUES ($1,$2,$3) RETURNING id_medico",
      ["MEDICO TEMPORAL", "Medicina general", marker]
    )).rows[0];
    doctorId = doctor.id_medico;

    const patient = await pool.query(
      `INSERT INTO pacientes (
         nombre,dni,telefono,fecha_nacimiento,sexo,residencia
       ) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_paciente`,
      [
        "PRUEBA CODEX TEMPORAL",
        `TMP-${Date.now()}`,
        "00000000",
        "1990-01-01",
        "masculino",
        "Temporal",
      ]
    );
    patientId = patient.rows[0].id_paciente;

    // Usar el mismo contrato HTTP de Recepción; insertar por SQL ocultaba errores del validador.
    const appointmentDate = new Date().toISOString();
    const appointmentResponse = await fetch(`${baseUrl}/api/citas`, {
      method: 'POST', headers,
      body: JSON.stringify({ id_paciente: patientId, id_medico: doctor.id_medico,
        fecha_hora: appointmentDate, motivo: 'Fiebre alta y dolor abdominal',
        estado: 'pendiente', triaje_notas: 'Ingreso sintético de recepción' }),
    });
    const appointment = await appointmentResponse.json();
    assert.equal(appointmentResponse.status, 201, JSON.stringify(appointment));
    assert.equal(appointment.fecha_hora, appointmentDate);
    assert.equal(appointment.estado, 'pendiente');
    assert.equal(appointment.triaje_notas, 'Ingreso sintético de recepción');
    assert.ok(appointment.hora_llegada && !Number.isNaN(new Date(appointment.hora_llegada).getTime()), 'El alta conserva el valor predeterminado de hora de llegada');
    const appointmentId = appointment.id_cita;
    const agendaResponse = await fetch(`${baseUrl}/api/citas?id_paciente=${patientId}`, { headers });
    assert.equal(agendaResponse.status, 200);
    const agenda = await agendaResponse.json();
    assert.ok(agenda.data.some(item => item.id_cita === appointmentId), 'El ingreso guardado aparece en la agenda');

    const triageResponse = await fetch(`${baseUrl}/api/triajes`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id_cita: appointmentId,
        motivo_consulta: "Fiebre alta y dolor abdominal",
        historia_enfermedad_actual: "Dos dias de evolucion",
        antecedentes_relevantes: "Sin antecedentes",
        presion_arterial: "110/70",
        frecuencia_cardiaca: 96,
        frecuencia_respiratoria: 22,
        temperatura: 39.1,
        saturacion_oxigeno: 96,
        peso: 70,
      }),
    });
    const triage = await triageResponse.json();
    if (!triageResponse.ok) throw new Error(JSON.stringify(triage));

    const visitResponse = await fetch(`${baseUrl}/api/visitas`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id_cita: appointmentId,
        id_paciente: patientId,
        id_medico: doctor.id_medico,
        fecha_visita: new Date().toISOString(),
        motivo: "Fiebre alta y dolor abdominal",
        historia_enfermedad_actual: "Dos dias de evolucion",
        antecedentes_medicos: "Sin antecedentes",
        examen_fisico: "Paciente consciente y orientado",
        presion_arterial: "110/70",
        frecuencia_cardiaca: 96,
        frecuencia_respiratoria: 22,
        temperatura: 39.1,
        saturacion_oxigeno: 96,
        impresion_clinica: "Sindrome febril en estudio",
        diagnostico: "Diagnostico de prueba temporal",
        tratamiento: "Hidratacion",
        conducta: "Seguimiento ambulatorio",
        tipo_atencion: "ambulatorio",
        dieta: "Blanda",
        ordenes_especiales: "Control de signos vitales",
        diagnostico_egreso: "Estable",
        fecha_egreso: new Date().toISOString(),
        costo_consulta: 0,
      }),
    });
    const visit = await visitResponse.json();
    if (!visitResponse.ok) throw new Error(JSON.stringify(visit));
    assert.equal(visit.impresion_clinica, "Sindrome febril en estudio");
    assert.equal(visit.id_paciente, patientId);
    assert.ok(triage.id_triaje, "Debe persistir el triaje");
    const productResponse = await fetch(`${baseUrl}/api/productos`, {
      method: "POST", headers,
      body: JSON.stringify({ tipo: "farmacia", codigo: marker, nombre: "PRODUCTO TEMPORAL", categoria: "Prueba", unidad: "unidad", stock: 5, minimo: 1, precio: 2 }),
    });
    assert.equal(productResponse.status, 201);
    productId = (await productResponse.json()).id;
    const movementUrl = `${baseUrl}/api/productos/${productId}/movimientos`;
    const concurrent = await Promise.all([1,2].map(() => fetch(movementUrl, {
      method: "POST", headers, body: JSON.stringify({ tipo: "salida", cantidad: 4, motivo: "Prueba concurrente" }),
    })));
    assert.deepEqual(concurrent.map(r=>r.status).sort(), [201,409], "Debe evitar sobreventa concurrente");
    const stock = (await pool.query("SELECT stock FROM productos WHERE id=$1", [productId])).rows[0].stock;
    assert.equal(stock, 1);

    // Prescripcion vinculada a farmacia: costo desde catalogo y dispensacion parcial.
    await fetch(movementUrl, { method: "POST", headers, body: JSON.stringify({ tipo: "entrada", cantidad: 5, motivo: "Reposicion de prueba" }) });
    const prescriptionResponse = await fetch(`${baseUrl}/api/prescripciones`, {
      method: "POST", headers,
      body: JSON.stringify({ id_visita: visit.id_visita, medicamento: "PRODUCTO TEMPORAL", dosis: "1 tableta", frecuencia: "Cada 8 horas", duracion: "2 dias", id_producto: productId, cantidad: 4, costo: 999 }),
    });
    const prescription = await prescriptionResponse.json();
    assert.equal(prescriptionResponse.status, 201, JSON.stringify(prescription));
    assert.equal(Number(prescription.costo), 8, "El costo debe calcularse como cantidad x precio");
    const charge = (await pool.query("SELECT total FROM cargos_paciente WHERE referencia_tipo='prescripcion' AND referencia_id=$1", [prescription.id_prescripcion])).rows[0];
    assert.equal(Number(charge.total), 8, "El cargo debe reflejar el costo del catalogo");
    const dispenseUrl = `${baseUrl}/api/prescripciones/${prescription.id_prescripcion}/dispensar`;
    const partial = await fetch(dispenseUrl, { method: "POST", headers, body: JSON.stringify({ cantidad: 3 }) });
    assert.equal(partial.status, 201);
    assert.equal((await partial.json()).cantidad_dispensada, 3);
    const excess = await fetch(dispenseUrl, { method: "POST", headers, body: JSON.stringify({ cantidad: 5 }) });
    assert.equal(excess.status, 409, "No debe dispensar mas de lo prescrito");
    const shrink = await fetch(`${baseUrl}/api/prescripciones/${prescription.id_prescripcion}`, {
      method: "PUT", headers,
      body: JSON.stringify({ id_visita: visit.id_visita, medicamento: "PRODUCTO TEMPORAL", dosis: "1 tableta", frecuencia: "Cada 8 horas", duracion: "2 dias", id_producto: productId, cantidad: 2 }),
    });
    assert.equal(shrink.status, 409, "No debe reducir la cantidad por debajo de lo dispensado");
    const rest = await Promise.all([1,2].map(() => fetch(dispenseUrl, { method: "POST", headers, body: "{}" })));
    assert.deepEqual(rest.map(r=>r.status).sort(), [201,409], "Debe evitar doble dispensacion concurrente");
    const stockAfter = (await pool.query("SELECT stock FROM productos WHERE id=$1", [productId])).rows[0].stock;
    assert.equal(stockAfter, 2, "La dispensacion debe descontar exactamente lo prescrito");
    const linked = await pool.query("SELECT COUNT(*)::int AS n FROM movimientos_productos WHERE id_prescripcion=$1", [prescription.id_prescripcion]);
    assert.equal(linked.rows[0].n, 2, "Cada dispensacion debe quedar ligada a la prescripcion");
    const pending = await (await fetch(`${baseUrl}/api/prescripciones?pendientes_dispensar=1&id_paciente=${patientId}`, { headers })).json();
    assert.equal(pending.data.length, 0, "Una prescripcion completa no debe figurar como pendiente");

    const content = Buffer.from("Documento temporal de prueba").toString("base64");
    const docResponse = await fetch(`${baseUrl}/api/documentos`, {
      method: "POST", headers, body: JSON.stringify({id_paciente:patientId,nombre:"prueba.txt",tipo:"text/plain",contenido:content}),
    });
    assert.equal(docResponse.status,201);
    const docId=(await docResponse.json()).id;
    const savedDoc=await fetch(`${baseUrl}/api/documentos/${docId}`,{headers});
    assert.equal(savedDoc.status,200);
    assert.equal((await savedDoc.json()).contenido,content,"El archivo debe conservar sus bytes");
    await pool.query("UPDATE usuarios SET rol='fundacion' WHERE id_usuario=$1", [userId]);
    const forbidden = await fetch(movementUrl, { method: "POST", headers, body: JSON.stringify({ tipo: "entrada", cantidad: 1, motivo: "No permitido" }) });
    assert.equal(forbidden.status, 403, "Fundacion solo puede consultar inventario");
    const forbiddenDoc=await fetch(`${baseUrl}/api/documentos/${docId}`,{headers});
    assert.equal(forbiddenDoc.status,403,"Fundacion no debe descargar documentos clinicos");
    const dashboard = await fetch(`${baseUrl}/api/dashboard/resumen`, { headers });
    assert.equal(dashboard.status, 200);
    const summary = await dashboard.json();
    assert.equal(summary.citas_por_mes.length, 6);
    assert.ok(summary.citas_por_mes.some(m => m.citas >= 1));

    console.log(
      JSON.stringify(
        {
          triaje: {
            id: triage.id_triaje,
            prioridad: triage.prioridad_clinica,
            puntaje: triage.puntaje_prioridad,
          },
          visita: {
            id: visit.id_visita,
            impresion: visit.impresion_clinica,
            tipo_atencion: visit.tipo_atencion,
          },
        },
        null,
        2
      )
    );
  } finally {
    await cleanup();
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

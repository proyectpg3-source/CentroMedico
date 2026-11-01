// Flujo clínico completo contra PostgreSQL embebido (PGlite), con el esquema
// real y las rutas HTTP reales. No usa la base de datos del centro.
//   Recepción → Evaluación de Enfermería → Motor P1–P4 → Validación
//   profesional → Cola médica → Consulta.
// Requiere: npm install (devDependency @electric-sql/pglite).
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

let passed = 0;
function check(condition, message) { assert.ok(condition, message); passed++; }

(async () => {
  let db, pool;
  const realPg = process.env.RUN_DB_INTEGRATION === 'true';
  if (realPg) {
    if (process.env.DB_NAME !== 'centromedico_isolated_test' || process.env.DB_HOST !== '127.0.0.1') throw Error('Requiere PostgreSQL temporal aislado.');
    pool = require('../src/config/db');
    db = { close: () => pool.end() };
  } else {
    const { PGlite } = await import('@electric-sql/pglite');
    db = new PGlite();
    const adapt = (r) => ({ rows: r.rows, rowCount: r.affectedRows ?? r.rows.length });
    pool = {
      query: async (sql, params) => adapt(await db.query(sql, params)),
      connect: async () => ({ query: async (sql, params) => adapt(await db.query(sql, params)), release() {} }),
      on() {},
    };
    const dbId = require.resolve('../src/config/db');
    require.cache[dbId] = { id: dbId, filename: dbId, loaded: true, exports: pool };
  }

  const { ensureSchema } = require('../schema');
  await ensureSchema(pool);
  await ensureSchema(pool); // idempotente: se ejecuta en cada arranque
  check(true, 'Esquema aplicado dos veces sin errores');
  // Simular una instalación anterior en la BD temporal: el arranque restaura
  // las columnas nuevas incluso si CREATE TABLE IF NOT EXISTS no modifica la tabla.
  await pool.query('ALTER TABLE triajes DROP COLUMN estado_prioridad CASCADE');
  await pool.query('ALTER TABLE triajes DROP COLUMN justificacion_cambio');
  await ensureSchema(pool);
  check(true, 'Actualización de tabla triajes anterior compatible');

  const users = {};
  for (const rol of ['admin', 'medico', 'enfermero', 'recepcionista']) {
    const r = await pool.query(`INSERT INTO usuarios (nombre, email, password, rol, activo) VALUES ($1, $2, 'x', $3, TRUE) RETURNING id_usuario`, [`Usuario ${rol}`, `${rol}@prueba.local`, rol]);
    users[rol] = r.rows[0].id_usuario;
  }
  const medico = (await pool.query(`INSERT INTO medicos (nombre, especialidad) VALUES ('Dra. Prueba', 'General') RETURNING id_medico`)).rows[0].id_medico;
  const paciente = (await pool.query(`INSERT INTO pacientes (nombre, dni, fecha_nacimiento) VALUES ('PRUEBA Adulto', 'T-001', '1990-05-01') RETURNING id_paciente`)).rows[0].id_paciente;
  const paciente2 = (await pool.query(`INSERT INTO pacientes (nombre, dni, fecha_nacimiento) VALUES ('PRUEBA Critico', 'T-002', '1980-01-01') RETURNING id_paciente`)).rows[0].id_paciente;

  process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/api/analisis', require('../src/modules/analisis/analisis.routes'));
  app.use('/api/visitas', require('../src/modules/visitas/visitas.routes'));
  app.use('/api/citas', require('../src/modules/citas/citas.routes'));
  app.use('/api/triajes', require('../src/modules/triajes/triajes.routes'));
  app.use('/api/indicadores', require('../src/modules/indicadores/indicadores.routes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (rol, method, path, body) => {
    const token = jwt.sign({ id_usuario: users[rol] }, process.env.JWT_SECRET);
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
  };

  try {
    // 1. Recepción: crear cita (sin prioridad inferida) y check-in (llegada).
    const cita = await call('recepcionista', 'POST', '/api/citas', { id_paciente: paciente, id_medico: medico, fecha_hora: new Date().toISOString(), motivo: 'Dolor de cabeza' });
    check(cita.status === 201, `Crear cita: ${JSON.stringify(cita.body)}`);
    const idCita = cita.body.id_cita;
    check(cita.body.hora_llegada === null, 'La llegada no se registra al crear la cita');
    const checkin = await call('recepcionista', 'PATCH', `/api/citas/${idCita}/estado`, { estado: 'confirmada' });
    check(checkin.status === 200 && checkin.body.hora_llegada, 'Check-in registra la llegada');

    const physical = await call('recepcionista', 'POST', '/api/citas', { id_paciente: paciente, id_medico: medico, fecha_hora: new Date(Date.now()+10800000).toISOString(), motivo: 'Ingreso presencial', registrar_llegada: true });
    check(physical.status === 201 && physical.body.estado === 'confirmada' && physical.body.hora_llegada, 'Ingreso presencial atómico');
    for (const rol of ['recepcionista', 'enfermero', 'medico']) {
      check((await call(rol, 'PATCH', `/api/citas/${idCita}/estado`, { estado: 'en_curso' })).status === 409, 'Sin acceso directo a atención por citas');
    }
    check((await call('medico', 'POST', '/api/visitas', { id_cita: idCita, diagnostico: 'Prueba' })).status === 409, 'Consulta sin validar no se guarda');
    check((await call('recepcionista', 'PUT', `/api/citas/${idCita}`, { estado: 'completada' })).status === 400, 'Edición no elude la cola');

    // 2. Evaluación de Enfermería sin datos SATS → sin propuesta (antes: P4).
    const catalog = await call('enfermero', 'GET', '/api/triajes/catalogo');
    check(catalog.body.discriminadores.length === 24, 'Catálogo de 24 discriminadores');
    let t = await call('enfermero', 'POST', '/api/triajes', { id_cita: idCita, motivo_consulta: 'Dolor de cabeza' });
    check(t.status === 201, `Guardar triaje: ${JSON.stringify(t.body)}`);
    check(t.body.estado_propuesta === 'SIN_PROPUESTA' && t.body.nivel_propuesto === null, 'Sin datos: SIN_PROPUESTA');
    check(t.body.propuesta.acciones_requeridas.length > 0, 'Indica acciones pendientes');
    check((await call('recepcionista', 'PUT', `/api/citas/${idCita}`, { id_paciente: paciente2 })).status === 400, 'No se cambia el paciente tras la evaluación clínica');

    // Datos inválidos se rechazan sin escribir.
    check((await call('enfermero', 'POST', '/api/triajes', { id_cita: idCita, motivo_consulta: 'X', movilidad: 'CORRE' })).status === 400, 'Movilidad inválida');
    check((await call('enfermero', 'POST', '/api/triajes', { id_cita: idCita, motivo_consulta: 'X', revision_completa: true })).status === 400, 'El cliente no declara la completitud');
    check((await call('medico', 'POST', '/api/triajes', { id_cita: idCita, motivo_consulta: 'X' })).status === 403, 'Solo Enfermería/admin registran la evaluación');

    // La cola no admite pacientes sin validar.
    check((await call('medico', 'POST', `/api/triajes/cola/${idCita}/iniciar`)).status === 409, 'No se inicia atención sin prioridad validada');

    // 3. Evaluación completa con presión no obtenible → P4 provisional (máx. P3).
    const allAbsent = Object.fromEntries(catalog.body.discriminadores.map((d) => [d.code, 'AUSENTE']));
    const full = {
      id_cita: idCita, motivo_consulta: 'Dolor de cabeza', frecuencia_cardiaca: 80, frecuencia_respiratoria: 14,
      temperatura: 36.8, saturacion_oxigeno: 98, movilidad: 'CAMINA', estado_conciencia: 'ALERTA', trauma: 'NO',
      revision_discriminadores: allAbsent, datos_no_obtenibles: { presion_sistolica: 'EQUIPO_NO_DISPONIBLE' },
    };
    const preview = await call('enfermero', 'POST', '/api/triajes/vista-previa', full);
    check(preview.status === 200 && preview.body.guardado === false, 'Vista previa sin guardar');
    t = await call('enfermero', 'POST', '/api/triajes', full);
    check(t.body.estado_propuesta === 'PROPUESTA_PROVISIONAL' && t.body.nivel_propuesto === 'P4' && t.body.nivel_maximo_posible === 'P3', 'P4 provisional (máx. P3)');
    check(t.body.requiere_justificacion === true && t.body.revision_completa === true, 'Exige justificación; revisión completa');

    // 4. Validación profesional.
    check((await call('enfermero', 'PATCH', '/api/triajes/validar', { id_cita: idCita, prioridad_final: 'P4' })).status === 403, 'Enfermería no valida');
    check((await call('medico', 'PATCH', '/api/triajes/validar', { id_cita: idCita, prioridad_final: 'P4' })).status === 400, 'Provisional exige justificación');
    let v = await call('medico', 'PATCH', '/api/triajes/validar', { id_cita: idCita, prioridad_final: 'P4', justificacion: 'Paciente estable, sin datos de alarma al interrogatorio.' });
    check(v.status === 200 && v.body.estado_prioridad === 'validado' && v.body.prioridad_final === 'P4' && v.body.origen_clasificacion === 'AUTOMATICA', 'P4 confirmada con justificación');
    check((await call('medico', 'PATCH', '/api/triajes/validar', { id_cita: idCita, prioridad_final: 'P3', justificacion: 'Intento de doble validación.' })).status === 409, 'No se valida dos veces');

    // 5. Segundo paciente: convulsión activa → P1 conclusiva; el médico la confirma sin justificación.
    const cita2 = await call('recepcionista', 'POST', '/api/citas', { id_paciente: paciente2, id_medico: medico, fecha_hora: new Date(Date.now() + 3600000).toISOString(), motivo: 'Convulsión' });
    const idCita2 = cita2.body.id_cita;
    await call('recepcionista', 'PATCH', `/api/citas/${idCita2}/estado`, { estado: 'confirmada' });
    t = await call('enfermero', 'POST', '/api/triajes', { id_cita: idCita2, motivo_consulta: 'Convulsión', movilidad: 'CAMILLA_INMOVIL', estado_conciencia: 'NO_RESPONDE', trauma: 'NO', revision_discriminadores: { CONVULSION_ACTIVA: 'PRESENTE' } });
    check(t.body.nivel_propuesto === 'P1' && t.body.estado_propuesta === 'PROPUESTA_CONCLUSIVA', 'Convulsión activa: P1 conclusiva');
    const indicatorService = require('../src/modules/analisis/analisis.service');
    check((await indicatorService.getIndicadores()).citas_alta_prioridad === 0, 'El resumen no cuenta propuestas como alta prioridad validada');
    v = await call('medico', 'PATCH', '/api/triajes/validar', { id_cita: idCita2, prioridad_final: 'P1' });
    check(v.status === 200 && v.body.prioridad_final === 'P1', 'P1 confirmada sin justificación');
    check((await indicatorService.getIndicadores()).citas_alta_prioridad === 1, 'El resumen cuenta P1 tras validación profesional');

    // Modificar sin justificación se rechaza (tercer paciente, sin propuesta → manual).
    const cita3 = await call('recepcionista', 'POST', '/api/citas', { id_paciente: paciente, id_medico: medico, fecha_hora: new Date(Date.now() + 7200000).toISOString(), motivo: 'Control' });
    await call('enfermero', 'POST', '/api/triajes', { id_cita: cita3.body.id_cita, motivo_consulta: 'Control' });
    check((await call('medico', 'PATCH', '/api/triajes/validar', { id_cita: cita3.body.id_cita, prioridad_final: 'P3' })).status === 400, 'Clasificación manual exige justificación');
    v = await call('medico', 'PATCH', '/api/triajes/validar', { id_cita: cita3.body.id_cita, prioridad_final: 'P3', justificacion: 'Clasificación manual: paciente referido con dolor moderado.' });
    check(v.body.origen_clasificacion === 'MANUAL', 'Clasificación manual registrada');

    // 6. Cola médica: P1 primero aunque se validó después.
    let cola = await call('medico', 'GET', '/api/triajes/cola');
    check(cola.body.length === 3, 'Tres pacientes en cola');
    check(cola.body[0].id_cita === idCita2 && cola.body[0].posicion === 1, 'P1 encabeza la cola');
    check(cola.body.map((c) => c.prioridad_final).join(',') === 'P1,P3,P4', 'Orden por prioridad validada');
    check((await call('enfermero', 'POST', `/api/triajes/cola/${idCita2}/llamar`)).status === 403, 'Enfermería no llama a consulta');
    const llamado = await call('medico', 'POST', `/api/triajes/cola/${idCita2}/llamar`);
    check(llamado.status === 200 && llamado.body.estado_cola === 'LLAMADO', 'Paciente llamado');
    const inicio = await call('medico', 'POST', `/api/triajes/cola/${idCita2}/iniciar`);
    check(inicio.status === 200, 'Atención iniciada');
    cola = await call('medico', 'GET', '/api/triajes/cola');
    check(cola.body.find((c) => c.id_cita === idCita2).estado_cola === 'EN_ATENCION', 'En atención');
    check((await call('enfermero', 'POST', '/api/triajes', { id_cita: idCita2, motivo_consulta: 'Cambio' })).status === 409, 'No se reevalúa con la consulta iniciada');

    // Panel principal: la cola legada también ordena por prioridad validada.
    const legacy = await require('../src/modules/analisis/analisis.service').getColaPriorizada();
    check(legacy[0].prioridad_final === 'P1', 'Panel principal ordena por P1–P4 validada');

    // Reevaluar anula la validación previa.
    t = await call('enfermero', 'POST', '/api/triajes', { ...full, temperatura: 37.2 });
    check(t.body.estado_prioridad === 'propuesto' && t.body.prioridad_final === null, 'Actualizar la evaluación exige nueva validación');
    cola = await call('medico', 'GET', '/api/triajes/cola');
    check(!cola.body.some((c) => c.id_cita === idCita), 'Sale de la cola hasta revalidar');

    // Recalcular no altera validaciones ni consultas iniciadas.
    const beforePriority = await pool.query('SELECT prioridad_clinica, puntaje_prioridad FROM citas WHERE id_cita=$1', [idCita2]);
    const recalculated = await call('admin', 'POST', '/api/analisis/priorizacion/recalcular');
    check(recalculated.status === 200 && recalculated.body.total_recalculadas === 1, 'Solo recalcula evaluaciones pendientes');
    const afterPriority = await pool.query('SELECT prioridad_clinica, puntaje_prioridad FROM citas WHERE id_cita=$1', [idCita2]);
    check(JSON.stringify(beforePriority.rows) === JSON.stringify(afterPriority.rows), 'Respeta prioridad validada');
    if (realPg) {
      const parallel = await Promise.all([
        call('admin', 'POST', '/api/analisis/priorizacion/recalcular'),
        call('medico', 'PATCH', '/api/triajes/validar', { id_cita: idCita, prioridad_final: 'P2', justificacion: 'Reclasificación sintética en prueba concurrente.' }),
      ]);
      check(parallel.every(r => r.status === 200), 'Recalcular y validar concurrentemente no produce errores');
      const consistent = await pool.query("SELECT c.prioridad_clinica AS cita, t.prioridad_clinica AS triaje, t.prioridad_final FROM citas c JOIN triajes t USING(id_cita) WHERE c.id_cita=$1", [idCita]);
      check(consistent.rows[0].prioridad_final === 'P2' && consistent.rows[0].cita === consistent.rows[0].triaje, 'La prioridad final y la cita conservan coherencia bajo concurrencia');
    }

    // 7. Consulta real: persiste visita/cargo y finaliza la cita en la misma transacción.
    const fin = await call('medico', 'POST', '/api/visitas', { id_cita: idCita2, diagnostico: 'Diagnóstico sintético', tratamiento: 'Seguimiento de prueba', costo_consulta: 120 });
    check(fin.status === 201 && fin.body.id_visita, `Consulta persistida: ${JSON.stringify(fin.body)}`);
    const closed = await call('medico', 'GET', `/api/citas/${idCita2}`);
    check(closed.body.estado === 'completada' && closed.body.hora_fin_atencion, 'Consulta finalizada');
    const charge = await pool.query("SELECT total FROM cargos_paciente WHERE referencia_tipo='visita' AND referencia_id=$1", [fin.body.id_visita]);
    check(Number(charge.rows[0].total) === 120, 'Cargo de consulta persistido');

    // Bitácora.
    const hist = await call('medico', 'GET', `/api/triajes/cita/${idCita2}/historial`);
    check(['REGISTRO', 'VALIDACION', 'LLAMADO', 'INICIO_ATENCION'].every((a) => hist.body.some((h) => h.accion === a)), 'Bitácora completa');

    // 8. Reglas y aprobación médica.
    const reglas = await call('medico', 'GET', '/api/triajes/reglas');
    check(reglas.body.validacion.todos_correctos && reglas.body.validacion.total === 20, 'Batería 20/20');
    check(reglas.body.aprobacion.estado === 'PENDIENTE_APROBACION_MEDICA', 'Pendiente de aprobación');
    const ap = await call('medico', 'POST', '/api/triajes/reglas/aprobacion', { decision: 'APROBADA' });
    check(ap.status === 201, 'Aprobación registrada');

    // 9. Indicadores y línea base.
    const csv = 'codigo_hoja;fecha;hora_llegada;hora_valoracion;hora_inicio_consulta;hora_fin_consulta;prioridad\n' +
      Array.from({ length: 6 }, (_, i) => `H${i + 1};2026-09-0${i + 1};08:00;08:30;09:40;10:00;P3`).join('\n');
    const sim = await call('medico', 'POST', '/api/indicadores/linea-base/lotes', { nombre: 'Septiembre', csv, simular: true });
    check(sim.status === 200 && sim.body.filas_validas === 6, `Simulación de línea base: ${JSON.stringify(sim.body)}`);
    const lote = await call('medico', 'POST', '/api/indicadores/linea-base/lotes', { nombre: 'Septiembre', csv });
    check(lote.status === 201, 'Lote guardado');
    const bad = await call('medico', 'POST', '/api/indicadores/linea-base/lotes', { nombre: 'Malo', csv: 'fecha;hora_llegada\n2026-13-40;99:99' });
    check(bad.status === 422 && bad.body.details.total_errores > 0, 'Lote con errores no se guarda');
    const rep = await call('medico', 'GET', '/api/indicadores');
    check(rep.status === 200 && rep.body.antes.volumen.registros === 6, 'Reporte antes/después');
    check(rep.body.despues.volumen.registros >= 3 && rep.body.despues.distribucion_prioridades.P1.n === 1, 'Distribución de prioridades del sistema');
    check(rep.body.despues.concordancia_motor.manuales >= 1, 'Concordancia y clasificaciones manuales');
    check((await call('enfermero', 'GET', '/api/indicadores')).status === 403, 'Enfermería no ve indicadores');

    console.log(`${passed} comprobaciones aprobadas: recepción, evaluación SATS, motor P1–P4, validación profesional, cola médica, consulta, bitácora, reglas e indicadores.`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await db.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });

// Solo ejecutar desde el arnés PostgreSQL temporal; proveedor de correo simulado.
const assert = require('node:assert/strict');
if (process.env.RUN_DB_INTEGRATION !== 'true' || process.env.DB_NAME !== 'centromedico_isolated_test' || process.env.DB_HOST !== '127.0.0.1') {
  console.error('Esta prueba requiere el clúster PostgreSQL temporal del arnés aislado.'); process.exit(1);
}
const pool = require('../src/config/db');
const { ensureSchema } = require('../schema');
const { createService } = require('../src/modules/notificaciones/notificaciones.service');
process.env.EMAIL_ENABLED = 'true'; process.env.RESEND_API_KEY = 'synthetic-never-used';
process.env.EMAIL_FROM = 'Centro <avisos@example.invalid>';
process.env.APP_URL = 'https://frontend.example.invalid'; process.env.PUBLIC_API_URL = 'https://backend.example.invalid';
(async () => {
  try {
    await ensureSchema(pool);
    const user = (await pool.query(`INSERT INTO usuarios(nombre,email,password,rol) VALUES ('Correo prueba','correo@example.invalid','synthetic','admin') RETURNING id_usuario,rol`)).rows[0];
    const patient = (await pool.query(`INSERT INTO pacientes(nombre,dni,email) VALUES ('Paciente correo','0000000000099','paciente@example.invalid') RETURNING id_paciente`)).rows[0];
    let calls = 0;
    const sent = [];
    const service = createService(pool, async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails'); calls++; sent.push(options);
      await new Promise(resolve => setTimeout(resolve, 40));
      return { ok: true, status: 200, json: async () => ({ id: 'synthetic-provider' }) };
    });
    const input = { tipo: 'paciente_bienvenida', entidad_id: patient.id_paciente, destinatario_confirmado: true, email_confirmado: 'paciente@example.invalid' };
    await Promise.all(Array.from({ length: 6 }, () => service.send(input, user)));
    assert.equal(calls, 1, 'Reclamo SQL y restricción única evitan correos concurrentes');
    const records = (await pool.query('SELECT * FROM notificaciones_correo')).rows;
    assert.equal(records.length, 1); assert.equal(records[0].estado, 'aceptado');
    await service.send(input, user); assert.equal(calls, 1);
    const unconfigured = { ...input, tipo: 'estado_cuenta' };
    process.env.EMAIL_ENABLED = 'false';
    const pending = await service.send(unconfigured, user); assert.equal(pending.estado, 'pendiente');
    process.env.EMAIL_ENABLED = 'true';
    const retry = await service.retry(pending.id, input, user); assert.equal(retry.estado, 'aceptado');
    assert.match(JSON.parse(sent.at(-1).body).text, /\/api\/notificaciones\/estado-cuenta\//);
    const bad = { ...input, tipo: 'usuario_bienvenida', entidad_id: user.id_usuario, email_confirmado: 'correo@example.invalid' };
    const failing = createService(pool, async () => { throw new Error('SYNTHETIC_TIMEOUT'); });
    const uncertain = await failing.send(bad, user); assert.equal(uncertain.estado, 'desconocido');
    await pool.query(`UPDATE notificaciones_correo SET primer_intento=NOW()-INTERVAL '24 hours' WHERE id=$1`, [uncertain.id]);
    await assert.rejects(service.retry(uncertain.id, bad, user), { status: 409 });
    console.log('APROBADO correo PostgreSQL: esquema real, unicidad, seis envíos concurrentes, pendientes, reintentos y vigencia; cero correos reales.');
  } finally { await pool.end(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

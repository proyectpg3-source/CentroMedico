const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
if (process.env.RUN_DB_INTEGRATION !== 'true' || !/_test$/i.test(process.env.DB_NAME || '')) throw Error('Requiere PostgreSQL de pruebas aislado.');
const pool = require('../src/config/db');
const app = require('../src/app');
const jwt = require('jsonwebtoken');
const { ensureSchema } = require('../schema');
(async () => {
  const server = app.listen(0); await new Promise(r => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api/atenciones-rapidas`;
  const tokens = {}; const ids = {}; let checks = 0;
  async function call(role, method = 'GET', body, suffix = '') {
    const res = await fetch(base+suffix, { method, headers: { 'Content-Type':'application/json', ...(role ? { Authorization:'Bearer '+tokens[role] } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, body: await res.json() };
  }
  function check(actual, expected) { assert.deepEqual(actual, expected); checks++; }
  try {
    await ensureSchema(pool);
    for (const rol of ['admin','medico','enfermero','recepcionista','fundacion']) {
      const u = (await pool.query('INSERT INTO usuarios (nombre,email,password,rol,activo) VALUES ($1,$2,$3,$4,TRUE) RETURNING id_usuario', ['SQA '+rol, randomUUID()+'@example.invalid','unused-test-password',rol])).rows[0];
      ids[rol] = u.id_usuario; tokens[rol] = jwt.sign({id_usuario:u.id_usuario},process.env.JWT_SECRET,{algorithm:'HS256'});
    }
    check((await call(null)).status,401);
    check((await call('fundacion')).status,403);
    const payload = {solicitud:randomUUID(),motivo:'Ingreso sintético SQA'};
    check((await call('fundacion','POST',payload)).status,403);
    check((await call('recepcionista','POST',{...payload,motivo:' '})).status,400);
    const parallel = await Promise.all([call('recepcionista','POST',payload),call('recepcionista','POST',payload)]);
    check(parallel.map(x=>x.status).sort(),[200,201]);
    const item = parallel[0].body; const path = '/'+item.id;
    check(item.id_paciente,null); check(item.iniciado_por,ids.recepcionista);
    check((await call('recepcionista')).body.filter(x=>x.id===item.id).length,1);
    check((await call('medico','POST',payload)).status,409);
    check((await call('recepcionista','PATCH',{estado:'en_atencion'},path)).status,403);
    check((await call('medico','PATCH',{estado:'finalizada'},path)).status,409);
    check((await call('medico','PATCH',{estado:'en_atencion'},path)).status,200);
    check((await call('enfermero','PATCH',{estado:'en_atencion'},path)).status,409);
    check((await call('enfermero','PATCH',{estado:'finalizada'},path)).status,200);
    check((await call('admin','PATCH',{id_paciente:'12abc'},path)).status,400);
    check((await call('admin','PATCH',{id_paciente:2147483647},path)).status,400);
    const p = (await pool.query('INSERT INTO pacientes (nombre,dni) VALUES ($1,$2) RETURNING id_paciente',['PACIENTE SQA',randomUUID()])).rows[0];
    check((await call('recepcionista','PATCH',{id_paciente:p.id_paciente},path)).status,200);
    const p2 = (await pool.query('INSERT INTO pacientes (nombre,dni) VALUES ($1,$2) RETURNING id_paciente',['OTRO SQA',randomUUID()])).rows[0];
    check((await call('admin','PATCH',{id_paciente:p2.id_paciente},path)).status,409);
    const persisted = (await pool.query('SELECT * FROM atenciones_rapidas WHERE id=$1',[item.id])).rows[0];
    check(persisted.estado,'finalizada'); check(persisted.id_paciente,p.id_paciente); check(persisted.atendido_por,ids.medico);
    const backup = await fetch(base.replace('/atenciones-rapidas','/backups/export'),{headers:{Authorization:'Bearer '+tokens.admin}});
    check(backup.status,200); check((await backup.json()).data.atencionesRapidas.some(x=>x.id===item.id),true);
    console.log(`${checks} comprobaciones aprobadas: permisos, persistencia, duplicados concurrentes, transiciones, vínculo y respaldo.`);
  } finally { await new Promise(r=>server.close(r)); await pool.end(); }
})().catch(e=>{console.error(e);process.exitCode=1;});

// HTTP regression of appointment conversion; production service and charge logic.
// All PostgreSQL interactions are strictly simulated; no real data/schema touched.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const secret = crypto.randomBytes(48).toString('hex'); process.env.JWT_SECRET = secret;
let appointment, visit, charge, insertions, committed;
function reset(state = 'confirmada') {
  appointment = { id_cita: 41, id_paciente: 51, id_medico: 61, fecha_hora: '2026-10-11T16:00:00Z', motivo: 'Consulta sintética', estado: state };
  visit = null; charge = null; insertions = 0; committed = false;
}
async function query(sql, params = []) {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (s.startsWith('SELECT id_usuario, nombre, email, rol, id_medico, activo FROM usuarios WHERE')) return { rows: [{ id_usuario: 1, rol: 'admin', activo: true }] };
  if (['BEGIN','ROLLBACK'].includes(s)) return { rows: [] };
  if (s === 'COMMIT') { committed=true; return { rows: [] }; }
  if (s === 'SELECT * FROM citas WHERE id_cita=$1') return { rows: params[0]===41 ? [appointment] : [] };
  if (s.startsWith('INSERT INTO visitas_medicas ')) {
    if (visit) throw Object.assign(new Error('Synthetic unique violation'), { code: '23505' });
    insertions++;
    visit = { id_visita: 71, id_cita: params[0], id_paciente: params[1], id_medico: params[2], fecha_visita: params[3], motivo: params[4], diagnostico: params[18], costo_consulta: params[30] };
    return { rows: [{ id_visita: 71 }] };
  }
  if (s.startsWith('UPDATE citas SET estado=')) { appointment.estado='completada'; return { rows: [] }; }
  if (s.startsWith('UPDATE ordenes_laboratorio SET id_visita=')) return { rows: [] };
  if (s.startsWith('SELECT id_cargo FROM cargos_paciente WHERE referencia_tipo')) return { rows: [], rowCount: 0 };
  if (s.startsWith('INSERT INTO cargos_paciente ')) { charge={ id_cargo:81, id_paciente:params[0], referencia_id:params[3], total:params[6] }; return { rows: [{ id_cargo:81 }] }; }
  if (s === 'SELECT * FROM cargos_paciente WHERE id_cargo = $1') return { rows:[charge] };
  if (s.startsWith('SELECT COALESCE(SUM(monto), 0)')) return { rows:[{total_pagado:0}] };
  if (s.startsWith('UPDATE cargos_paciente SET saldo')) { charge.saldo=params[0]; return {rows:[]}; }
  if (s.includes('FROM cargos_paciente cp') && s.includes('WHERE cp.id_cargo = $1')) return {rows:[charge]};
  if (s.includes('FROM visitas_medicas v') && s.includes('WHERE v.id_visita=$1')) return {rows:[visit]};
  if (s.startsWith('INSERT INTO eventos_auditoria')) return { rows: [], rowCount: 1 };
  throw new Error('UNEXPECTED_QUERY');
}
const pool={query,connect:async()=>({query,release(){}})};
for(const [file,exports] of [['../src/config/db',pool],['../schema',{ensureSchema:async()=>{}}]]){ const id=require.resolve(file);require.cache[id]={id,filename:id,loaded:true,exports}; }
const app=require('../src/app');
(async()=>{
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+server.address().port;
  const payload={id_cita:41,fecha_visita:'2026-10-11T17:00:00Z',motivo:'Consulta sintética',diagnostico:'Diagnóstico de prueba',costo_consulta:123.45};
  const request=async data=>{const r=await fetch(base+'/api/visitas',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt.sign({id_usuario:1},secret)},body:JSON.stringify(data)});return{status:r.status,data:await r.json()};};
  let count=0;
  try{
    reset();let r=await request(payload);assert.equal(r.status,201,JSON.stringify(r.data));assert.equal(r.data.id_paciente,51);assert.equal(r.data.id_medico,61);assert.equal(r.data.fecha_visita,payload.fecha_visita);assert.equal(charge.total,123.45);assert.equal(charge.id_paciente,51);assert.equal(appointment.estado,'completada');assert.ok(committed);console.log('PASS Conversión con id_cita; paciente/médico heredados; cargo y estado');count++;
    r=await request(payload);assert.equal(r.status,409);assert.equal(insertions,1);console.log('PASS Duplicado rechazado');count++;
    for(const [name,data,status,state] of [
      ['Cita inexistente',{...payload,id_cita:999},404],
      ['Cita cancelada',payload,400,'cancelada'],
      ['Visita directa sin paciente/médico',{...payload,id_cita:null},400],
      ['Fecha inválida',{...payload,fecha_visita:'invalid'},400],
      ['Diagnóstico vacío',{...payload,diagnostico:''},400],
      ['Signos inválidos',{...payload,saturacion_oxigeno:101},400],
      ['Paciente incompatible con cita',{...payload,id_paciente:999},400],
    ]){
      reset(state);r=await request(data);assert.equal(r.status,status,name+': '+JSON.stringify(r.data));assert.equal(insertions,0);console.log('PASS '+name);count++;
    }
    reset();r=await request({...payload,id_cita:null,id_paciente:51,id_medico:61});assert.equal(r.status,201);console.log('PASS Visita directa completa');count++;
    console.log('PASS '+count+' casos de conversión; BD simulada.');
  }finally{await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.message);process.exitCode=1;});

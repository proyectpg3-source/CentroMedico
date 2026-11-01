const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
process.env.NODE_ENV = 'test';
const roles = ['admin', 'medico', 'enfermero', 'recepcionista', 'fundacion'];
const users = roles.map((rol, i) => ({ id_usuario: i+1, rol, activo:true }));
let serviceCalls=0, writes=0, audits=0;
function stub(file, exports) { const id=require.resolve(file); require.cache[id]={id, filename:id, loaded:true, exports}; }
stub('../src/config/db', { query:async (sql, params=[]) => {
  if (!sql.replace(/\s+/g,' ').trim().startsWith('SELECT id_usuario, nombre, email, rol, id_medico, activo FROM usuarios')) throw Error('Consulta inesperada fuera de autenticación');
  return {rows:users.filter(u=>u.id_usuario===params[0])};
} });
stub('../schema', {ensureSchema:async()=>{}});
stub('../src/services/audit', {logAuditEvent:async()=>{audits++;}});
const list=async()=>{serviceCalls++;return {data:[{id:101}],meta:{total:1}};};
const detail=async()=>{serviceCalls++;return {id:101};};
stub('../src/modules/visitas/visitas.service', {getAll:list,getById:detail,create:async()=>{writes++;return {id_visita:101};},update:async()=>{writes++;return {id_visita:101};}});
stub('../src/modules/analisis/analisis.service', {getFullClinicalHistory:async()=>{serviceCalls++;return {patient:{nombre:'PACIENTE SINTETICO'},history:{visits:[]}};}});
stub('../src/modules/prescripciones/prescripciones.service', {getAll:list,getById:detail});
stub('../src/modules/laboratorio/laboratorio.service', {getAllInsumos:list,getAlertasInsumos:list,getAllOrdenes:list,getOrdenById:detail,getAllResultados:list,getResultadoById:detail});
stub('../src/modules/dashboard/dashboard.service', {getResumen:async()=>({total_pacientes:1,total_visitas:1,financiera:{recaudado:120,pendiente:30}})});
const app=require('../src/app');
(async()=>{
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 let passed=0;
 async function request(rol,path,method='GET',tokenOverride){
  const user=users.find(u=>u.rol===rol);
  const token=tokenOverride || (user && jwt.sign({id_usuario:user.id_usuario,rol},process.env.JWT_SECRET));
  const r=await fetch(base+path,{method,headers:token?{Authorization:'Bearer '+token}: {}});
  return {status:r.status,body:await r.json()};
 }
 async function denied(rol,path,method='GET',status=403,token){
  const before=serviceCalls, previousAudits=audits;
  const r=await request(rol,path,method,token);assert.equal(r.status,status,`${rol} ${method} ${path}: ${JSON.stringify(r.body)}`);
  assert.equal(serviceCalls,before,'No consulta servicios clínicos');assert.equal(audits,previousAudits,'No registra falsa consulta clínica');assert.equal(writes,0);passed++;
 }
 try{
  const clinical=['/api/visitas','/api/visitas/101','/api/visitas/historial/101'];
  const pharmacyLab=['/api/prescripciones','/api/prescripciones/101','/api/laboratorio/insumos','/api/laboratorio/insumos/alertas','/api/laboratorio/ordenes','/api/laboratorio/ordenes/101','/api/laboratorio/resultados','/api/laboratorio/resultados/101'];
  for(const path of [...clinical,...pharmacyLab,'/api/dashboard/resumen']) await denied(null,path,'GET',401);
  for(const rol of ['recepcionista','fundacion']) for(const path of clinical) await denied(rol,path);
  for(const path of pharmacyLab) await denied('recepcionista',path);
  for(const rol of ['admin','medico','enfermero']) for(const path of clinical){ const r=await request(rol,path);assert.equal(r.status,200,`${rol} ${path}: ${JSON.stringify(r.body)}`);passed++; }
  for(const rol of ['admin','medico','enfermero','fundacion']) for(const path of pharmacyLab){const r=await request(rol,path);assert.equal(r.status,200,`${rol} ${path}: ${JSON.stringify(r.body)}`);passed++;}
  for(const rol of roles){const r=await request(rol,'/api/dashboard/resumen');assert.equal(r.status,200);assert.equal(Object.hasOwn(r.body,'financiera'),['admin','recepcionista','fundacion'].includes(rol));assert.equal(r.body.total_visitas,1);passed++;}
  await denied('enfermero','/api/visitas','POST');await denied('enfermero','/api/visitas/101','PUT');
  for(const rol of ['medico','enfermero','recepcionista','fundacion']) await denied(rol,'/api/auth/usuarios');
  const reception=users.find(u=>u.rol==='recepcionista');
  await denied('recepcionista','/api/visitas','GET',403,jwt.sign({id_usuario:reception.id_usuario,rol:'admin'},process.env.JWT_SECRET));
  reception.activo=false;await denied('recepcionista','/api/visitas','GET',401);reception.activo=true;
  console.log(`APROBADO: ${passed} comprobaciones de roles, lecturas clínicas, privacidad financiera, autenticación y cero escrituras rechazadas; servicios aislados.`);
 }finally{await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});

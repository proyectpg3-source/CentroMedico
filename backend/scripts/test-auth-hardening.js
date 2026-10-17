const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = require('node:crypto').randomBytes(48).toString('hex');
let user = null, comparisons = 0;
const dbId = require.resolve('../src/config/db');
require.cache[dbId] = { id: dbId, filename: dbId, loaded: true, exports: {
  async query(sql) {
    assert.equal(sql, 'SELECT * FROM usuarios WHERE email = $1');
    return { rows: user ? [user] : [] };
  }
} };
const originalCompare = bcrypt.compare;
bcrypt.compare = async (...args) => { comparisons++; return originalCompare(...args); };
const auth = require('../src/modules/auth/auth.service');
(async () => {
  let passed = 0;
  await assert.rejects(auth.login({email:'synthetic@example.invalid',password:'incorrect'}), e=>e.status===401);
  assert.equal(comparisons,1,'Correo inexistente también debe pasar por bcrypt'); passed++;
  user = { id_usuario:1, nombre:'SQA', email:'synthetic@example.invalid', rol:'admin', activo:false, password:await bcrypt.hash('correct-test-password',4) };
  await assert.rejects(auth.login({email:user.email,password:'incorrect'}), e=>e.status===401 && e.message==='Credenciales incorrectas.'); passed++;
  await assert.rejects(auth.login({email:user.email,password:'correct-test-password'}), e=>e.status===403); passed++;
  user.activo = true;
  const result = await auth.login({email:user.email,password:'correct-test-password'});
  assert.equal(result.usuario.password,undefined);
  assert.equal(jwt.decode(result.token,{complete:true}).header.alg,'HS256');
  assert.equal(jwt.verify(result.token,process.env.JWT_SECRET,{algorithms:['HS256']}).id_usuario,1); passed++;
  console.log(`${passed} pruebas de autenticación aprobadas; PostgreSQL simulado.`);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{bcrypt.compare=originalCompare;});

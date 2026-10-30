// Ejecuta el servicio real con PostgreSQL simulado, sin cargar configuracion ni esquema.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/modules/dashboard/dashboard.service.js'), 'utf8');

async function resumen(financiera) {
  let call = 0;
  const results = [{ rows: [{ total_pacientes: 4 }] }, { rows: [] }, { rows: [] }, { rows: [] }, { rows: financiera }];
  const context = {
    module: { exports: {} },
    require(name) {
      assert.equal(name, '../../config/db');
      return { query: async () => results[call++] };
    },
  };
  vm.runInNewContext(source, context);
  return context.module.exports.getResumen();
}

(async () => {
  for (const [recaudado, pendiente, expected] of [[100, 100, 50], [0, 0, 0], [100, 0, 100], [0, 100, 0]]) {
    const result = await resumen([{ recaudado, pendiente, cargos_pendientes: 2 }]);
    assert.equal(result.financiera.indiceCobrabilidad, expected);
    assert.equal(result.total_pacientes, 4);
    assert.equal(result.financiera.cargos_pendientes, 2);
  }
  assert.equal((await resumen([])).financiera.indiceCobrabilidad, 0);
  console.log('APROBADO: resumen del dashboard en 5 escenarios financieros.');
})().catch(error => { console.error(error); process.exitCode = 1; });

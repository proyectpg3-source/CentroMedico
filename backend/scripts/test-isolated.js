// npm test nunca carga el esquema ni se conecta a PostgreSQL real.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const scripts = ['test-security.js', 'test-auth-hardening.js', 'test-input-validation.js', 'test-settings.js', 'test-visit-conversion.js', 'test-payment-guard.js', 'test-dashboard.js', 'test-daily-summary.js', 'test-triage-evidence.js', 'test-flujo-motor.js', 'test-email.js'];
const results = [];
for (const script of scripts) {
  const r = spawnSync(process.execPath, [path.join(__dirname, script)], { encoding: 'utf8', windowsHide: true, timeout: 60000 });
  const status = r.status === 0 ? 'APROBADO' : 'FALLIDO';
  const summary = (r.stdout || '').trim().split('\n').at(-1);
  results.push({ script, status, summary, output: r.stdout, errors: r.stderr, processError: r.error?.message });
  console.log(`${status} ${script}: ${summary}`);
  if (r.status !== 0) { console.error(r.stderr || r.error); process.exitCode = 1; }
}
const dir = path.resolve(__dirname, '../../output/sqa'); fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'resultados_pruebas_aisladas.json'), JSON.stringify({ executedAt: new Date().toISOString(), environment: 'PostgreSQL simulado; sin migraciones ni cuentas reales', results }, null, 2));

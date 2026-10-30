// Crea un cluster PostgreSQL temporal independiente. Nunca carga el .env del proyecto.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const { spawnSync } = require('node:child_process');
const { Client } = require('pg');
const bin = process.env.PG_TEST_BIN || 'C:/Program Files/PostgreSQL/16/bin';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'centromedico-pg-test-'));
const data = path.join(root, 'data');
const results = [];
let started = false;
function run(exe, args, env = process.env) {
  const r = spawnSync(exe, args, { env, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024, cwd: path.resolve(__dirname, '..') });
  if (r.status !== 0) throw new Error((r.error?.message || '') + '\n' + r.stdout + '\n' + r.stderr);
  return r.stdout;
}
async function freePort() {
  const s = net.createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r));
  const p = s.address().port; await new Promise(r => s.close(r)); return p;
}
(async () => {
  const password = crypto.randomBytes(32).toString('hex');
  const passwordFile = path.join(root, 'password');
  fs.writeFileSync(passwordFile, password, { mode: 0o600 });
  const port = await freePort();
  const env = { ...process.env, DB_HOST: '127.0.0.1', DB_PORT: String(port), DB_USER: 'postgres', DB_PASSWORD: password, DB_NAME: 'centromedico_isolated_test', DB_SSL: 'false', JWT_SECRET: crypto.randomBytes(48).toString('hex'), NODE_ENV: 'test', RUN_DB_INTEGRATION: 'true', TRIAGE_SERVICE_URL: '', INVENTORY_ALERTS_SERVICE_URL: '', RATE_LIMIT_DISABLED: 'false', RATE_LIMIT_API_PER_MIN: '300', RATE_LIMIT_LOGIN_MAX: '10' };
  try {
    run(path.join(bin, 'initdb.exe'), ['-D', data, '-U', 'postgres', '--auth=scram-sha-256', '--pwfile=' + passwordFile, '--encoding=UTF8', '--locale=C']);
    fs.unlinkSync(passwordFile);
    run(path.join(bin, 'pg_ctl.exe'), ['-D', data, '-l', path.join(root, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']);
    started = true;
    const c = new Client({ host: '127.0.0.1', port, user: 'postgres', password, database: 'postgres' });
    await c.connect();
    try { await c.query('CREATE DATABASE centromedico_isolated_test'); } finally { await c.end(); }
    for (const script of ['test-query-schema.js', 'test-payments-concurrency.js', 'test-clinical-flow.js', 'test-quick-care.js', 'test-daily-summary-postgres.js']) {
      console.log('EJECUTANDO ' + script + ' en PostgreSQL temporal');
      try {
        const output = run(process.execPath, [path.join(__dirname, script)], env);
        results.push({ script, status: 'APROBADO', output }); console.log(output.trim());
      } catch (error) { results.push({ script, status: 'FALLIDO', error: error.message }); throw error; }
    }
  } finally {
    let stopped = !started;
    if (started) { run(path.join(bin, 'pg_ctl.exe'), ['-D', data, '-m', 'fast', '-w', 'stop']); stopped = true; }
    // Solo eliminar el directorio unico creado por este proceso, tras detener el cluster.
    const resolved = path.resolve(root);
    if (stopped && path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('centromedico-pg-test-')) fs.rmSync(resolved, { recursive: true });
    const out = path.resolve(__dirname, '../../output/sqa'); fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'resultados_postgres_aislado.json'), JSON.stringify({ executedAt: new Date().toISOString(), environment: 'PostgreSQL 16 temporal con puerto y credenciales propios; datos sinteticos', results, stopped }, null, 2));
  }
  console.log('PostgreSQL temporal detenido y eliminado. Base del centro medico sin modificar.');
})().catch(e => { console.error(e.message); process.exitCode = 1; });

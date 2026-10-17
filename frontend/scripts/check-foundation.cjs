// UI real con todas las APIs interceptadas; sin datos ni cuentas reales.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext();
    const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5178';
    const calls = [], errors = [];
    let role = 'fundacion';
    await context.addInitScript(() => localStorage.setItem('centro-medico.auth-token', 'synthetic'));
    await context.route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.pathname.startsWith('/api/')) {
        calls.push(u.pathname);
        if (u.pathname === '/api/pacientes') return route.fulfill({ status: 403, json: { message: 'Acceso denegado.' } });
        const fixtures = {
          '/api/auth/me': { usuario: { id_usuario: 5, nombre: 'Fundacion sintetica', rol: role, activo: true } },
          '/api/pacientes/opciones': { data: [{ id_paciente: 901, nombre: 'PACIENTE SINTETICO' }], meta: { total: 137, page: 1, limit: 100, totalPages: 2 } },
          '/api/medicos': [{ id_medico: 1, nombre: 'Medico sintetico', especialidad: 'General', activo: true }],
          '/api/laboratorio/insumos/alertas': { summary: { totalAlerts: 0 }, alerts: [] },
        };
        return route.fulfill({ json: fixtures[u.pathname] ?? [] });
      }
      return u.origin === base ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/appointments');
    await page.getByRole('heading', { name: 'Bandeja de citas', exact: true }).waitFor();
    await page.goto(base + '/laboratory');
    await page.getByRole('heading', { name: 'Laboratorio', exact: true }).waitFor();
    await page.goto(base + '/reports');
    await page.getByText('137', { exact: true }).waitFor();
    role = 'admin';
    await page.goto(base + '/appointments');
    await page.getByRole('button', { name: 'Nueva cita', exact: true }).last().click();
    await page.locator('option[value="901"]').waitFor({ state: 'attached' });
    assert.match(await page.locator('option[value="901"]').innerText(), /PACIENTE SINTETICO/);
    await page.goto(base + '/laboratory');
    await page.getByRole('button', { name: /Nueva orden/ }).click();
    await page.locator('option[value="901"]').waitFor({ state: 'attached' });
    assert.ok(!calls.includes('/api/pacientes'), 'Las pantallas no deben solicitar la ficha completa');
    assert.deepEqual(errors, []);
    console.log('APROBADO: Fundacion carga citas/laboratorio/reportes; administracion usa el selector limitado, sin solicitar fichas completas. APIs simuladas.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

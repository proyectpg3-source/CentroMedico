// Isolated browser checks. Every API request is intercepted; no real accounts or database.
// Requires Playwright: PLAYWRIGHT_MODULE may point at an existing installation.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const output = process.env.UI_OUTPUT || path.resolve('output/ui-review');
  fs.mkdirSync(output, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let role = 'admin';
  let loginAttempts = 0;
  let appointmentsUnavailable = false;
  const user = () => ({ id_usuario: 1, nombre: 'Usuario de prueba', email: 'demo@example.test', rol: role, activo: true, id_medico: null });
  await context.route('**/api/**', async (route) => {
    const endpoint = new URL(route.request().url()).pathname;
    if (endpoint === '/api/auth/login') {
      loginAttempts++;
      return route.fulfill({ status: 401, json: { message: 'Credenciales incorrectas.' } });
    }
    if (endpoint === '/api/citas' && appointmentsUnavailable) return route.fulfill({ status: 503, json: { message: 'Agenda no disponible.' } });
    const fixtures = {
      '/api/auth/me': { usuario: user() },
      '/api/pacientes/opciones': { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } },
      '/api/health': { status: 'ok', database: 'connected' },
      '/api/dashboard/resumen': { total_pacientes: 24, total_medicos: 3, total_citas: 0, citas_por_mes: [], citas_por_estado: [] },
      '/api/analisis/indicadores': { citas_activas: 0, citas_alta_prioridad: 0, espera_promedio_minutos: 0, diagnosticos_frecuentes: [], motivos_frecuentes: [] },
      '/api/laboratorio/insumos/alertas': { source: 'isolated-fixture', summary: { totalItems: 0, lowStock: 0, outOfStock: 0, expired: 0, expiringSoon: 0, totalAlerts: 0 }, alerts: [], expiringSoonDays: 180 },
      '/api/configuracion': { centerName: 'Centro Médico La Aurora', rut: '', address: '', phone: '', email: '', website: '', timezone: 'America/Guatemala', language: 'Español (Latinoamérica)' },
    };
    return route.fulfill({ json: fixtures[endpoint] ?? [] });
  });
  // Also block any third-party requests; the preview remains entirely local.
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.fallback();
    if (url.origin === new URL(base).origin) return route.continue();
    return route.abort();
  });
  const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5178';
  const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal document overflow');
  try {
    await page.goto(base + '/login');
    await page.getByRole('heading', { name: 'Centro Médico La Aurora' }).waitFor();
    await page.screenshot({ path: path.join(output, 'login-desktop.png'), fullPage: true });
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    assert.equal(loginAttempts, 0, 'Empty form must not call login');
    await page.getByLabel('Correo electrónico').fill('demo@example.test');
    await page.getByLabel('Contraseña', { exact: true }).fill('synthetic-password');
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    assert.equal(await page.getByLabel('Contraseña', { exact: true }).getAttribute('type'), 'text');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').innerText(), /correo o la contraseña/);
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow();
    await page.screenshot({ path: path.join(output, 'login-mobile.png'), fullPage: true });

    await page.evaluate(() => localStorage.setItem('centro-medico.auth-token', 'isolated-ui-fixture'));
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base);
    await page.getByRole('heading', { name: 'El pulso de La Aurora' }).waitFor();
    await page.locator('.clinic-kpi').first().getByText('24', { exact: true }).waitFor();
    const quickActions = page.getByRole('navigation', { name: 'Accesos rápidos' });
    assert.equal(await quickActions.getByRole('link').count(), 4);
    await page.getByText('Todavía no hay una tendencia', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(output, 'dashboard-desktop.png'), fullPage: true });
    await noOverflow();
    await page.getByRole('button', { name: 'Colapsar menu lateral' }).click();
    assert.equal(await page.locator('.clinic-sidebar').getAttribute('data-collapsed'), 'true');
    await page.getByRole('link', { name: 'Configuración', exact: true }).waitFor();
    await page.keyboard.press('Control+k');
    await page.getByRole('dialog').waitFor();
    await page.getByLabel('Buscar módulo', { exact: true }).fill('configuracion');
    assert.equal(await page.getByRole('navigation', { name: 'Resultados de módulos' }).getByRole('link').count(), 1);
    await page.getByLabel('Buscar módulo', { exact: true }).fill('zzzz');
    await page.getByText('No hay módulos con ese nombre.', { exact: false }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.getByRole('dialog').count(), 0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Abrir menú lateral' }).click();
    assert.equal(await page.locator('.clinic-sidebar').getAttribute('data-collapsed'), 'false', 'Mobile menu must show labels even after desktop collapse');
    await page.getByRole('link', { name: 'Configuración', exact: true }).waitFor();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Cerrar sesion');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.clinic-sidebar').getAttribute('data-mobile-open'), 'false');
    await page.locator('.clinic-sidebar').waitFor({ state: 'hidden' });
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Abrir menú lateral');
    await noOverflow();
    await page.screenshot({ path: path.join(output, 'dashboard-mobile.png'), fullPage: true });
    for (const width of [320, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await noOverflow();
    }
    await page.setViewportSize({ width: 390, height: 844 });

    role = 'recepcionista';
    appointmentsUnavailable = true;
    await page.reload();
    assert.equal(await quickActions.getByRole('link', { name: /Triaje/ }).count(), 0);
    await page.getByText('Agenda no disponible.', { exact: false }).waitFor();
    assert.match(await page.locator('.clinic-kpi').nth(1).innerText(), /Datos no disponibles/);
    await page.getByRole('button', { name: 'Buscar módulo' }).click();
    await page.getByLabel('Buscar módulo', { exact: true }).fill('configuracion');
    assert.equal(await page.getByRole('navigation', { name: 'Resultados de módulos' }).getByRole('link').count(), 0);
    await page.getByLabel('Buscar módulo', { exact: true }).fill('pacientes');
    await page.getByLabel('Buscar módulo', { exact: true }).press('Enter');
    await page.waitForURL('**/patients');
    await page.getByRole('heading', { name: 'Pacientes', exact: true }).waitFor();
    await noOverflow();
    appointmentsUnavailable = false;
    await page.goto(base + '/appointments');
    await page.locator('.clinic-header').waitFor();
    await page.getByRole('button', { name: 'Buscar módulo' }).waitFor();
    await noOverflow();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: path.join(output, 'appointments-desktop.png'), fullPage: true });

    // Review shared chrome in every routed module with an administrator fixture.
    role = 'admin';
    for (const modulePath of ['patients', 'appointments', 'recepcion', 'triage', 'doctors', 'laboratory', 'inventory', 'inventario-general', 'farmacia', 'records', 'documentos', 'prescriptions', 'billing', 'facturacion', 'reports', 'prioritization', 'settings', 'account']) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(base + '/' + modulePath);
      await page.locator('.clinic-header').waitFor();
      await noOverflow();
      await page.getByRole('navigation', { name: 'Ubicación actual' }).waitFor();
      await page.screenshot({ path: path.join(output, modulePath + '-desktop.png'), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await noOverflow();
      if (modulePath === 'settings') {
        for (const label of ['RUT', 'Teléfono de Contacto', 'Email Institucional', 'Sitio Web']) {
          const field = await page.getByLabel(label, { exact: true }).boundingBox();
          assert.ok(field && field.width > 200, 'Settings fields must have readable mobile widths: ' + label);
        }
      }
      await page.screenshot({ path: path.join(output, modulePath + '-mobile.png'), fullPage: true });
    }
    assert.deepEqual(errors, [], 'Browser runtime errors');
    console.log('PASS: login; desktop/mobile layouts in 18 modules; role-aware shortcuts; empty chart; collapsed/mobile navigation; keyboard search; unavailable data; readable mobile settings; no runtime errors.');
    console.log('Screenshots: ' + output);
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5178';
    await context.addInitScript(() => localStorage.setItem('centro-medico.auth-token', 'synthetic'));
    await context.route('**/*', route => {
      const u = new URL(route.request().url());
      if (u.pathname.startsWith('/api/')) {
        const fixtures = {
          '/api/auth/me': { usuario: { id_usuario: 1, nombre: 'Prueba apariencia', rol: 'admin', activo: true } },
          '/api/configuracion': { centerName: 'Centro sintetico', rut: '', phone: '', email: '', website: '', address: '', timezone: 'America/Guatemala', language: 'Español (Latinoamérica)' },
        };
        return route.fulfill({ json: fixtures[u.pathname] ?? [] });
      }
      return u.origin === base ? route.continue() : route.abort();
    });
    const page = await context.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    const open = async () => { await page.goto(base + '/settings'); await page.getByRole('button', { name: 'Apariencia', exact: true }).click(); };
    await open();
    await page.getByRole('radio', { name: /^Grande/ }).check();
    await page.waitForFunction(() => getComputedStyle(document.documentElement).fontSize === '18px');
    await page.getByRole('checkbox', { name: /^Reducir movimiento/ }).check();
    await page.waitForFunction(() => document.documentElement.dataset.reduceMotion === 'true');
    await open();
    assert.ok(await page.getByRole('radio', { name: /^Grande/ }).isChecked());
    assert.ok(await page.getByRole('checkbox', { name: /^Reducir movimiento/ }).isChecked());
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Desbordamiento a ' + width);
    }
    const out = path.resolve('../output/pendientes-verificados'); fs.mkdirSync(out, { recursive: true });
    await page.screenshot({ path: path.join(out, 'apariencia-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 900 });
    await page.screenshot({ path: path.join(out, 'apariencia-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Restablecer apariencia' }).click();
    await page.waitForFunction(() => getComputedStyle(document.documentElement).fontSize === '16px');
    assert.ok(!(await page.getByRole('checkbox', { name: /^Reducir movimiento/ }).isChecked()));
    await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key === 'centro-medico.appearance') throw new Error('Synthetic storage failure'); return original.call(this, key, value); }; });
    await page.getByRole('radio', { name: /^Grande/ }).click();
    await page.getByRole('alert').waitFor();
    assert.equal(await page.getByRole('status').count(), 0);
    assert.equal(await page.locator('html').getAttribute('data-text-size'), 'normal');
    assert.deepEqual(errors, []);
    console.log('APROBADO: tamano real de texto, persistencia al recargar, movimiento reducido, restauracion y error de almacenamiento sin falso exito; 320/390/768/1440 px. APIs simuladas.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

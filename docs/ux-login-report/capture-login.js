const fs = require("fs");
const path = require("path");
const { chromium } = require("C:/Users/eliazar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const phase = process.argv[2] || "capture";
const baseUrl = process.argv[3] || "http://localhost:5173/login";
const outDir = path.resolve(__dirname, "captures");

async function waitForLogin(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => window.localStorage.clear());
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: "C:/Progra~1/BraveSoftware/Brave-Browser/Application/brave.exe",
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 1365, height: 768 },
    deviceScaleFactor: 1,
  });

  await waitForLogin(page);
  await page.screenshot({
    path: path.join(outDir, `${phase}-01-inicio.png`),
    fullPage: true,
  });

  await page.locator('button[aria-label="Ingresar"]').click();
  await page.waitForTimeout(900);
  await page.screenshot({
    path: path.join(outDir, `${phase}-02-areas.png`),
    fullPage: true,
  });

  const showAreasButton = page.locator('button[aria-label^="Mostrar"]');
  if (await showAreasButton.count()) {
    await showAreasButton.first().click();
    await page.waitForTimeout(900);
  }

  const roleButtons = page.locator("button").filter({ hasText: "Recepcionista" });
  if (await roleButtons.count()) {
    await roleButtons.first().click();
  } else {
    await page.locator("button").nth(2).click();
  }
  await page.waitForTimeout(900);
  await page.screenshot({
    path: path.join(outDir, `${phase}-03-formulario.png`),
    fullPage: true,
  });

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

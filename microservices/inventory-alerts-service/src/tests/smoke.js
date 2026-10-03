import assert from "node:assert/strict";
import { createApp } from "../app.js";

const app = createApp();
const server = app.listen(0);
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json().catch(() => ({}));
  assert.equal(response.status, options.expected ?? 200, payload.message ?? response.statusText);
  return Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload;
}

try {
  const health = await request("/health");
  assert.equal(health.service, "inventory-alerts-service");

  const now = new Date();
  now.setUTCDate(now.getUTCDate() + 20);

  const alerts = await request("/alerts", {
    method: "POST",
    body: {
      expiringSoonDays: 180,
      items: [
        {
          id: "inv-test-1",
          name: "Amoxicilina",
          category: "Medicamento",
          unit: "cajas",
          stock: 2,
          minStock: 5,
          expirationDate: now.toISOString().slice(0, 10)
        }
      ]
    }
  });
  assert.equal(alerts.source, "inventory-alerts-service");
  assert.equal(alerts.summary.lowStock, 1);
  assert.equal(alerts.summary.expiringSoon, 1);
  assert.equal(alerts.alerts.length, 2);

  console.log("Smoke test OK: inventory-alerts-service.");
} finally {
  await new Promise((resolve) => server.close(resolve));
}

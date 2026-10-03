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
  assert.equal(health.service, "triage-priority-service");

  const priority = await request("/prioritize", {
    method: "POST",
    body: {
      chiefComplaint: "Dificultad para respirar y dolor toracico",
      birthDate: "1950-01-01",
      vitalPa: "185/122",
      vitalFr: 31,
      vitalFc: 126,
      vitalTemp: 39.1,
      vitalSpo2: 89
    }
  });
  assert.equal(priority.level, "critica");
  assert.equal(priority.source, "triage-priority-service");
  assert.ok(priority.reasons.some((reason) => reason.includes("Presion arterial")));

  console.log("Smoke test OK: triage-priority-service.");
} finally {
  await new Promise((resolve) => server.close(resolve));
}

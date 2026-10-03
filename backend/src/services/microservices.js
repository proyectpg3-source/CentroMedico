function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getTimeoutMs() {
  const timeout = Number(process.env.MICROSERVICE_TIMEOUT_MS || 1500);
  return Number.isFinite(timeout) && timeout > 0 ? timeout : 1500;
}

async function requestJson(baseUrl, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || `Microservicio respondio ${response.status}.`);
    }

    return Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload;
  } finally {
    clearTimeout(timer);
  }
}

function buildTriagePayload(input = {}) {
  return {
    reason: input.motivo || input.motivo_consulta,
    triageNotes: [input.triaje_notas, input.observaciones].filter(Boolean).join(" "),
    chiefComplaint: input.motivo_consulta || input.motivo,
    currentIllness: input.historia_enfermedad_actual,
    medicalHistory: [
      input.antecedentes_relevantes,
      input.alergias_referidas,
      input.diagnostico,
      input.tratamiento,
    ].filter(Boolean).join(" "),
    birthDate: input.fecha_nacimiento || null,
    vitalPa: input.presion_arterial || null,
    vitalTemp: input.temperatura ?? null,
    vitalSpo2: input.saturacion_oxigeno ?? null,
    vitalFc: input.frecuencia_cardiaca ?? null,
    vitalFr: input.frecuencia_respiratoria ?? null,
  };
}

async function assessTriagePriority(input) {
  const baseUrl = process.env.TRIAGE_SERVICE_URL;
  if (!baseUrl) return null;

  const result = await requestJson(baseUrl, "/prioritize", buildTriagePayload(input));
  return {
    puntaje_prioridad: result.score,
    prioridad_clinica: result.level,
    motivos_prioridad: Array.isArray(result.reasons)
      ? result.reasons.join(" ")
      : "Prioridad calculada por microservicio.",
    fuente_prioridad: result.source || "triage-priority-service",
  };
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function daysUntilExpiration(value, now = new Date()) {
  if (!value) return null;
  const rawDate = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const expiration = new Date(`${rawDate}T12:00:00`);
  if (Number.isNaN(expiration.getTime())) return null;

  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  return Math.ceil((expiration.getTime() - today.getTime()) / 86400000);
}

function buildLocalInventoryAlerts(items, expiringSoonDays) {
  const alerts = [];
  const summary = {
    totalItems: items.length,
    totalAlerts: 0,
    lowStock: 0,
    outOfStock: 0,
    expired: 0,
    expiringSoon: 0,
  };

  items.forEach((item) => {
    const stock = asNumber(item.stock);
    const minStock = asNumber(item.minStock);
    if (stock <= minStock) {
      summary.lowStock += 1;
      if (stock <= 0) summary.outOfStock += 1;
      alerts.push({
        key: `${item.id}-low`,
        itemId: item.id,
        type: "stock",
        level: "low",
        name: item.name,
        badge: String(stock),
        detail: `${item.category} - stock ${stock} ${item.unit}, minimo ${minStock} ${item.unit}`,
        recommendation: "Reponer inventario antes del siguiente turno.",
        order: stock <= 0 ? 0.5 : 1,
      });
    }

    const days = daysUntilExpiration(item.expirationDate);
    if (days === null) return;
    if (days < 0) {
      summary.expired += 1;
      alerts.push({
        key: `${item.id}-expired`,
        itemId: item.id,
        type: "expiration",
        level: "expired",
        name: item.name,
        badge: "Vencido",
        detail: `Vencio hace ${Math.abs(days)} dias - stock ${stock} ${item.unit}`,
        recommendation: "Retirar del inventario utilizable y registrar reposicion.",
        order: 0,
      });
      return;
    }
    if (days <= expiringSoonDays) {
      summary.expiringSoon += 1;
      alerts.push({
        key: `${item.id}-expiring`,
        itemId: item.id,
        type: "expiration",
        level: "expiring",
        name: item.name,
        badge: `${days} d`,
        detail: `Vence en ${days} dias - stock ${stock} ${item.unit}`,
        recommendation: "Priorizar uso o planificar reposicion.",
        order: 2 + days,
      });
    }
  });

  alerts.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  summary.totalAlerts = alerts.length;

  return {
    source: "fallback-local",
    generatedAt: new Date().toISOString(),
    expiringSoonDays,
    summary,
    alerts,
  };
}

async function buildInventoryAlerts(items) {
  const expiringSoonDays = Number(process.env.INVENTORY_EXPIRING_SOON_DAYS || 180);
  const baseUrl = process.env.INVENTORY_ALERTS_SERVICE_URL;

  if (!baseUrl) return buildLocalInventoryAlerts(items, expiringSoonDays);

  try {
    return await requestJson(baseUrl, "/alerts", { items, expiringSoonDays });
  } catch (error) {
    return {
      ...buildLocalInventoryAlerts(items, expiringSoonDays),
      serviceWarning: error.message,
    };
  }
}

async function healthFor(name, baseUrl) {
  if (!baseUrl) {
    return { name, status: "disabled", mode: "fallback-local" };
  }

  try {
    const result = await requestJson(baseUrl, "/health");
    return {
      name,
      status: result.status || "ok",
      service: result.service || name,
      url: normalizeBaseUrl(baseUrl),
    };
  } catch (error) {
    return {
      name,
      status: "unavailable",
      mode: "fallback-local",
      url: normalizeBaseUrl(baseUrl),
      error: error.message,
    };
  }
}

async function getMicroserviceHealth() {
  return {
    generatedAt: new Date().toISOString(),
    services: await Promise.all([
      healthFor("triage-priority-service", process.env.TRIAGE_SERVICE_URL),
      healthFor("inventory-alerts-service", process.env.INVENTORY_ALERTS_SERVICE_URL),
    ]),
  };
}

module.exports = {
  assessTriagePriority,
  buildInventoryAlerts,
  getMicroserviceHealth,
};

const DEFAULT_EXPIRING_SOON_DAYS = 180;

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeItem(item) {
  return {
    id: item.id,
    name: item.name ?? "Articulo sin nombre",
    category: item.category ?? "General",
    unit: item.unit || "unidad",
    stock: asNumber(item.stock),
    minStock: asNumber(item.minStock ?? item.min_stock),
    expirationDate: item.expirationDate ?? item.expiration_date ?? null
  };
}

function dateAtNoon(value) {
  if (!value) return null;
  const rawDate = value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
  const date = new Date(`${rawDate}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function daysUntilExpiration(expirationDate, now = new Date()) {
  const expiration = dateAtNoon(expirationDate);
  if (!expiration) return null;

  const today = new Date(now);
  if (Number.isNaN(today.getTime())) return null;
  today.setHours(12, 0, 0, 0);

  return Math.ceil((expiration.getTime() - today.getTime()) / 86400000);
}

export function buildInventoryAlerts({
  items = [],
  expiringSoonDays = DEFAULT_EXPIRING_SOON_DAYS,
  now = new Date()
} = {}) {
  const normalizedItems = items.map(normalizeItem);
  const alerts = [];
  const summary = {
    totalItems: normalizedItems.length,
    totalAlerts: 0,
    lowStock: 0,
    outOfStock: 0,
    expired: 0,
    expiringSoon: 0
  };

  normalizedItems.forEach((item) => {
    if (item.stock <= item.minStock) {
      summary.lowStock += 1;
      if (item.stock <= 0) summary.outOfStock += 1;
      alerts.push({
        key: `${item.id}-low`,
        itemId: item.id,
        type: "stock",
        level: "low",
        name: item.name,
        badge: String(item.stock),
        detail: `${item.category} - stock ${item.stock} ${item.unit}, minimo ${item.minStock} ${item.unit}`,
        recommendation: "Reponer inventario antes del siguiente turno.",
        order: item.stock <= 0 ? 0.5 : 1
      });
    }

    const days = daysUntilExpiration(item.expirationDate, now);
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
        detail: `Vencio hace ${Math.abs(days)} dias - stock ${item.stock} ${item.unit}`,
        recommendation: "Retirar del inventario utilizable y registrar reposicion.",
        order: 0
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
        detail: `Vence en ${days} dias - stock ${item.stock} ${item.unit}`,
        recommendation: "Priorizar uso o planificar reposicion.",
        order: 2 + days
      });
    }
  });

  alerts.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  summary.totalAlerts = alerts.length;

  return {
    source: "inventory-alerts-service",
    generatedAt: new Date(now).toISOString(),
    expiringSoonDays,
    summary,
    alerts
  };
}

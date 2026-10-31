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
    source: "local",
    generatedAt: new Date().toISOString(),
    expiringSoonDays,
    summary,
    alerts,
  };
}

async function buildInventoryAlerts(items) {
  const expiringSoonDays = Number(process.env.INVENTORY_EXPIRING_SOON_DAYS || 180);
  return buildLocalInventoryAlerts(items, expiringSoonDays);
}

module.exports = { buildInventoryAlerts };

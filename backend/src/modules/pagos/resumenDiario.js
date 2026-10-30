const TIME_ZONE = "America/Guatemala";

function localDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type).value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function validateDate(value, now = new Date()) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw Object.assign(new Error("Selecciona una fecha valida (AAAA-MM-DD)."), { status: 400 });
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value || value < "1900-01-01" || value > localDate(now)) {
    throw Object.assign(new Error("La fecha debe existir y no puede ser futura."), { status: 400 });
  }
  return value;
}

async function getDailySummary(db, value, now = new Date()) {
  const fecha = validateDate(value === undefined ? localDate(now) : value, now);
  // Una sola consulta mantiene totales y desglose en el mismo snapshot.
  // El intervalo semiabierto incluye medianoche inicial y excluye la siguiente.
  const { rows } = await db.query(`
    WITH movimientos AS (
      SELECT monto, COALESCE(NULLIF(LOWER(BTRIM(metodo)), ''), 'sin especificar') AS metodo
      FROM pagos
      WHERE fecha_pago >= ($1::date::timestamp AT TIME ZONE 'America/Guatemala')
        AND fecha_pago < (($1::date + 1)::timestamp AT TIME ZONE 'America/Guatemala')
    ), metodos AS (
      SELECT metodo, COUNT(*)::int AS cantidad, SUM(monto)::text AS total
      FROM movimientos GROUP BY metodo
    )
    SELECT COUNT(*)::int AS cantidad, COALESCE(SUM(monto), 0)::text AS total,
      COALESCE((SELECT json_agg(metodos ORDER BY metodo) FROM metodos), '[]'::json) AS metodos
    FROM movimientos
  `, [fecha]);
  return { fecha, zona_horaria: TIME_ZONE, ...rows[0] };
}

module.exports = { localDate, validateDate, getDailySummary };

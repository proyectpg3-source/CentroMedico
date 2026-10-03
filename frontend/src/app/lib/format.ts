export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function numericValue(value: number | string | null | undefined) {
  const parsed = typeof value === "string" ? Number(value) : value ?? 0;
  return Number.isFinite(parsed) ? Number(parsed) : 0;
}

export function formatCurrency(value: number | string | null | undefined) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(numericValue(value));
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(date);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function toDateInputValue(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toTimeInputValue(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function toDateTimePayload(date: string, time: string) {
  return new Date(`${date}T${time || "00:00"}:00`).toISOString();
}

export function waitColor(minutes: number | string | null | undefined) {
  const value = numericValue(minutes);
  if (value >= 30) return "text-red-600";
  if (value >= 15) return "text-amber-600";
  return "text-slate-500";
}

export function formatDuration(minutes: number | string | null | undefined) {
  const value = numericValue(minutes);

  if (!Number.isFinite(value) || value <= 0) {
    return "Inactivo";
  }

  const totalMinutes = Math.round(value);
  const ONE_DAY_MINUTES = 24 * 60;

  if (totalMinutes >= ONE_DAY_MINUTES) {
    return "> 24 h";
  }

  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    return remainingMinutes > 0 ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
  }

  return `${totalMinutes} min`;
}

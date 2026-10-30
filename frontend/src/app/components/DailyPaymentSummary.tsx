import { useEffect, useState } from "react";
import { fetchDailyPaymentSummary, type DailyPaymentSummary as Summary } from "../api/billing";
import { formatCurrency, getErrorMessage } from "../lib/format";

function todayInGuatemala() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Guatemala", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function DailyPaymentSummary({ revision }: { revision: number }) {
  const [date, setDate] = useState(todayInGuatemala);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setSummary(null);
    setError(null);
    setLoading(true);
    fetchDailyPaymentSummary(date, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setSummary(result); })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(getErrorMessage(reason, "No se pudo consultar el resumen."));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, revision, refresh]);

  return (
    <section aria-labelledby="daily-summary-title" aria-busy={loading} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="daily-summary-title" className="text-lg font-semibold text-slate-900">Cobros del día</h2>
          <p className="text-sm text-slate-500">Pagos por fecha de pago, en horario de Guatemala.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-slate-700">
            Fecha
            <input type="date" min="1900-01-01" max={todayInGuatemala()} value={date}
              onChange={(event) => { if (event.target.value) setDate(event.target.value); }}
              className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </label>
          <button type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50">Actualizar</button>
        </div>
      </div>
      <div aria-live="polite" className="mt-4">
        {loading && <p className="text-sm text-slate-500">Consultando cobros…</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error} Usa Actualizar para reintentar.</p>}
        {summary && <>
          <p className="text-2xl font-semibold tabular-nums text-emerald-700">{formatCurrency(summary.total)}</p>
          <p className="text-sm text-slate-500">{summary.cantidad} pagos registrados</p>
          {summary.cantidad === 0 ? <p className="mt-3 text-sm text-slate-600">No hay pagos para esta fecha.</p> :
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              {summary.metodos.map((method) => <div key={method.metodo} className="border-l-2 border-emerald-200 pl-3">
                <dt className="text-sm capitalize text-slate-600">{method.metodo} · {method.cantidad} pagos</dt>
                <dd className="font-semibold tabular-nums text-slate-900">{formatCurrency(method.total)}</dd>
              </div>)}
            </dl>}
          <p className="mt-4 text-xs text-slate-500">Resumen informativo; no representa un cierre ni un arqueo de efectivo.</p>
        </>}
      </div>
    </section>
  );
}

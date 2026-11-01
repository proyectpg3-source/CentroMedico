import { useEffect, useState } from "react";
import { AlertCircle, Download, FileUp, Loader2, RefreshCcw, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Header } from "../components/layout/Header";
import { usePermissions } from "../auth/usePermissions";
import {
  fetchBaselineBatches,
  fetchBaselineTemplate,
  fetchIndicators,
  uploadBaseline,
  voidBaseline,
  type BaselineBatch,
  type BatchResult,
  type ComparisonRow,
  type IndicatorsReport,
  type Level,
} from "../api/indicators";
import { formatDateTime, getErrorMessage } from "../lib/format";

const LEVELS: Level[] = ["P1", "P2", "P3", "P4"];

const CONCLUSION: Record<ComparisonRow["conclusion"], { text: string; tone: string; icon: typeof Minus }> = {
  MEJORA_SIGNIFICATIVA: { text: "Mejora significativa", tone: "bg-emerald-100 text-emerald-800", icon: TrendingDown },
  EMPEORA_SIGNIFICATIVO: { text: "Empeora (significativo)", tone: "bg-rose-100 text-rose-800", icon: TrendingUp },
  SIN_DIFERENCIA_SIGNIFICATIVA: { text: "Sin diferencia significativa", tone: "bg-slate-100 text-slate-700", icon: Minus },
  SIN_DATOS_SUFICIENTES: { text: "Datos insuficientes", tone: "bg-amber-50 text-amber-800", icon: Minus },
};

function minutes(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (value >= 120) return `${Math.round((value / 60) * 10) / 10} h`;
  return `${value} min`;
}

function percent(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : `${value} %`;
}

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" }).format(new Date());
}

function daysAgo(n: number) {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guatemala" }).format(date);
}

function BaselinePanel({ canUpload, canVoid, onChanged }: { canUpload: boolean; canVoid: boolean; onChanged: () => void }) {
  const [batches, setBatches] = useState<BaselineBatch[]>([]);
  const [name, setName] = useState("");
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<BatchResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setBatches(await fetchBaselineBatches());
    } catch (reason) {
      setError(getErrorMessage(reason, "No se pudieron cargar los lotes."));
    }
  }
  useEffect(() => { void load(); }, []);

  async function downloadTemplate() {
    try {
      const template = await fetchBaselineTemplate();
      const url = URL.createObjectURL(new Blob(["﻿" + template.csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "plantilla-linea-base.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setError(getErrorMessage(reason, "No se pudo descargar la plantilla."));
    }
  }

  async function send(simular: boolean) {
    setBusy(true);
    setError(null);
    try {
      const result = await uploadBaseline({ nombre: name.trim(), csv, simular });
      if (simular) {
        setPreview(result);
      } else {
        setPreview(null);
        setCsv("");
        setFileName("");
        setName("");
        await load();
        onChanged();
      }
    } catch (reason) {
      setPreview(null);
      setError(getErrorMessage(reason, "No se pudo procesar el archivo."));
    } finally {
      setBusy(false);
    }
  }

  async function voidBatch(batch: BaselineBatch) {
    const reason = window.prompt(`Motivo para anular "${batch.nombre}" (mínimo 5 caracteres):`);
    if (!reason) return;
    try {
      await voidBaseline(batch.id_lote, reason);
      await load();
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo anular el lote."));
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Línea base (periodo anterior al sistema)</h2>
          <p className="text-sm text-slate-500">Hojas de observación sin datos personales: código de hoja, horas y prioridad.</p>
        </div>
        <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Plantilla CSV</button>
      </div>

      {canUpload && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del lote (ej. Observación septiembre 2026)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <FileUp className="h-4 w-4" />{fileName || "Elegir archivo CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFileName(file.name);
                setPreview(null);
                setCsv(await file.text());
              }}
            />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={busy || !csv || name.trim().length < 3} onClick={() => send(true)} className="rounded-lg border border-blue-200 px-3 py-2 text-sm text-blue-700 disabled:opacity-50">Revisar</button>
            <button type="button" disabled={busy || !preview} onClick={() => send(false)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Guardar</button>
          </div>
        </div>
      )}
      {preview && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {preview.filas_validas} filas válidas del {preview.desde} al {preview.hasta} · {preview.con_prioridad} con prioridad · {preview.con_consulta} con hora de consulta. Pulsa «Guardar» para registrarlas.
        </p>
      )}
      {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2 pr-3">Lote</th><th className="py-2 pr-3">Periodo</th><th className="py-2 pr-3">Registros</th><th className="py-2 pr-3">Registrado</th><th className="py-2"></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {batches.length === 0 && <tr><td colSpan={5} className="py-3 text-slate-500">Sin lotes registrados.</td></tr>}
            {batches.map((batch) => (
              <tr key={batch.id_lote} className={batch.anulado ? "text-slate-400 line-through" : ""}>
                <td className="py-2 pr-3">{batch.nombre}</td>
                <td className="py-2 pr-3">{batch.desde} – {batch.hasta}</td>
                <td className="py-2 pr-3">{batch.total_registros}</td>
                <td className="py-2 pr-3 text-xs">{formatDateTime(batch.registrado_en)} · {batch.usuario || "—"}</td>
                <td className="py-2 text-right">{canVoid && !batch.anulado && <button type="button" onClick={() => voidBatch(batch)} className="text-xs text-rose-700 hover:underline">Anular</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Indicators() {
  const { role } = usePermissions();
  const [desde, setDesde] = useState(daysAgo(29));
  const [hasta, setHasta] = useState(today());
  const [report, setReport] = useState<IndicatorsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    try {
      setLoading(true);
      setError(null);
      setReport(await fetchIndicators({ desde, hasta }, signal));
    } catch (reason) {
      if (!signal?.aborted) setError(getErrorMessage(reason, "No se pudieron calcular los indicadores."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const distribution = report
    ? LEVELS.map((level) => ({
        nivel: level,
        Antes: report.antes.distribucion_prioridades[level]?.porcentaje ?? 0,
        Después: report.despues.distribucion_prioridades[level]?.porcentaje ?? 0,
      }))
    : [];

  const motor = report?.despues.concordancia_motor;
  const quality = report?.despues.calidad_registro;

  return (
    <div className="flex min-h-full flex-col">
      <Header title="Indicadores de optimización" subtitle="Tiempos de espera, valoración y prioridades: antes y después del sistema" />
      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="text-xs text-slate-600">Después: desde
            <input type="date" value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-slate-600">hasta
            <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"><RefreshCcw className="h-4 w-4" />Calcular</button>
          {report && (
            <p className="text-xs text-slate-500">
              Antes: {report.periodo_antes.desde ? `${report.periodo_antes.desde} – ${report.periodo_antes.hasta}` : "sin línea base"} ({report.antes.volumen.registros} registros) ·
              Después: {report.periodo_despues.desde} – {report.periodo_despues.hasta} ({report.despues.volumen.registros} registros)
            </p>
          )}
        </section>

        {error && <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800"><AlertCircle className="h-5 w-5" />{error}</div>}

        {loading && !report ? (
          <div className="flex min-h-60 items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : report && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Espera hasta la consulta (mediana)", before: report.antes.tiempos.llegada_consulta?.mediana, after: report.despues.tiempos.llegada_consulta?.mediana, fmt: minutes, onlySystem: false },
                { label: "Tiempo hasta la valoración (mediana)", before: report.antes.tiempos.llegada_valoracion?.mediana, after: report.despues.tiempos.llegada_valoracion?.mediana, fmt: minutes, onlySystem: false },
                { label: "Atendidos dentro del objetivo", before: report.comparacion.cumplimiento_objetivo.antes, after: report.comparacion.cumplimiento_objetivo.despues, fmt: percent, onlySystem: false },
                { label: "Espera en cola médica (mediana)", before: null, after: report.despues.tiempos.espera_cola?.mediana, fmt: minutes, onlySystem: true },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{card.fmt(card.after)}</p>
                  <p className="text-xs text-slate-500">{card.onlySystem ? "Solo existe con el sistema" : card.before === null || card.before === undefined ? "Antes: sin línea base" : `Antes: ${card.fmt(card.before)}`}</p>
                </div>
              ))}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Comparación antes / después</h2>
              <p className="text-sm text-slate-500">Mismas definiciones en ambos periodos. Prueba U de Mann-Whitney bilateral (α = 0,05; mínimo 5 registros por periodo).</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2 pr-3">Indicador</th><th className="py-2 pr-3">Mediana antes</th><th className="py-2 pr-3">Mediana después</th><th className="py-2 pr-3">Cambio</th><th className="py-2 pr-3">n (antes/después)</th><th className="py-2 pr-3">p</th><th className="py-2">Conclusión</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.comparacion.tiempos.map((row) => {
                      const c = CONCLUSION[row.conclusion];
                      return (
                        <tr key={row.codigo}>
                          <td className="py-2 pr-3 text-slate-800" title={report.definiciones.find((d) => d.codigo === row.codigo)?.descripcion}>{row.nombre}</td>
                          <td className="py-2 pr-3">{minutes(row.mediana_antes)}</td>
                          <td className="py-2 pr-3">{minutes(row.mediana_despues)}</td>
                          <td className="py-2 pr-3">{row.diferencia_minutos === null ? "—" : `${row.diferencia_minutos > 0 ? "+" : ""}${row.diferencia_minutos} min${row.cambio_porcentaje !== null ? ` (${row.cambio_porcentaje > 0 ? "+" : ""}${row.cambio_porcentaje} %)` : ""}`}</td>
                          <td className="py-2 pr-3 text-xs">{row.prueba.n_antes} / {row.prueba.n_despues}</td>
                          <td className="py-2 pr-3 text-xs">{row.prueba.aplicable ? row.prueba.p_valor : "—"}</td>
                          <td className="py-2"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.tone}`}><c.icon className="h-3 w-3" />{c.text}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">Distribución de prioridades (%)</h2>
                <p className="text-sm text-slate-500">Después: solo prioridades validadas por el personal. Sin prioridad: {report.despues.distribucion_prioridades.sin_prioridad}.</p>
                <div className="mt-3 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribution}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="nivel" />
                      <YAxis unit="%" />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Antes" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Después" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-900">Cumplimiento del tiempo objetivo por prioridad</h2>
                <table className="mt-3 w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Nivel</th><th className="py-2">Objetivo</th><th className="py-2">Antes</th><th className="py-2">Después</th><th className="py-2">Mediana después</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {LEVELS.map((level) => (
                      <tr key={level}>
                        <td className="py-2 font-semibold">{level}</td>
                        <td className="py-2">{minutes(report.objetivos_minutos[level])}</td>
                        <td className="py-2">{percent(report.antes.por_prioridad[level]?.cumplimiento_porcentaje)}</td>
                        <td className="py-2">{percent(report.despues.por_prioridad[level]?.cumplimiento_porcentaje)}</td>
                        <td className="py-2">{minutes(report.despues.por_prioridad[level]?.espera_hasta_consulta.mediana)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {motor && (
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Concordancia motor / personal</p><p className="text-lg font-semibold">{percent(motor.concordancia_porcentaje)}</p><p className="text-xs text-slate-500">{motor.confirmadas_sin_cambio} sin cambio · {motor.elevadas_por_personal} elevadas · {motor.disminuidas_por_personal} disminuidas</p></div>
                    <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Clasificaciones manuales</p><p className="text-lg font-semibold">{motor.manuales}</p><p className="text-xs text-slate-500">de {motor.priorizaciones} priorizaciones</p></div>
                    {quality && <div className="col-span-2 rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Evaluaciones con revisión SATS completa</p><p className="text-lg font-semibold">{percent(quality.porcentaje)}</p><p className="text-xs text-slate-500">{quality.revision_discriminadores_completa} de {quality.valoraciones_sats}</p></div>}
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        <BaselinePanel canUpload={role === "admin" || role === "medico"} canVoid={role === "admin"} onChanged={() => void load()} />
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, Loader2, RefreshCcw, Scale, ShieldCheck, XCircle } from "lucide-react";
import { Header } from "../components/layout/Header";
import { usePermissions } from "../auth/usePermissions";
import {
  approvePriorityRules,
  fetchPriorityRules,
  fetchTriages,
  validateTriage,
  type PriorityLevel,
  type RulesOverview,
  type TriageRecord,
} from "../api/triage";
import { LevelBadge, LEVEL_META, PriorityProposalCard } from "../components/PriorityProposal";
import { formatDateTime, getErrorMessage } from "../lib/format";

const LEVELS: PriorityLevel[] = ["P1", "P2", "P3", "P4"];

const FIELD_LABELS: Record<string, string> = {
  movilidad: "Movilidad",
  frecuencia_respiratoria: "FR",
  frecuencia_cardiaca: "FC",
  presion_sistolica: "PAS",
  temperatura: "Temperatura",
  estado_conciencia: "Conciencia",
  trauma: "Trauma",
};

function SatsSummary({ triage }: { triage: TriageRecord }) {
  const tews = triage.clasificacion_sats?.tews;
  const disc = triage.clasificacion_sats?.discriminadores;
  return (
    <div className="space-y-2 text-xs text-slate-600">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-md bg-slate-100 px-2 py-1">Edad {triage.edad_evaluacion ?? "sin registrar"}</span>
        <span className="rounded-md bg-slate-100 px-2 py-1">Movilidad {triage.movilidad ?? "—"}</span>
        <span className="rounded-md bg-slate-100 px-2 py-1">Conciencia {triage.estado_conciencia ?? "—"}</span>
        <span className="rounded-md bg-slate-100 px-2 py-1">Trauma {triage.trauma ?? "—"}</span>
        <span className="rounded-md bg-slate-100 px-2 py-1">P/A {triage.presion_arterial || "—"} · FC {triage.frecuencia_cardiaca ?? "—"} · FR {triage.frecuencia_respiratoria ?? "—"} · T {triage.temperatura ?? "—"} · SpO2 {triage.saturacion_oxigeno ?? "—"}</span>
      </div>
      {tews?.aplicable && tews.componentes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tews.componentes.map((c) => (
            <span key={c.campo} className={`rounded-md border px-2 py-0.5 ${c.estado === "MEDIDO" ? "border-slate-200 bg-white" : c.estado === "NO_OBTENIBLE" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
              {FIELD_LABELS[c.campo] || c.campo}: {c.estado === "MEDIDO" ? c.puntaje : c.estado === "NO_OBTENIBLE" ? `no obtenible (≤${c.puntaje_maximo_posible})` : c.estado.toLowerCase()}
            </span>
          ))}
        </div>
      )}
      {disc && <p>Discriminadores revisados: {disc.total_revisados}/{disc.total_catalogo}{disc.presentes.length > 0 ? ` · presentes: ${disc.presentes.join(", ")}` : ""}</p>}
    </div>
  );
}

function ValidationForm({ triage, onValidated }: { triage: TriageRecord; onValidated: (record: TriageRecord) => void }) {
  const proposed = triage.estado_propuesta !== "SIN_PROPUESTA" ? triage.nivel_propuesto : null;
  const [level, setLevel] = useState<PriorityLevel | null>(proposed);
  const [justification, setJustification] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasons: string[] = [];
  if (!proposed) reasons.push("No hay propuesta del motor: la clasificación será manual.");
  if (proposed && level && level !== proposed) reasons.push(`Modificas la propuesta ${proposed} a ${level}.`);
  if (proposed && triage.requiere_justificacion) reasons.push("La propuesta es provisional o tiene alertas de inconsistencia.");
  const needsJustification = reasons.length > 0;

  async function submit() {
    if (!level) return;
    setSaving(true);
    setError(null);
    try {
      onValidated(await validateTriage({ id_cita: triage.id_cita, prioridad_final: level, justificacion: justification.trim() || null }));
    } catch (reason) {
      setError(getErrorMessage(reason, "No se pudo validar la prioridad."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">Validación profesional</p>
      <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Prioridad final">
        {LEVELS.map((item) => (
          <button
            key={item}
            type="button"
            role="radio"
            aria-checked={level === item}
            onClick={() => setLevel(item)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${level === item ? LEVEL_META[item].solid + " border-transparent" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            {item}{item === proposed ? " · propuesta" : ""}
          </button>
        ))}
      </div>
      {needsJustification && (
        <ul className="mt-2 list-disc pl-5 text-xs text-amber-800">
          {reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      )}
      <label className="mt-2 block text-xs text-slate-600">
        Justificación clínica {needsJustification ? "(obligatoria, mínimo 10 caracteres)" : "(opcional)"}
        <textarea rows={2} value={justification} onChange={(e) => setJustification(e.target.value)} maxLength={1000} className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" />
      </label>
      {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
      <button
        type="button"
        disabled={!level || saving || (needsJustification && justification.trim().length < 10)}
        onClick={submit}
        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
        {!level ? "Elige un nivel" : level === proposed ? `Confirmar ${level} y enviar a la cola` : `Validar como ${level} y enviar a la cola`}
      </button>
    </div>
  );
}

function RulesPanel({ canApprove }: { canApprove: boolean }) {
  const [rules, setRules] = useState<RulesOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<"APROBADA" | "OBSERVADA">("APROBADA");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function load(signal?: AbortSignal) {
    try {
      setRules(await fetchPriorityRules(signal));
    } catch (reason) {
      if (!signal?.aborted) setError(getErrorMessage(reason, "No se pudieron cargar las reglas."));
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  async function approve() {
    setSaving(true);
    setError(null);
    try {
      await approvePriorityRules({ decision, observaciones: notes.trim() || undefined });
      setNotes("");
      await load();
    } catch (reason) {
      setError(getErrorMessage(reason, "No se pudo registrar la decisión."));
    } finally {
      setSaving(false);
    }
  }

  if (!rules) return error ? <p className="text-sm text-rose-700">{error}</p> : <Loader2 className="h-6 w-6 animate-spin text-blue-600" />;

  const status = rules.aprobacion.estado;
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Conjunto {rules.version_reglas}</h2>
            <p className="text-sm text-slate-500">{rules.base}. Se aplica el nivel más urgente entre discriminadores y TEWS.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === "APROBADA" ? "bg-emerald-100 text-emerald-800" : status === "OBSERVADA" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
            {status === "PENDIENTE_APROBACION_MEDICA" ? "Pendiente de aprobación médica" : status === "APROBADA" ? "Aprobada" : "Observada"}
          </span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2 pr-3">Código</th><th className="py-2 pr-3">Nivel</th><th className="py-2">Condición</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rules.reglas.map((rule) => (
                <tr key={rule.codigo}><td className="py-2 pr-3 font-mono text-xs">{rule.codigo}</td><td className="py-2 pr-3"><LevelBadge level={rule.nivel} /></td><td className="py-2 text-slate-700">{rule.descripcion}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="mt-5 text-sm font-semibold text-slate-900">Política de datos faltantes</h3>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {rules.politica_propuesta.map((policy) => <li key={policy.codigo}><span className="font-mono text-xs text-slate-800">{policy.codigo}</span> · {policy.descripcion}</li>)}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Batería de validación: {rules.validacion.correctos}/{rules.validacion.total} casos con el resultado esperado</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2 pr-3">Caso</th><th className="py-2 pr-3">Esperado</th><th className="py-2 pr-3">Obtenido</th><th className="py-2"></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {rules.validacion.casos.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-3 text-slate-700"><span className="font-mono text-xs">{item.id}</span> {item.titulo}</td>
                  <td className="py-2 pr-3 text-xs">{item.esperado.nivel ?? "sin propuesta"}</td>
                  <td className="py-2 pr-3 text-xs">{item.obtenido.nivel ?? "sin propuesta"}{item.obtenido.reglas.length ? ` · ${item.obtenido.reglas.join(", ")}` : ""}</td>
                  <td className="py-2">{item.correcto ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Correcto" /> : <XCircle className="h-4 w-4 text-rose-600" aria-label="Distinto" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Aprobación médica</h3>
        {rules.historial_aprobaciones.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Aún no hay decisiones registradas para esta versión.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm text-slate-600">
            {rules.historial_aprobaciones.map((item) => (
              <li key={item.id_aprobacion}>{formatDateTime(item.registrado_en)} · <strong>{item.decision}</strong> por {item.usuario || "usuario"} ({item.casos_correctos}/{item.casos_validados}){item.observaciones ? ` · ${item.observaciones}` : ""}</li>
            ))}
          </ul>
        )}
        {canApprove && (
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              {(["APROBADA", "OBSERVADA"] as const).map((item) => (
                <button key={item} type="button" onClick={() => setDecision(item)} className={`rounded-lg border px-3 py-1.5 text-sm ${decision === item ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 text-slate-700"}`}>{item === "APROBADA" ? "Aprobar" : "Registrar observaciones"}</button>
              ))}
            </div>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={decision === "OBSERVADA" ? "Describe las observaciones (mínimo 10 caracteres)" : "Observaciones (opcional)"} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            {error && <p className="text-sm text-rose-700">{error}</p>}
            <button type="button" disabled={saving || (decision === "OBSERVADA" && notes.trim().length < 10)} onClick={approve} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Guardando…" : "Registrar decisión"}</button>
          </div>
        )}
      </section>
    </div>
  );
}

export default function Prioritization() {
  const { role } = usePermissions();
  const canValidate = role === "admin" || role === "medico";
  const [tab, setTab] = useState<"pendientes" | "validadas" | "reglas">("pendientes");
  const [triages, setTriages] = useState<TriageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadData(signal?: AbortSignal) {
    try {
      setLoading(true);
      setError(null);
      setTriages(await fetchTriages(signal, { abiertas: true }));
    } catch (reason) {
      if (!signal?.aborted) setError(getErrorMessage(reason, "No se pudieron cargar las evaluaciones."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, []);

  const pending = useMemo(() => triages.filter((t) => t.estado_prioridad === "propuesto" && !t.hora_inicio_atencion), [triages]);
  const validated = useMemo(() => triages.filter((t) => t.estado_prioridad === "validado"), [triages]);
  const withProposal = pending.filter((t) => t.nivel_propuesto).length;

  return (
    <div className="flex min-h-full flex-col">
      <Header title="Validación profesional" subtitle="Confirma o modifica con justificación la propuesta P1–P4 del motor" />
      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Pendientes de validación", value: pending.length, icon: ClipboardCheck },
            { label: "Con propuesta del motor", value: withProposal, icon: Scale },
            { label: "Validadas (citas abiertas)", value: validated.length, icon: ShieldCheck },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? "..." : item.value}</p></div>
                <item.icon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1" role="tablist">
            {([
              ["pendientes", "Pendientes"],
              ["validadas", "Validadas"],
              ["reglas", "Reglas P1–P4"],
            ] as const).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} type="button" onClick={() => setTab(key)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === key ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{label}</button>
            ))}
          </div>
          {tab !== "reglas" && (
            <button type="button" onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><RefreshCcw className="h-4 w-4" />Actualizar</button>
          )}
        </div>

        {!canValidate && tab !== "reglas" && (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Solo el personal médico autorizado puede validar prioridades. Aquí puedes consultar el estado.</p>
        )}
        {error && <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800"><AlertCircle className="h-5 w-5" />{error}</div>}
        {success && <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5" />{success}</div>}

        {tab === "reglas" ? (
          <RulesPanel canApprove={canValidate} />
        ) : loading ? (
          <div className="flex min-h-60 items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : tab === "pendientes" ? (
          pending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No hay evaluaciones pendientes de validación.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {pending.map((triage) => (
                <article key={triage.id_triaje} className={`space-y-3 rounded-2xl border border-l-4 border-slate-200 bg-white p-5 shadow-sm ${triage.nivel_propuesto ? LEVEL_META[triage.nivel_propuesto].border : "border-l-slate-300"}`}>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">{triage.paciente_nombre || "Paciente"}</h2>
                    <p className="text-sm text-slate-500">Evaluado {formatDateTime(triage.fecha_triaje)}{triage.usuario_registro_nombre ? ` por ${triage.usuario_registro_nombre}` : ""} · {triage.medico_nombre || "sin médico"}</p>
                    <p className="mt-2 text-sm text-slate-700">{triage.motivo_consulta}</p>
                  </div>
                  <SatsSummary triage={triage} />
                  <PriorityProposalCard proposal={triage.propuesta} />
                  {canValidate && (
                    <ValidationForm
                      triage={triage}
                      onValidated={(record) => {
                        setSuccess(`${record.paciente_nombre || "Paciente"}: prioridad ${record.prioridad_final} validada. Ingresó a la cola médica.`);
                        void loadData();
                      }}
                    />
                  )}
                </article>
              ))}
            </div>
          )
        ) : validated.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Aún no hay prioridades validadas en citas abiertas.</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">Paciente</th><th className="px-4 py-3">Propuesta</th><th className="px-4 py-3">Final</th><th className="px-4 py-3">Origen</th><th className="px-4 py-3">Validó</th><th className="px-4 py-3">Justificación</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {validated.map((t) => (
                  <tr key={t.id_triaje}>
                    <td className="px-4 py-3 font-medium text-slate-900">{t.paciente_nombre}</td>
                    <td className="px-4 py-3">{t.nivel_propuesto ?? "—"}</td>
                    <td className="px-4 py-3"><LevelBadge level={t.prioridad_final} /></td>
                    <td className="px-4 py-3 text-xs">{t.origen_clasificacion === "MANUAL" ? "Manual" : t.prioridad_final === t.nivel_propuesto ? "Confirmada" : "Modificada"}</td>
                    <td className="px-4 py-3 text-xs">{t.usuario_validacion_nombre || "—"}<br />{formatDateTime(t.fecha_validacion)}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{t.motivo_confirmacion || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

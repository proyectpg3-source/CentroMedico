import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPlus,
  Clock3,
  HeartPulse,
  Loader2,
  Search,
  ShieldCheck,
  Stethoscope,
  X,
} from "lucide-react";
import { Header } from "../components/layout/Header";
import { usePermissions } from "../auth/usePermissions";
import { fetchAppointments, type AppointmentRecord } from "../api/appointments";
import {
  fetchSatsCatalog,
  fetchTriages,
  previewTriage,
  saveTriage,
  type Consciousness,
  type Mobility,
  type PriorityLevel,
  type ReviewState,
  type SatsCatalog,
  type TriagePayload,
  type TriagePreview,
  type TriageRecord,
  type UnavailableField,
} from "../api/triage";
import { LevelBadge, PriorityProposalCard, LEVEL_META } from "../components/PriorityProposal";
import { formatDateTime, getErrorMessage } from "../lib/format";

interface TriageFormState {
  motivo_consulta: string;
  historia_enfermedad_actual: string;
  antecedentes_relevantes: string;
  alergias_referidas: string;
  presion_arterial: string;
  frecuencia_cardiaca: string;
  frecuencia_respiratoria: string;
  temperatura: string;
  saturacion_oxigeno: string;
  peso: string;
  glucometria: string;
  observaciones: string;
  movilidad: Mobility | "";
  estado_conciencia: Consciousness | "";
  trauma: "SI" | "NO" | "";
}

const MOBILITY_OPTIONS: Array<[Mobility, string]> = [
  ["CAMINA", "Camina"],
  ["CON_AYUDA", "Con ayuda"],
  ["CAMILLA_INMOVIL", "Camilla / inmóvil"],
];
const CONSCIOUSNESS_OPTIONS: Array<[Consciousness, string]> = [
  ["ALERTA", "Alerta"],
  ["CONFUSO", "Confuso"],
  ["VOZ", "Responde a la voz"],
  ["DOLOR", "Responde al dolor"],
  ["NO_RESPONDE", "No responde"],
];
const REVIEW_OPTIONS: Array<[ReviewState, string, string]> = [
  ["PRESENTE", "Presente", "bg-rose-600 text-white border-rose-600"],
  ["AUSENTE", "Ausente", "bg-emerald-600 text-white border-emerald-600"],
  ["NO_EVALUADO", "Sin evaluar", "bg-slate-200 text-slate-700 border-slate-300"],
];

// Signos del TEWS que pueden declararse no obtenibles (con motivo).
const TEWS_VITALS: Array<{ field: keyof TriageFormState; unavailable: UnavailableField; label: string; placeholder: string }> = [
  { field: "frecuencia_respiratoria", unavailable: "frecuencia_respiratoria", label: "FR (rpm)", placeholder: "18" },
  { field: "frecuencia_cardiaca", unavailable: "frecuencia_cardiaca", label: "FC (lpm)", placeholder: "80" },
  { field: "presion_arterial", unavailable: "presion_sistolica", label: "P/A (mmHg)", placeholder: "120/80" },
  { field: "temperatura", unavailable: "temperatura", label: "Temperatura °C", placeholder: "36.5" },
];
const OTHER_VITALS: Array<{ field: keyof TriageFormState; label: string; placeholder: string }> = [
  { field: "saturacion_oxigeno", label: "SpO2 %", placeholder: "97" },
  { field: "glucometria", label: "Glucometría mg/dL", placeholder: "95" },
  { field: "peso", label: "Peso kg", placeholder: "65" },
];

function buildForm(appointment: AppointmentRecord, triage?: TriageRecord): TriageFormState {
  return {
    motivo_consulta: triage?.motivo_consulta || appointment.motivo || "",
    historia_enfermedad_actual: triage?.historia_enfermedad_actual || "",
    antecedentes_relevantes: triage?.antecedentes_relevantes || "",
    alergias_referidas: triage?.alergias_referidas || "",
    presion_arterial: triage?.presion_arterial || "",
    frecuencia_cardiaca: triage?.frecuencia_cardiaca?.toString() || "",
    frecuencia_respiratoria: triage?.frecuencia_respiratoria?.toString() || "",
    temperatura: triage?.temperatura?.toString() || "",
    saturacion_oxigeno: triage?.saturacion_oxigeno?.toString() || "",
    peso: triage?.peso?.toString() || "",
    glucometria: triage?.glucometria?.toString() || "",
    observaciones: triage?.observaciones || "",
    movilidad: triage?.movilidad || "",
    estado_conciencia: triage?.estado_conciencia || "",
    trauma: triage?.trauma || "",
  };
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) throw new Error("Revisa los signos vitales: usa valores numéricos sin unidades.");
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Revisa los signos vitales: usa valores numéricos sin unidades.");
  return parsed;
}

function ChoiceGroup<T extends string>({ label, value, options, onChange }: { label: string; value: T | ""; options: Array<[T, string]>; onChange: (value: T) => void }) {
  return (
    <fieldset>
      <legend className="text-xs font-medium text-slate-600">{label} *</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map(([option, text]) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${value === option ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function TriageModal({
  appointment,
  triage,
  catalog,
  onClose,
  onSaved,
}: {
  appointment: AppointmentRecord;
  triage?: TriageRecord;
  catalog: SatsCatalog;
  onClose: () => void;
  onSaved: (record: TriageRecord) => void;
}) {
  const [form, setForm] = useState(() => buildForm(appointment, triage));
  const [review, setReview] = useState<Record<string, ReviewState>>(() => {
    const initial: Record<string, ReviewState> = {};
    for (const item of catalog.discriminadores) initial[item.code] = triage?.revision_discriminadores?.[item.code] ?? "NO_EVALUADO";
    return initial;
  });
  const [unavailable, setUnavailable] = useState<Partial<Record<UnavailableField, string>>>(() => ({ ...(triage?.datos_no_obtenibles || {}) }));
  const [preview, setPreview] = useState<TriagePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setPreview(null); }, [form, review, unavailable]);

  const reviewed = Object.values(review).filter((state) => state !== "NO_EVALUADO").length;
  const total = catalog.discriminadores.length;
  const grouped = useMemo(() => {
    const groups: Record<PriorityLevel, typeof catalog.discriminadores> = { P1: [], P2: [], P3: [], P4: [] };
    for (const item of catalog.discriminadores) groups[item.level].push(item);
    return groups;
  }, [catalog]);

  function update<K extends keyof TriageFormState>(field: K, value: TriageFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function buildPayload(): TriagePayload {
    // Un valor medido prevalece: no se envía "no obtenible" para signos con valor.
    const cleanUnavailable: Partial<Record<UnavailableField, string>> = {};
    for (const vital of TEWS_VITALS) {
      const reason = unavailable[vital.unavailable];
      if (reason && !String(form[vital.field]).trim()) cleanUnavailable[vital.unavailable] = reason;
    }
    return {
      id_cita: appointment.id_cita,
      motivo_consulta: form.motivo_consulta.trim(),
      historia_enfermedad_actual: form.historia_enfermedad_actual.trim() || null,
      antecedentes_relevantes: form.antecedentes_relevantes.trim() || null,
      alergias_referidas: form.alergias_referidas.trim() || null,
      presion_arterial: form.presion_arterial.trim() || null,
      frecuencia_cardiaca: optionalNumber(form.frecuencia_cardiaca),
      frecuencia_respiratoria: optionalNumber(form.frecuencia_respiratoria),
      temperatura: optionalNumber(form.temperatura),
      saturacion_oxigeno: optionalNumber(form.saturacion_oxigeno),
      peso: optionalNumber(form.peso),
      glucometria: optionalNumber(form.glucometria),
      observaciones: form.observaciones.trim() || null,
      movilidad: form.movilidad || null,
      estado_conciencia: form.estado_conciencia || null,
      trauma: form.trauma || null,
      revision_discriminadores: review,
      datos_no_obtenibles: cleanUnavailable,
    };
  }

  async function handlePreview() {
    setPreviewing(true); setError(null); setPreview(null);
    try {
      setPreview(await previewTriage(buildPayload()));
    } catch (reason) {
      setError(getErrorMessage(reason, "No se pudo calcular la propuesta."));
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onSaved(await saveTriage(buildPayload()));
    } catch (saveError) {
      setError(getErrorMessage(saveError, "No se pudo guardar la evaluación."));
    } finally {
      setSaving(false);
    }
  }

  const textArea = "mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-2 sm:p-4">
      <div className="max-h-[96vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600">Evaluación de Enfermería · SATS</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{appointment.paciente_nombre || "Paciente"}</h2>
            <p className="text-sm text-slate-500">Cita #{appointment.id_cita} · {formatDateTime(appointment.fecha_hora)}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6">
          <fieldset disabled={saving || previewing} className="min-w-0 space-y-6">
            {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
            {triage?.estado_prioridad === "validado" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Esta evaluación ya tiene la prioridad {triage.prioridad_final} validada. Si guardas cambios, la validación se anula y el paciente sale de la cola hasta que se vuelva a validar.
              </div>
            )}

            <section>
              <h3 className="text-sm font-semibold text-slate-900">1. Evaluación inicial</h3>
              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-700">Motivo de consulta *</label>
                  <textarea required rows={3} value={form.motivo_consulta} onChange={(e) => update("motivo_consulta", e.target.value)} className={textArea} />
                </div>
                <div>
                  <label className="text-sm text-slate-700">Historia de la enfermedad actual</label>
                  <textarea rows={3} value={form.historia_enfermedad_actual} onChange={(e) => update("historia_enfermedad_actual", e.target.value)} className={textArea} />
                </div>
                <div>
                  <label className="text-sm text-slate-700">Antecedentes relevantes</label>
                  <textarea rows={2} value={form.antecedentes_relevantes} onChange={(e) => update("antecedentes_relevantes", e.target.value)} className={textArea} />
                </div>
                <div>
                  <label className="text-sm text-slate-700">Alergias referidas</label>
                  <textarea rows={2} value={form.alergias_referidas} onChange={(e) => update("alergias_referidas", e.target.value)} className={textArea} />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-900">2. Observaciones TEWS</h3>
              <p className="text-xs text-slate-500">Siempre deben registrarse; no se pueden declarar no obtenibles.</p>
              <div className="mt-3 space-y-3">
                <ChoiceGroup label="Movilidad" value={form.movilidad} options={MOBILITY_OPTIONS} onChange={(v) => update("movilidad", v)} />
                <ChoiceGroup label="Estado de conciencia (AVPU)" value={form.estado_conciencia} options={CONSCIOUSNESS_OPTIONS} onChange={(v) => update("estado_conciencia", v)} />
                <ChoiceGroup label="Trauma" value={form.trauma} options={[["SI", "Sí"], ["NO", "No"]]} onChange={(v) => update("trauma", v)} />
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-900">3. Signos vitales</h3>
              <p className="text-xs text-slate-500">Nunca se asume un valor normal. Si un signo del TEWS no puede medirse, declara el motivo.</p>
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {TEWS_VITALS.map((vital) => {
                  const hasValue = Boolean(String(form[vital.field]).trim());
                  return (
                    <div key={vital.field} className="rounded-xl border border-slate-200 p-3">
                      <label htmlFor={`triage-${vital.field}`} className="text-xs font-medium text-slate-600">{vital.label}</label>
                      <input
                        id={`triage-${vital.field}`}
                        inputMode={vital.field === "presion_arterial" ? "text" : "decimal"}
                        value={form[vital.field]}
                        onChange={(e) => update(vital.field, e.target.value as never)}
                        placeholder={vital.placeholder}
                        className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                      <select
                        aria-label={`Motivo si ${vital.label} no puede obtenerse`}
                        disabled={hasValue}
                        value={hasValue ? "" : unavailable[vital.unavailable] || ""}
                        onChange={(e) => setUnavailable((current) => ({ ...current, [vital.unavailable]: e.target.value || undefined }))}
                        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 disabled:opacity-50"
                      >
                        <option value="">{hasValue ? "Medido" : "Sin registrar"}</option>
                        {catalog.motivos_no_obtenible.map((reason) => <option key={reason.code} value={reason.code}>No obtenible: {reason.description}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {OTHER_VITALS.map((vital) => (
                  <div key={vital.field}>
                    <label htmlFor={`triage-${vital.field}`} className="text-xs font-medium text-slate-600">{vital.label}</label>
                    <input
                      id={`triage-${vital.field}`}
                      inputMode="decimal"
                      value={form[vital.field]}
                      onChange={(e) => update(vital.field, e.target.value as never)}
                      placeholder={vital.placeholder}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">4. Revisión de discriminadores SATS</h3>
                  <p className="text-xs text-slate-500">«Sin evaluar» nunca equivale a ausente. Catálogo {catalog.version_catalogo}.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReview((current) => Object.fromEntries(Object.entries(current).map(([code, state]) => [code, state === "NO_EVALUADO" ? "AUSENTE" : state])))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Marcar pendientes como ausentes
                </button>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-600"><span>Revisados</span><span>{reviewed} / {total}</span></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={reviewed} aria-valuemin={0} aria-valuemax={total}>
                  <div className={`h-full ${reviewed === total ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${(reviewed / Math.max(total, 1)) * 100}%` }} />
                </div>
              </div>
              <div className="mt-4 space-y-4">
                {(["P1", "P2", "P3"] as PriorityLevel[]).map((level) => grouped[level].length > 0 && (
                  <div key={level}>
                    <p className="mb-2"><LevelBadge level={level} /></p>
                    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                      {grouped[level].map((item) => (
                        <li key={item.code} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-sm text-slate-700">{item.description}</span>
                          <div className="flex shrink-0 gap-1" role="radiogroup" aria-label={item.description}>
                            {REVIEW_OPTIONS.map(([state, text, active]) => (
                              <button
                                key={state}
                                type="button"
                                role="radio"
                                aria-checked={review[item.code] === state}
                                onClick={() => setReview((current) => ({ ...current, [item.code]: state }))}
                                className={`rounded-md border px-2.5 py-1 text-xs ${review[item.code] === state ? active : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
                              >
                                {text}
                              </button>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <div>
              <label className="text-sm text-slate-700">Observaciones de enfermería</label>
              <textarea rows={3} value={form.observaciones} onChange={(e) => update("observaciones", e.target.value)} className={textArea} />
            </div>

            <section aria-live="polite" className="rounded-xl border border-slate-200 p-4">
              <button type="button" onClick={handlePreview} className="rounded-lg border border-blue-200 px-4 py-2.5 text-sm font-medium text-blue-700 disabled:opacity-60">
                {previewing ? "Calculando…" : "Ver propuesta P1–P4 antes de guardar"}
              </button>
              <p className="mt-2 text-xs text-slate-500">La vista previa no guarda datos ni cambia la cola.</p>
              {preview && (
                <div className="mt-3 space-y-2">
                  {preview.edad === null && <p className="text-xs text-amber-800">El paciente no tiene fecha de nacimiento registrada.</p>}
                  <PriorityProposalCard proposal={preview.propuesta} />
                </div>
              )}
            </section>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">La propuesta del motor debe ser validada por un médico antes de ingresar a la cola.</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar evaluación
                </button>
              </div>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}

function FlowStatus({ triage }: { triage?: TriageRecord }) {
  if (!triage) return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Pendiente de evaluación</span>;
  if (triage.estado_prioridad === "validado") {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" />Validada {triage.prioridad_final} · en cola médica</span>;
  }
  return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">Pendiente de validación profesional</span>;
}

export default function Triage() {
  const { role } = usePermissions();
  const canRegister = role === "admin" || role === "enfermero";
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [triages, setTriages] = useState<TriageRecord[]>([]);
  const [catalog, setCatalog] = useState<SatsCatalog | null>(null);
  const [selected, setSelected] = useState<AppointmentRecord | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadData(signal?: AbortSignal) {
    try {
      setLoading(true);
      setError(null);
      const [appointmentData, triageData, catalogData] = await Promise.all([
        fetchAppointments(undefined, signal),
        fetchTriages(signal, { abiertas: true }),
        fetchSatsCatalog(signal),
      ]);
      setAppointments(appointmentData.filter((item) => ["pendiente", "confirmada", "en_curso"].includes(item.estado)));
      setTriages(triageData);
      setCatalog(catalogData);
    } catch (loadError) {
      if (!signal?.aborted) setError(getErrorMessage(loadError, "No se pudo cargar la evaluación de Enfermería."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, []);

  const triageByAppointment = useMemo(() => new Map(triages.map((item) => [item.id_cita, item])), [triages]);
  const filtered = appointments.filter((item) =>
    [item.paciente_nombre, item.paciente_dni, item.medico_nombre, item.motivo]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );
  const completed = appointments.filter((item) => triageByAppointment.has(item.id_cita)).length;
  const pendingValidation = triages.filter((item) => item.estado_prioridad === "propuesto").length;

  return (
    <div className="flex min-h-full flex-col">
      <Header title="Evaluación de Enfermería" subtitle="Signos vitales, TEWS y discriminadores SATS" />
      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: "Citas activas", value: appointments.length, icon: Clock3, tone: "bg-blue-50 text-blue-600" },
            { label: "Evaluaciones registradas", value: completed, icon: ClipboardPlus, tone: "bg-emerald-50 text-emerald-600" },
            { label: "Pendientes de validación", value: pendingValidation, icon: ShieldCheck, tone: "bg-amber-50 text-amber-600" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{loading ? "..." : item.value}</p></div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.tone}`}><item.icon className="h-5 w-5" /></div>
              </div>
            </div>
          ))}
        </div>

        {error && <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800"><AlertCircle className="h-5 w-5" />{error}</div>}
        {success && <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5" />{success}</div>}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar paciente, documento, doctor o motivo" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white" />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No hay citas activas. Recepción debe registrar la llegada del paciente.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filtered.map((appointment) => {
              const triage = triageByAppointment.get(appointment.id_cita);
              const level = triage?.prioridad_final || triage?.nivel_propuesto || null;
              const started = Boolean(triage?.hora_inicio_atencion || appointment.estado === "en_curso");
              return (
                <article key={appointment.id_cita} className={`rounded-2xl border border-l-4 border-slate-200 bg-white p-5 shadow-sm ${level ? LEVEL_META[level].border : "border-l-slate-300"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><FlowStatus triage={triage} /></div>
                      <h2 className="mt-3 text-lg font-semibold text-slate-900">{appointment.paciente_nombre || "Paciente"}</h2>
                      <p className="mt-1 text-sm text-slate-500">{appointment.medico_nombre || "Doctor no asignado"} · {formatDateTime(appointment.fecha_hora)}</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Stethoscope className="h-5 w-5" /></div>
                  </div>
                  <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{triage?.motivo_consulta || appointment.motivo || "Sin motivo registrado"}</p>
                  {triage && (
                    <div className="mt-3">
                      <PriorityProposalCard proposal={triage.propuesta} compact />
                    </div>
                  )}
                  {triage && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">P/A {triage.presion_arterial || "-"}</span><span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">FC {triage.frecuencia_cardiaca ?? "-"}</span><span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">T {triage.temperatura ?? "-"}</span><span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">SpO2 {triage.saturacion_oxigeno ?? "-"}%</span></div>}
                  {canRegister && catalog && !started && (
                    <button type="button" onClick={() => setSelected(appointment)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
                      <HeartPulse className="h-4 w-4" />{triage ? "Actualizar evaluación" : "Registrar evaluación"}
                    </button>
                  )}
                  {started && <p className="mt-4 text-xs text-slate-500">La consulta médica ya inició.</p>}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {selected && catalog && (
        <TriageModal
          appointment={selected}
          triage={triageByAppointment.get(selected.id_cita)}
          catalog={catalog}
          onClose={() => setSelected(null)}
          onSaved={(record) => {
            setSelected(null);
            setSuccess(
              record.nivel_propuesto
                ? `Evaluación guardada. Propuesta ${record.nivel_propuesto} pendiente de validación profesional.`
                : "Evaluación guardada sin propuesta: completa los datos indicados o solicita una clasificación manual justificada."
            );
            void loadData();
          }}
        />
      )}
    </div>
  );
}

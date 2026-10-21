import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ClipboardPlus,
  Clock3,
  HeartPulse,
  Loader2,
  Search,
  ShieldAlert,
  Stethoscope,
  Thermometer,
  X,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Header } from "../components/layout/Header";
import { Can } from "../auth/usePermissions";
import { fetchAppointments, type AppointmentRecord } from "../api/appointments";
import { fetchTriages, saveTriage, validateTriage, type TriageRecord } from "../api/triage";
import type { ClinicalPriority } from "../api/analysis";
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
  observaciones: string;
  discriminadores: string[];
}

const SATS_DISCRIMINATORS = [
  { id: "chest_pain", label: "Dolor Torácico", priority: "alta" },
  { id: "dyspnea", label: "Dificultad Respiratoria", priority: "alta" },
  { id: "unconscious", label: "Inconsciencia / Alteración Estado Consciente", priority: "critica" },
  { id: "shock", label: "Signos de Shock", priority: "critica" },
  { id: "severe_trauma", label: "Trauma Grave", priority: "critica" },
  { id: "active_bleeding", label: "Hemorragia Activa", priority: "critica" },
];

const VITAL_RANGES = {
  frecuencia_cardiaca: { min: 60, max: 100 },
  frecuencia_respiratoria: { min: 12, max: 20 },
  temperatura: { min: 36, max: 37.5 },
  saturacion_oxigeno: { min: 94, max: 100 },
};

const priorityMeta: Record<ClinicalPriority, { label: string; badge: string; border: string }> = {
  baja: { label: "Baja", badge: "bg-slate-100 text-slate-700", border: "border-l-slate-400" },
  media: { label: "Media", badge: "bg-amber-100 text-amber-800", border: "border-l-amber-500" },
  alta: { label: "Alta", badge: "bg-orange-100 text-orange-800", border: "border-l-orange-500" },
  critica: { label: "Critica", badge: "bg-rose-100 text-rose-800", border: "border-l-rose-500" },
};

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
    observaciones: triage?.observaciones || "",
    discriminadores: [],
  };
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function TriageModal({
  appointment,
  triage,
  onClose,
  onSaved,
}: {
  appointment: AppointmentRecord;
  triage?: TriageRecord;
  onClose: () => void;
  onSaved: (record: TriageRecord) => void;
}) {
  const [form, setForm] = useState(() => buildForm(appointment, triage));
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposedTriage, setProposedTriage] = useState<TriageRecord | null>(null);
  const [customPriority, setCustomPriority] = useState<string>("");
  const [justification, setJustification] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const record = await saveTriage({
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
        observaciones: form.observaciones.trim() || null,
      });
      setProposedTriage(record);
    } catch (saveError) {
      setError(getErrorMessage(saveError, "No se pudo guardar el triaje."));
    } finally {
      setSaving(false);
    }
  }

  async function handleValidate(finalPriority: string) {
    setValidating(true);
    setError(null);
    try {
      await validateTriage({
        id_cita: appointment.id_cita,
        prioridad_final: finalPriority,
        justificacion: customPriority !== proposedTriage?.prioridad_clinica ? justification : null,
      });
      onSaved(proposedTriage!);
    } catch (valError) {
      setError(getErrorMessage(valError, "No se pudo validar la prioridad."));
    } finally {
      setValidating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600">Triaje de enfermeria</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">
              {appointment.paciente_nombre || "Paciente"}
            </h2>
            <p className="text-sm text-slate-500">Cita #{appointment.id_cita} · {formatDateTime(appointment.fecha_hora)}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!proposedTriage ? (
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

            <section>
              <h3 className="text-sm font-semibold text-slate-900">Evaluacion inicial</h3>
              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-700">Motivo de consulta *</label>
                  <textarea required rows={3} value={form.motivo_consulta} onChange={(event) => setForm((current) => ({ ...current, motivo_consulta: event.target.value }))} className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div}
                <div>
                  <label className="text-sm text-slate-700">Historia de la enfermedad actual</label>
                  <textarea rows={3} value={form.historia_enfermedad_actual} onChange={(event) => setForm((current) => ({ ...current, historia_enfermedad_actual: event.target.value }))} className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div}
                <div>
                  <label className="text-sm text-slate-700">Antecedentes relevantes</label>
                  <textarea rows={2} value={form.antecedentes_relevantes} onChange={(event) => setForm((current) => ({ ...current, antecedentes_relevantes: event.target.value }))} className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-sm text-slate-700">Alergias referidas</label>
                  <textarea rows={2} value={form.alergias_referidas} onChange={(event) => setForm((current) => ({ ...current, alergias_referidas: event.target.value }))} className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-900">Criterios Críticos (SATS)</h3>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SATS_DISCRIMINATORS.map((disc) => (
                  <label key={disc.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={form.discriminadores.includes(disc.id)}
                      onChange={(e) => {
                        const newDisc = e.target.checked
                          ? [...form.discriminadores, disc.id]
                          : form.discriminadores.filter(id => id !== disc.id);
                        setForm(current => ({ ...current, discriminadores: newDisc }));
                      }}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-700">{disc.label}</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Impacto: {disc.priority}</span>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-slate-900">Signos vitales</h3>
              <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                {[
                  ["presion_arterial", "P/A", "110/70"],
                  ["frecuencia_cardiaca", "FC (lpm)", "80"],
                  ["frecuencia_respiratoria", "FR (rpm)", "18"],
                  ["temperatura", "Temperatura C", "36.5"],
                  ["saturacion_oxigeno", "SpO2 %", "97"],
                  ["peso", "Peso kg", "65"],
                ].map(([field, label, placeholder]) => {
                  const val = optionalNumber(form[field as keyof TriageFormState]);
                  const range = VITAL_RANGES[field as keyof typeof VITAL_RANGES];
                  const isOutRange = range && (val === null || val < range.min || val > range.max);

                  return (
                    <div key={field}>
                      <label className="text-xs font-medium text-slate-600">{label}</label>
                      <input
                        inputMode={field === "presion_arterial" ? "text" : "decimal"}
                        value={form[field as keyof TriageFormState]}
                        onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                        placeholder={placeholder}
                        className={`mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors ${
                          isOutRange
                            ? "border-rose-300 bg-rose-50 text-rose-700 focus:border-rose-500"
                            : "border-slate-200 focus:border-blue-500"
                        }`}
                      />
                    </div>
                  );
                }))
              </div>
            </section>

            <div>
              <label className="text-sm text-slate-700">Observaciones de enfermeria</label>
              <textarea rows={3} value={form.observaciones} onChange={(event) => setForm((current) => ({ ...current, observaciones: event.target.value }))} className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">La prioridad calculada debe ser confirmada por personal clinico.</p>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar triaje
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-6 p-6">
            {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

            <div className="rounded-2xl border-2 border-blue-100 bg-blue-50/50 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Propuesta de Prioridad SATS</h3>
                  <p className="text-sm text-blue-700">Validación profesional requerida para ingreso a cola médica</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-xl bg-white p-4 shadow-sm border border-blue-100">
                  <p className="text-xs font-medium uppercase text-slate-500 mb-2">Sugerencia Algorítmica</p>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-lg font-bold ${priorityMeta[proposedTriage.prioridad_clinica].badge}`}>
                      {priorityMeta[proposedTriage.prioridad_clinica].label}
                    </span>
                    <span className="text-sm text-slate-600">{proposedTriage.puntaje_prioridad} puntos TEWS</span>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-slate-50 text-xs text-slate-600 leading-relaxed italic">
                    "{proposedTriage.motivos_prioridad}"
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600">Confirmar Prioridad Final</label>
                    <select
                      value={customPriority || proposedTriage.prioridad_clinica}
                      onChange={(e) => setCustomPriority(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      {Object.entries(priorityMeta).map(([key, meta]) => (
                        <option key={key} value={key}>{meta.label}</option>
                      ))}
                    </select>
                  </div>
                  {customPriority && customPriority !== proposedTriage.prioridad_clinica && (
                    <div>
                      <label className="text-xs font-medium text-rose-600">Justificación del Cambio *</label>
                      <textarea
                        required
                        rows={2}
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        placeholder="Explique la razón clínica del cambio..."
                        className="mt-1.5 w-full resize-none rounded-lg border border-rose-200 px-3 py-2 text-sm outline-none focus:border-rose-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button type="button" onClick={() => setProposedTriage(null)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">Volver a editar</button>
              <button
                type="button"
                onClick={() => handleValidate(customPriority || proposedTriage.prioridad_clinica)}
                disabled={validating || (customPriority !== proposedTriage.prioridad_clinica && !justification)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {validating && <Loader2 className="h-4 w-4 animate-spin" />}
                <Check className="h-4 w-4" />
                Validar y Enviar a Cola
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Triage() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [triages, setTriages] = useState<TriageRecord[]>([]);
  const [selected, setSelected] = useState<AppointmentRecord | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadData(signal?: AbortSignal) {
    try {
      setLoading(true);
      setError(null);
      const [appointmentData, triageData] = await Promise.all([
        fetchAppointments(undefined, signal),
        fetchTriages(signal),
      ]);
      setAppointments(appointmentData.filter((item) => ["pendiente", "confirmada", "en_curso"].includes(item.estado)));
      setTriages(triageData);
    } catch (loadError) {
      if (!signal?.aborted) setError(getErrorMessage(loadError, "No se pudo cargar el triaje."));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, []);

  const triageByAppointment = useMemo(
    () => new Map(triages.map((item) => [item.id_cita, item])),
    [triages]
  );
  const filtered = appointments.filter((item) =>
    [item.paciente_nombre, item.paciente_dni, item.medico_nombre, item.motivo]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );
  const completed = appointments.filter((item) => triageByAppointment.has(item.id_cita)).length;
  const highPriority = appointments.filter((item) => ["alta", "critica"].includes(item.prioridad_clinica)).length;

  return (
    <div className="flex min-h-full flex-col">
      <Header title="Triaje de enfermeria" subtitle="Evaluacion inicial, signos vitales y preparacion para consulta" />
      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: "Citas activas", value: appointments.length, icon: Clock3, tone: "bg-blue-50 text-blue-600" },
            { label: "Triajes registrados", value: completed, icon: ClipboardPlus, tone: "bg-emerald-50 text-emerald-600" },
            { label: "Prioridad alta", value: highPriority, icon: ShieldAlert, tone: "bg-rose-50 text-rose-600" },
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
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filtered.map((appointment) => {
              const triage = triageByAppointment.get(appointment.id_cita);
              const priority = priorityMeta[appointment.prioridad_clinica || "baja"];
              return (
                <article key={appointment.id_cita} className={`rounded-2xl border border-l-4 border-slate-200 bg-white p-5 shadow-sm ${priority.border}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priority.badge}`}>{priority.label} · {appointment.puntaje_prioridad || 10} pts</span>{triage && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Evaluado</span>}</div>
                      <h2 className="mt-3 text-lg font-semibold text-slate-900">{appointment.paciente_nombre || "Paciente"}</h2>
                      <p className="mt-1 text-sm text-slate-500">{appointment.medico_nombre || "Doctor no asignado"} · {formatDateTime(appointment.fecha_hora)}</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Stethoscope className="h-5 w-5" /></div>
                  </div>
                  <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{triage?.motivo_consulta || appointment.motivo || "Sin motivo registrado"}</p>
                  {triage && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4"><span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">P/A {triage.presion_arterial || "-"}</span><span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">FC {triage.frecuencia_cardiaca || "-"}</span><span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">T {triage.temperatura || "-"}</span><span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">SpO2 {triage.saturacion_oxigeno || "-"}%</span></div>}
                  <Can module="triage" action="edit">
                    <button type="button" onClick={() => setSelected(appointment)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"><HeartPulse className="h-4 w-4" />{triage ? "Actualizar triaje" : "Registrar triaje"}</button>
                  </Can>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <TriageModal
          appointment={selected}
          triage={triageByAppointment.get(selected.id_cita)}
          onClose={() => setSelected(null)}
          onSaved={(record) => {
            setSelected(null);
            setSuccess(`Triaje guardado. Prioridad ${record.prioridad_clinica} con ${record.puntaje_prioridad} puntos.`);
            void loadData();
          }}
        />
      )}
    </div>
  );
}

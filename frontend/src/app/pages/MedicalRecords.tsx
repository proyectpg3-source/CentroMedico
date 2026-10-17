import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/layout/Header";
import { Can } from "../auth/usePermissions";
import { fetchDoctors, type DoctorRecord } from "../api/doctors";
import { fetchLabOrders, type LabOrderRecord } from "../api/laboratory";
import { fetchPatients, type PatientRecord } from "../api/patients";
import { fetchPrescriptions, type PrescriptionRecord } from "../api/prescriptions";
import { createVisit, fetchVisits, type VisitRecord } from "../api/visits";
import {
  AlertCircle,
  ClipboardList,
  FilePlus2,
  FileText,
  FlaskConical,
  Loader2,
  Pill,
  Search,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getErrorMessage,
  toDateInputValue,
  toDateTimePayload,
  toTimeInputValue,
} from "../lib/format";

interface VisitFormState {
  id_paciente: string;
  id_medico: string;
  date: string;
  time: string;
  motivo: string;
  historia_enfermedad_actual: string;
  antecedentes_medicos: string;
  antecedentes_quirurgicos: string;
  antecedentes_alergicos: string;
  antecedentes_traumaticos: string;
  antecedentes_ginecologicos: string;
  examen_fisico: string;
  presion_arterial: string;
  frecuencia_cardiaca: string;
  frecuencia_respiratoria: string;
  temperatura: string;
  saturacion_oxigeno: string;
  impresion_clinica: string;
  diagnostico: string;
  tratamiento: string;
  conducta: string;
  tipo_atencion: string;
  dieta: string;
  soluciones: string;
  ultrasonido: string;
  rayos_x: string;
  ordenes_especiales: string;
  diagnostico_egreso: string;
  fecha_egreso: string;
  observaciones: string;
  costo_consulta: string;
}

function buildVisitFormState(): VisitFormState {
  return {
    id_paciente: "",
    id_medico: "",
    date: toDateInputValue(),
    time: toTimeInputValue(),
    motivo: "",
    historia_enfermedad_actual: "",
    antecedentes_medicos: "",
    antecedentes_quirurgicos: "",
    antecedentes_alergicos: "",
    antecedentes_traumaticos: "",
    antecedentes_ginecologicos: "",
    examen_fisico: "",
    presion_arterial: "",
    frecuencia_cardiaca: "",
    frecuencia_respiratoria: "",
    temperatura: "",
    saturacion_oxigeno: "",
    impresion_clinica: "",
    diagnostico: "",
    tratamiento: "",
    conducta: "",
    tipo_atencion: "ambulatorio",
    dieta: "",
    soluciones: "",
    ultrasonido: "",
    rayos_x: "",
    ordenes_especiales: "",
    diagnostico_egreso: "",
    fecha_egreso: "",
    observaciones: "",
    costo_consulta: "350",
  };
}

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function VisitFormModal({
  patients,
  doctors,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  patients: PatientRecord[];
  doctors: DoctorRecord[];
  onClose: () => void;
  onSubmit: (form: VisitFormState) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [form, setForm] = useState<VisitFormState>(() => buildVisitFormState());
  const canSubmit = patients.length > 0 && doctors.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              Expediente clinico
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              Registrar visita medica
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(form);
          }}
          className="space-y-5 px-6 py-6"
        >
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          {!canSubmit && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              Necesitas pacientes y doctores disponibles para registrar visitas nuevas.
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Paciente *</label>
              <select
                required
                value={form.id_paciente}
                onChange={(event) =>
                  setForm((current) => ({ ...current, id_paciente: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Selecciona un paciente</option>
                {patients.map((patient) => (
                  <option key={patient.id_paciente} value={patient.id_paciente}>
                    {patient.nombre} - {patient.dni}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Doctor *</label>
              <select
                required
                value={form.id_medico}
                onChange={(event) =>
                  setForm((current) => ({ ...current, id_medico: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Selecciona un doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id_medico} value={doctor.id_medico}>
                    {doctor.nombre} - {doctor.especialidad}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Fecha *</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, date: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Hora *</label>
              <input
                type="time"
                required
                value={form.time}
                onChange={(event) =>
                  setForm((current) => ({ ...current, time: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Costo consulta *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.costo_consulta}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    costo_consulta: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Motivo *</label>
            <textarea
              required
              rows={2}
              value={form.motivo}
              onChange={(event) =>
                setForm((current) => ({ ...current, motivo: event.target.value }))
              }
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Historia de la enfermedad actual</h3>
              <p className="text-xs text-slate-500">Evolucion, inicio, intensidad y sintomas asociados.</p>
            </div>
            <textarea
              rows={4}
              value={form.historia_enfermedad_actual}
              onChange={(event) =>
                setForm((current) => ({ ...current, historia_enfermedad_actual: event.target.value }))
              }
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Antecedentes</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {([
                ["antecedentes_medicos", "Medicos"],
                ["antecedentes_quirurgicos", "Quirurgicos"],
                ["antecedentes_alergicos", "Alergicos"],
                ["antecedentes_traumaticos", "Traumaticos"],
                ["antecedentes_ginecologicos", "Ginecologicos"],
              ] as const).map(([field, label]) => (
                <div key={field} className={field === "antecedentes_ginecologicos" ? "md:col-span-2" : ""}>
                  <label className="text-sm font-medium text-slate-700">{label}</label>
                  <textarea
                    rows={2}
                    value={form[field]}
                    onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                    className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Examen fisico y signos vitales</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {([
                ["presion_arterial", "P/A", "110/70"],
                ["frecuencia_cardiaca", "FC (lpm)", "80"],
                ["frecuencia_respiratoria", "FR (rpm)", "18"],
                ["temperatura", "Temperatura C", "36.5"],
                ["saturacion_oxigeno", "SpO2 %", "97"],
              ] as const).map(([field, label, placeholder]) => (
                <div key={field}>
                  <label className="text-xs font-medium text-slate-600">{label}</label>
                  <input
                    value={form[field]}
                    onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                    placeholder={placeholder}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              ))}
            </div>
            <textarea
              rows={4}
              value={form.examen_fisico}
              onChange={(event) => setForm((current) => ({ ...current, examen_fisico: event.target.value }))}
              placeholder="Hallazgos del examen fisico"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </section>

          <div>
            <label className="text-sm font-medium text-slate-700">Impresion clinica</label>
            <textarea
              rows={3}
              value={form.impresion_clinica}
              onChange={(event) => setForm((current) => ({ ...current, impresion_clinica: event.target.value }))}
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Diagnostico *</label>
            <textarea
              required
              rows={3}
              value={form.diagnostico}
              onChange={(event) =>
                setForm((current) => ({ ...current, diagnostico: event.target.value }))
              }
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Tratamiento</label>
            <textarea
              rows={3}
              value={form.tratamiento}
              onChange={(event) =>
                setForm((current) => ({ ...current, tratamiento: event.target.value }))
              }
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Conducta y ordenes medicas</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Conducta</label>
                <textarea rows={3} value={form.conducta} onChange={(event) => setForm((current) => ({ ...current, conducta: event.target.value }))} className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Tipo de atencion</label>
                <select value={form.tipo_atencion} onChange={(event) => setForm((current) => ({ ...current, tipo_atencion: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400">
                  <option value="ambulatorio">Ambulatorio</option>
                  <option value="encamamiento">Encamamiento</option>
                  <option value="referencia">Referencia</option>
                  <option value="observacion">Observacion</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Dieta</label>
                <input value={form.dieta} onChange={(event) => setForm((current) => ({ ...current, dieta: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Soluciones</label>
                <input value={form.soluciones} onChange={(event) => setForm((current) => ({ ...current, soluciones: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Ultrasonido</label>
                <textarea rows={2} value={form.ultrasonido} onChange={(event) => setForm((current) => ({ ...current, ultrasonido: event.target.value }))} className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Rayos X</label>
                <textarea rows={2} value={form.rayos_x} onChange={(event) => setForm((current) => ({ ...current, rayos_x: event.target.value }))} className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Ordenes especiales</label>
                <textarea rows={2} value={form.ordenes_especiales} onChange={(event) => setForm((current) => ({ ...current, ordenes_especiales: event.target.value }))} className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">Egreso o referencia</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_260px]">
              <div>
                <label className="text-sm font-medium text-slate-700">Diagnostico de egreso</label>
                <textarea rows={2} value={form.diagnostico_egreso} onChange={(event) => setForm((current) => ({ ...current, diagnostico_egreso: event.target.value }))} className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Fecha y hora</label>
                <input type="datetime-local" value={form.fecha_egreso} onChange={(event) => setForm((current) => ({ ...current, fecha_egreso: event.target.value }))} className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
              </div>
            </div>
          </section>

          <div>
            <label className="text-sm font-medium text-slate-700">Observaciones</label>
            <textarea
              rows={3}
              value={form.observaciones}
              onChange={(event) =>
                setForm((current) => ({ ...current, observaciones: event.target.value }))
              }
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !canSubmit}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar visita
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecordDetailModal({
  visit,
  orders,
  prescriptions,
  onClose,
}: {
  visit: VisitRecord;
  orders: LabOrderRecord[];
  prescriptions: PrescriptionRecord[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
              Visita clinica
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              {visit.paciente_nombre || "Paciente"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {visit.medico_nombre || "Doctor"} - {formatDateTime(visit.fecha_visita)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-3xl bg-blue-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-blue-600">Consulta</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{formatCurrency(visit.costo_consulta)}</p>
            </div>
            <div className="rounded-3xl bg-emerald-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-emerald-600">Ordenes</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{orders.length}</p>
            </div>
            <div className="rounded-3xl bg-violet-50 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-violet-600">Prescripciones</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{prescriptions.length}</p>
            </div>
            <div className="rounded-3xl bg-slate-100 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Cita origen</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {visit.id_cita ? `#${visit.id_cita}` : "Directa"}
              </p>
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">Motivo e historia de la enfermedad actual</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{visit.motivo}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {visit.historia_enfermedad_actual || "Sin historia de enfermedad actual registrada."}
            </p>
          </section>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              ["Medicos", visit.antecedentes_medicos],
              ["Quirurgicos", visit.antecedentes_quirurgicos],
              ["Alergicos", visit.antecedentes_alergicos],
              ["Traumaticos", visit.antecedentes_traumaticos],
              ["Ginecologicos", visit.antecedentes_ginecologicos],
            ].map(([label, value]) => (
              <section key={label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
                <p className="mt-2 text-sm text-slate-700">{value || "No registrado"}</p>
              </section>
            ))}
          </div>

          <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">Examen fisico</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <span className="rounded-xl bg-white px-3 py-2 text-sm text-slate-600">P/A {visit.presion_arterial || "-"}</span>
              <span className="rounded-xl bg-white px-3 py-2 text-sm text-slate-600">FC {visit.frecuencia_cardiaca || "-"}</span>
              <span className="rounded-xl bg-white px-3 py-2 text-sm text-slate-600">FR {visit.frecuencia_respiratoria || "-"}</span>
              <span className="rounded-xl bg-white px-3 py-2 text-sm text-slate-600">T {visit.temperatura || "-"}</span>
              <span className="rounded-xl bg-white px-3 py-2 text-sm text-slate-600">SpO2 {visit.saturacion_oxigeno || "-"}%</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{visit.examen_fisico || "Sin hallazgos registrados."}</p>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <section className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-amber-700">
                  <ClipboardList className="h-4 w-4" />
                  <p className="text-sm font-semibold">Diagnostico</p>
                </div>
                <p className="text-sm leading-6 text-slate-700">{visit.diagnostico}</p>
                {visit.impresion_clinica && (
                  <p className="mt-3 border-t border-amber-200 pt-3 text-sm text-slate-600">
                    Impresion clinica: {visit.impresion_clinica}
                  </p>
                )}
              </section>

              <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-emerald-700">
                  <Stethoscope className="h-4 w-4" />
                  <p className="text-sm font-semibold">Tratamiento</p>
                </div>
                <p className="text-sm leading-6 text-slate-700">
                  {visit.tratamiento || "Sin tratamiento registrado."}
                </p>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="mb-2 text-sm font-semibold text-slate-900">Observaciones</p>
                <p className="text-sm leading-6 text-slate-600">
                  {visit.observaciones || "Sin observaciones adicionales."}
                </p>
              </section>

              <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                <p className="text-sm font-semibold text-blue-800">Conducta y ordenes</p>
                <p className="mt-2 text-sm text-slate-700">{visit.conducta || "Sin conducta registrada."}</p>
                <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <span>Atencion: {visit.tipo_atencion || "No indicada"}</span>
                  <span>Dieta: {visit.dieta || "No indicada"}</span>
                  <span>Soluciones: {visit.soluciones || "No indicadas"}</span>
                  <span>Especiales: {visit.ordenes_especiales || "Ninguna"}</span>
                </div>
              </section>

              {(visit.ultrasonido || visit.rayos_x) && (
                <section className="rounded-3xl border border-cyan-100 bg-cyan-50 p-5">
                  <p className="text-sm font-semibold text-cyan-800">Estudios de imagen</p>
                  <p className="mt-2 text-sm text-slate-700">Ultrasonido: {visit.ultrasonido || "No registrado"}</p>
                  <p className="mt-2 text-sm text-slate-700">Rayos X: {visit.rayos_x || "No registrado"}</p>
                </section>
              )}

              {(visit.diagnostico_egreso || visit.fecha_egreso) && (
                <section className="rounded-3xl border border-rose-100 bg-rose-50 p-5">
                  <p className="text-sm font-semibold text-rose-800">Egreso o referencia</p>
                  <p className="mt-2 text-sm text-slate-700">{visit.diagnostico_egreso || "Sin diagnostico de egreso."}</p>
                  {visit.fecha_egreso && <p className="mt-2 text-xs text-slate-500">{formatDateTime(visit.fecha_egreso)}</p>}
                </section>
              )}
            </div>

            <div className="space-y-4">
              <section className="rounded-3xl border border-violet-100 bg-violet-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-violet-700">
                  <FlaskConical className="h-4 w-4" />
                  <p className="text-sm font-semibold">Laboratorio asociado</p>
                </div>
                <div className="space-y-3">
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <div key={order.id_orden} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-900">{order.examen}</p>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            {order.estado.replace("_", " ")}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Prioridad {order.prioridad} - {formatCurrency(order.costo)}
                        </p>
                        {order.resultado && (
                          <p className="mt-3 text-sm text-slate-600">{order.resultado}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No hay ordenes de laboratorio para esta visita.</p>
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-blue-700">
                  <Pill className="h-4 w-4" />
                  <p className="text-sm font-semibold">Prescripciones</p>
                </div>
                <div className="space-y-3">
                  {prescriptions.length > 0 ? (
                    prescriptions.map((prescription) => (
                      <div
                        key={prescription.id_prescripcion}
                        className="rounded-2xl bg-white px-4 py-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-900">
                            {prescription.medicamento}
                          </p>
                          <span className="text-xs font-medium text-slate-500">
                            {formatCurrency(prescription.costo)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {prescription.dosis} - {prescription.frecuencia} - {prescription.duracion}
                        </p>
                        {prescription.instrucciones && (
                          <p className="mt-2 text-sm text-slate-600">
                            {prescription.instrucciones}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No hay prescripciones registradas.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MedicalRecords() {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [orders, setOrders] = useState<LabOrderRecord[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filterDoctor, setFilterDoctor] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitRecord | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadData(signal?: AbortSignal) {
    try {
      setLoading(true);
      setError(null);

      const [visitsResponse, ordersResponse, prescriptionsResponse, patientsResponse, doctorsResponse] =
        await Promise.all([
          fetchVisits(undefined, signal),
          fetchLabOrders(undefined, signal),
          fetchPrescriptions(undefined, signal),
          fetchPatients(signal),
          fetchDoctors(undefined, signal),
        ]);

      setVisits(visitsResponse);
      setOrders(ordersResponse);
      setPrescriptions(prescriptionsResponse);
      setPatients(patientsResponse);
      setDoctors(doctorsResponse);
    } catch (loadError) {
      if (signal?.aborted) {
        return;
      }

      setError(getErrorMessage(loadError, "No se pudieron cargar los expedientes clinicos."));
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, []);

  const filteredVisits = useMemo(() => {
    return visits.filter((visit) => {
      const normalized = search.trim().toLowerCase();
      const matchesSearch =
        !normalized ||
        [
          visit.paciente_nombre,
          visit.medico_nombre,
          visit.diagnostico,
          visit.motivo,
          visit.tratamiento,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesDoctor =
        filterDoctor === "all" || String(visit.id_medico) === filterDoctor;
      return matchesSearch && matchesDoctor;
    });
  }, [filterDoctor, search, visits]);

  const stats = useMemo(() => {
    const totalRevenue = visits.reduce(
      (sum, visit) => sum + Number(visit.costo_consulta || 0),
      0
    );

    return {
      visits: visits.length,
      patients: new Set(visits.map((visit) => visit.id_paciente)).size,
      orders: orders.length,
      prescriptions: prescriptions.length,
      revenue: totalRevenue,
    };
  }, [orders, prescriptions, visits]);

  async function handleCreateVisit(form: VisitFormState) {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await createVisit({
        id_paciente: Number(form.id_paciente),
        id_medico: Number(form.id_medico),
        fecha_visita: toDateTimePayload(form.date, form.time),
        motivo: form.motivo.trim(),
        historia_enfermedad_actual: form.historia_enfermedad_actual.trim() || null,
        antecedentes_medicos: form.antecedentes_medicos.trim() || null,
        antecedentes_quirurgicos: form.antecedentes_quirurgicos.trim() || null,
        antecedentes_alergicos: form.antecedentes_alergicos.trim() || null,
        antecedentes_traumaticos: form.antecedentes_traumaticos.trim() || null,
        antecedentes_ginecologicos: form.antecedentes_ginecologicos.trim() || null,
        examen_fisico: form.examen_fisico.trim() || null,
        presion_arterial: form.presion_arterial.trim() || null,
        frecuencia_cardiaca: optionalNumber(form.frecuencia_cardiaca),
        frecuencia_respiratoria: optionalNumber(form.frecuencia_respiratoria),
        temperatura: optionalNumber(form.temperatura),
        saturacion_oxigeno: optionalNumber(form.saturacion_oxigeno),
        impresion_clinica: form.impresion_clinica.trim() || null,
        diagnostico: form.diagnostico.trim(),
        tratamiento: form.tratamiento.trim() || null,
        conducta: form.conducta.trim() || null,
        tipo_atencion: form.tipo_atencion || null,
        dieta: form.dieta.trim() || null,
        soluciones: form.soluciones.trim() || null,
        ultrasonido: form.ultrasonido.trim() || null,
        rayos_x: form.rayos_x.trim() || null,
        ordenes_especiales: form.ordenes_especiales.trim() || null,
        diagnostico_egreso: form.diagnostico_egreso.trim() || null,
        fecha_egreso: form.fecha_egreso ? new Date(form.fecha_egreso).toISOString() : null,
        observaciones: form.observaciones.trim() || null,
        costo_consulta: Number(form.costo_consulta),
      });

      setShowCreateModal(false);
      setSuccessMessage("La visita clinica se registro correctamente.");
      await loadData();
    } catch (createError) {
      setSubmitError(
        getErrorMessage(createError, "No se pudo registrar la visita clinica.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedVisitOrders = selectedVisit
    ? orders.filter((order) => order.id_visita === selectedVisit.id_visita)
    : [];
  const selectedVisitPrescriptions = selectedVisit
    ? prescriptions.filter(
        (prescription) => prescription.id_visita === selectedVisit.id_visita
      )
    : [];

  return (
    <div className="flex min-h-full flex-col">
      <Header
        title="Expedientes clinicos"
        subtitle="Visitas medicas reales con laboratorio y prescripciones enlazadas"
      />

      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Visitas registradas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.visits}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pacientes atendidos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.patients}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Ordenes de laboratorio</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.orders}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Prescripciones</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.prescriptions}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Consulta acumulada</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {formatCurrency(stats.revenue)}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  No se pudieron sincronizar los expedientes clinicos.
                </p>
                <p className="mt-1 text-sm text-amber-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-800">Operacion completada</p>
                <p className="mt-1 text-sm text-emerald-700">{successMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 transition-colors hover:text-emerald-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Bandeja de visitas</h2>
              <p className="text-sm text-slate-500">
                Historia clinica real con diagnosticos, tratamientos y trazabilidad operativa
              </p>
            </div>
            <Can module="records" action="create">
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                <FilePlus2 className="h-4 w-4" />
                Nueva visita
              </button>
            </Can>
          </div>

          <div className="mt-5 flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por paciente, diagnostico o doctor"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <select
              value={filterDoctor}
              onChange={(event) => setFilterDoctor(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">Todos los doctores</option>
              {doctors.map((doctor) => (
                <option key={doctor.id_medico} value={doctor.id_medico}>
                  {doctor.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-slate-200 bg-white text-slate-500 shadow-sm">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm">Cargando visitas clinicas...</p>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <FileText className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm font-medium text-slate-700">
              No encontramos visitas con esos filtros.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Prueba otra busqueda o registra una visita nueva.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredVisits.map((visit) => {
              const visitOrders = orders.filter((order) => order.id_visita === visit.id_visita);
              const visitPrescriptions = prescriptions.filter(
                (prescription) => prescription.id_visita === visit.id_visita
              );

              return (
                <button
                  key={visit.id_visita}
                  type="button"
                  onClick={() => setSelectedVisit(visit)}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          Visita #{visit.id_visita}
                        </span>
                        {visit.id_cita && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            Cita #{visit.id_cita}
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-slate-900">
                        {visit.paciente_nombre || "Paciente"}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {visit.medico_nombre || "Doctor"} - {formatDateTime(visit.fecha_visita)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Consulta
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {formatCurrency(visit.costo_consulta)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                      Diagnostico
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{visit.diagnostico}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Motivo
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{visit.motivo}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Laboratorio
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{visitOrders.length} orden(es)</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Prescripciones
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {visitPrescriptions.length} registro(s)
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-center text-sm text-slate-400">
          Mostrando {filteredVisits.length} de {visits.length} visitas registradas
        </p>
      </div>

      {showCreateModal && (
        <VisitFormModal
          patients={patients}
          doctors={doctors}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateVisit}
          isSubmitting={isSubmitting}
          errorMessage={submitError}
        />
      )}

      {selectedVisit && (
        <RecordDetailModal
          visit={selectedVisit}
          orders={selectedVisitOrders}
          prescriptions={selectedVisitPrescriptions}
          onClose={() => setSelectedVisit(null)}
        />
      )}
    </div>
  );
}

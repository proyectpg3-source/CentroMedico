import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/layout/Header";
import { Can } from "../auth/usePermissions";
import {
  createAppointment,
  fetchAppointments,
  removeAppointment,
  updateAppointment,
  updateAppointmentStatus,
  type AppointmentPayload,
  type AppointmentRecord,
  type AppointmentStatus,
} from "../api/appointments";
import { createLabOrder } from "../api/laboratory";
import { fetchDoctors, type DoctorRecord } from "../api/doctors";
import { fetchPatientOptions, type PatientOption } from "../api/patients";
import { createVisit } from "../api/visits";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardPlus,
  Edit2,
  FlaskConical,
  Loader2,
  PencilLine,
  RefreshCcw,
  Search,
  Trash2,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import {
  formatDate,
  formatDateTime,
  getErrorMessage,
  toDateInputValue,
  toDateTimePayload,
  toTimeInputValue,
} from "../lib/format";

interface AppointmentFormState {
  id_paciente: string;
  id_medico: string;
  date: string;
  time: string;
  motivo: string;
  triaje_notas: string;
  estado: AppointmentStatus;
}

interface VisitFormState {
  date: string;
  time: string;
  motivo: string;
  diagnostico: string;
  tratamiento: string;
  observaciones: string;
  costo_consulta: string;
}

interface LabOrderFormState {
  examen: string;
  prioridad: "normal" | "alta" | "urgente";
  costo: string;
}

type AppointmentFormModalState =
  | {
      mode: "create" | "edit";
      appointment: AppointmentRecord | null;
    }
  | null;

const appointmentStatuses: AppointmentStatus[] = [
  "pendiente",
  "confirmada",
  "en_curso",
  "completada",
  "cancelada",
];

const statusMeta: Record<
  AppointmentStatus,
  { label: string; badge: string; accent: string }
> = {
  pendiente: {
    label: "Pendiente",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    accent: "border-l-blue-500",
  },
  confirmada: {
    label: "Confirmada",
    badge: "border-indigo-200 bg-indigo-50 text-indigo-700",
    accent: "border-l-indigo-500",
  },
  en_curso: {
    label: "En curso",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    accent: "border-l-amber-500",
  },
  completada: {
    label: "Completada",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    accent: "border-l-emerald-500",
  },
  cancelada: {
    label: "Cancelada",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    accent: "border-l-rose-500",
  },
};

const priorityMeta = {
  baja: {
    label: "Prioridad baja",
    badge: "border-slate-200 bg-slate-50 text-slate-600",
  },
  media: {
    label: "Prioridad media",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
  },
  alta: {
    label: "Prioridad alta",
    badge: "border-orange-200 bg-orange-50 text-orange-700",
  },
  critica: {
    label: "Prioridad critica",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
  },
} as const;

function getPriorityMeta(priority: AppointmentRecord["prioridad_clinica"] | null | undefined) {
  return priorityMeta[priority || "baja"] || priorityMeta.baja;
}

function sortAppointments(records: AppointmentRecord[]) {
  return [...records].sort(
    (left, right) =>
      new Date(left.fecha_hora).getTime() - new Date(right.fecha_hora).getTime()
  );
}

function buildAppointmentFormState(appointment: AppointmentRecord | null): AppointmentFormState {
  return {
    id_paciente: appointment?.id_paciente ? String(appointment.id_paciente) : "",
    id_medico: appointment?.id_medico ? String(appointment.id_medico) : "",
    date: toDateInputValue(appointment?.fecha_hora),
    time: toTimeInputValue(appointment?.fecha_hora) || "09:00",
    motivo: appointment?.motivo || "",
    triaje_notas: appointment?.triaje_notas || "",
    estado: appointment?.estado || "pendiente",
  };
}

function buildVisitFormState(appointment: AppointmentRecord): VisitFormState {
  return {
    date: toDateInputValue(appointment.fecha_hora),
    time: toTimeInputValue(appointment.fecha_hora) || "09:00",
    motivo: appointment.motivo || "",
    diagnostico: "",
    tratamiento: "",
    observaciones: "",
    costo_consulta: "350",
  };
}

function buildLabOrderFormState(): LabOrderFormState {
  return {
    examen: "",
    prioridad: "normal",
    costo: "250",
  };
}

function toAppointmentPayload(form: AppointmentFormState): AppointmentPayload {
  return {
    id_paciente: Number(form.id_paciente),
    id_medico: Number(form.id_medico),
    fecha_hora: toDateTimePayload(form.date, form.time),
    motivo: form.motivo.trim() || null,
    triaje_notas: form.triaje_notas.trim() || null,
    estado: form.estado,
  };
}

function AppointmentFormModal({
  mode,
  appointment,
  patients,
  doctors,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  mode: "create" | "edit";
  appointment: AppointmentRecord | null;
  patients: PatientOption[];
  doctors: DoctorRecord[];
  onClose: () => void;
  onSubmit: (form: AppointmentFormState) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [form, setForm] = useState<AppointmentFormState>(() =>
    buildAppointmentFormState(appointment)
  );

  useEffect(() => {
    setForm(buildAppointmentFormState(appointment));
  }, [appointment]);

  const canSubmit = patients.length > 0 && doctors.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              Agenda clinica
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {mode === "create" ? "Nueva cita medica" : "Editar cita medica"}
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
              Necesitas al menos un paciente y un doctor para registrar citas nuevas.
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
                    {patient.nombre} - #{patient.id_paciente}
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
              <label className="text-sm font-medium text-slate-700">Estado</label>
              <select
                value={form.estado}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    estado: event.target.value as AppointmentStatus,
                  }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {appointmentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusMeta[status].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Motivo</label>
            <textarea
              rows={3}
              value={form.motivo}
              onChange={(event) =>
                setForm((current) => ({ ...current, motivo: event.target.value }))
              }
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="Motivo de consulta o notas de agenda"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Notas de triaje</label>
            <textarea
              rows={3}
              value={form.triaje_notas}
              onChange={(event) =>
                setForm((current) => ({ ...current, triaje_notas: event.target.value }))
              }
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="Sintomas observados, signos vitales o antecedentes importantes"
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
              {mode === "create" ? "Guardar cita" : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VisitModal({
  appointment,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  appointment: AppointmentRecord;
  onClose: () => void;
  onSubmit: (form: VisitFormState) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [form, setForm] = useState<VisitFormState>(() => buildVisitFormState(appointment));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
              Conversion clinica
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              Abrir visita medica
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {appointment.paciente_nombre || "Paciente"} - {formatDateTime(appointment.fecha_hora)}
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="visit-date" className="text-sm font-medium text-slate-700">Fecha *</label>
              <input
                type="date"
                required
                id="visit-date"
              value={form.date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, date: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label htmlFor="visit-time" className="text-sm font-medium text-slate-700">Hora *</label>
              <input
                type="time"
                required
                id="visit-time"
              value={form.time}
                onChange={(event) =>
                  setForm((current) => ({ ...current, time: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label htmlFor="visit-costo_consulta" className="text-sm font-medium text-slate-700">Costo consulta *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                id="visit-costo_consulta"
              value={form.costo_consulta}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    costo_consulta: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="visit-motivo" className="text-sm font-medium text-slate-700">Motivo *</label>
            <textarea
              required
              rows={2}
              id="visit-motivo"
              value={form.motivo}
              onChange={(event) =>
                setForm((current) => ({ ...current, motivo: event.target.value }))
              }
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label htmlFor="visit-diagnostico" className="text-sm font-medium text-slate-700">Diagnostico *</label>
            <textarea
              required
              rows={3}
              id="visit-diagnostico"
              value={form.diagnostico}
              onChange={(event) =>
                setForm((current) => ({ ...current, diagnostico: event.target.value }))
              }
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              placeholder="Describe el diagnostico principal de la consulta"
            />
          </div>

          <div>
            <label htmlFor="visit-tratamiento" className="text-sm font-medium text-slate-700">Tratamiento</label>
            <textarea
              rows={3}
              id="visit-tratamiento"
              value={form.tratamiento}
              onChange={(event) =>
                setForm((current) => ({ ...current, tratamiento: event.target.value }))
              }
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label htmlFor="visit-observaciones" className="text-sm font-medium text-slate-700">Observaciones</label>
            <textarea
              rows={3}
              id="visit-observaciones"
              value={form.observaciones}
              onChange={(event) =>
                setForm((current) => ({ ...current, observaciones: event.target.value }))
              }
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear visita
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LabOrderModal({
  appointment,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  appointment: AppointmentRecord;
  onClose: () => void;
  onSubmit: (form: LabOrderFormState) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [form, setForm] = useState<LabOrderFormState>(() => buildLabOrderFormState());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
              Laboratorio
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              Nueva orden de laboratorio
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {appointment.paciente_nombre || "Paciente"} - {appointment.medico_nombre || "Doctor"}
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

          <div>
            <label className="text-sm font-medium text-slate-700">Examen solicitado *</label>
            <input
              required
              value={form.examen}
              onChange={(event) =>
                setForm((current) => ({ ...current, examen: event.target.value }))
              }
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              placeholder="Ej. Biometria hematica, glucosa, perfil lipidico"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Prioridad</label>
              <select
                value={form.prioridad}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    prioridad: event.target.value as LabOrderFormState["prioridad"],
                  }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Costo *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.costo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, costo: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            La orden se vinculara a la cita actual y luego podra enlazarse automaticamente a la
            visita cuando se complete la atencion clinica.
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear orden
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({
  appointment,
  onClose,
  onConfirm,
  isDeleting,
}: {
  appointment: AppointmentRecord;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <Trash2 className="h-5 w-5" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-slate-900">Eliminar cita</h2>
        <p className="mt-2 text-sm text-slate-500">
          Se eliminara la cita de {appointment.paciente_nombre || "este paciente"} programada para{" "}
          {formatDateTime(appointment.fecha_hora)}.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function AppointmentCard({
  appointment,
  onEdit,
  onDelete,
  onStatusChange,
  onOpenVisit,
  onOpenOrder,
  isStatusUpdating,
}: {
  appointment: AppointmentRecord;
  onEdit: (appointment: AppointmentRecord) => void;
  onDelete: (appointment: AppointmentRecord) => void;
  onStatusChange: (id: number, status: AppointmentStatus) => void;
  onOpenVisit: (appointment: AppointmentRecord) => void;
  onOpenOrder: (appointment: AppointmentRecord) => void;
  isStatusUpdating: boolean;
}) {
  const status = statusMeta[appointment.estado];
  const priority = getPriorityMeta(appointment.prioridad_clinica);
  const canCreateVisit = appointment.estado !== "cancelada" && !appointment.id_visita;
  const canCreateOrder = appointment.estado !== "cancelada";

  return (
    <article
      className={`rounded-[28px] border border-slate-200 border-l-4 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${status.accent}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${status.badge}`}
            >
              {status.label}
            </span>
            {appointment.medico_especialidad && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {appointment.medico_especialidad}
              </span>
            )}
            {appointment.id_visita && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                Visita #{appointment.id_visita}
              </span>
            )}
            <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${priority.badge}`}>
              {priority.label} · {appointment.puntaje_prioridad || 10} pts
            </span>
          </div>

          <h3 className="mt-3 text-lg font-semibold text-slate-900">
            {appointment.paciente_nombre || "Paciente sin nombre"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {appointment.medico_nombre || "Doctor no disponible"}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Cita
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {formatDate(appointment.fecha_hora)}
          </p>
          <p className="text-sm text-slate-500">{formatDateTime(appointment.fecha_hora).split(", ").pop()}</p>
        </div>
      </div>

      {appointment.motivo && (
        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {appointment.motivo}
        </p>
      )}

      {(appointment.triaje_notas || appointment.motivos_prioridad) && (
        <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-4 py-3">
          {appointment.triaje_notas && (
            <p className="text-sm text-slate-600">{appointment.triaje_notas}</p>
          )}
          {appointment.motivos_prioridad && (
            <p className="mt-2 text-xs text-slate-500">{appointment.motivos_prioridad}</p>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Paciente
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {appointment.paciente_dni || "Sin DNI"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Contacto
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {appointment.paciente_telefono || "Sin telefono"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Estado editable
          </p>
          <select
            value={appointment.estado}
            onChange={(event) =>
              onStatusChange(appointment.id_cita, event.target.value as AppointmentStatus)
            }
            disabled={isStatusUpdating}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
          >
            {appointmentStatuses.map((value) => (
              <option key={value} value={value}>
                {statusMeta[value].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {canCreateVisit ? (
          <button
            type="button"
            onClick={() => onOpenVisit(appointment)}
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <ClipboardPlus className="h-4 w-4" />
            Abrir visita
          </button>
        ) : appointment.id_visita ? (
          <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Ya convertida a visita
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
            <XCircle className="h-4 w-4" />
            Cita cancelada
          </div>
        )}

        {canCreateOrder && (
          <Can module="laboratory" action="create">
            <button
              type="button"
              onClick={() => onOpenOrder(appointment)}
              className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100"
            >
              <FlaskConical className="h-4 w-4" />
              Orden laboratorio
            </button>
          </Can>
        )}

        <Can module="appointments" action="edit">
          <button
            type="button"
            onClick={() => onEdit(appointment)}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <PencilLine className="h-4 w-4" />
            Editar
          </button>
        </Can>

        <Can module="appointments" action="delete">
          <button
            type="button"
            onClick={() => onDelete(appointment)}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        </Can>
      </div>
    </article>
  );
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDoctor, setFilterDoctor] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [appointmentForm, setAppointmentForm] = useState<AppointmentFormModalState>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<AppointmentRecord | null>(null);
  const [appointmentForVisit, setAppointmentForVisit] = useState<AppointmentRecord | null>(null);
  const [appointmentForLabOrder, setAppointmentForLabOrder] =
    useState<AppointmentRecord | null>(null);

  async function loadData(signal?: AbortSignal) {
    try {
      setLoading(true);
      setError(null);

      const [appointmentsResponse, patientsResponse, doctorsResponse] = await Promise.all([
        fetchAppointments(undefined, signal),
        fetchPatientOptions(signal),
        fetchDoctors(undefined, signal),
      ]);

      setAppointments(sortAppointments(appointmentsResponse));
      setPatients(patientsResponse);
      setDoctors(doctorsResponse);
    } catch (loadError) {
      if (signal?.aborted) {
        return;
      }

      setError(getErrorMessage(loadError, "No se pudieron cargar las citas."));
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

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const normalized = search.trim().toLowerCase();
      const matchesSearch =
        !normalized ||
        [appointment.paciente_nombre, appointment.medico_nombre, appointment.motivo]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesStatus =
        filterStatus === "all" || appointment.estado === filterStatus;
      const matchesDoctor =
        filterDoctor === "all" || String(appointment.id_medico || "") === filterDoctor;
      const matchesDate = !filterDate || toDateInputValue(appointment.fecha_hora) === filterDate;
      return matchesSearch && matchesStatus && matchesDoctor && matchesDate;
    });
  }, [appointments, filterDate, filterDoctor, filterStatus, search]);

  const counts = useMemo(
    () =>
      appointmentStatuses.map((status) => ({
        status,
        label: statusMeta[status].label,
        count: appointments.filter((appointment) => appointment.estado === status).length,
      })),
    [appointments]
  );

  const summary = useMemo(() => {
    return {
      total: appointments.length,
      converted: appointments.filter((appointment) => Boolean(appointment.id_visita)).length,
      today: appointments.filter(
        (appointment) => toDateInputValue(appointment.fecha_hora) === toDateInputValue()
      ).length,
    };
  }, [appointments]);

  async function handleAppointmentSubmit(form: AppointmentFormState) {
    if (!appointmentForm) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const payload = toAppointmentPayload(form);

      if (appointmentForm.mode === "edit" && appointmentForm.appointment) {
        await updateAppointment(appointmentForm.appointment.id_cita, payload);
        setSuccessMessage("La cita se actualizo correctamente.");
      } else {
        await createAppointment(payload);
        setSuccessMessage("La cita se registro correctamente.");
      }

      setAppointmentForm(null);
      await loadData();
    } catch (submitActionError) {
      setSubmitError(getErrorMessage(submitActionError, "No se pudo guardar la cita."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(id: number, status: AppointmentStatus) {
    setStatusUpdatingId(id);
    setError(null);

    try {
      await updateAppointmentStatus(id, status);
      await loadData();
    } catch (statusError) {
      setError(getErrorMessage(statusError, "No se pudo actualizar el estado de la cita."));
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleDelete() {
    if (!appointmentToDelete) {
      return;
    }

    setDeletingId(appointmentToDelete.id_cita);
    setError(null);

    try {
      await removeAppointment(appointmentToDelete.id_cita);
      setAppointmentToDelete(null);
      setSuccessMessage("La cita se elimino correctamente.");
      await loadData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "No se pudo eliminar la cita."));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleVisitSubmit(form: VisitFormState) {
    if (!appointmentForVisit) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await createVisit({
        id_cita: appointmentForVisit.id_cita,
        id_paciente: appointmentForVisit.id_paciente,
        id_medico: appointmentForVisit.id_medico,
        diagnostico: form.diagnostico.trim(),
        fecha_visita: toDateTimePayload(form.date, form.time),
        motivo: form.motivo.trim(),
        tratamiento: form.tratamiento.trim() || null,
        observaciones: form.observaciones.trim() || null,
        costo_consulta: Number(form.costo_consulta),
      });

      setAppointmentForVisit(null);
      setSuccessMessage("La cita se convirtio en visita medica y ya genero su cargo de consulta.");
      await loadData();
    } catch (visitError) {
      setSubmitError(
        getErrorMessage(visitError, "No se pudo registrar la visita medica.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLabOrderSubmit(form: LabOrderFormState) {
    if (!appointmentForLabOrder) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await createLabOrder({
        id_cita: appointmentForLabOrder.id_cita,
        examen: form.examen.trim(),
        prioridad: form.prioridad,
        costo: Number(form.costo),
      });

      setAppointmentForLabOrder(null);
      setSuccessMessage("La orden de laboratorio se registro correctamente.");
      await loadData();
    } catch (labError) {
      setSubmitError(
        getErrorMessage(labError, "No se pudo crear la orden de laboratorio.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header
        title="Citas medicas"
        subtitle="Agenda diaria con conversion directa a visita clinica y ordenes de laboratorio"
      />

      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Citas registradas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.total}</p>
            <p className="mt-2 text-xs text-slate-400">Agenda completa cargada desde API</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Para hoy</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.today}</p>
            <p className="mt-2 text-xs text-slate-400">Control rapido para la jornada actual</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Ya convertidas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary.converted}</p>
            <p className="mt-2 text-xs text-slate-400">Citas que ya pasaron a visita medica</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pacientes activos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{patients.length}</p>
            <p className="mt-2 text-xs text-slate-400">Directorio disponible para nuevas citas</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {counts.map((item) => (
            <button
              key={item.status}
              type="button"
              onClick={() =>
                setFilterStatus((current) => (current === item.status ? "all" : item.status))
              }
              className={`rounded-3xl border p-4 text-left transition-all ${
                filterStatus === item.status
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              <p className="text-2xl font-semibold">{loading ? "..." : item.count}</p>
              <p className="mt-1 text-sm opacity-80">{item.label}</p>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    No se pudo sincronizar la agenda.
                  </p>
                  <p className="mt-1 text-sm text-amber-700">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void loadData()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
              >
                <RefreshCcw className="h-4 w-4" />
                Reintentar
              </button>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Operacion completada</p>
                  <p className="mt-1 text-sm text-emerald-700">{successMessage}</p>
                </div>
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
              <h2 className="text-lg font-semibold text-slate-900">Bandeja de citas</h2>
              <p className="text-sm text-slate-500">
                Filtra la agenda, ajusta estados y abre el flujo clinico sin salir de esta vista
              </p>
            </div>
            <Can module="appointments" action="create">
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  setAppointmentForm({ mode: "create", appointment: null });
                }}
                disabled={patients.length === 0 || doctors.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CalendarDays className="h-4 w-4" />
                Nueva cita
              </button>
            </Can>
          </div>

          <div className="mt-5 flex flex-col gap-3 xl:flex-row">
            {!loading && (patients.length === 0 || doctors.length === 0) && <p role="status" className="text-sm text-slate-600">Para crear una cita, primero registrá al menos un paciente y un médico en sus módulos.</p>}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por paciente, doctor o motivo"
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

            <input
              type="date"
              value={filterDate}
              onChange={(event) => setFilterDate(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />

            {(search || filterStatus !== "all" || filterDoctor !== "all" || filterDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterStatus("all");
                  setFilterDoctor("all");
                  setFilterDate("");
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-slate-200 bg-white text-slate-500 shadow-sm">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm">Cargando agenda desde la API...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <UserRound className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm font-medium text-slate-700">
              No encontramos citas con esos filtros.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Ajusta la busqueda o limpia los filtros para volver a ver toda la agenda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id_cita}
                appointment={appointment}
                onEdit={(selectedAppointment) => {
                  setSubmitError(null);
                  setAppointmentForm({ mode: "edit", appointment: selectedAppointment });
                }}
                onDelete={setAppointmentToDelete}
                onStatusChange={handleStatusChange}
                onOpenVisit={(selectedAppointment) => {
                  setSubmitError(null);
                  setAppointmentForVisit(selectedAppointment);
                }}
                onOpenOrder={(selectedAppointment) => {
                  setSubmitError(null);
                  setAppointmentForLabOrder(selectedAppointment);
                }}
                isStatusUpdating={statusUpdatingId === appointment.id_cita}
              />
            ))}
          </div>
        )}

        <p className="text-center text-sm text-slate-400">
          Mostrando {filteredAppointments.length} de {appointments.length} citas
        </p>
      </div>

      {appointmentForm && (
        <AppointmentFormModal
          mode={appointmentForm.mode}
          appointment={appointmentForm.appointment}
          patients={patients}
          doctors={doctors}
          onClose={() => setAppointmentForm(null)}
          onSubmit={handleAppointmentSubmit}
          isSubmitting={isSubmitting}
          errorMessage={submitError}
        />
      )}

      {appointmentForVisit && (
        <VisitModal
          appointment={appointmentForVisit}
          onClose={() => setAppointmentForVisit(null)}
          onSubmit={handleVisitSubmit}
          isSubmitting={isSubmitting}
          errorMessage={submitError}
        />
      )}

      {appointmentForLabOrder && (
        <LabOrderModal
          appointment={appointmentForLabOrder}
          onClose={() => setAppointmentForLabOrder(null)}
          onSubmit={handleLabOrderSubmit}
          isSubmitting={isSubmitting}
          errorMessage={submitError}
        />
      )}

      {appointmentToDelete && (
        <DeleteModal
          appointment={appointmentToDelete}
          onClose={() => setAppointmentToDelete(null)}
          onConfirm={() => void handleDelete()}
          isDeleting={deletingId === appointmentToDelete.id_cita}
        />
      )}
    </div>
  );
}

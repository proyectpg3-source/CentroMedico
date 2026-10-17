import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/layout/Header";
import { Can } from "../auth/usePermissions";
import { fetchAppointments, type AppointmentRecord } from "../api/appointments";
import {
  createLabSupply,
  createLabOrder,
  fetchLabSupplies,
  fetchLabSupplyAlerts,
  fetchLabOrders,
  registerLabSupplyMovement,
  saveLabResult,
  updateLabSupply,
  updateLabOrderStatus,
  type LabSupplyAlertsResponse,
  type LabSupplyRecord,
  type LabOrderRecord,
  type LaboratoryOrderStatus,
  type LaboratoryPriority,
} from "../api/laboratory";
import { fetchPatientOptions, type PatientOption } from "../api/patients";
import { fetchVisits, type VisitRecord } from "../api/visits";
import {
  AlertCircle,
  ArrowDownUp,
  Beaker,
  CheckCircle2,
  Clock3,
  FilePlus2,
  FlaskConical,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getErrorMessage,
  numericValue,
} from "../lib/format";

interface OrderFormState {
  id_paciente: string;
  id_cita: string;
  id_visita: string;
  examen: string;
  prioridad: LaboratoryPriority;
  costo: string;
}

interface ResultFormState {
  resultado: string;
  observaciones: string;
  validado_por: string;
}

interface SupplyFormState {
  nombre: string;
  categoria: string;
  unidad: string;
  stock: string;
  stock_minimo: string;
  fecha_vencimiento: string;
}

interface MovementFormState {
  tipo: "entrada" | "salida";
  cantidad: string;
  motivo: string;
}

const orderStatuses: LaboratoryOrderStatus[] = [
  "pendiente",
  "en_proceso",
  "resultado_cargado",
  "validado",
];

const statusMeta: Record<
  LaboratoryOrderStatus,
  { label: string; badge: string; accent: string }
> = {
  pendiente: {
    label: "Pendiente",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    accent: "border-l-amber-500",
  },
  en_proceso: {
    label: "En proceso",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    accent: "border-l-blue-500",
  },
  resultado_cargado: {
    label: "Resultado cargado",
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    accent: "border-l-violet-500",
  },
  validado: {
    label: "Validado",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    accent: "border-l-emerald-500",
  },
};

function buildOrderFormState(): OrderFormState {
  return {
    id_paciente: "",
    id_cita: "",
    id_visita: "",
    examen: "",
    prioridad: "normal",
    costo: "250",
  };
}

function buildResultFormState(order: LabOrderRecord): ResultFormState {
  return {
    resultado: order.resultado || "",
    observaciones: order.resultado_observaciones || "",
    validado_por: order.validado_por || "",
  };
}

function buildSupplyFormState(supply?: LabSupplyRecord | null): SupplyFormState {
  return {
    nombre: supply?.nombre || "",
    categoria: supply?.categoria || "Laboratorio",
    unidad: supply?.unidad || "unidad",
    stock: String(supply?.stock ?? 0),
    stock_minimo: String(supply?.stock_minimo ?? 0),
    fecha_vencimiento: supply?.fecha_vencimiento
      ? supply.fecha_vencimiento.slice(0, 10)
      : "",
  };
}

function buildEmptyAlerts(): LabSupplyAlertsResponse {
  return {
    source: "frontend",
    generatedAt: new Date().toISOString(),
    summary: {
      totalItems: 0,
      totalAlerts: 0,
      lowStock: 0,
      outOfStock: 0,
      expired: 0,
      expiringSoon: 0,
    },
    alerts: [],
  };
}

function OrderFormModal({
  patients,
  appointments,
  visits,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  patients: PatientOption[];
  appointments: AppointmentRecord[];
  visits: VisitRecord[];
  onClose: () => void;
  onSubmit: (form: OrderFormState) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [form, setForm] = useState<OrderFormState>(() => buildOrderFormState());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-3xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
              Laboratorio operativo
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              Registrar orden de laboratorio
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Paciente *</label>
              <select
                required
                value={form.id_paciente}
                onChange={(event) =>
                  setForm((current) => ({ ...current, id_paciente: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
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
              <label className="text-sm font-medium text-slate-700">Cita origen</label>
              <select
                value={form.id_cita}
                onChange={(event) =>
                  setForm((current) => ({ ...current, id_cita: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="">Sin cita</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id_cita} value={appointment.id_cita}>
                    #{appointment.id_cita} - {appointment.paciente_nombre || "Paciente"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Visita asociada</label>
              <select
                value={form.id_visita}
                onChange={(event) =>
                  setForm((current) => ({ ...current, id_visita: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="">Sin visita</option>
                {visits.map((visit) => (
                  <option key={visit.id_visita} value={visit.id_visita}>
                    #{visit.id_visita} - {visit.paciente_nombre || "Paciente"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Examen solicitado *</label>
            <input
              required
              value={form.examen}
              onChange={(event) =>
                setForm((current) => ({ ...current, examen: event.target.value }))
              }
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              placeholder="Ej. Quimica sanguinea, perfil lipidico, BH"
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
                    prioridad: event.target.value as LaboratoryPriority,
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

function ResultFormModal({
  order,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  order: LabOrderRecord;
  onClose: () => void;
  onSubmit: (form: ResultFormState) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [form, setForm] = useState<ResultFormState>(() => buildResultFormState(order));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
              Resultados
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              Capturar resultado
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {order.examen} - {order.paciente_nombre || "Paciente"}
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
            <label className="text-sm font-medium text-slate-700">Resultado *</label>
            <textarea
              required
              rows={5}
              value={form.resultado}
              onChange={(event) =>
                setForm((current) => ({ ...current, resultado: event.target.value }))
              }
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Observaciones</label>
            <textarea
              rows={3}
              value={form.observaciones}
              onChange={(event) =>
                setForm((current) => ({ ...current, observaciones: event.target.value }))
              }
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Validado por</label>
            <input
              value={form.validado_por}
              onChange={(event) =>
                setForm((current) => ({ ...current, validado_por: event.target.value }))
              }
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              placeholder="Dejalo vacio si aun no ha sido validado"
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
              Guardar resultado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SupplyFormModal({
  supply,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  supply: LabSupplyRecord | null;
  onClose: () => void;
  onSubmit: (form: SupplyFormState) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [form, setForm] = useState<SupplyFormState>(() => buildSupplyFormState(supply));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">
              Inventario
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {supply ? "Editar insumo" : "Nuevo insumo"}
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Nombre *</label>
              <input
                required
                value={form.nombre}
                onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="Ej. Tubos Vacutainer, reactivo de glucosa"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Categoria</label>
              <input
                value={form.categoria}
                onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Unidad</label>
              <input
                value={form.unidad}
                onChange={(event) => setForm((current) => ({ ...current, unidad: event.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                placeholder="unidad, caja, ml"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Stock *</label>
              <input
                required
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Stock minimo *</label>
              <input
                required
                type="number"
                min="0"
                value={form.stock_minimo}
                onChange={(event) => setForm((current) => ({ ...current, stock_minimo: event.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Fecha de vencimiento</label>
              <input
                type="date"
                value={form.fecha_vencimiento}
                onChange={(event) => setForm((current) => ({ ...current, fecha_vencimiento: event.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </div>
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
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar insumo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SupplyMovementModal({
  supply,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  supply: LabSupplyRecord;
  onClose: () => void;
  onSubmit: (form: MovementFormState) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [form, setForm] = useState<MovementFormState>({
    tipo: "entrada",
    cantidad: "1",
    motivo: "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-600">
              Movimiento de stock
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{supply.nombre}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Stock actual: {supply.stock} {supply.unidad}
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Tipo</label>
              <select
                value={form.tipo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tipo: event.target.value as MovementFormState["tipo"] }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
              >
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Cantidad *</label>
              <input
                required
                type="number"
                min="1"
                value={form.cantidad}
                onChange={(event) => setForm((current) => ({ ...current, cantidad: event.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Motivo</label>
            <textarea
              rows={3}
              value={form.motivo}
              onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))}
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
              placeholder="Compra, consumo en prueba, vencimiento, ajuste..."
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
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Laboratory() {
  const [orders, setOrders] = useState<LabOrderRecord[]>([]);
  const [supplies, setSupplies] = useState<LabSupplyRecord[]>([]);
  const [supplyAlerts, setSupplyAlerts] = useState<LabSupplyAlertsResponse>(() => buildEmptyAlerts());
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrderRecord | null>(null);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<LabSupplyRecord | null>(null);
  const [movementSupply, setMovementSupply] = useState<LabSupplyRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);

  async function loadData(signal?: AbortSignal) {
    try {
      setLoading(true);
      setError(null);

      const [
        ordersResponse,
        supplyResponse,
        supplyAlertsResponse,
        patientsResponse,
        appointmentsResponse,
        visitsResponse,
      ] =
        await Promise.all([
          fetchLabOrders(undefined, signal),
          fetchLabSupplies(undefined, signal),
          fetchLabSupplyAlerts(signal),
          fetchPatientOptions(signal),
          fetchAppointments(undefined, signal),
          fetchVisits(undefined, signal),
        ]);

      setOrders(ordersResponse);
      setSupplies(supplyResponse);
      setSupplyAlerts(supplyAlertsResponse);
      setPatients(patientsResponse);
      setAppointments(appointmentsResponse);
      setVisits(visitsResponse);
    } catch (loadError) {
      if (signal?.aborted) {
        return;
      }

      setError(
        getErrorMessage(loadError, "No se pudieron cargar las ordenes de laboratorio.")
      );
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

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const normalized = search.trim().toLowerCase();
      const matchesSearch =
        !normalized ||
        [
          order.paciente_nombre,
          order.examen,
          order.medico_nombre,
          order.visita_diagnostico,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesStatus = filterStatus === "all" || order.estado === filterStatus;
      const matchesPriority =
        filterPriority === "all" || order.prioridad === filterPriority;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [filterPriority, filterStatus, orders, search]);

  const criticalSupplies = useMemo(() => {
    return supplies.filter((supply) => Number(supply.stock) <= Number(supply.stock_minimo));
  }, [supplies]);

  const stats = useMemo(() => {
    const totalCost = orders.reduce((sum, order) => sum + numericValue(order.costo), 0);
    return {
      total: orders.length,
      validated: orders.filter((order) => order.estado === "validado").length,
      inProgress: orders.filter((order) => order.estado === "en_proceso").length,
      pending: orders.filter((order) => order.estado === "pendiente").length,
      alerts: orders.filter((order) => order.prioridad === "urgente").length,
      totalCost,
      supplies: supplies.length,
      lowSupplies: supplyAlerts.summary.lowStock || criticalSupplies.length,
      supplyAlerts: supplyAlerts.summary.totalAlerts || 0,
    };
  }, [criticalSupplies.length, orders, supplies.length, supplyAlerts.summary.lowStock, supplyAlerts.summary.totalAlerts]);

  async function handleCreateOrder(form: OrderFormState) {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await createLabOrder({
        id_paciente: Number(form.id_paciente),
        id_cita: form.id_cita ? Number(form.id_cita) : null,
        id_visita: form.id_visita ? Number(form.id_visita) : null,
        examen: form.examen.trim(),
        prioridad: form.prioridad,
        costo: Number(form.costo),
      });

      setShowOrderModal(false);
      setSuccessMessage("La orden de laboratorio se registro correctamente.");
      await loadData();
    } catch (createError) {
      setSubmitError(
        getErrorMessage(createError, "No se pudo registrar la orden de laboratorio.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveResult(form: ResultFormState) {
    if (!selectedOrder) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await saveLabResult({
        id_orden: selectedOrder.id_orden,
        resultado: form.resultado.trim(),
        observaciones: form.observaciones.trim() || null,
        validado_por: form.validado_por.trim() || null,
      });

      setSelectedOrder(null);
      setSuccessMessage("El resultado del laboratorio se guardo correctamente.");
      await loadData();
    } catch (saveError) {
      setSubmitError(
        getErrorMessage(saveError, "No se pudo guardar el resultado del laboratorio.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(id: number, estado: LaboratoryOrderStatus) {
    setStatusUpdatingId(id);
    setError(null);

    try {
      await updateLabOrderStatus(id, estado);
      await loadData();
    } catch (statusError) {
      setError(
        getErrorMessage(statusError, "No se pudo actualizar el estado de la orden.")
      );
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleSaveSupply(form: SupplyFormState) {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        nombre: form.nombre.trim(),
        categoria: form.categoria.trim() || "Laboratorio",
        unidad: form.unidad.trim() || "unidad",
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo),
        fecha_vencimiento: form.fecha_vencimiento || null,
      };

      if (selectedSupply) {
        await updateLabSupply(selectedSupply.id_insumo, payload);
        setSuccessMessage("El insumo se actualizo correctamente.");
      } else {
        await createLabSupply(payload);
        setSuccessMessage("El insumo se registro correctamente.");
      }

      setShowSupplyModal(false);
      setSelectedSupply(null);
      await loadData();
    } catch (saveError) {
      setSubmitError(getErrorMessage(saveError, "No se pudo guardar el insumo."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegisterMovement(form: MovementFormState) {
    if (!movementSupply) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await registerLabSupplyMovement(movementSupply.id_insumo, {
        tipo: form.tipo,
        cantidad: Number(form.cantidad),
        motivo: form.motivo.trim() || null,
      });

      setMovementSupply(null);
      setSuccessMessage("El movimiento de inventario se registro correctamente.");
      await loadData();
    } catch (movementError) {
      setSubmitError(getErrorMessage(movementError, "No se pudo registrar el movimiento."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header
        title="Laboratorio"
        subtitle="Ordenes, estados operativos, captura de resultados y validacion"
      />

      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Ordenes visibles</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</p>
            <p className="mt-2 text-xs text-slate-400">Bandeja completa desde la base real</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Validadas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.validated}</p>
            <p className="mt-2 text-xs text-slate-400">Resultados liberados por el equipo</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">En proceso</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.inProgress}</p>
            <p className="mt-2 text-xs text-slate-400">Muestras actualmente en trabajo</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pendientes</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.pending}</p>
            <p className="mt-2 text-xs text-slate-400">Aun sin resultado capturado</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Valor de ordenes</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {formatCurrency(stats.totalCost)}
            </p>
            <p className="mt-2 text-xs text-slate-400">Costo bruto acumulado del modulo</p>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  No se pudo sincronizar el laboratorio.
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
              <h2 className="text-lg font-semibold text-slate-900">Bandeja de laboratorio</h2>
              <p className="text-sm text-slate-500">
                Ordenes trazadas por paciente, visita o cita con captura de resultado
              </p>
            </div>
            <Can module="laboratory" action="create">
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  setShowOrderModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                <FilePlus2 className="h-4 w-4" />
                Nueva orden
              </button>
            </Can>
          </div>

          <div className="mt-5 flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar paciente, examen o diagnostico"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition-all focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            >
              <option value="all">Todos los estados</option>
              {orderStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusMeta[status].label}
                </option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={(event) => setFilterPriority(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            >
              <option value="all">Todas las prioridades</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-slate-200 bg-white text-slate-500 shadow-sm">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-violet-600" />
            <p className="text-sm">Cargando ordenes de laboratorio...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <Beaker className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm font-medium text-slate-700">
              No encontramos ordenes con esos filtros.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Crea una orden nueva o ajusta la busqueda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredOrders.map((order) => (
              <article
                key={order.id_orden}
                className={`rounded-[28px] border border-slate-200 border-l-4 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${statusMeta[order.estado].accent}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${statusMeta[order.estado].badge}`}
                      >
                        {statusMeta[order.estado].label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        Prioridad {order.prioridad}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">
                      {order.examen}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {order.paciente_nombre || "Paciente"} - {order.medico_nombre || "Doctor"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Costo
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {formatCurrency(order.costo)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Orden
                    </p>
                    <p className="mt-1 text-sm text-slate-700">#{order.id_orden}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Cita / visita
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {order.id_visita ? `Visita #${order.id_visita}` : order.id_cita ? `Cita #${order.id_cita}` : "Manual"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Fecha
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {formatDateTime(order.created_at)}
                    </p>
                  </div>
                </div>

                {order.resultado && (
                  <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                      Resultado
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{order.resultado}</p>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <select
                    value={order.estado}
                    onChange={(event) =>
                      void handleStatusChange(
                        order.id_orden,
                        event.target.value as LaboratoryOrderStatus
                      )
                    }
                    disabled={statusUpdatingId === order.id_orden}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:opacity-60"
                  >
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>
                        {statusMeta[status].label}
                      </option>
                    ))}
                  </select>

                  <Can module="laboratory" action="edit">
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitError(null);
                        setSelectedOrder(order);
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                    >
                      <FlaskConical className="h-4 w-4" />
                      {order.resultado ? "Editar resultado" : "Cargar resultado"}
                    </button>
                  </Can>

                  {order.validado_por && (
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Validado por {order.validado_por}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Inventario de insumos</h2>
                <p className="text-sm text-slate-500">
                  Stock de laboratorio conectado al microservicio de alertas
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadData()}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
              <Can module="laboratory" action="create">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitError(null);
                    setSelectedSupply(null);
                    setShowSupplyModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo insumo
                </button>
              </Can>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Insumos
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{stats.supplies}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                Alertas
              </p>
              <p className="mt-1 text-2xl font-semibold text-amber-900">
                {stats.supplyAlerts}
              </p>
            </div>
            <div className="rounded-2xl bg-rose-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-700">
                Bajo minimo
              </p>
              <p className="mt-1 text-2xl font-semibold text-rose-900">{stats.lowSupplies}</p>
            </div>
          </div>

          {supplyAlerts.serviceWarning && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              El backend uso calculo local porque el microservicio respondio con aviso: {supplyAlerts.serviceWarning}
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Alertas del inventario</h3>
              <div className="mt-3 space-y-2">
                {supplyAlerts.alerts.length ? (
                  supplyAlerts.alerts.slice(0, 5).map((alert) => (
                    <div key={alert.key} className="rounded-2xl bg-white px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{alert.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{alert.detail}</p>
                          <p className="mt-1 text-xs text-slate-400">{alert.recommendation}</p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                          {alert.badge}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-white px-4 py-6 text-center text-sm text-slate-400">
                    Sin alertas activas de stock o vencimiento.
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Insumo</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Stock</th>
                      <th className="px-4 py-3">Vence</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {supplies.map((supply) => {
                      const isLow = Number(supply.stock) <= Number(supply.stock_minimo);
                      return (
                        <tr key={supply.id_insumo} className="bg-white">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">{supply.nombre}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              Minimo {supply.stock_minimo} {supply.unidad}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{supply.categoria}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                isLow
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {supply.stock} {supply.unidad}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatDate(supply.fecha_vencimiento)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Can module="laboratory" action="edit">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubmitError(null);
                                    setMovementSupply(supply);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-50"
                                >
                                  <ArrowDownUp className="h-3.5 w-3.5" />
                                  Movimiento
                                </button>
                              </Can>
                              <Can module="laboratory" action="edit">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSubmitError(null);
                                    setSelectedSupply(supply);
                                    setShowSupplyModal(true);
                                  }}
                                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                  Editar
                                </button>
                              </Can>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {!supplies.length && (
                <div className="px-6 py-10 text-center">
                  <Package className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm text-slate-500">
                    Aun no hay insumos registrados.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Ruta operativa</h3>
            <div className="mt-4 space-y-3">
              {[
                "Recibir la orden desde una cita o visita clinica.",
                "Moverla por estados hasta llegar a resultado cargado.",
                "Validar y dejar el resultado visible para expediente medico.",
              ].map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm text-slate-600">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Alertas y foco</h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-rose-50 px-4 py-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 text-rose-600" />
                  <div>
                    <p className="text-sm font-medium text-rose-900">Urgentes</p>
                    <p className="text-xs text-rose-700">
                      {stats.alerts} orden(es) marcadas con prioridad urgente.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-blue-50 px-4 py-3">
                <div className="flex items-start gap-2">
                  <Clock3 className="mt-0.5 h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">En seguimiento</p>
                    <p className="text-xs text-blue-700">
                      {stats.inProgress + stats.pending} orden(es) aun requieren intervencion operativa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showOrderModal && (
        <OrderFormModal
          patients={patients}
          appointments={appointments}
          visits={visits}
          onClose={() => setShowOrderModal(false)}
          onSubmit={handleCreateOrder}
          isSubmitting={isSubmitting}
          errorMessage={submitError}
        />
      )}

      {selectedOrder && (
        <ResultFormModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSubmit={handleSaveResult}
          isSubmitting={isSubmitting}
          errorMessage={submitError}
        />
      )}

      {showSupplyModal && (
        <SupplyFormModal
          supply={selectedSupply}
          onClose={() => {
            setShowSupplyModal(false);
            setSelectedSupply(null);
          }}
          onSubmit={handleSaveSupply}
          isSubmitting={isSubmitting}
          errorMessage={submitError}
        />
      )}

      {movementSupply && (
        <SupplyMovementModal
          supply={movementSupply}
          onClose={() => setMovementSupply(null)}
          onSubmit={handleRegisterMovement}
          isSubmitting={isSubmitting}
          errorMessage={submitError}
        />
      )}
    </div>
  );
}

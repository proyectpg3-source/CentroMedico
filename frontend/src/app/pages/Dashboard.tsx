import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext";
import { canAccess } from "../auth/roles";
import { ClipboardPlus } from "lucide-react";
import { Header } from "../components/layout/Header";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Clock3,
  Database,
  ListOrdered,
  ShieldAlert,
  ShieldCheck,
  TimerReset,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchAppointments, type AppointmentRecord } from "../api/appointments";
import { fetchDashboardSummary, fetchHealthStatus, type DashboardSummaryRecord, type HealthStatusRecord } from "../api/dashboard";
import { fetchDoctors, type DoctorRecord } from "../api/doctors";
import { fetchPatients, type PatientRecord } from "../api/patients";
import { fetchAnalysisIndicators, fetchPriorityQueue, type AnalysisIndicators, type ClinicalPriority, type PriorityQueueRecord } from "../api/analysis";
import { fetchCharges, type ChargeRecord } from "../api/billing";
import { Skeleton } from "../components/ui/skeleton";
import { summarizeActivePriorities } from "../lib/appointmentWorkflow.js";
import { formatDuration } from "../lib/format";

type UiStatus = "pendiente" | "confirmada" | "en_curso" | "completada" | "cancelada";

interface DashboardState {
  appointments: AppointmentRecord[] | null;
  doctors: DoctorRecord[] | null;
  health: HealthStatusRecord | null;
  patients: PatientRecord[] | null;
  summary: DashboardSummaryRecord | null;
  indicators: AnalysisIndicators | null;
  priorityQueue: PriorityQueueRecord[] | null;
  charges: ChargeRecord[] | null;
  warnings: string[];
}

// Paleta categorica de la marca (theme.css --chart-1..5), reutilizada para
// el estado de la agenda en vez de colores Tailwind genericos.
const statusMeta: Record<UiStatus, { label: string; color: string; hint: string }> = {
  pendiente: { label: "Pendientes", color: "#1d4ed8", hint: "Por confirmar" },
  confirmada: { label: "Confirmadas", color: "#7c3aed", hint: "Agenda asegurada" },
  en_curso: { label: "En curso", color: "#c2410c", hint: "Atención activa" },
  completada: { label: "Completadas", color: "#059669", hint: "Circuito cerrado" },
  cancelada: { label: "Canceladas", color: "#dc2626", hint: "Requieren seguimiento" },
};

// Colores de prioridad clinica (theme.css --triage-*): rojo se reserva
// exclusivamente para lo critico, siguiendo la convencion de triaje.
const priorityMeta: Record<ClinicalPriority, { label: string; color: string }> = {
  critica: { label: "Crítica", color: "#dc2626" },
  alta: { label: "Alta", color: "#ea580c" },
  media: { label: "Media", color: "#ca8a04" },
  baja: { label: "Baja", color: "#16a34a" },
};

const LEVEL_TO_PRIORITY: Record<"P1" | "P2" | "P3" | "P4", ClinicalPriority> = { P1: "critica", P2: "alta", P3: "media", P4: "baja" };

const currencyFormatter = new Intl.NumberFormat("es-GT", {
  style: "currency",
  currency: "GTQ",
  maximumFractionDigits: 0,
});

function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function appointmentDateKey(value: string) {
  return toLocalDateKey(new Date(value));
}

function normalizeStatus(status: string): UiStatus {
  if (status in statusMeta) {
    return status as UiStatus;
  }

  const mapping: Record<string, UiStatus> = {
    scheduled: "pendiente",
    completed: "completada",
    cancelled: "cancelada",
    "in-progress": "en_curso",
  };

  return mapping[status] || "pendiente";
}

function getPatientInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function buildFallbackState(): DashboardState {
  return {
    summary: null,
    health: null,
    patients: null,
    doctors: null,
    appointments: null,
    indicators: null,
    priorityQueue: null,
    charges: null,
    warnings: [],
  };
}

function ColorTag({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{ backgroundColor: `${color}17`, borderColor: `${color}33`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
  loading,
}: {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  loading?: boolean;
}) {
  return (
    <div className="clinic-kpi rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`clinic-dashboard-section rounded-2xl border border-border bg-card p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const role = user?.rol;
  const canReadPatients = canAccess(role, "/patients");
  const canReadClinical = canAccess(role, "/prioritization");
  const canReadFinance = canAccess(role, "/billing");
  const quickActions = [
    { to: "/atencion-rapida", title: "Atención rápida", detail: "Ingreso sin cita ni ficha previa", icon: ClipboardPlus },
    { to: "/patients", title: "Pacientes", detail: "Registro y seguimiento", icon: Users },
    { to: "/appointments", title: "Citas médicas", detail: "Organizar la agenda", icon: CalendarDays },
    { to: "/triage", title: "Triaje", detail: "Evaluación inicial", icon: ClipboardPlus },
    { to: "/billing", title: "Cuentas y pagos", detail: "Consultar saldos", icon: Wallet },
  ].filter(action => canAccess(role, action.to));
  const [state, setState] = useState<DashboardState>(buildFallbackState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);

    async function loadDashboard() {
      const [
        summaryResult,
        healthResult,
        patientsResult,
        doctorsResult,
        appointmentsResult,
        indicatorsResult,
        priorityQueueResult,
        chargesResult,
      ] = await Promise.allSettled([
        fetchDashboardSummary(controller.signal),
        fetchHealthStatus(controller.signal),
        canReadPatients ? fetchPatients(controller.signal) : Promise.resolve(null),
        fetchDoctors(undefined, controller.signal),
        fetchAppointments(undefined, controller.signal),
        canReadClinical ? fetchAnalysisIndicators(controller.signal) : Promise.resolve(null),
        canReadClinical ? fetchPriorityQueue(controller.signal) : Promise.resolve(null),
        canReadFinance ? fetchCharges(undefined, controller.signal) : Promise.resolve(null),
      ]);

      if (controller.signal.aborted) {
        return;
      }

      const warnings: string[] = [];
      const pushWarning = (result: PromiseSettledResult<unknown>, fallback: string) => {
        if (result.status === "rejected") {
          warnings.push(result.reason instanceof Error ? result.reason.message : fallback);
        }
      };

      pushWarning(summaryResult, "Resumen no disponible.");
      pushWarning(healthResult, "Salud del sistema no disponible.");
      pushWarning(patientsResult, "Pacientes no disponibles.");
      pushWarning(doctorsResult, "Doctores no disponibles.");
      pushWarning(appointmentsResult, "Citas no disponibles.");
      pushWarning(indicatorsResult, "Indicadores clínicos no disponibles.");
      pushWarning(priorityQueueResult, "Cola de prioridad no disponible.");
      pushWarning(chargesResult, "Cargos no disponibles.");

      setState({
        summary: summaryResult.status === "fulfilled" ? summaryResult.value : null,
        health: healthResult.status === "fulfilled" ? healthResult.value : null,
        patients: patientsResult.status === "fulfilled" ? patientsResult.value : null,
        doctors: doctorsResult.status === "fulfilled" ? doctorsResult.value : null,
        appointments: appointmentsResult.status === "fulfilled" ? appointmentsResult.value : null,
        indicators: indicatorsResult.status === "fulfilled" ? indicatorsResult.value : null,
        priorityQueue: priorityQueueResult.status === "fulfilled" ? priorityQueueResult.value : null,
        charges: chargesResult.status === "fulfilled" ? chargesResult.value : null,
        warnings,
      });
      setIsLoading(false);
    }

    void loadDashboard();

    return () => controller.abort();
  }, [canReadPatients, canReadClinical, canReadFinance]);

  const todayKey = toLocalDateKey();

  const patientCards = useMemo(() => {
    if (state.patients) {
      return [...state.patients]
        .sort((left, right) => new Date(right.fecha_registro).getTime() - new Date(left.fecha_registro).getTime())
        .slice(0, 5)
        .map((patient) => ({
          id: String(patient.id_paciente),
          name: patient.nombre,
          document: patient.dni,
          contact: patient.telefono || patient.email || "Sin contacto",
          date: formatDate(patient.fecha_registro),
        }));
    }

    return [];
  }, [state.patients]);

  const agenda = useMemo(() => {
    if (state.appointments) {
      return state.appointments
        .map((appointment) => ({
          id: String(appointment.id_cita),
          patientName: appointment.paciente_nombre || "Paciente pendiente",
          doctorName: appointment.medico_nombre || "Doctor pendiente",
          specialty: appointment.medico_especialidad || "Especialidad por definir",
          status: normalizeStatus(appointment.estado),
          time: formatTime(appointment.fecha_hora),
          dateKey: appointmentDateKey(appointment.fecha_hora),
        }))
        .sort((left, right) => left.time.localeCompare(right.time));
    }

    return [];
  }, [state.appointments]);

  const todayAgenda = agenda.filter((appointment) => appointment.dateKey === todayKey);
  const nextAgendaDate =
    todayAgenda.length > 0
      ? todayKey
      : agenda
          .map((appointment) => appointment.dateKey)
          .filter((dateKey) => dateKey >= todayKey)
          .sort()[0] || todayKey;

  const visibleAgenda = agenda
    .filter((appointment) => appointment.dateKey === nextAgendaDate)
    .slice(0, 6);

  const statusDistribution = useMemo(() => {
    if (state.summary?.citas_por_estado?.length) {
      return state.summary.citas_por_estado.map((item) => {
        const key = normalizeStatus(item.estado);
        return {
          name: statusMeta[key].label,
          value: item.total,
          color: statusMeta[key].color,
        };
      });
    }

    const counts = agenda.reduce<Record<UiStatus, number>>(
      (accumulator, item) => ({
        ...accumulator,
        [item.status]: accumulator[item.status] + 1,
      }),
      { pendiente: 0, confirmada: 0, en_curso: 0, completada: 0, cancelada: 0 }
    );

    return (Object.keys(counts) as UiStatus[])
      .filter((status) => counts[status] > 0)
      .map((status) => ({
        name: statusMeta[status].label,
        value: counts[status],
        color: statusMeta[status].color,
      }));
  }, [agenda, state.summary]);

  const priorityDistribution = useMemo(() => {
    if (!state.appointments) {
      return [];
    }

    const counts = summarizeActivePriorities(state.appointments);
    const meta = {
      P1: { label: "P1 validada", color: priorityMeta.critica.color },
      P2: { label: "P2 validada", color: priorityMeta.alta.color },
      P3: { label: "P3 validada", color: priorityMeta.media.color },
      P4: { label: "P4 validada", color: priorityMeta.baja.color },
      SIN_VALIDAR: { label: "Sin validar", color: "#64748b" },
    };
    return (Object.keys(meta) as (keyof typeof meta)[])
      .filter((key) => counts[key] > 0)
      .map((key) => ({ name: meta[key].label, value: counts[key], color: meta[key].color }));
  }, [state.appointments]);

  const priorityQueueTop = useMemo(() => {
    if (!state.priorityQueue) {
      return [];
    }

    // El backend ya ordena por prioridad validada (P1–P4) y hora de ingreso a la cola.
    return [...state.priorityQueue].slice(0, 6);
  }, [state.priorityQueue]);

  const doctorLoad = useMemo(() => {
    if (state.doctors && state.appointments) {
      const loadMap = state.appointments.reduce<Record<number, number>>((accumulator, appointment) => {
        if (!appointment.id_medico) {
          return accumulator;
        }

        return {
          ...accumulator,
          [appointment.id_medico]: (accumulator[appointment.id_medico] || 0) + 1,
        };
      }, {});

      return state.doctors
        .map((doctor) => ({
          id: doctor.id_medico,
          name: doctor.nombre,
          specialty: doctor.especialidad,
          load: loadMap[doctor.id_medico] || 0,
        }))
        .sort((left, right) => right.load - left.load)
        .slice(0, 5);
    }

    return [];
  }, [state.appointments, state.doctors]);

  const financials = useMemo(() => {
    if (!state.charges) {
      return { cobrado: null as number | null, pendiente: null as number | null, porOrigen: [] as Array<{ origen: string; total: number }> };
    }

    // Priorizamos los datos del summary del backend si están disponibles,
    // sino calculamos localmente para mantener la compatibilidad.
    const recaudado = state.summary?.financiera?.recaudado ?? state.charges.reduce((sum, charge) => sum + Number(charge.total_pagado || 0), 0);
    const pendiente = state.summary?.financiera?.pendiente ?? state.charges.reduce((sum, charge) => sum + Number(charge.saldo || 0), 0);

    const origenLabels: Record<string, string> = {
      consulta: "Consultas",
      laboratorio: "Laboratorio",
      farmacia: "Farmacia",
    };

    const porOrigenMap = state.charges.reduce<Record<string, number>>((accumulator, charge) => {
      return { ...accumulator, [charge.origen]: (accumulator[charge.origen] || 0) + Number(charge.total || 0) };
    }, {});

    const porOrigen = Object.entries(porOrigenMap)
      .map(([origen, total]) => ({ origen: origenLabels[origen] || origen, total }))
      .sort((left, right) => right.total - left.total);

    return {
      cobrado: recaudado,
      pendiente: pendiente,
      porOrigen,
      cobrabilidad: state.summary?.financiera?.indiceCobrabilidad ?? (recaudado / NULLIF(recaudado + pendiente, 0) * 100)
    };
  }, [state.charges, state.summary]);

  const frequentLists = useMemo(() => {
    const diagnosticos = state.indicators?.diagnosticos_frecuentes?.slice(0, 5) ?? [];
    const motivos = state.indicators?.motivos_frecuentes?.slice(0, 5) ?? [];
    const maxDiagnostico = Math.max(1, ...diagnosticos.map((item) => item.total));
    const maxMotivo = Math.max(1, ...motivos.map((item) => item.total));

    return { diagnosticos, motivos, maxDiagnostico, maxMotivo };
  }, [state.indicators]);

  const patientsTotal = state.summary?.total_pacientes ?? state.patients?.length ?? null;
  const doctorsTotal = state.summary?.total_medicos ?? state.doctors?.length ?? null;
  const appointmentsTotal = state.summary?.total_citas ?? state.appointments?.length ?? null;
  const liveAppointmentsToday = state.appointments ? todayAgenda.length : null;
  const esperaPromedio = state.indicators?.espera_promedio_minutos ?? null;
  const altaPrioridad = state.indicators?.citas_alta_prioridad ?? null;
  const operationalText =
    state.health?.status === "ok" && state.health.database === "connected"
      ? "Sistema disponible"
      : "Conexión por verificar";

  return (
    <div className="flex min-h-full flex-col">
      <Header title="Vista general" subtitle="La actividad de tu centro médico, en un solo lugar." />

      <div className="clinic-dashboard flex-1 space-y-6 p-4 lg:p-6">
        <div className="clinic-dashboard-intro flex items-end justify-between gap-4">
          <div><p className="mb-2 text-xs font-medium text-primary">Atención y seguimiento</p><h2 className="text-3xl font-semibold tracking-tight text-foreground">El pulso de La Aurora</h2></div>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-4 w-4" />Resumen de la jornada</span>
        </div>
        <nav aria-label="Accesos rápidos" className="clinic-quick-actions">
          {quickActions.map(({ to, title, detail, icon: Icon }) => <Link key={to} to={to} className="clinic-quick-action"><Icon className="h-5 w-5" aria-hidden="true" /><span><strong>{title}</strong><small>{detail}</small></span><ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>)}
        </nav>
        {state.warnings.length > 0 && (
          <div className="rounded-2xl border border-warning/30 bg-warning-bg px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
              <div>
                <p className="text-sm font-medium text-warning">
                  Algunos datos no están disponibles. Intenta recargar la página.
                </p>
                <p className="mt-1 text-xs text-warning/80">{state.warnings.join(" · ")}</p>
              </div>
            </div>
          </div>
        )}

        {/* KPIs clinicos principales: cada uno habilita una decision concreta
            (staffing, priorizacion, cobros) en vez de solo llenar espacio. */}
        <div className="clinic-metrics grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Pacientes registrados"
            value={patientsTotal?.toLocaleString("es-MX") ?? "—"}
            description={patientsTotal != null ? "Pacientes en el sistema" : "Datos no disponibles"}
            icon={Users}
            tone="bg-accent text-accent-foreground"
            loading={isLoading}
          />
          <KpiCard
            title="Citas de hoy"
            value={liveAppointmentsToday?.toLocaleString("es-GT") ?? "—"}
            description={liveAppointmentsToday == null ? "Datos no disponibles" : liveAppointmentsToday > 0 ? "Agenda activa para hoy" : "Sin citas registradas hoy"}
            icon={CalendarDays}
            tone="bg-primary/10 text-primary"
            loading={isLoading}
          />
          <KpiCard
            title="Espera promedio"
            value={esperaPromedio != null ? `${Math.round(esperaPromedio)} min` : "—"}
            description="Tiempo entre llegada y atención"
            icon={TimerReset}
            tone="bg-warning-bg text-warning"
            loading={isLoading}
          />
          <KpiCard
            title="Prioridad alta / crítica"
            value={altaPrioridad != null ? altaPrioridad.toLocaleString("es-MX") : "—"}
            description="Casos activos que requieren atención pronta"
            icon={ShieldAlert}
            tone="bg-destructive-bg text-destructive"
            loading={isLoading}
          />
        </div>

        {/* Franja operativa y financiera: expandida para incluir análisis de rendimiento
            sin romper la armonía visual ni el flujo de lectura del administrador. */}
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success-bg text-success">
              <Banknote className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Recaudado</p>
              <p className="truncate text-lg font-semibold text-foreground">
                {financials.cobrado != null ? currencyFormatter.format(financials.cobrado) : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:border-x sm:border-border sm:px-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning-bg text-warning">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Pendiente</p>
              <p className="truncate text-lg font-semibold text-foreground">
                {financials.pendiente != null ? currencyFormatter.format(financials.pendiente) : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:border-x sm:border-border sm:px-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Tasa Conv.</p>
              <p className="truncate text-lg font-semibold text-foreground">
                {state.summary?.operativa?.tasa_conversion != null ? `${state.summary.operativa.tasa_conversion.toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:border-x sm:border-border sm:px-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-bg text-accent-foreground">
              <Clock3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Espera Prom.</p>
              <p className="truncate text-lg font-semibold text-foreground">
                {state.summary?.operativa?.tiempo_espera_promedio_horas != null ? `${state.summary.operativa.tiempo_espera_promedio_horas.toFixed(1)} h` : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:border-x sm:border-border sm:px-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success-bg text-success">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Cobrabilidad</p>
              <p className="truncate text-lg font-semibold text-foreground">
                {state.summary?.financiera?.indiceCobrabilidad != null ? `${state.summary.financiera.indiceCobrabilidad.toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                state.health?.status === "ok" ? "bg-success-bg text-success" : "bg-warning-bg text-warning"
              }`}
            >
              {state.health?.status === "ok" ? <ShieldCheck className="h-5 w-5" /> : <Database className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Estado Sistema</p>
              <p className="truncate text-sm font-medium text-foreground">{operationalText}</p>
            </div>
          </div>
        </div>

        {/* Cola de prioridad clinica: la vista mas accionable del panel — quien
            hay que atender primero, hace cuanto espera y por que. */}
        <SectionCard
          title="Seguimiento de atención"
          subtitle="Evaluaciones pendientes y prioridades validadas"
          action={
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <ListOrdered className="h-3.5 w-3.5" />
              {state.priorityQueue?.length ?? 0} citas activas
            </span>
          }
        >
          {priorityQueueTop.length > 0 ? (
            <div className="space-y-2">
              {priorityQueueTop.map((item) => (
                <div
                  key={item.id_cita}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {getPatientInitials(item.paciente_nombre || "Paciente")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{item.paciente_nombre || "Paciente pendiente"}</p>
                        {(() => {
                          const level = item.prioridad_final || item.nivel_propuesto;
                          if (!level) return <ColorTag color="#64748b" label={item.id_triaje ? "Sin propuesta" : "Sin evaluar"} />;
                          const meta = priorityMeta[LEVEL_TO_PRIORITY[level]];
                          return <ColorTag color={meta.color} label={`${level} ${item.prioridad_final ? "validada" : "propuesta"}`} />;
                        })()}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.motivo || "Motivo no especificado"} · {item.medico_nombre || "Doctor por asignar"}
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 self-start rounded-xl bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm sm:self-auto">
                    <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                    {item.vencida
                      ? "Cita vencida · cerrar o reprogramar"
                      : item.minutos_espera != null
                        ? `${formatDuration(item.minutos_espera)} esperando`
                        : "Sin registro de espera"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No hay citas activas para seguimiento en este momento.
            </p>
          )}
        </SectionCard>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <SectionCard
            title="Tendencia de citas"
            subtitle="Citas registradas en los últimos seis meses"
            className="xl:col-span-2"
            action={
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Activity className="h-3.5 w-3.5" />
                {appointmentsTotal ?? "—"} citas acumuladas
              </span>
            }
          >
            {isLoading ? <Skeleton className="h-[260px] w-full" /> : state.summary?.citas_por_mes?.some(item => item.citas > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={state.summary?.citas_por_mes ?? []}>
                <defs>
                  <linearGradient id="dashboard-area-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="citas" stroke="#059669" strokeWidth={2.5} fill="url(#dashboard-area-fill)" />
              </AreaChart>
            </ResponsiveContainer>
            ) : <div className="clinic-chart-empty"><TrendingUp className="h-7 w-7" aria-hidden="true" /><strong>{state.summary ? "Todavía no hay una tendencia" : "Tendencia no disponible"}</strong><p>{state.summary ? "Las citas registradas aparecerán aquí para mostrar la actividad de los últimos meses." : "No pudimos cargar estos datos. Intenta recargar la página."}</p></div>}

          </SectionCard>

          <SectionCard title="Prioridad clínica activa" subtitle="Prioridades validadas y citas pendientes de validación">
            {priorityDistribution.length ? <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={priorityDistribution} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={4}>
                  {priorityDistribution.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}`, "Citas"]} />
              </PieChart>
            </ResponsiveContainer> : null}
            <div className="space-y-2">
              {priorityDistribution.length > 0 ? (
                priorityDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{item.value}</span>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-xs text-muted-foreground">{state.appointments ? "Sin citas activas para clasificar." : "Datos no disponibles."}</p>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card shadow-sm xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {nextAgendaDate === todayKey ? "Agenda de hoy" : `Próxima agenda: ${formatDate(nextAgendaDate)}`}
                </h3>
                <p className="text-sm text-muted-foreground">Citas priorizadas para seguimiento y operación</p>
              </div>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {visibleAgenda.length} visibles
              </span>
            </div>
            <div className="divide-y divide-border">
              {visibleAgenda.length > 0 ? (
                visibleAgenda.map((appointment) => (
                  <div key={appointment.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{appointment.patientName}</p>
                        <ColorTag color={statusMeta[appointment.status].color} label={statusMeta[appointment.status].label} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {appointment.doctorName} · {appointment.specialty}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
                      <Clock3 className="h-4 w-4 text-muted-foreground" />
                      {appointment.time}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-muted-foreground">No hay citas disponibles para mostrar en la agenda actual.</p>
                </div>
              )}
            </div>
          </div>

          <SectionCard title="Estado de la agenda" subtitle="Distribución actual por estado">
            <div className="space-y-2">
              {statusDistribution.length > 0 ? (
                statusDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-xl bg-muted px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{item.value}</span>
                  </div>
                ))
              ) : (
                <p className="py-2 text-center text-xs text-muted-foreground">Sin citas registradas todavía.</p>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <SectionCard title="Últimos ingresos" subtitle="Pacientes registrados recientemente">
            <div className="space-y-3">
              {patientCards.length > 0 ? (
                patientCards.map((patient) => (
                  <div key={patient.id} className="flex items-center gap-3 rounded-xl bg-muted px-3 py-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {getPatientInitials(patient.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{patient.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {patient.document} · {patient.contact}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">{patient.date}</div>
                  </div>
                ))
              ) : (
                <p className="py-2 text-center text-xs text-muted-foreground">Aún no hay pacientes registrados.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Carga por doctor"
            subtitle={`Comparativo actual según citas asociadas · ${doctorsTotal ?? "—"} doctores en total`}
            className="xl:col-span-2"
            action={
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                Primeros 5
              </span>
            }
          >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                {doctorLoad.map((doctor) => (
                  <div key={doctor.id} className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{doctor.name}</p>
                        <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
                      </div>
                      <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                        {doctor.load} cita(s)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={doctorLoad}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" hide />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value}`, "Citas"]} />
                  <Bar dataKey="load" radius={[10, 10, 0, 0]} fill="#059669" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        {/* Insights clinicos: motivos y diagnosticos mas frecuentes, para
            identificar patrones sin tener que abrir el modulo de analisis. */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard title="Diagnósticos frecuentes" subtitle="Los más registrados en visitas recientes">
            {frequentLists.diagnosticos.length > 0 ? (
              <div className="space-y-3">
                {frequentLists.diagnosticos.map((item) => (
                  <div key={item.diagnostico}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate text-foreground">{item.diagnostico}</span>
                      <span className="ml-2 shrink-0 font-medium text-muted-foreground">{item.total}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(6, (item.total / frequentLists.maxDiagnostico) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-2 text-center text-xs text-muted-foreground">Sin diagnósticos registrados aún.</p>
            )}
          </SectionCard>

          <SectionCard title="Motivos de consulta frecuentes" subtitle="Principales razones de visita">
            {frequentLists.motivos.length > 0 ? (
              <div className="space-y-3">
                {frequentLists.motivos.map((item) => (
                  <div key={item.motivo}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate text-foreground">{item.motivo}</span>
                      <span className="ml-2 shrink-0 font-medium text-muted-foreground">{item.total}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-accent-foreground"
                        style={{ width: `${Math.max(6, (item.total / frequentLists.maxMotivo) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-2 text-center text-xs text-muted-foreground">Sin motivos registrados aún.</p>
            )}
          </SectionCard>
        </div>

        {financials.porOrigen.length > 0 && (
          <SectionCard title="Facturación por origen" subtitle="Distribución de cargos generados por tipo de servicio">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {financials.porOrigen.map((item) => (
                <div key={item.origen} className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    {item.origen}
                  </div>
                  <p className="mt-2 text-xl font-semibold text-foreground">{currencyFormatter.format(item.total)}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <ArrowUpRight className="h-3.5 w-3.5" />
          {isLoading ? "Actualizando panel..." : "Datos sincronizados con el backend."}
        </div>
      </div>
    </div>
  );
}

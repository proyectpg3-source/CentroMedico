import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Header } from "../components/layout/Header";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  ShieldCheck,
  Stethoscope,
  Users,
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
import { appointments as mockAppointments, chartData, doctors as mockDoctors, patients as mockPatients } from "../data/mockData";

type UiStatus = "pendiente" | "confirmada" | "en_curso" | "completada" | "cancelada";

interface DashboardState {
  appointments: AppointmentRecord[] | null;
  doctors: DoctorRecord[] | null;
  health: HealthStatusRecord | null;
  patients: PatientRecord[] | null;
  summary: DashboardSummaryRecord | null;
  warnings: string[];
}

const statusMeta: Record<
  UiStatus,
  { label: string; pill: string; chartColor: string; summary: string }
> = {
  pendiente: {
    label: "Pendientes",
    pill: "bg-blue-50 text-blue-700 border-blue-200",
    chartColor: "#2563eb",
    summary: "Por confirmar",
  },
  confirmada: {
    label: "Confirmadas",
    pill: "bg-indigo-50 text-indigo-700 border-indigo-200",
    chartColor: "#4f46e5",
    summary: "Agenda asegurada",
  },
  en_curso: {
    label: "En curso",
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    chartColor: "#f59e0b",
    summary: "Atención activa",
  },
  completada: {
    label: "Completadas",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    chartColor: "#10b981",
    summary: "Circuito cerrado",
  },
  cancelada: {
    label: "Canceladas",
    pill: "bg-rose-50 text-rose-700 border-rose-200",
    chartColor: "#f43f5e",
    summary: "Requieren seguimiento",
  },
};

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
    warnings: [],
  };
}

function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            {description}
          </p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [state, setState] = useState<DashboardState>(buildFallbackState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      const [summaryResult, healthResult, patientsResult, doctorsResult, appointmentsResult] =
        await Promise.allSettled([
          fetchDashboardSummary(controller.signal),
          fetchHealthStatus(controller.signal),
          fetchPatients(controller.signal),
          fetchDoctors(undefined, controller.signal),
          fetchAppointments(undefined, controller.signal),
        ]);

      if (controller.signal.aborted) {
        return;
      }

      const warnings: string[] = [];

      if (summaryResult.status === "rejected") {
        warnings.push(summaryResult.reason instanceof Error ? summaryResult.reason.message : "Resumen no disponible.");
      }

      if (healthResult.status === "rejected") {
        warnings.push(healthResult.reason instanceof Error ? healthResult.reason.message : "Salud del sistema no disponible.");
      }

      if (patientsResult.status === "rejected") {
        warnings.push(patientsResult.reason instanceof Error ? patientsResult.reason.message : "Pacientes no disponibles.");
      }

      if (doctorsResult.status === "rejected") {
        warnings.push(doctorsResult.reason instanceof Error ? doctorsResult.reason.message : "Doctores no disponibles.");
      }

      if (appointmentsResult.status === "rejected") {
        warnings.push(appointmentsResult.reason instanceof Error ? appointmentsResult.reason.message : "Citas no disponibles.");
      }

      setState({
        summary: summaryResult.status === "fulfilled" ? summaryResult.value : null,
        health: healthResult.status === "fulfilled" ? healthResult.value : null,
        patients: patientsResult.status === "fulfilled" ? patientsResult.value : null,
        doctors: doctorsResult.status === "fulfilled" ? doctorsResult.value : null,
        appointments: appointmentsResult.status === "fulfilled" ? appointmentsResult.value : null,
        warnings,
      });
      setIsLoading(false);
    }

    void loadDashboard();

    return () => controller.abort();
  }, []);

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

    return mockPatients.slice(0, 5).map((patient) => ({
      id: patient.id,
      name: patient.name,
      document: patient.insuranceNumber,
      contact: patient.phone,
      date: formatDate(patient.lastVisit),
    }));
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

    return mockAppointments.map((appointment) => ({
      id: appointment.id,
      patientName: appointment.patientName,
      doctorName: appointment.doctorName,
      specialty: appointment.specialty,
      status: normalizeStatus(appointment.status),
      time: appointment.time,
      dateKey: appointment.date,
    }));
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
          color: statusMeta[key].chartColor,
        };
      });
    }

    const counts = agenda.reduce<Record<UiStatus, number>>(
      (accumulator, item) => ({
        ...accumulator,
        [item.status]: accumulator[item.status] + 1,
      }),
      {
        pendiente: 0,
        confirmada: 0,
        en_curso: 0,
        completada: 0,
        cancelada: 0,
      }
    );

    return (Object.keys(counts) as UiStatus[])
      .filter((status) => counts[status] > 0)
      .map((status) => ({
        name: statusMeta[status].label,
        value: counts[status],
        color: statusMeta[status].chartColor,
      }));
  }, [agenda, state.summary]);

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

    return mockDoctors
      .map((doctor) => ({
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
        load: mockAppointments.filter((appointment) => appointment.doctorId === doctor.id).length,
      }))
      .sort((left, right) => right.load - left.load)
      .slice(0, 5);
  }, [state.appointments, state.doctors]);

  const patientsTotal = state.summary?.total_pacientes ?? state.patients?.length ?? mockPatients.length;
  const doctorsTotal = state.summary?.total_medicos ?? state.doctors?.length ?? mockDoctors.length;
  const appointmentsTotal = state.summary?.total_citas ?? state.appointments?.length ?? mockAppointments.length;
  const liveAppointmentsToday = todayAgenda.length;
  const completedCount =
    statusDistribution.find((item) => item.name === statusMeta.completada.label)?.value || 0;
  const operationalText =
    state.health?.status === "ok" && state.health.database === "connected"
      ? "API y base de datos conectadas"
      : "Operando con respaldo visual";

  return (
    <div className="flex min-h-full flex-col">
      <Header title="Dashboard General" subtitle="Resumen operativo del centro médico y seguimiento diario" />

      <div className="flex-1 space-y-6 p-4 lg:p-6">
        {state.warnings.length > 0 && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  Algunas fuentes no respondieron. El dashboard mantiene contenido de respaldo para no dejar la vista vacía.
                </p>
                <p className="mt-1 text-xs text-amber-700">{state.warnings.join(" · ")}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Pacientes registrados"
            value={patientsTotal.toLocaleString("es-MX")}
            description={state.patients ? "Sincronizado con la API real" : "Vista de respaldo disponible"}
            icon={Users}
            tone="bg-blue-50 text-blue-600"
          />
          <KpiCard
            title="Doctores activos"
            value={doctorsTotal.toLocaleString("es-MX")}
            description={state.doctors ? "Equipo cargado correctamente" : "Usando plantilla visual"}
            icon={Stethoscope}
            tone="bg-emerald-50 text-emerald-600"
          />
          <KpiCard
            title="Citas de hoy"
            value={liveAppointmentsToday.toLocaleString("es-MX")}
            description={liveAppointmentsToday > 0 ? "Agenda activa para hoy" : "Sin citas registradas hoy"}
            icon={CalendarDays}
            tone="bg-violet-50 text-violet-600"
          />
          <KpiCard
            title="Salud del sistema"
            value={state.health?.status === "ok" ? "Online" : "Respaldo"}
            description={operationalText}
            icon={state.health?.status === "ok" ? ShieldCheck : Database}
            tone={state.health?.status === "ok" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Tendencia de citas</h3>
                <p className="text-sm text-slate-500">Histórico visual de los últimos seis meses</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                <Activity className="h-3.5 w-3.5" />
                {appointmentsTotal} citas acumuladas
              </span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData.appointmentsPerMonth}>
                <defs>
                  <linearGradient id="dashboard-area-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="citas" stroke="#2563eb" strokeWidth={2.5} fill="url(#dashboard-area-fill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Estado de la agenda</h3>
              <p className="text-sm text-slate-500">Distribución actual por estado</p>
            </div>
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={4}
                >
                  {statusDistribution.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}`, "Citas"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {statusDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {nextAgendaDate === todayKey ? "Agenda de hoy" : `Próxima agenda: ${formatDate(nextAgendaDate)}`}
                </h3>
                <p className="text-sm text-slate-500">Citas priorizadas para seguimiento y operación</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                {visibleAgenda.length} visibles
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {visibleAgenda.length > 0 ? (
                visibleAgenda.map((appointment) => (
                  <div key={appointment.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-slate-900">{appointment.patientName}</p>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusMeta[appointment.status].pill}`}>
                          {statusMeta[appointment.status].label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {appointment.doctorName} · {appointment.specialty}
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <Clock3 className="h-4 w-4 text-slate-400" />
                      {appointment.time}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-slate-500">No hay citas disponibles para mostrar en la agenda actual.</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Pulso operativo</h3>
              <p className="text-sm text-slate-500">Indicadores rápidos para coordinación</p>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Citas cerradas</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-900">{completedCount}</p>
                <p className="text-xs text-emerald-700">Episodios completados durante el período actual</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Conectividad</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{operationalText}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {isLoading ? "Actualizando panel..." : "Estado revisado desde el backend disponible."}
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Cobertura del equipo</p>
                <p className="mt-2 text-sm font-medium text-blue-900">{doctorLoad.length} doctores monitoreados</p>
                <p className="mt-1 text-xs text-blue-700">
                  Vista rápida de carga clínica y seguimiento de agenda.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Últimos ingresos</h3>
              <p className="text-sm text-slate-500">Pacientes registrados recientemente</p>
            </div>
            <div className="space-y-3">
              {patientCards.map((patient) => (
                <div key={patient.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600/10 text-sm font-semibold text-blue-700">
                    {getPatientInitials(patient.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{patient.name}</p>
                    <p className="truncate text-xs text-slate-500">{patient.document} · {patient.contact}</p>
                  </div>
                  <div className="text-right text-xs text-slate-400">{patient.date}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Carga por doctor</h3>
                <p className="text-sm text-slate-500">Comparativo actual según citas asociadas</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                Top 5
              </span>
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                {doctorLoad.map((doctor) => (
                  <div key={doctor.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{doctor.name}</p>
                        <p className="text-xs text-slate-500">{doctor.specialty}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                        {doctor.load} cita(s)
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={doctorLoad}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" hide />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value}`, "Citas"]} />
                  <Bar dataKey="load" radius={[10, 10, 0, 0]} fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

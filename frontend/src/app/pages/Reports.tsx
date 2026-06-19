import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/layout/Header";
import {
  AlertCircle,
  BarChart3,
  BriefcaseMedical,
  CheckCircle2,
  ClipboardList,
  Coins,
} from "lucide-react";
import {
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
import { fetchCharges, fetchPayments } from "../api/billing";
import { fetchLabOrders } from "../api/laboratory";
import { fetchPatients } from "../api/patients";
import { fetchPrescriptions } from "../api/prescriptions";
import { fetchVisits } from "../api/visits";
import { formatCurrency, getErrorMessage, numericValue } from "../lib/format";

const statusColors = {
  pendiente: "#f59e0b",
  en_proceso: "#2563eb",
  resultado_cargado: "#8b5cf6",
  validado: "#10b981",
} as const;

const originColors = {
  consulta: "#2563eb",
  laboratorio: "#10b981",
  farmacia: "#8b5cf6",
} as const;

export default function Reports() {
  const [patientCount, setPatientCount] = useState(0);
  const [visits, setVisits] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [charges, setCharges] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReports() {
      try {
        setLoading(true);
        setWarning(null);

        const [
          patientsResponse,
          visitsResponse,
          ordersResponse,
          prescriptionsResponse,
          chargesResponse,
          paymentsResponse,
        ] = await Promise.all([
          fetchPatients(controller.signal),
          fetchVisits(undefined, controller.signal),
          fetchLabOrders(undefined, controller.signal),
          fetchPrescriptions(undefined, controller.signal),
          fetchCharges(undefined, controller.signal),
          fetchPayments(undefined, controller.signal),
        ]);

        setPatientCount(patientsResponse.length);
        setVisits(visitsResponse);
        setOrders(ordersResponse);
        setPrescriptions(prescriptionsResponse);
        setCharges(chargesResponse);
        setPayments(paymentsResponse);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setWarning(getErrorMessage(error, "No se pudo cargar la analitica del sistema."));
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadReports();
    return () => controller.abort();
  }, []);

  const totalBilled = useMemo(
    () => charges.reduce((sum, charge) => sum + numericValue(charge.total), 0),
    [charges]
  );
  const totalCollected = useMemo(
    () => payments.reduce((sum, payment) => sum + numericValue(payment.monto), 0),
    [payments]
  );
  const totalPending = useMemo(
    () => charges.reduce((sum, charge) => sum + numericValue(charge.saldo), 0),
    [charges]
  );

  const labStatusChart = useMemo(() => {
    const counts = orders.reduce<Record<string, number>>((accumulator, order) => {
      accumulator[order.estado] = (accumulator[order.estado] || 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: statusColors[name as keyof typeof statusColors] || "#94a3b8",
    }));
  }, [orders]);

  const chargeOriginChart = useMemo(() => {
    const counts = charges.reduce<Record<string, number>>((accumulator, charge) => {
      accumulator[charge.origen] = (accumulator[charge.origen] || 0) + numericValue(charge.total);
      return accumulator;
    }, {});

    return Object.entries(counts).map(([name, total]) => ({
      name,
      total,
      fill: originColors[name as keyof typeof originColors] || "#94a3b8",
    }));
  }, [charges]);

  const patientCostRanking = useMemo(() => {
    const totals = charges.reduce<Record<string, { name: string; total: number }>>(
      (accumulator, charge) => {
        const key = String(charge.id_paciente);
        const current = accumulator[key] || {
          name: charge.paciente_nombre || `Paciente ${charge.id_paciente}`,
          total: 0,
        };

        current.total += numericValue(charge.total);
        accumulator[key] = current;
        return accumulator;
      },
      {}
    );

    return Object.values(totals).sort((left, right) => right.total - left.total).slice(0, 5);
  }, [charges]);

  const productivitySummary = useMemo(
    () => [
      {
        label: "Visitas clinicas",
        total: visits.length,
        icon: BriefcaseMedical,
        tone: "bg-blue-50 text-blue-600",
      },
      {
        label: "Ordenes de laboratorio",
        total: orders.length,
        icon: ClipboardList,
        tone: "bg-emerald-50 text-emerald-600",
      },
      {
        label: "Prescripciones",
        total: prescriptions.length,
        icon: CheckCircle2,
        tone: "bg-violet-50 text-violet-600",
      },
      {
        label: "Pagos aplicados",
        total: payments.length,
        icon: Coins,
        tone: "bg-amber-50 text-amber-600",
      },
    ],
    [orders.length, payments.length, prescriptions.length, visits.length]
  );

  return (
    <div className="flex min-h-full flex-col">
      <Header
        title="Reportes"
        subtitle="Indicadores clinicos y financieros construidos sobre visitas, laboratorio y cobros reales"
      />

      <div className="flex-1 space-y-6 p-4 lg:p-6">
        {warning && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  La analitica no se pudo sincronizar completamente.
                </p>
                <p className="mt-1 text-sm text-amber-700">{warning}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pacientes</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {loading ? "..." : patientCount}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Facturado</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {loading ? "..." : formatCurrency(totalBilled)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Cobrado</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {loading ? "..." : formatCurrency(totalCollected)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Saldo pendiente</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {loading ? "..." : formatCurrency(totalPending)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {productivitySummary.map((item) => (
            <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {loading ? "..." : item.total}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                  <item.icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Ingresos por origen</h3>
              <p className="text-sm text-slate-500">
                Consulta, laboratorio y farmacia acumulados sobre los cargos del sistema
              </p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chargeOriginChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="total" radius={[10, 10, 0, 0]}>
                  {chargeOriginChart.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Estado de laboratorio</h3>
              <p className="text-sm text-slate-500">Distribucion actual del pipeline</p>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={labStatusChart} dataKey="value" innerRadius={50} outerRadius={78} paddingAngle={4}>
                  {labStatusChart.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}`, "Ordenes"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {labStatusChart.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-slate-600 capitalize">
                      {item.name.replace("_", " ")}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-slate-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Pacientes con mayor costo</h3>
                <p className="text-sm text-slate-500">
                  Ranking basado en el total acumulado de cargos
                </p>
              </div>
              <BarChart3 className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-3">
              {patientCostRanking.map((patient) => (
                <div key={patient.name} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{patient.name}</p>
                      <p className="text-xs text-slate-500">Acumulado clinico y operativo</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                      {formatCurrency(patient.total)}
                    </span>
                  </div>
                </div>
              ))}
              {patientCostRanking.length === 0 && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Aun no hay suficiente informacion para construir el ranking.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Lectura ejecutiva</h3>
              <p className="text-sm text-slate-500">
                Resumen del estado actual del centro medico
              </p>
            </div>
            <div className="space-y-3">
              {[
                `Se han registrado ${visits.length} visitas clinicas formales con ${orders.length} ordenes de laboratorio enlazadas.`,
                `El flujo de medicacion suma ${prescriptions.length} prescripciones y un valor bruto de ${formatCurrency(
                  prescriptions.reduce((sum, prescription) => sum + numericValue(prescription.costo), 0)
                )}.`,
                `El sistema ha facturado ${formatCurrency(totalBilled)} y conserva ${formatCurrency(totalPending)} en saldo pendiente.`,
              ].map((recommendation, index) => (
                <div key={recommendation} className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm text-slate-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

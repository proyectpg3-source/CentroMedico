import { Banknote, Building, CheckCircle2, CreditCard, DollarSign, Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis, YAxis,
} from "recharts";
import { Header } from "../components/layout/Header";
import { chartData, payments, type Payment } from "../data/mockData";

const methodConfig = {
  efectivo:      { label: "Efectivo",      icon: Banknote,    color: "text-green-600",  bg: "bg-green-100" },
  tarjeta:       { label: "Tarjeta",       icon: CreditCard,  color: "text-blue-600",   bg: "bg-blue-100" },
  transferencia: { label: "Transferencia", icon: Building,    color: "text-purple-600", bg: "bg-purple-100" },
  cheque:        { label: "Cheque",        icon: CheckCircle2,color: "text-amber-600",  bg: "bg-amber-100" },
  seguro:        { label: "Seguro/IGSS",   icon: CheckCircle2,color: "text-teal-600",   bg: "bg-teal-100" },
};

const statusConfig = {
  completed: { label: "Completado", bg: "bg-green-100",  text: "text-green-700" },
  pending:   { label: "Pendiente",  bg: "bg-amber-100",  text: "text-amber-700" },
  refunded:  { label: "Devuelto",   bg: "bg-red-100",    text: "text-red-700" },
};

export default function Pagos() {
  const [allPayments] = useState<Payment[]>(payments);
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = allPayments.filter((p) => {
    const match = p.patientName.toLowerCase().includes(search.toLowerCase()) ||
      p.concept.toLowerCase().includes(search.toLowerCase());
    const methodMatch = filterMethod === "all" || p.method === filterMethod;
    const statusMatch = filterStatus === "all" || p.status === filterStatus;
    return match && methodMatch && statusMatch;
  });

  const totalIngresos = allPayments.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const totalPendiente = allPayments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);
  const efectivo = allPayments.filter((p) => p.method === "efectivo" && p.status === "completed").reduce((s, p) => s + p.amount, 0);
  const tarjeta = allPayments.filter((p) => p.method === "tarjeta" && p.status === "completed").reduce((s, p) => s + p.amount, 0);

  const paymentsByMethod = Object.entries(methodConfig).map(([key, cfg]) => ({
    method: cfg.label,
    amount: allPayments.filter((p) => p.method === key && p.status === "completed").reduce((s, p) => s + p.amount, 0),
  })).filter((m) => m.amount > 0);

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Pagos e Ingresos" subtitle="Control financiero y flujo de caja del centro médico" />

      <div className="flex-1 p-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Ingresos totales", value: `Q${totalIngresos.toFixed(2)}`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
            { label: "Pendiente de cobro", value: `Q${totalPendiente.toFixed(2)}`, icon: DollarSign, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "En efectivo", value: `Q${efectivo.toFixed(2)}`, icon: Banknote, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Con tarjeta", value: `Q${tarjeta.toFixed(2)}`, icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 shadow-sm border border-white`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500">{s.label}</p>
                  <p className={`text-xl mt-1 ${s.color}`}>{s.value}</p>
                </div>
                <div className={`w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Income chart */}
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-slate-900">Ingresos vs Egresos</h3>
                <p className="text-xs text-slate-500">Últimos 6 meses (en Q)</p>
              </div>
              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                <TrendingUp className="w-3.5 h-3.5" /> +28.5%
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData.incomeByMonth}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} formatter={(v: number) => [`Q${v.toLocaleString()}`, ""]} />
                <Legend />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#16a34a" strokeWidth={2} fill="url(#colorIngresos)" />
                <Area type="monotone" dataKey="egresos" name="Egresos" stroke="#ef4444" strokeWidth={2} fill="url(#colorEgresos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Payment methods */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-slate-900 mb-4">Por Método de Pago</h3>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={paymentsByMethod} barSize={24}>
                <XAxis dataKey="method" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`Q${v.toFixed(2)}`, "Monto"]} />
                <Bar dataKey="amount" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-3">
              {paymentsByMethod.map((m) => (
                <div key={m.method} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">{m.method}</span>
                  <span className="text-sm text-slate-900">Q{m.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payments table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-wrap gap-y-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input placeholder="Buscar pago..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 rounded-xl border border-gray-200 focus:outline-none" />
            </div>
            <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none">
              <option value="all">Todos los métodos</option>
              {Object.entries(methodConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none">
              <option value="all">Todos los estados</option>
              {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Paciente</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Concepto</th>
                  <th className="text-left px-4 py-3">Método</th>
                  <th className="text-right px-4 py-3">Monto</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Cajero</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((pay) => {
                  const mc = methodConfig[pay.method];
                  const sc = statusConfig[pay.status];
                  const Icon = mc.icon;
                  return (
                    <tr key={pay.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-600">{pay.date}</td>
                      <td className="px-4 py-3 text-sm text-slate-900 truncate max-w-[140px]">{pay.patientName}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 hidden md:table-cell max-w-[180px] truncate">{pay.concept}</td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${mc.bg} ${mc.color}`}>
                          <Icon className="w-3 h-3" /> {mc.label}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm ${pay.status === "pending" ? "text-amber-600" : "text-slate-900"}`}>
                          Q{pay.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">{pay.cashierId}</td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-400 hidden lg:table-cell">{pay.reference || "—"}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      <DollarSign className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm">Sin pagos registrados</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

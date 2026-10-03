import { Activity, AlertTriangle, Brain, Clock, TrendingUp, Users, Zap } from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    PolarAngleAxis,
    PolarGrid,
    Radar,
    RadarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis, YAxis,
} from "recharts";
import { Header } from "../components/layout/Header";
import { chartData } from "../data/mockData";

const hourlyPrediction = [
  { hora: "06:00", predicho: 2, real: 1 },
  { hora: "07:00", predicho: 5, real: 4 },
  { hora: "08:00", predicho: 12, real: 11 },
  { hora: "09:00", predicho: 18, real: 20 },
  { hora: "10:00", predicho: 24, real: 22 },
  { hora: "11:00", predicho: 28, real: 26 },
  { hora: "12:00", predicho: 22, real: null },
  { hora: "13:00", predicho: 15, real: null },
  { hora: "14:00", predicho: 18, real: null },
  { hora: "15:00", predicho: 20, real: null },
  { hora: "16:00", predicho: 14, real: null },
  { hora: "17:00", predicho: 8, real: null },
];

const radarData = [
  { subject: "Dengue", value: 85 },
  { subject: "Hipertensión", value: 70 },
  { subject: "Diabetes", value: 60 },
  { subject: "Trauma", value: 45 },
  { subject: "Respiratorio", value: 55 },
  { subject: "Gastrointestinal", value: 75 },
];

const alerts = [
  { level: "critical", title: "Alta incidencia de dengue", detail: "Predicción: 18–24 casos en próximas 72h. Se recomienda activar protocolo epidemiológico.", time: "Actualizado hace 10 min" },
  { level: "warning", title: "Pico de demanda esperado 10:00–13:00", detail: "Se estima +35% de pacientes respecto al promedio. Considerar médico adicional.", time: "Hoy" },
  { level: "info", title: "Stock de suero oral en descenso", detail: "Al ritmo actual, el stock se agotará en ~3 días. Ordenar reposición.", time: "Proyección" },
];

const alertConfig = {
  critical: { bg: "bg-rose-50",   border: "border-rose-200",  text: "text-rose-700",   icon: AlertTriangle, dot: "bg-red-500" },
  warning:  { bg: "bg-amber-50",  border: "border-amber-200", text: "text-amber-700",  icon: Zap,           dot: "bg-amber-500" },
  info:     { bg: "bg-blue-50",   border: "border-blue-200",  text: "text-blue-700",   icon: Brain,         dot: "bg-blue-500" },
};

const recommendations = [
  { icon: Users, title: "Staffing", desc: "Activar 1 médico adicional entre 10:00–14:00. Riesgo de saturación moderado-alto.", color: "text-blue-600 bg-blue-50" },
  { icon: Clock, title: "Triage", desc: "Priorizar casos febriles >38.5°C con prueba NS1. Tiempo de espera máximo: 20 min.", color: "text-red-600 bg-red-50" },
  { icon: Activity, title: "Laboratorio", desc: "Preparar 15–20 sets de NS1 adicionales para la tarde. Alta demanda esperada.", color: "text-purple-600 bg-purple-50" },
  { icon: TrendingUp, title: "Inventario", desc: "Suero oral y Paracetamol IV próximos a agotarse. Realizar pedido hoy.", color: "text-amber-600 bg-amber-50" },
];

export default function PrediccionIA() {
  const today = new Date();
  const dayName = today.toLocaleDateString("es-GT", { weekday: "long" });
  const fullDate = today.toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Predicción IA" subtitle="Análisis predictivo y recomendaciones inteligentes para el centro médico" />

      <div className="flex-1 p-5 space-y-4">
        {/* AI banner */}
        <div className="bg-gradient-to-br from-[#0c1a3a] to-[#1e3a6e] rounded-xl p-5 text-white">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <Brain className="w-6 h-6 text-blue-300" />
              </div>
              <div>
                <p className="text-[11px] text-blue-300 uppercase tracking-widest mb-1">Sistema de Predicción con IA</p>
                <h2 className="text-xl text-white capitalize">{dayName}, {fullDate}</h2>
                <p className="text-xs text-blue-200 mt-1">Modelo entrenado con datos del MSPAS + patrones locales · Confianza: 87.4%</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-green-300">Modelo activo</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
            {[
              { label: "Pacientes esperados hoy", value: "48–62", sub: "+18% vs promedio" },
              { label: "Carga predicha", value: "78%", sub: "Moderado-alto" },
              { label: "Diagnóstico probable #1", value: "Dengue", sub: "3 casos activos confirmados" },
              { label: "Hora pico estimada", value: "10:30–13:00", sub: "Preparar recursos adicionales" },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl p-3">
                <p className="text-[10px] text-blue-300 uppercase tracking-wide">{s.label}</p>
                <p className="text-lg text-white mt-1">{s.value}</p>
                <p className="text-[11px] text-blue-200 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wide px-1">Alertas y recomendaciones activas</p>
          {alerts.map((a, i) => {
            const cfg = alertConfig[a.level as keyof typeof alertConfig];
            const Icon = cfg.icon;
            return (
              <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon className={`w-4 h-4 ${cfg.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm ${cfg.text}`}>{a.title}</p>
                    <span className="text-[10px] text-slate-400">{a.time}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{a.detail}</p>
                </div>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${cfg.dot}`} />
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Hourly prediction */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-slate-900 mb-1">Pacientes por Hora</h3>
            <p className="text-xs text-slate-500 mb-4">Predicción vs. real (hoy)</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={hourlyPrediction}>
                <defs>
                  <linearGradient id="predColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="realColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hora" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                <Legend />
                <Area type="monotone" dataKey="predicho" name="Predicho" stroke="#2563eb" strokeWidth={2} fill="url(#predColor)" strokeDasharray="5 3" />
                <Area type="monotone" dataKey="real" name="Real" stroke="#16a34a" strokeWidth={2.5} fill="url(#realColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Risk radar */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-slate-900 mb-1">Riesgo por Patología</h3>
            <p className="text-xs text-slate-500 mb-4">Probabilidad de incremento en próximos 7 días (%)</p>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Radar dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v}%`, "Riesgo"]} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <h3 className="text-slate-900 mb-1">Tendencia de Citas por Mes</h3>
          <p className="text-xs text-slate-500 mb-4">Histórico + proyección para próximo mes</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[...chartData.appointmentsPerMonth, { mes: "Sep*", citas: 420 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="citas" radius={[4, 4, 0, 0]}
                fill="#2563eb"
                label={({ x, y, width, value, index }: any) =>
                  index === 6 ? <text x={x + width / 2} y={y - 5} fill="#9ca3af" fontSize={10} textAnchor="middle">Proyección</text> : null
                }
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Recommendations */}
        <div>
          <p className="text-sm text-slate-700 mb-3">Recomendaciones operativas generadas por IA</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec) => (
              <div key={rec.title} className={`flex items-start gap-3 p-4 rounded-xl ${rec.color.split(" ")[1]}`}>
                <div className={`w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center flex-shrink-0`}>
                  <rec.icon className={`w-4 h-4 ${rec.color.split(" ")[0]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${rec.color.split(" ")[0]}`}>{rec.title}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{rec.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 flex items-start gap-2">
          <Brain className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500">
            Las predicciones son generadas por un modelo de machine learning entrenado con datos históricos del centro médico y datos epidemiológicos del MSPAS Guatemala.
            Los resultados son orientativos y no reemplazan el criterio clínico del equipo médico.
          </p>
        </div>
      </div>
    </div>
  );
}

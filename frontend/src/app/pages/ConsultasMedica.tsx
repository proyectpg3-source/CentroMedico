import { AlertTriangle, ClipboardList, Clock, FileDown, FlaskConical, Printer, Save, User } from "lucide-react";
import { useState } from "react";
import { Header } from "../components/layout/Header";
import { doctors, medicalRecords, patients } from "../data/mockData";
import { formatDuration, waitColor } from "../lib/format";

interface ConsultaForm {
  patientId: string;
  doctorId: string;
  fecha: string;
  // SOAP
  motivoConsulta: string;
  historia: string;
  antecedentes: string;
  // Objetivo
  examenFisico: string;
  temperatura: string;
  presionArterial: string;
  frecuenciaCardiaca: string;
  saturacion: string;
  peso: string;
  talla: string;
  // Assessment
  diagnosticoCIE: string;
  diagnosticoTexto: string;
  // Plan
  plan: string;
  prescripciones: string;
  indicaciones: string;
  laboratoriosSolicitados: string;
  fechaControl: string;
}

const INITIAL: ConsultaForm = {
  patientId: "p2",
  doctorId: "d3",
  fecha: new Date().toISOString().split("T")[0],
  motivoConsulta: "Fiebre de 4 días, dolor abdominal, manchas en piel, sangrado de encías.",
  historia: "Paciente femenina de 27 años con cuadro de evolución caracterizado por fiebre alta (39°C), dolor abdominal difuso, rash petequial en MMII y sangrado espontáneo de encías. Refiere cefalea intensa, mialgia y artralgia generalizadas. Vive en zona endémica.",
  antecedentes: "Sin antecedentes patológicos relevantes. Niega alergias medicamentosas. Vacunación completa.",
  examenFisico: "Paciente álgida, febril. Piel con petequias en MMII. Abdomen blando, doloroso en hipocondrio derecho. Prueba del torniquete positiva.",
  temperatura: "39.0",
  presionArterial: "100/70",
  frecuenciaCardiaca: "98",
  saturacion: "97",
  peso: "58",
  talla: "162",
  diagnosticoCIE: "A90 – Dengue",
  diagnosticoTexto: "Dengue clásico con signos de alarma. Plaquetas 95,000/μL. NS1 positivo.",
  plan: "1. Hidratación IV con Solución Salina 0.9% 1000mL en 4h.\n2. Control de plaquetas c/12h.\n3. Antipirético: Paracetamol. Evitar AINES.\n4. Observación hospitalaria 24–48h.\n5. Reportar a vigilancia epidemiológica.",
  prescripciones: "- Paracetamol 500mg – 1 tab c/6h × 5 días\n- Solución Oral de Rehidratación – 1L/día\n- Reposo absoluto",
  indicaciones: "No administrar aspirina ni ibuprofeno. Consultar si hay sangrado activo, dolor abdominal intenso o dificultad respiratoria.",
  laboratoriosSolicitados: "Hemograma completo c/12h, Plaquetas, NS1 Antígeno Dengue",
  fechaControl: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0],
};

const CIE10_COMMON = [
  "A90 – Dengue", "A91 – Dengue hemorrágico", "I10 – Hipertensión esencial",
  "E11 – Diabetes mellitus tipo 2", "K59.0 – Gastritis aguda", "J06 – Infección respiratoria aguda",
  "R10 – Dolor abdominal", "J45 – Asma", "D50 – Anemia ferropénica", "S09 – Traumatismo",
];

export default function ConsultaMedica() {
  const [form, setForm] = useState<ConsultaForm>(INITIAL);
  const [saved, setSaved] = useState(false);
  const [waitMinutes] = useState(15);

  const selectedPatient = patients.find((p) => p.id === form.patientId);
  const selectedDoctor = doctors.find((d) => d.id === form.doctorId);
  const prevRecords = medicalRecords.filter((r) => r.patientId === form.patientId).slice(0, 4);

  const age = selectedPatient
    ? new Date().getFullYear() - new Date(selectedPatient.dob).getFullYear()
    : "--";

  function imc() {
    const w = parseFloat(form.peso);
    const h = parseFloat(form.talla) / 100;
    if (!w || !h) return "--";
    return (w / (h * h)).toFixed(1);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function field(f: Partial<ConsultaForm>) {
    setForm((prev) => ({ ...prev, ...f }));
  }

  const triagePriority =
    parseFloat(form.temperatura) >= 39 ? "ROJO" :
    parseFloat(form.temperatura) >= 38 ? "NARANJA" :
    "AMARILLO";

  const priorityColors = {
    ROJO:     "bg-rose-100 text-rose-700 border-rose-300",
    NARANJA:  "bg-orange-100 text-orange-700 border-orange-300",
    AMARILLO: "bg-yellow-100 text-yellow-700 border-yellow-300",
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Consulta Médica" subtitle="Historia Clínica Digital – Formato SOAP" />

      <div className="flex-1 p-5 overflow-auto">
        {/* Patient header bar */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3 mb-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{selectedPatient?.name || "Selecciona paciente"}</p>
              <p className="text-xs text-slate-500">DPI: {selectedPatient?.dpi || "—"} · {age} años · {selectedPatient?.gender}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full border ${priorityColors[triagePriority]}`}>
              Triaje: {triagePriority}
            </span>
            <span className={`text-xs flex items-center gap-1 ${waitColor(waitMinutes)}`}>
              <Clock className="w-3 h-3" />
              Espera: {formatDuration(waitMinutes)}
            </span>
            {selectedPatient?.allergies?.map((a) => (
              <span key={a} className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />{a}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-xl hover:bg-slate-50">
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-xl hover:bg-slate-50">
              <FileDown className="w-3.5 h-3.5" /> Exportar
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-xl transition-colors shadow-sm ${
                saved ? "bg-emerald-600 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700"
              }`}
            >
              <Save className="w-4 h-4" />
              {saved ? "¡Guardado!" : "Guardar consulta"}
            </button>
          </div>
        </div>

        {/* ─── 3-Column Layout ─────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[28%_1fr_24%] gap-4">

          {/* ── COLUMNA 1: Perfil + Signos Vitales (28%) ── */}
          <div className="space-y-3">
            {/* Patient selector */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-2">Expediente</p>
              <select
                value={form.patientId}
                onChange={(e) => field({ patientId: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 mb-3"
              >
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="space-y-1.5 text-xs">
                {[
                  { label: "Tipo de sangre",  value: selectedPatient?.bloodType },
                  { label: "Seguro",          value: selectedPatient?.insurance },
                  { label: "No. expediente",  value: selectedPatient?.insuranceNumber },
                  { label: "Doctor asignado", value: selectedDoctor?.name },
                  { label: "Residencia",      value: selectedPatient?.address },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between py-0.5 border-b border-slate-50">
                    <span className="text-slate-400">{r.label}</span>
                    <span className="text-slate-700 text-right max-w-[120px] truncate">{r.value || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Allergies */}
            {selectedPatient?.allergies && selectedPatient.allergies.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3">
                <p className="text-xs font-semibold text-rose-700 flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Alergias registradas
                </p>
                {selectedPatient.allergies.map((a) => (
                  <span key={a} className="inline-block text-[11px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full mr-1 mb-1">{a}</span>
                ))}
              </div>
            )}

            {/* Vital signs */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-3">Signos Vitales</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Temp. °C",    key: "temperatura" as const,       highlight: parseFloat(form.temperatura) >= 38 },
                  { label: "P.A. mmHg",   key: "presionArterial" as const,   highlight: false },
                  { label: "FC lpm",      key: "frecuenciaCardiaca" as const, highlight: false },
                  { label: "SatO₂ %",    key: "saturacion" as const,         highlight: parseInt(form.saturacion) < 94 },
                  { label: "Peso kg",     key: "peso" as const,               highlight: false },
                  { label: "Talla cm",    key: "talla" as const,              highlight: false },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-[10px] text-slate-400 block mb-0.5">{f.label}</label>
                    <input
                      value={form[f.key]}
                      onChange={(e) => field({ [f.key]: e.target.value })}
                      className={`w-full border rounded-lg px-2.5 py-1.5 text-sm text-center focus:outline-none focus:border-blue-400 ${
                        f.highlight ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200"
                      }`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 p-2 bg-blue-50 border border-blue-100 rounded-xl text-center">
                <p className="text-[10px] text-blue-500 uppercase tracking-wide">IMC</p>
                <p className="text-lg font-bold text-blue-700">{imc()}</p>
                <p className="text-[10px] text-blue-400">kg/m²</p>
              </div>
            </div>

            {/* Recent visits */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-2">Historial Reciente</p>
              {prevRecords.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Sin historial previo</p>
              ) : (
                <div className="space-y-2">
                  {prevRecords.map((r) => (
                    <div key={r.id} className="flex items-start gap-2 pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                      <div className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0 mt-1.5" />
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-500">{r.date}</p>
                        <p className="text-xs text-slate-800 truncate">{r.diagnosis}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── COLUMNA 2: SOAP Form (48%) ── */}
          <div className="space-y-3">
            {/* Patient + Doctor + Date bar */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Fecha</label>
                  <input type="date" value={form.fecha} onChange={(e) => field({ fecha: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Doctor responsable</label>
                  <select value={form.doctorId} onChange={(e) => field({ doctorId: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                    {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} – {d.specialty}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Control siguiente</label>
                  <input type="date" value={form.fechaControl} onChange={(e) => field({ fechaControl: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
                </div>
              </div>
            </div>

            {/* S – Subjetivo */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">S</span>
                <p className="text-sm font-semibold text-slate-700">Subjetivo — Motivo de Consulta e Historia</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">MC – Motivo principal de consulta</label>
                  <textarea rows={2} value={form.motivoConsulta} onChange={(e) => field({ motivoConsulta: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 resize-none" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Historia de la enfermedad actual</label>
                  <textarea rows={4} value={form.historia} onChange={(e) => field({ historia: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 resize-none" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Antecedentes</label>
                  <textarea rows={2} value={form.antecedentes} onChange={(e) => field({ antecedentes: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 resize-none" />
                </div>
              </div>
            </div>

            {/* O – Objetivo */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">O</span>
                <p className="text-sm font-semibold text-slate-700">Objetivo — Examen Físico</p>
              </div>
              <textarea rows={4} value={form.examenFisico} onChange={(e) => field({ examenFisico: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 resize-none" />
            </div>

            {/* A – Assessment / Diagnóstico CIE-10 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg bg-amber-500 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">A</span>
                <p className="text-sm font-semibold text-slate-700">Assessment — Diagnóstico (CIE-10)</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Código CIE-10</label>
                  <select value={form.diagnosticoCIE} onChange={(e) => field({ diagnosticoCIE: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400">
                    {CIE10_COMMON.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Descripción diagnóstica</label>
                  <textarea rows={3} value={form.diagnosticoTexto} onChange={(e) => field({ diagnosticoTexto: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 resize-none" />
                </div>
              </div>
            </div>

            {/* P – Plan */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">P</span>
                <p className="text-sm font-semibold text-slate-700">Plan — Prescripción y Laboratorios</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Plan de tratamiento</label>
                  <textarea rows={4} value={form.plan} onChange={(e) => field({ plan: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 resize-none" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Prescripciones</label>
                  <textarea rows={3} value={form.prescripciones} onChange={(e) => field({ prescripciones: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 resize-none" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Laboratorios solicitados</label>
                  <textarea rows={2} value={form.laboratoriosSolicitados} onChange={(e) => field({ laboratoriosSolicitados: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 resize-none" />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Indicaciones al paciente</label>
                  <textarea rows={2} value={form.indicaciones} onChange={(e) => field({ indicaciones: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 resize-none" />
                </div>
              </div>
            </div>
          </div>

          {/* ── COLUMNA 3: Asistente + Acciones Rápidas (24%) ── */}
          <div className="space-y-3">
            {/* Priority assistant */}
            <div className={`rounded-2xl border p-4 ${
              triagePriority === "ROJO" ? "bg-rose-50 border-rose-200" :
              triagePriority === "NARANJA" ? "bg-orange-50 border-orange-200" :
              "bg-yellow-50 border-yellow-200"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${
                  triagePriority === "ROJO" ? "text-rose-600" :
                  triagePriority === "NARANJA" ? "text-orange-600" : "text-yellow-600"
                }`} />
                <p className={`text-sm font-semibold ${
                  triagePriority === "ROJO" ? "text-rose-700" :
                  triagePriority === "NARANJA" ? "text-orange-700" : "text-yellow-700"
                }`}>Alerta de prioridad</p>
              </div>
              <p className={`text-xs mb-2 ${
                triagePriority === "ROJO" ? "text-rose-600" :
                triagePriority === "NARANJA" ? "text-orange-600" : "text-yellow-600"
              }`}>
                Triaje <strong>{triagePriority}</strong> — Temperatura {form.temperatura}°C
              </p>
              <p className="text-xs text-slate-600">
                Tiempo de espera previo: <strong>{formatDuration(waitMinutes)}</strong>
              </p>
              {triagePriority === "ROJO" && (
                <p className="text-xs text-rose-600 mt-1.5 bg-rose-100 rounded-lg px-2 py-1">
                  Atención inmediata requerida. Notificar a médico de guardia.
                </p>
              )}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
              <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-1">Acciones rápidas</p>
              <button
                onClick={handleSave}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl transition-colors shadow-sm ${
                  saved ? "bg-emerald-600 text-white" : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                <Save className="w-4 h-4 flex-shrink-0" />
                {saved ? "Guardado ✓" : "Guardar Consulta"}
              </button>
              <a href="/laboratory"
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
                <FlaskConical className="w-4 h-4 text-purple-500 flex-shrink-0" />
                Solicitar Laboratorio
              </a>
              <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
                <Printer className="w-4 h-4 text-blue-500 flex-shrink-0" />
                Imprimir Receta
              </button>
              <a href="/documentos"
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
                <FileDown className="w-4 h-4 text-amber-500 flex-shrink-0" />
                Subir Documentos
              </a>
              <a href="/caja"
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
                <ClipboardList className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                Ver Cuenta Paciente
              </a>
            </div>

            {/* Active conditions */}
            {selectedPatient?.conditions && selectedPatient.conditions.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-2">Condiciones activas</p>
                {selectedPatient.conditions.map((c) => (
                  <span key={c} className="inline-block text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full mr-1 mb-1">{c}</span>
                ))}
              </div>
            )}

            {/* Diagnostico preview */}
            {form.diagnosticoCIE && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                <p className="text-[11px] text-indigo-400 uppercase tracking-widest mb-1">Diagnóstico activo</p>
                <p className="text-sm text-indigo-800 font-medium">{form.diagnosticoCIE}</p>
                {form.diagnosticoTexto && (
                  <p className="text-xs text-indigo-600 mt-1 leading-relaxed">{form.diagnosticoTexto.slice(0, 100)}{form.diagnosticoTexto.length > 100 ? "…" : ""}</p>
                )}
              </div>
            )}

            {/* Lab preview */}
            {form.laboratoriosSolicitados && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <p className="text-[11px] text-slate-400 uppercase tracking-widest mb-2">Laboratorios solicitados</p>
                {form.laboratoriosSolicitados.split(",").map((l) => (
                  <div key={l.trim()} className="flex items-center gap-2 py-1 border-b border-slate-50 last:border-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                    <span className="text-xs text-slate-700">{l.trim()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

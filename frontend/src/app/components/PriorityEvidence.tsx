import type { PriorityEvidence as Evidence } from "../api/analysis";

export function PriorityEvidence({ evidence, source }: { evidence?: Evidence; source?: string }) {
  if (!evidence) return null;
  return <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
    <p className="font-medium">{evidence.estado_datos === "registrados" ? "Signos vitales registrados" : "Datos para revisar"} · {evidence.signos_registrados.length}/5</p>
    {evidence.datos_faltantes.length > 0 && <p className="mt-1">Sin registrar: {evidence.datos_faltantes.join(", ")}.</p>}
    {evidence.datos_invalidos.length > 0 && <p className="mt-1 text-amber-800">Revisar formato o valor: {evidence.datos_invalidos.join(", ")}.</p>}
    {evidence.visitas_historicas_consultadas !== null && <p className="mt-1">Visitas previas consultadas: {evidence.visitas_historicas_consultadas}.</p>}
    {source && <p className="mt-1">Origen del cálculo: {(source === "local" || source === "fallback-local") ? "motor local" : source}.</p>}
    <p className="mt-2 text-xs text-slate-500">{evidence.alcance}</p>
  </div>;
}

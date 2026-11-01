import { AlertTriangle, CheckCircle2, CircleDashed, Info, ListChecks } from "lucide-react";
import type { PriorityLevel, PriorityProposal, ProposalState } from "../api/triage";

export const LEVEL_META: Record<PriorityLevel, { name: string; badge: string; border: string; solid: string; target: string }> = {
  P1: { name: "Emergencia", badge: "bg-rose-100 text-rose-800 border-rose-200", border: "border-l-rose-600", solid: "bg-rose-600 text-white", target: "Inmediata" },
  P2: { name: "Muy urgente", badge: "bg-orange-100 text-orange-800 border-orange-200", border: "border-l-orange-500", solid: "bg-orange-500 text-white", target: "< 10 min" },
  P3: { name: "Urgente", badge: "bg-amber-100 text-amber-900 border-amber-200", border: "border-l-amber-400", solid: "bg-amber-400 text-amber-950", target: "< 60 min" },
  P4: { name: "Menor urgencia", badge: "bg-emerald-100 text-emerald-800 border-emerald-200", border: "border-l-emerald-500", solid: "bg-emerald-600 text-white", target: "< 4 h" },
};

export const STATE_LABEL: Record<ProposalState, string> = {
  PROPUESTA_CONCLUSIVA: "Propuesta conclusiva",
  PROPUESTA_PROVISIONAL: "Propuesta provisional",
  SIN_PROPUESTA: "Sin propuesta",
};

export function LevelBadge({ level, prefix }: { level: PriorityLevel | null | undefined; prefix?: string }) {
  if (!level) {
    return <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">{prefix ? `${prefix}: ` : ""}sin nivel</span>;
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${LEVEL_META[level].badge}`}>
      {prefix ? `${prefix}: ` : ""}{level} · {LEVEL_META[level].name}
    </span>
  );
}

// Muestra la propuesta del motor con su fundamento. Nunca la presenta como
// prioridad final: siempre recuerda que requiere validación profesional.
export function PriorityProposalCard({ proposal, compact = false }: { proposal: PriorityProposal | null | undefined; compact?: boolean }) {
  if (!proposal) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
        Evaluación registrada antes del registro SATS: actualízala para obtener una propuesta P1–P4.
      </div>
    );
  }

  const noProposal = proposal.estado === "SIN_PROPUESTA";
  const Icon = noProposal ? CircleDashed : proposal.estado === "PROPUESTA_CONCLUSIVA" ? CheckCircle2 : Info;
  const tone = noProposal
    ? "border-slate-200 bg-slate-50"
    : proposal.estado === "PROPUESTA_CONCLUSIVA"
      ? "border-emerald-200 bg-emerald-50/60"
      : "border-amber-200 bg-amber-50/60";

  return (
    <div className={`rounded-xl border p-3 text-sm text-slate-700 ${tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500" />
        <span className="font-medium text-slate-900">{STATE_LABEL[proposal.estado]}</span>
        {proposal.nivel_propuesto && <LevelBadge level={proposal.nivel_propuesto} />}
        {proposal.estado === "PROPUESTA_PROVISIONAL" && proposal.nivel_maximo_posible && (
          <span className="text-xs text-amber-800">podría elevarse hasta {proposal.nivel_maximo_posible}</span>
        )}
        {proposal.intervalo_tews && !noProposal && (
          <span className="rounded-md bg-white/70 px-2 py-0.5 text-xs text-slate-600">
            TEWS {proposal.intervalo_tews.minimo === proposal.intervalo_tews.maximo ? proposal.intervalo_tews.minimo : `${proposal.intervalo_tews.minimo}–${proposal.intervalo_tews.maximo}`}
          </span>
        )}
      </div>

      {noProposal && proposal.acciones_requeridas.length > 0 && (
        <div className="mt-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-500"><ListChecks className="h-3.5 w-3.5" />Pendiente para proponer</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {proposal.acciones_requeridas.map((action) => <li key={action}>{action}</li>)}
          </ul>
        </div>
      )}

      {!compact && proposal.reglas_cumplidas.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold uppercase text-slate-500">Reglas cumplidas</p>
          <ul className="mt-1 space-y-1">
            {proposal.reglas_cumplidas.map((rule) => (
              <li key={rule.codigo} className="flex flex-wrap gap-x-2">
                <span className="font-mono text-xs font-semibold text-slate-800">{rule.codigo}</span>
                <span className="text-slate-600">{rule.evidencia}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {proposal.alertas.length > 0 && (
        <ul className="mt-2 space-y-1">
          {proposal.alertas.map((alert) => (
            <li key={alert.codigo} className={`flex gap-2 rounded-lg px-2 py-1.5 text-xs ${alert.tipo === "INCONSISTENCIA" ? "bg-rose-50 text-rose-800" : "bg-sky-50 text-sky-800"}`}>
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span><strong>{alert.codigo}</strong> · {alert.descripcion} ({alert.evidencia})</span>
            </li>
          ))}
        </ul>
      )}

      {!noProposal && (
        <p className="mt-2 text-xs text-slate-500">
          {proposal.version_reglas} · Requiere validación del personal autorizado
          {proposal.requiere_justificacion_confirmacion ? "; la confirmación exige justificación escrita." : "."}
        </p>
      )}
    </div>
  );
}

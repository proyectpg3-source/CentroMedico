import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  DISPENSATION_LABELS,
  dispensePrescription,
  fetchPrescriptions,
  getDispensationStatus,
  type PrescriptionRecord,
} from "../api/prescriptions";
import { formatDateTime, getErrorMessage } from "../lib/format";

const inputClass = 'w-20 rounded-lg border border-slate-300 p-1.5 text-sm';
const buttonClass = 'rounded-lg bg-emerald-700 px-3 py-1.5 text-sm text-white disabled:opacity-50';

export default function PendingDispensations({ onDispensed }: { onDispensed: () => void }) {
  const { user } = useAuth();
  const writable = user?.rol === 'admin' || user?.rol === 'enfermero';
  const [items, setItems] = useState<PrescriptionRecord[]>([]);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load(signal?: AbortSignal) {
    setLoading(true);
    try {
      const pending = await fetchPrescriptions({ pendientes_dispensar: true }, signal);
      setItems(pending);
      setQuantities(Object.fromEntries(pending.map(p => [p.id_prescripcion, String((p.cantidad ?? 0) - p.cantidad_dispensada)])));
    } catch (e) {
      if (!signal?.aborted) setError(getErrorMessage(e, 'No se pudieron cargar las prescripciones pendientes.'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  async function dispense(item: PrescriptionRecord) {
    setBusyId(item.id_prescripcion); setError(''); setNotice('');
    try {
      const amount = Number(quantities[item.id_prescripcion]);
      await dispensePrescription(item.id_prescripcion, amount);
      setNotice(`Dispensadas ${amount} ${item.producto_unidad ?? 'unidades'} de ${item.producto_nombre} a ${item.paciente_nombre}.`);
      onDispensed();
      await load();
    } catch (e) {
      setError(getErrorMessage(e, 'No se pudo dispensar la prescripción.'));
    } finally {
      setBusyId(null);
    }
  }

  return <section className="space-y-3 rounded-xl border bg-white p-4">
    <div>
      <h2 className="font-semibold">Prescripciones por dispensar</h2>
      <p className="text-sm text-slate-500">Recetas vinculadas al catálogo de farmacia. Al dispensar se descuenta el stock y queda registrado en el historial del producto.</p>
    </div>
    {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{notice}</div>}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>
      {['Fecha','Paciente','Medicamento','Indicación','Estado','Existencia', writable ? 'Dispensar' : ''].map(t=><th key={t} className="p-3">{t}</th>)}
    </tr></thead><tbody>
      {items.map(item => {
        const status = DISPENSATION_LABELS[getDispensationStatus(item)];
        const remaining = (item.cantidad ?? 0) - item.cantidad_dispensada;
        return <tr key={item.id_prescripcion} className="border-t">
          <td className="p-3">{formatDateTime(item.created_at)}</td>
          <td className="p-3">{item.paciente_nombre}<div className="text-xs text-slate-500">Dr. {item.medico_nombre}</div></td>
          <td className="p-3">{item.producto_nombre}<div className="text-xs text-slate-500">{item.producto_codigo}</div></td>
          <td className="p-3">{item.dosis} · {item.frecuencia} · {item.duracion}</td>
          <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${status.className}`}>{status.label}</span><div className="mt-1 text-xs text-slate-500">{item.cantidad_dispensada} de {item.cantidad} {item.producto_unidad}</div></td>
          <td className={`p-3 ${(item.producto_stock ?? 0) < remaining ? 'font-semibold text-red-700' : ''}`}>{item.producto_stock} {item.producto_unidad}</td>
          {writable && <td className="p-3"><div className="flex items-center gap-2">
            <input aria-label={`Cantidad a dispensar para ${item.paciente_nombre}`} type="number" min="1" max={remaining} step="1" className={inputClass}
              value={quantities[item.id_prescripcion] ?? ''} onChange={e=>setQuantities({...quantities,[item.id_prescripcion]:e.target.value})} />
            <button className={buttonClass} disabled={busyId !== null || !(Number(quantities[item.id_prescripcion]) > 0)} onClick={()=>dispense(item)}>
              {busyId === item.id_prescripcion ? 'Guardando…' : 'Dispensar'}
            </button>
          </div></td>}
        </tr>;
      })}
      {!items.length && <tr><td colSpan={7} className="p-6 text-center text-slate-500">{loading ? 'Cargando…' : 'No hay prescripciones pendientes de dispensar.'}</td></tr>}
    </tbody></table></div>
  </section>;
}

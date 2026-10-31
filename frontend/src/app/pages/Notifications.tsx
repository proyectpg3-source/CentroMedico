import { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { request } from '../api/client';

const labels: Record<string, string> = {
  paciente_bienvenida: 'Confirmar registro de paciente', usuario_bienvenida: 'Bienvenida al personal',
  cita_confirmacion: 'Confirmar cita', cita_reprogramacion: 'Avisar reprogramación de cita', estado_cuenta: 'Enviar acceso al estado de cuenta',
};
const states: Record<string, string> = { pendiente: 'Pendiente de envío', enviando: 'En proceso',
  aceptado: 'Aceptado por Resend', fallido: 'Fallido', desconocido: 'Respuesta no confirmada' };
type Notice = { id: string; tipo: string; entidad_id: number; destinatario: string; estado: string; error_codigo?: string; created_at: string; aviso?: string };
type RecordOption = { id: number; nombre: string; fecha_hora?: string };
type Preview = { destinatario: string; asunto: string; texto: string };
const field = 'mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700';

export default function Notifications() {
  const [config, setConfig] = useState<{ configurado: boolean; tipos: string[] } | null>(null);
  const [kind, setKind] = useState('');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<RecordOption[]>([]);
  const [selected, setSelected] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [retry, setRetry] = useState<Notice | null>(null);
  const [history, setHistory] = useState<Notice[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const message = (e: unknown) => e instanceof Error ? e.message : 'No se pudo completar la operación.';
  async function refresh() {
    const [status, rows] = await Promise.all([
      request<{ configurado: boolean; tipos: string[] }>('/api/notificaciones/estado'),
      request<Notice[]>('/api/notificaciones'),
    ]);
    setConfig(status); setHistory(rows); setKind(current => current || status.tipos[0] || '');
  }
  useEffect(() => { refresh().catch(e => setError(message(e))); }, []);
  useEffect(() => {
    if (!kind) return;
    const controller = new AbortController();
    setOptions([]); setLoading(true);
    const timer = window.setTimeout(() => {
      request<RecordOption[]>(`/api/notificaciones/registros?${new URLSearchParams({ tipo: kind, q: query })}`, { signal: controller.signal })
        .then(setOptions).catch(e => { if (!controller.signal.aborted) setError(message(e)); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [kind, query]);
  useEffect(() => {
    setPreview(null); setConfirmed(false);
    if (!kind || !selected) return;
    const controller = new AbortController();
    request<Preview>(`/api/notificaciones/preparar?${new URLSearchParams({ tipo: kind, entidad_id: selected })}`, { signal: controller.signal })
      .then(setPreview).catch(e => { if (!controller.signal.aborted) setError(message(e)); });
    return () => controller.abort();
  }, [kind, selected, retry?.id]);
  async function send() {
    if (!preview || !confirmed || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request<Notice>(retry ? `/api/notificaciones/${retry.id}/reintentar` : '/api/notificaciones', {
        method: 'POST', body: JSON.stringify({ tipo: kind, entidad_id: Number(selected),
          destinatario_confirmado: true, email_confirmado: preview.destinatario }),
      });
      setNotice(result.aviso || `Aviso: ${states[result.estado] || result.estado}. El registro original permanece guardado.`);
      setConfirmed(false); setRetry(null); await refresh();
    } catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  }
  return <div className="flex min-h-full flex-col">
    <Header title="Correos" subtitle="Avisos administrativos a personal y pacientes" />
    <div className="space-y-6 p-4 lg:p-6">
      <p className="max-w-3xl text-sm text-slate-600">Registra primero al paciente, usuario o cita en su módulo. Después prepara el aviso y confirma el destinatario. Un fallo de correo no borra ni vuelve a crear ese registro.</p>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-emerald-900">{notice}</p>}
      {!config ? <div className="space-y-3"><p role="status">{error ? 'No se pudo cargar el servicio de correo.' : 'Cargando servicio de correo…'}</p>{error && <button className="min-h-11 rounded-lg border px-4 text-sm" onClick={() => { setError(''); refresh().catch(e => setError(message(e))); }}>Reintentar carga</button>}</div> : <>
        <p className="text-sm text-slate-700">{config.configurado ? 'Resend está configurado. Puedes solicitar envíos.' : 'El envío aún no está activado. El administrador debe configurar Resend; los avisos quedarán pendientes.'}</p>
        <section aria-labelledby="prepare-email" className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <h2 id="prepare-email" className="text-lg font-semibold">{retry ? 'Reintentar un aviso guardado' : 'Preparar un aviso'}</h2>
          <fieldset disabled={busy} className="grid min-w-0 gap-4 md:grid-cols-2">
            <label className="text-sm">Tipo de aviso<select className={field} value={kind} disabled={!!retry} onChange={e => { setKind(e.target.value); setSelected(''); setRetry(null); setError(''); }}>{config.tipos.map(t => <option key={t} value={t}>{labels[t]}</option>)}</select></label>
            <label className="text-sm">Buscar por nombre<input className={field} value={query} disabled={!!retry} onChange={e => { setQuery(e.target.value); setSelected(''); }} placeholder="Nombre del paciente o del personal" /></label>
            {!retry && <label className="text-sm md:col-span-2">{kind.startsWith('cita_') ? 'Cita guardada' : 'Registro guardado'}<select className={field} value={selected} disabled={loading} onChange={e => { setSelected(e.target.value); setError(''); }}><option value="">{loading ? 'Buscando…' : 'Selecciona un registro'}</option>{options.map(o => <option key={o.id} value={o.id}>{o.nombre}{o.fecha_hora ? ` · ${new Date(o.fecha_hora).toLocaleString('es-GT')}` : ''}</option>)}</select><span className="mt-1 block text-xs text-slate-500">Se muestran hasta 100 coincidencias. Acota la búsqueda si hace falta.</span></label>}
          </fieldset>
          {preview && <div className="space-y-3 border-t border-slate-200 pt-4">
            <p className="break-words text-sm"><strong>Para:</strong> {preview.destinatario}</p>
            <p className="text-sm"><strong>Asunto:</strong> {preview.asunto}</p>
            <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{preview.texto}</p>
            {kind === 'estado_cuenta' && <p className="text-sm text-slate-600">Se añadirá un enlace privado al PDF, válido por 24 horas. Quien tenga el enlace podrá consultar la cuenta; confirma que el correo pertenece al destinatario autorizado.</p>}
            <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} /><span>Confirmé esta dirección con su titular y su autorización para recibir el aviso. El formato de un correo no demuestra a quién pertenece.</span></label>
            <button type="button" disabled={busy || !confirmed} onClick={() => void send()} className="min-h-11 rounded-lg bg-emerald-800 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Procesando…' : retry ? 'Reintentar aviso' : config.configurado ? 'Enviar correo' : 'Guardar aviso pendiente'}</button>
          </div>}
          {retry && <button disabled={busy} className="min-h-11 text-sm underline" onClick={() => { setRetry(null); setSelected(''); }}>Cancelar reintento</button>}
        </section>
        <section aria-labelledby="email-history" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="email-history" className="text-lg font-semibold">Últimos avisos</h2><button disabled={busy} onClick={() => { setError(''); refresh().catch(e => setError(message(e))); }} className="min-h-11 rounded-lg border px-4 text-sm">Actualizar</button></div>
          <p className="text-sm text-slate-600">Aceptado por Resend significa que el proveedor aceptó la solicitud, no que el mensaje llegó al buzón. Si la respuesta no está confirmada, el reintento conserva la misma solicitud para evitar duplicados.</p>
          <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{['Fecha', 'Aviso', 'Destinatario', 'Estado', 'Acción'].map(h => <th key={h} scope="col" className="p-3">{h}</th>)}</tr></thead><tbody>
            {history.map(h => <tr key={h.id} className="border-t"><td className="p-3">{new Date(h.created_at).toLocaleString('es-GT')}</td><td className="p-3">{labels[h.tipo]}</td><td className="break-all p-3">{h.destinatario}</td><td className="p-3">{states[h.estado] || h.estado}{h.error_codigo && <span className="mt-1 block text-xs text-slate-500">{h.error_codigo}</span>}</td><td className="p-3">{h.estado !== 'aceptado' && <button disabled={busy} className="min-h-11 underline disabled:opacity-50" onClick={() => { setRetry(h); setKind(h.tipo); setSelected(String(h.entidad_id)); setConfirmed(false); setNotice(''); setError(''); }}>Revisar y reintentar</button>}</td></tr>)}
          </tbody></table>{history.length === 0 && <p className="p-6 text-sm text-slate-500">Todavía no hay avisos registrados.</p>}</div>
        </section>
      </>}
    </div>
  </div>;
}

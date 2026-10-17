import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { HeartPulse, RefreshCw } from 'lucide-react';
import { request, type PaginatedResponse } from '../api/client';
import type { PatientOption } from '../api/patients';
import { useAuth } from '../auth/AuthContext';

type Care = { id: number; codigo: string; nombre_temporal: string | null; motivo: string; estado: 'pendiente' | 'en_atencion' | 'finalizada'; id_paciente: number | null; paciente_nombre: string | null; iniciado_nombre: string; created_at: string };
const labels = { pendiente: 'Pendiente', en_atencion: 'En atención', finalizada: 'Finalizada' };
const field = 'w-full rounded-xl border border-slate-200 bg-white p-3 text-sm';
const button = 'rounded-xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50';

export default function QuickCare() {
  const { user } = useAuth();
  const clinical = ['admin', 'medico', 'enfermero'].includes(user?.rol || '');
  const [items, setItems] = useState<Care[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const submission = useRef<{ key: string; name: string; reason: string } | null>(null);
  const [selected, setSelected] = useState<Care | null>(null);
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<PatientOption[]>([]);
  const [patient, setPatient] = useState('');
  const [searching, setSearching] = useState(false);
  const searchVersion = useRef(0);

  async function load(target = page) {
    setLoading(true); setError('');
    try { setItems(await request<Care[]>(`/api/atenciones-rapidas?page=${target}`)); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(page); }, [page]);
  async function create(e: FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setNotice('');
    if (!submission.current || submission.current.name !== name || submission.current.reason !== reason)
      submission.current = { key: crypto.randomUUID(), name, reason };
    try {
      const saved = await request<Care>('/api/atenciones-rapidas', { method: 'POST', body: JSON.stringify({ solicitud: submission.current.key, nombre_temporal: name, motivo: reason }) });
      setNotice(`Atención ${saved.codigo} guardada. Puedes completar la ficha del paciente después.`);
      setName(''); setReason(''); submission.current = null;
      if (page !== 1) setPage(1); else await load(1);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function update(item: Care, changes: object) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const saved = await request<Care>(`/api/atenciones-rapidas/${item.id}`, { method: 'PATCH', body: JSON.stringify(changes) });
      setItems(current => current.map(row => row.id === saved.id ? saved : row));
      setSelected(null); setNotice(`${saved.codigo}: cambios guardados.`);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function findPatients(e: FormEvent) {
    e.preventDefault(); const version = ++searchVersion.current;
    setSearching(true); setOptions([]); setPatient(''); setError('');
    try {
      const found = await request<PaginatedResponse<PatientOption>>(`/api/pacientes/opciones?limit=100&q=${encodeURIComponent(search.trim())}`);
      if (version === searchVersion.current) setOptions(found.data);
    } catch (e) { setError((e as Error).message); }
    finally { setSearching(false); }
  }
  return <div className="space-y-6 p-4 md:p-8">
    <header className="flex items-start gap-3"><HeartPulse className="mt-1 h-8 w-8 shrink-0 text-emerald-700" aria-hidden="true" /><div><p className="text-xs uppercase tracking-widest text-emerald-700">Ingreso sin cita</p><h1 className="text-2xl font-semibold text-slate-900">Atención rápida</h1><p className="mt-2 text-sm text-slate-600">Inicia con el motivo de atención. Completa o vincula la ficha del paciente después.</p></div></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">{notice}</p>}
    <form onSubmit={create} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold">Nueva atención</h2>
      <label className="block space-y-2"><span className="text-sm font-medium">Nombre o referencia (opcional)</span><input className={field} value={name} onChange={e => setName(e.target.value)} maxLength={160} disabled={busy} placeholder="Puedes dejarlo vacío si aún no se identifica" /></label>
      <label className="block space-y-2"><span className="text-sm font-medium">Motivo de atención *</span><textarea className={field} required maxLength={2000} rows={3} value={reason} onChange={e => setReason(e.target.value)} disabled={busy} /></label>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-500">Registrada por: {user?.nombre}. El código se asignará al guardar.</p><button className={button} disabled={busy || !reason.trim()}>{busy ? 'Guardando…' : 'Abrir atención rápida'}</button></div>
    </form>
    <section className="space-y-4" aria-busy={loading}>
      <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Atenciones registradas</h2><button onClick={() => void load()} disabled={loading || busy} className="flex items-center gap-2 rounded-xl border p-3 text-sm"><RefreshCw className="h-4 w-4" aria-hidden="true" />Actualizar</button></div>
      {loading ? <p role="status">Cargando atenciones…</p> : items.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-slate-500">No hay atenciones en esta página.</p> : items.map(item => <article key={item.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{item.codigo} · {item.paciente_nombre || item.nombre_temporal || 'Persona sin identificar'}</h3><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-900">{labels[item.estado]}</span></div>
        <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{item.motivo}</p>
        <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString('es-GT')} · Inició: {item.iniciado_nombre}</p>
        <div className="flex flex-wrap gap-2">
          {clinical && item.estado !== 'finalizada' && <button className={button} disabled={busy} onClick={() => void update(item, { estado: item.estado === 'pendiente' ? 'en_atencion' : 'finalizada' })}>{item.estado === 'pendiente' ? 'Iniciar atención' : 'Finalizar atención'}</button>}
          {!item.id_paciente && <button className="rounded-xl border px-4 py-3 text-sm" disabled={busy} onClick={() => { setSelected(item); setOptions([]); setSearch(''); setPatient(''); ++searchVersion.current; }}>Vincular paciente · {item.codigo}</button>}
          {item.id_paciente && <span className="p-3 text-sm text-emerald-700">Ficha vinculada · #{item.id_paciente}</span>}
        </div>
        {selected?.id === item.id && <div className="space-y-3 rounded-xl bg-slate-50 p-4">
          <p className="text-sm">Selecciona la ficha correcta para {item.codigo}. Si aún no existe, <Link to="/patients" className="underline">registra al paciente</Link> y vuelve aquí.</p>
          <form onSubmit={findPatients} className="flex flex-wrap gap-2"><label className="min-w-0 flex-1"><span className="mb-1 block text-sm">Buscar paciente por nombre</span><input className={field} value={search} onChange={e => setSearch(e.target.value)} required /></label><button className={button} disabled={searching || !search.trim()}>{searching ? 'Buscando…' : 'Buscar'}</button></form>
          <label className="block text-sm">Paciente<select className={`${field} mt-1`} value={patient} onChange={e => setPatient(e.target.value)}><option value="">Selecciona un resultado ({options.length})</option>{options.map(p => <option key={p.id_paciente} value={p.id_paciente}>#{p.id_paciente} · {p.nombre}</option>)}</select></label>
          <p className="text-xs text-slate-500">Se muestran hasta 100 coincidencias. Verifica el identificador de la ficha antes de confirmar.</p>
          <div className="flex flex-wrap gap-2"><button className={button} disabled={!patient || busy} onClick={() => void update(item, { id_paciente: Number(patient) })}>Confirmar vínculo</button><button className="rounded-xl border px-4 py-3 text-sm" onClick={() => setSelected(null)} disabled={busy}>Cancelar</button></div>
        </div>}
      </article>)}
      <nav aria-label="Páginas de atenciones" className="flex items-center justify-between gap-3"><button className="rounded-xl border p-3" disabled={page === 1 || loading || busy} onClick={() => setPage(p => p-1)}>Anterior</button><span className="text-sm">Página {page}</span><button className="rounded-xl border p-3" disabled={items.length < 30 || loading || busy} onClick={() => setPage(p => p+1)}>Siguiente</button></nav>
    </section>
  </div>;
}

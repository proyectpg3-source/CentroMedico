import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Header } from "./layout/Header";
import { useAuth } from "../auth/AuthContext";
import { request } from "../api/client";

type Product = { id: number; codigo: string; nombre: string; categoria: string; unidad: string; proveedor: string; stock: number; minimo: number; precio: number; vencimiento: string | null };
type Movement = { id: number; cantidad: number; motivo: string; created_at: string; usuario: string };
const empty = { codigo: '', nombre: '', categoria: '', unidad: '', proveedor: '', stock: '0', minimo: '0', precio: '0', vencimiento: '' };
const inputClass = 'w-full rounded-lg border border-slate-300 p-2 text-sm';
const buttonClass = 'rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50';

export default function ProductInventory({ tipo, reloadKey = 0, children }: { tipo: 'inventario' | 'farmacia'; reloadKey?: number; children?: ReactNode }) {
  const { user } = useAuth();
  const writable = user?.rol === 'admin' || user?.rol === 'enfermero';
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [form, setForm] = useState(empty);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [history, setHistory] = useState<Movement[]>([]);
  const [movement, setMovement] = useState({ tipo: 'entrada', cantidad: '1', motivo: '' });
  async function load() {
    setLoading(true);
    try { setItems(await request<Product[]>(`/api/productos?tipo=${tipo}`)); }
    finally { setLoading(false); }
  }
  useEffect(() => { load().catch(e => setError(e.message)); }, [tipo, reloadKey]);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await request('/api/productos', { method: 'POST', body: JSON.stringify({ ...form, tipo }) });
      setShowAdd(false); setForm(empty); setNotice('Producto registrado.'); await load();
    } catch(e) { setError(e instanceof Error ? e.message : 'No se pudo registrar.'); }
    finally { setBusy(false); }
  }
  async function open(item: Product) {
    setError(''); setHistory([]); setSelected(item);
    setMovement({ tipo: 'entrada', cantidad: '1', motivo: '' });
    try { setHistory(await request<Movement[]>(`/api/productos/${item.id}/movimientos`)); }
    catch(e) { setError(e instanceof Error ? e.message : 'No se pudo cargar el historial.'); }
  }
  async function move(event: FormEvent) {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await request(`/api/productos/${selected.id}/movimientos`, { method: 'POST', body: JSON.stringify(movement) });
      setSelected(null); setNotice('Movimiento registrado.'); await load();
    } catch(e) { setError(e instanceof Error ? e.message : 'No se pudo registrar el movimiento.'); }
    finally { setBusy(false); }
  }
  const filtered = items.filter(p => `${p.nombre} ${p.codigo} ${p.categoria}`.toLowerCase().includes(search.toLowerCase()) && (!lowOnly || p.stock <= p.minimo));
  return <div className="flex min-h-full flex-col">
    <Header title={tipo === 'farmacia' ? 'Farmacia' : 'Inventario general'} subtitle="Productos, existencias e historial de movimientos" />
    <div className="space-y-5 p-5">
      {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-xl bg-green-50 p-3 text-green-800">{notice}</div>}
      <div className="grid gap-4 sm:grid-cols-3">{[['Productos',items.length],['Stock bajo',items.filter(p=>p.stock<=p.minimo).length],['Valor de existencias',new Intl.NumberFormat('es-GT',{style:'currency',currency:'GTQ'}).format(items.reduce((n,p)=>n+p.stock*p.precio,0))]].map(([label,value])=><div key={label} className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl">{loading ? '…' : value}</p></div>)}</div>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <input aria-label="Buscar productos" className={`${inputClass} max-w-sm`} placeholder="Buscar por nombre, código o categoría" value={search} onChange={e=>setSearch(e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lowOnly} onChange={e=>setLowOnly(e.target.checked)} /> Solo stock bajo</label>
        <button className={buttonClass} disabled={busy || loading} onClick={()=>{setError('');load().catch(e=>setError(e.message));}}>Recargar</button>
        {writable && <button className={buttonClass} onClick={()=>setShowAdd(!showAdd)}>Nuevo producto</button>}
      </div>
      {showAdd && writable && <form onSubmit={save} className="space-y-4 rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Nuevo producto</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([['codigo','Código'],['nombre','Nombre'],['categoria','Categoría'],['unidad','Unidad'],['proveedor','Proveedor'],['stock','Existencia inicial'],['minimo','Stock mínimo'],['precio',tipo === 'farmacia' ? 'Precio unitario (Q)' : 'Costo unitario (Q)'],['vencimiento','Vencimiento']] as const).map(([key,label])=><label key={key} className="space-y-1 text-sm"><span>{label}</span><input className={inputClass} required={!['proveedor','vencimiento'].includes(key)} type={['stock','minimo','precio'].includes(key)?'number':key==='vencimiento'?'date':'text'} min="0" step={key==='precio'?'0.01':'1'} maxLength={200} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
        </div>
        <button disabled={busy} className={buttonClass}>{busy?'Guardando…':'Guardar producto'}</button>
        <button type="button" disabled={busy} className="ml-3 text-sm" onClick={()=>setShowAdd(false)}>Cancelar</button>
      </form>}
      <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{['Código','Producto','Categoría','Existencia','Mínimo','Precio / costo','Vencimiento','Acciones'].map(t=><th key={t} className="p-3">{t}</th>)}</tr></thead><tbody>
        {filtered.map(p=><tr key={p.id} className="border-t"><td className="p-3">{p.codigo}</td><td className="p-3">{p.nombre}</td><td className="p-3">{p.categoria}</td><td className={`p-3 ${p.stock<=p.minimo?'font-semibold text-red-700':''}`}>{p.stock} {p.unidad}</td><td className="p-3">{p.minimo}</td><td className="p-3">Q{p.precio.toFixed(2)}</td><td className="p-3">{p.vencimiento || 'Sin fecha'}</td><td className="p-3"><button className="text-blue-700 underline" onClick={()=>open(p)}>Movimientos</button></td></tr>)}
        {!filtered.length && <tr><td colSpan={8} className="p-8 text-center text-slate-500">{loading?'Cargando…':error?'No se pudieron cargar los productos.':'No hay productos para mostrar.'}</td></tr>}
      </tbody></table></div>
      {selected && <section className="space-y-4 rounded-xl border bg-white p-4">
        <div className="flex justify-between"><h2 className="font-semibold">Movimientos: {selected.nombre}</h2><button disabled={busy} onClick={()=>setSelected(null)}>Cerrar</button></div>
        {writable && <form onSubmit={move} className="grid items-end gap-3 sm:grid-cols-4">
          <label className="text-sm">Tipo<select className={inputClass} value={movement.tipo} onChange={e=>setMovement({...movement,tipo:e.target.value})}><option value="entrada">Entrada</option><option value="salida">{tipo==='farmacia'?'Dispensación / salida':'Salida'}</option></select></label>
          <label className="text-sm">Cantidad<input required type="number" min="1" step="1" className={inputClass} value={movement.cantidad} onChange={e=>setMovement({...movement,cantidad:e.target.value})}/></label>
          <label className="text-sm">Motivo<input required className={inputClass} value={movement.motivo} onChange={e=>setMovement({...movement,motivo:e.target.value})}/></label>
          <button disabled={busy} className={buttonClass}>{busy?'Guardando…':'Registrar movimiento'}</button>
        </form>}
        <ul className="divide-y">{history.map(m=><li key={m.id} className="py-2 text-sm">{new Date(m.created_at).toLocaleString('es-GT')} · {m.cantidad>0?'+':''}{m.cantidad} · {m.motivo} · {m.usuario || 'Sistema'}</li>)}</ul>
      </section>}
    </div>
  </div>;
}

import { useEffect, useState, type FormEvent } from 'react';
import { Header } from '../components/layout/Header';
import { request } from '../api/client';
import { fetchPatients, type PatientRecord } from '../api/patients';
import { useAuth } from '../auth/AuthContext';

type Doc = { id: number; id_paciente: number; nombre: string; descripcion: string; tipo: string; bytes: number; paciente: string; created_at: string };
export default function Documentos() {
  const { user } = useAuth();
  const [docs,setDocs]=useState<Doc[]>([]);
  const [patients,setPatients]=useState<PatientRecord[]>([]);
  const [patient,setPatient]=useState('');
  const [description,setDescription]=useState('');
  const [search,setSearch]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [notice,setNotice]=useState('');
  async function load() {
    setLoading(true);
    try { const [d,p]=await Promise.all([request<Doc[]>('/api/documentos'),fetchPatients()]); setDocs(d);setPatients(p); }
    finally { setLoading(false); }
  }
  useEffect(()=>{load().catch(e=>setError(e.message));},[]);
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();const form=e.currentTarget;
    const file=new FormData(form).get('archivo') as File;
    setError('');setNotice('');
    if(!file?.size || file.size>5*1024*1024) {setError('Selecciona un archivo de hasta 5 MB.');return;}
    setBusy(true);
    try {
      const contenido=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('No se pudo leer el archivo.'));reader.readAsDataURL(file);});
      await request('/api/documentos',{method:'POST',body:JSON.stringify({id_paciente:Number(patient),nombre:file.name,tipo:file.type,descripcion:description,contenido})});
      form.reset();setDescription('');setPatient('');setNotice('Documento guardado.');await load();
    }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar el documento.');}finally{setBusy(false);}
  }
  async function download(d:Doc){
    setError('');setBusy(true);
    try{
      const file=await request<{contenido:string;tipo:string;nombre:string}>(`/api/documentos/${d.id}`);
      const bytes=Uint8Array.from(atob(file.contenido),c=>c.charCodeAt(0));
      const url=URL.createObjectURL(new Blob([bytes],{type:file.tipo}));
      const a=document.createElement('a');a.href=url;a.download=file.nombre;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){setError(e instanceof Error?e.message:'No se pudo descargar.');}finally{setBusy(false);}
  }
  async function remove(d:Doc){
    if(!window.confirm(`¿Eliminar el documento ${d.nombre}?`))return;
    setError('');setBusy(true);
    try{await request(`/api/documentos/${d.id}`,{method:'DELETE'});setNotice('Documento eliminado.');await load();}
    catch(e){setError(e instanceof Error?e.message:'No se pudo eliminar.');}finally{setBusy(false);}
  }
  return <div><Header title="Documentos" subtitle="Archivos asociados al expediente del paciente"/><div className="space-y-5 p-5">
    {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
    {notice&&<p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">{notice}</p>}
    <form onSubmit={upload} className="space-y-4 rounded-xl border bg-white p-4">
      <h2 className="font-semibold">Adjuntar documento</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">Paciente<select required value={patient} onChange={e=>setPatient(e.target.value)} className="mt-1 w-full rounded-lg border p-2"><option value="">Selecciona un paciente</option>{patients.map(p=><option key={p.id_paciente} value={p.id_paciente}>{p.nombre} · {p.dni}</option>)}</select></label>
        <label className="text-sm">Archivo (PDF, JPG, PNG o TXT; hasta 5 MB)<input required name="archivo" type="file" accept="application/pdf,image/jpeg,image/png,text/plain" className="mt-1 block w-full rounded-lg border p-2"/></label>
        <label className="text-sm md:col-span-2">Descripción<input value={description} onChange={e=>setDescription(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label>
      </div>
      <button disabled={busy||loading} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50">{busy?'Procesando…':'Guardar documento'}</button>
      {!loading&&!patients.length&&<p className="text-sm text-slate-600">Registra primero un paciente para adjuntar archivos.</p>}
    </form>
    <input aria-label="Buscar documentos" placeholder="Buscar paciente, archivo o descripción" value={search} onChange={e=>setSearch(e.target.value)} className="w-full rounded-lg border bg-white p-3"/>
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{['Paciente','Archivo','Descripción','Tamaño','Fecha','Acciones'].map(s=><th key={s} className="p-3">{s}</th>)}</tr></thead><tbody>
      {docs.filter(d=>`${d.paciente} ${d.nombre} ${d.descripcion}`.toLowerCase().includes(search.toLowerCase())).map(d=><tr key={d.id} className="border-t"><td className="p-3">{d.paciente}</td><td className="p-3">{d.nombre}</td><td className="p-3">{d.descripcion||'—'}</td><td className="p-3">{Math.ceil(d.bytes/1024)} KB</td><td className="p-3">{new Date(d.created_at).toLocaleDateString('es-GT')}</td><td className="space-x-3 p-3"><button disabled={busy} onClick={()=>download(d)} className="text-blue-700 underline">Descargar</button>{user?.rol==='admin'&&<button disabled={busy} onClick={()=>remove(d)} className="text-red-700 underline">Eliminar</button>}</td></tr>)}
    </tbody></table>{loading?<p className="p-6 text-center">Cargando…</p>:!docs.length&&<p className="p-6 text-center text-slate-500">No hay documentos registrados.</p>}</div>
  </div></div>;
}

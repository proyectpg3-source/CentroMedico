import { ArrowLeft, ShieldX } from "lucide-react";
import { Link } from "react-router";

export default function Forbidden() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700"><ShieldX className="h-8 w-8" /></div>
      <h1 className="mt-5 text-2xl font-semibold text-slate-900">Acceso restringido</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Tu rol no tiene permiso para abrir este módulo. Si necesitas acceso, comunícate con administración.</p>
      <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"><ArrowLeft className="h-4 w-4" /> Volver al dashboard</Link>
    </div>
  );
}

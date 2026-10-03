import { BadgeDollarSign, CheckCircle2, Plus, ReceiptText, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Header } from "../components/layout/Header";
import { patientAccounts, patients, type AccountItem, type PatientAccount } from "../data/mockData";

const categoryConfig = {
  consulta:      { label: "Consulta",     bg: "bg-blue-100",   text: "text-blue-700" },
  laboratorio:   { label: "Laboratorio",  bg: "bg-purple-100", text: "text-purple-700" },
  farmacia:      { label: "Farmacia",     bg: "bg-green-100",  text: "text-green-700" },
  procedimiento: { label: "Procedimiento", bg: "bg-orange-100", text: "text-orange-700" },
  otro:          { label: "Otro",         bg: "bg-gray-100",   text: "text-slate-600" },
};

const statusConfig = {
  open:     { label: "Abierta",   bg: "bg-blue-100",   text: "text-blue-700" },
  partial:  { label: "Parcial",   bg: "bg-amber-100",  text: "text-amber-700" },
  paid:     { label: "Pagada",    bg: "bg-green-100",  text: "text-green-700" },
  invoiced: { label: "Facturada", bg: "bg-purple-100", text: "text-purple-700" },
};

export default function Caja() {
  const [accounts, setAccounts] = useState<PatientAccount[]>(patientAccounts);
  const [selected, setSelected] = useState<PatientAccount | null>(accounts[0] || null);
  const [search, setSearch] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({ description: "", category: "consulta" as AccountItem["category"], quantity: "1", unitPrice: "" });

  const filtered = accounts.filter((a) => a.patientName.toLowerCase().includes(search.toLowerCase()));

  function addItem() {
    if (!selected || !newItem.description || !newItem.unitPrice) return;
    const qty = parseInt(newItem.quantity) || 1;
    const price = parseFloat(newItem.unitPrice) || 0;
    const item: AccountItem = {
      id: `ai${Date.now()}`,
      description: newItem.description,
      category: newItem.category,
      quantity: qty,
      unitPrice: price,
      total: qty * price,
    };
    setAccounts((prev) => prev.map((a) => {
      if (a.id !== selected.id) return a;
      const newItems = [...a.items, item];
      const total = newItems.reduce((s, i) => s + i.total, 0);
      return { ...a, items: newItems, totalAmount: total, pending: total - a.paid };
    }));
    setSelected((prev) => {
      if (!prev) return prev;
      const newItems = [...prev.items, item];
      const total = newItems.reduce((s, i) => s + i.total, 0);
      return { ...prev, items: newItems, totalAmount: total, pending: total - prev.paid };
    });
    setNewItem({ description: "", category: "consulta", quantity: "1", unitPrice: "" });
    setShowAddItem(false);
  }

  function removeItem(itemId: string) {
    if (!selected) return;
    setAccounts((prev) => prev.map((a) => {
      if (a.id !== selected.id) return a;
      const newItems = a.items.filter((i) => i.id !== itemId);
      const total = newItems.reduce((s, i) => s + i.total, 0);
      return { ...a, items: newItems, totalAmount: total, pending: total - a.paid };
    }));
    setSelected((prev) => {
      if (!prev) return prev;
      const newItems = prev.items.filter((i) => i.id !== itemId);
      const total = newItems.reduce((s, i) => s + i.total, 0);
      return { ...prev, items: newItems, totalAmount: total, pending: total - prev.paid };
    });
  }

  function createNewAccount(patientId: string) {
    const patient = patients.find((p) => p.id === patientId);
    if (!patient) return;
    const acc: PatientAccount = {
      id: `acc${Date.now()}`, patientId, patientName: patient.name,
      date: new Date().toISOString().split("T")[0],
      items: [], totalAmount: 0, paid: 0, pending: 0, status: "open",
    };
    setAccounts((prev) => [acc, ...prev]);
    setSelected(acc);
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Caja / Cuenta del Paciente" subtitle="Control de servicios y cargos por paciente" />

      <div className="flex-1 p-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Cuentas abiertas", value: accounts.filter((a) => a.status === "open").length, color: "text-blue-600" },
            { label: "Pendiente de cobro", value: `Q${accounts.reduce((s, a) => s + a.pending, 0).toFixed(2)}`, color: "text-amber-600" },
            { label: "Cobrado hoy", value: `Q${accounts.reduce((s, a) => s + a.paid, 0).toFixed(2)}`, color: "text-green-600" },
            { label: "Facturadas", value: accounts.filter((a) => a.status === "invoiced").length, color: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-2xl mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Accounts list */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="px-4 py-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input placeholder="Buscar paciente..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-400" />
              </div>
              <select onChange={(e) => e.target.value && createNewAccount(e.target.value)} defaultValue=""
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none">
                <option value="">+ Nueva cuenta para paciente</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="divide-y divide-gray-50">
              {filtered.map((acc) => {
                const sc = statusConfig[acc.status];
                return (
                  <div key={acc.id} onClick={() => setSelected(acc)}
                    className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${selected?.id === acc.id ? "bg-blue-50" : ""}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-slate-900 truncate flex-1">{acc.patientName}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0 ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{acc.date} · {acc.items.length} ítem(s)</span>
                      <span className={acc.pending > 0 ? "text-amber-600" : "text-green-600"}>
                        {acc.pending > 0 ? `Q${acc.pending.toFixed(2)} pendiente` : "Pagado"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">Sin cuentas</div>
              )}
            </div>
          </div>

          {/* Account detail */}
          {selected ? (
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-slate-900">{selected.patientName}</h3>
                  <p className="text-xs text-slate-500">{selected.date} · Cuenta #{selected.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${statusConfig[selected.status].bg} ${statusConfig[selected.status].text}`}>
                    {statusConfig[selected.status].label}
                  </span>
                  <a href="/facturacion" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700">
                    <ReceiptText className="w-4 h-4" /> Facturar (SAT)
                  </a>
                </div>
              </div>

              {/* Items table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-3 py-2">Descripción</th>
                      <th className="text-left px-3 py-2">Categoría</th>
                      <th className="text-right px-3 py-2">Cant.</th>
                      <th className="text-right px-3 py-2">P. Unit.</th>
                      <th className="text-right px-3 py-2">Total</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selected.items.map((item) => {
                      const cc = categoryConfig[item.category];
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5 text-slate-800">{item.description}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${cc.bg} ${cc.text}`}>{cc.label}</span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-700">{item.quantity}</td>
                          <td className="px-3 py-2.5 text-right text-slate-700">Q{item.unitPrice.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right text-slate-900">Q{item.total.toFixed(2)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <button onClick={() => removeItem(item.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {selected.items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400 text-xs">Sin servicios registrados</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add item */}
              {showAddItem ? (
                <div className="bg-slate-50 border border-gray-200 rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <input placeholder="Descripción del servicio" value={newItem.description} onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                      className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400" />
                    <select value={newItem.category} onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value as AccountItem["category"] }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
                      {Object.entries(categoryConfig).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                    </select>
                    <input placeholder="Precio unit. (Q)" type="number" value={newItem.unitPrice} onChange={(e) => setNewItem((p) => ({ ...p, unitPrice: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400" />
                    <input placeholder="Cantidad" type="number" value={newItem.quantity} onChange={(e) => setNewItem((p) => ({ ...p, quantity: e.target.value }))}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-400" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addItem} className="px-4 py-2 bg-[#2563eb] text-white text-sm rounded-lg hover:bg-blue-700">Agregar</button>
                    <button onClick={() => setShowAddItem(false)} className="px-4 py-2 border border-gray-200 text-slate-600 text-sm rounded-lg">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddItem(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 text-slate-500 text-sm rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors w-full justify-center">
                  <Plus className="w-4 h-4" /> Agregar servicio / cargo
                </button>
              )}

              {/* Totals */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="text-slate-900">Q{selected.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Pagado</span>
                  <span className="text-green-600">Q{selected.paid.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                  <span className="text-slate-800">Pendiente</span>
                  <span className={`text-lg ${selected.pending > 0 ? "text-amber-600" : "text-green-600"}`}>
                    Q{selected.pending.toFixed(2)}
                  </span>
                </div>
              </div>

              {selected.pending === 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Cuenta completamente pagada
                </div>
              )}
            </div>
          ) : (
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 min-h-[300px]">
              <div className="text-center">
                <BadgeDollarSign className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm">Selecciona una cuenta</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

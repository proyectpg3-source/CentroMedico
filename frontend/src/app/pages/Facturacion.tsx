import { CheckCircle2, Download, ReceiptText, Search, Send, XCircle } from "lucide-react";
import { useState } from "react";
import { Header } from "../components/layout/Header";
import { invoices, patientAccounts, patients, type Invoice } from "../data/mockData";

const statusConfig = {
  draft:     { label: "Borrador",   bg: "bg-gray-100",   text: "text-slate-600" },
  issued:    { label: "Emitida",    bg: "bg-green-100",  text: "text-green-700" },
  cancelled: { label: "Cancelada",  bg: "bg-red-100",    text: "text-red-700" },
  annulled:  { label: "Anulada",    bg: "bg-orange-100", text: "text-orange-700" },
};

const paymentMethods: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  cheque: "Cheque",
};

export default function Facturacion() {
  const [allInvoices, setAllInvoices] = useState<Invoice[]>(invoices);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Invoice | null>(invoices[0] || null);
  const [showNew, setShowNew] = useState(false);
  const [emitting, setEmitting] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    patientId: "p2",
    nit: "CF",
    paymentMethod: "efectivo" as Invoice["paymentMethod"],
    accountId: "",
  });

  const filtered = allInvoices.filter((inv) =>
    inv.patientName.toLowerCase().includes(search.toLowerCase()) ||
    inv.invoiceNumber.includes(search)
  );

  const pendingAccounts = patientAccounts.filter((a) => a.status === "open" || a.status === "partial");

  async function handleEmit() {
    const patient = patients.find((p) => p.id === newInvoice.patientId);
    if (!patient) return;
    const account = patientAccounts.find((a) => a.patientId === newInvoice.patientId);
    if (!account) return;

    setEmitting(true);
    await new Promise((r) => setTimeout(r, 2000));

    const uuid = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("").toUpperCase();
    const auth = Array.from({ length: 36 }, (_, i) => [8, 13, 18, 23].includes(i) ? "-" : Math.floor(Math.random() * 16).toString(16)).join("").toUpperCase();
    const num = String(allInvoices.length + 1).padStart(6, "0");

    const newInv: Invoice = {
      id: `inv${Date.now()}`,
      invoiceNumber: num,
      series: "A",
      patientId: newInvoice.patientId,
      patientName: patient.name,
      patientNit: newInvoice.nit,
      date: new Date().toISOString().split("T")[0],
      items: account.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
      subtotal: account.totalAmount,
      iva: account.totalAmount * 0.12,
      total: account.totalAmount * 1.12,
      status: "issued",
      satAuthorization: auth,
      satUuid: uuid,
      paymentMethod: newInvoice.paymentMethod,
    };

    setAllInvoices((prev) => [newInv, ...prev]);
    setSelected(newInv);
    setEmitting(false);
    setShowNew(false);
  }

  function handleAnnul(id: string) {
    setAllInvoices((prev) => prev.map((inv) => inv.id === id ? { ...inv, status: "annulled" as const } : inv));
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status: "annulled" } : null);
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header title="Facturación SAT" subtitle="Emisión de facturas electrónicas FEL – Superintendencia de Administración Tributaria" />

      <div className="flex-1 p-5 space-y-4">
        {/* SAT status banner */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-900 text-white rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <ReceiptText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Sistema FEL – Factura Electrónica en Línea</p>
            <p className="text-xs text-blue-200">Conectado · Certificador: G&T Continental · NIT Emisor: 98765432-1</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-green-300">En línea</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Emitidas hoy", value: allInvoices.filter((i) => i.status === "issued").length, color: "text-green-600" },
            { label: "Borradores", value: allInvoices.filter((i) => i.status === "draft").length, color: "text-slate-600" },
            { label: "Anuladas", value: allInvoices.filter((i) => i.status === "annulled" || i.status === "cancelled").length, color: "text-red-600" },
            { label: "Total facturado", value: `Q${allInvoices.filter((i) => i.status === "issued").reduce((s, i) => s + i.total, 0).toFixed(2)}`, color: "text-blue-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-2xl mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* List */}
          <div className="xl:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="px-4 py-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input placeholder="Buscar factura..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 rounded-xl border border-gray-200 focus:outline-none" />
              </div>
              <button onClick={() => setShowNew(!showNew)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700">
                <Send className="w-4 h-4" /> Nueva Factura FEL
              </button>
            </div>

            {showNew && (
              <div className="px-4 py-3 border-b border-gray-100 bg-blue-50 space-y-2">
                <p className="text-xs text-slate-700 font-medium">Emitir factura electrónica</p>
                <select value={newInvoice.patientId} onChange={(e) => setNewInvoice((p) => ({ ...p, patientId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input placeholder="NIT del cliente (o CF para Consumidor Final)" value={newInvoice.nit} onChange={(e) => setNewInvoice((p) => ({ ...p, nit: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none" />
                <select value={newInvoice.paymentMethod} onChange={(e) => setNewInvoice((p) => ({ ...p, paymentMethod: e.target.value as Invoice["paymentMethod"] }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
                  {Object.entries(paymentMethods).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={handleEmit} disabled={emitting}
                  className={`w-full py-2 text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${emitting ? "bg-gray-400 cursor-wait text-white" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}>
                  {emitting ? (
                    <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Enviando a SAT...</>
                  ) : (
                    <><Send className="w-3.5 h-3.5" />Emitir en SAT</>
                  )}
                </button>
                <button onClick={() => setShowNew(false)} className="w-full py-2 border border-gray-200 text-slate-600 text-sm rounded-lg">Cancelar</button>
              </div>
            )}

            <div className="divide-y divide-gray-50 overflow-y-auto max-h-[400px]">
              {filtered.map((inv) => {
                const sc = statusConfig[inv.status];
                return (
                  <div key={inv.id} onClick={() => setSelected(inv)}
                    className={`px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${selected?.id === inv.id ? "bg-blue-50" : ""}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-slate-600">Serie {inv.series} – {inv.invoiceNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </div>
                    <p className="text-sm text-slate-900 truncate">{inv.patientName}</p>
                    <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                      <span>{inv.date}</span>
                      <span className="text-slate-700">Q{inv.total.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div className="text-center py-8 text-slate-400 text-sm">Sin facturas</div>}
            </div>
          </div>

          {/* Invoice detail */}
          {selected ? (
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-slate-400">FACTURA ELECTRÓNICA FEL</p>
                  <h3 className="text-slate-900">Serie {selected.series} · No. {selected.invoiceNumber}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Fecha: {selected.date} · Pago: {paymentMethods[selected.paymentMethod]}</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-slate-600 text-xs rounded-lg hover:bg-slate-50">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                  {selected.status === "issued" && (
                    <button onClick={() => handleAnnul(selected.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 text-xs rounded-lg hover:bg-red-50">
                      <XCircle className="w-3.5 h-3.5" /> Anular
                    </button>
                  )}
                </div>
              </div>

              {/* Patient info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3 text-xs">
                <div>
                  <p className="text-slate-400">Paciente / Cliente</p>
                  <p className="text-slate-900">{selected.patientName}</p>
                </div>
                <div>
                  <p className="text-slate-400">NIT</p>
                  <p className="text-slate-900">{selected.patientNit}</p>
                </div>
              </div>

              {/* SAT Authorization */}
              {selected.satAuthorization && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-700">Autorizado por SAT</p>
                  </div>
                  <div className="text-xs text-green-600 space-y-0.5">
                    <p><span className="text-green-400">UUID SAT: </span>{selected.satUuid}</p>
                    <p><span className="text-green-400">Autorización: </span>{selected.satAuthorization}</p>
                  </div>
                </div>
              )}

              {/* Items */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <th className="text-left px-3 py-2">Descripción</th>
                      <th className="text-right px-3 py-2">Cant.</th>
                      <th className="text-right px-3 py-2">P. Unit.</th>
                      <th className="text-right px-3 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {selected.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-800">{item.description}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{item.quantity}</td>
                        <td className="px-3 py-2 text-right text-slate-600">Q{item.unitPrice.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-slate-900">Q{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-slate-800">Q{selected.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">IVA (12%)</span>
                  <span className="text-slate-800">Q{selected.iva.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-2">
                  <span className="text-slate-900">TOTAL</span>
                  <span className="text-xl text-slate-900">Q{selected.total.toFixed(2)}</span>
                </div>
              </div>

              {/* QR code placeholder */}
              <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-3">
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] text-slate-400 text-center">QR SAT</span>
                </div>
                <div className="text-xs text-slate-500">
                  <p>Esta factura fue generada mediante el sistema FEL.</p>
                  <p>Puedes verificarla en portal.sat.gob.gt</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-slate-300 min-h-[300px]">
              <div className="text-center">
                <ReceiptText className="w-10 h-10 mx-auto mb-2" />
                <p className="text-sm">Selecciona o crea una factura</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

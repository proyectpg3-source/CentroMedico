import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Header } from "../components/layout/Header";
import { Can } from "../auth/usePermissions";
import {
  createLabSupply,
  fetchLabSupplies,
  fetchLabSupplyAlerts,
  registerLabSupplyMovement,
  updateLabSupply,
  type LabSupplyAlertsResponse,
  type LabSupplyRecord,
} from "../api/laboratory";
import { formatDate, getErrorMessage } from "../lib/format";

interface SupplyFormState {
  nombre: string;
  categoria: string;
  unidad: string;
  stock: string;
  stock_minimo: string;
  fecha_vencimiento: string;
}

interface MovementFormState {
  tipo: "entrada" | "salida";
  cantidad: string;
  motivo: string;
}

function emptyAlerts(): LabSupplyAlertsResponse {
  return {
    source: "frontend",
    generatedAt: new Date().toISOString(),
    summary: {
      totalItems: 0,
      totalAlerts: 0,
      lowStock: 0,
      outOfStock: 0,
      expired: 0,
      expiringSoon: 0,
    },
    alerts: [],
  };
}

function supplyFormState(supply?: LabSupplyRecord | null): SupplyFormState {
  return {
    nombre: supply?.nombre || "",
    categoria: supply?.categoria || "Laboratorio",
    unidad: supply?.unidad || "unidad",
    stock: String(supply?.stock ?? 0),
    stock_minimo: String(supply?.stock_minimo ?? 0),
    fecha_vencimiento: supply?.fecha_vencimiento
      ? supply.fecha_vencimiento.slice(0, 10)
      : "",
  };
}

function SupplyModal({
  supply,
  saving,
  error,
  onClose,
  onSave,
}: {
  supply: LabSupplyRecord | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (form: SupplyFormState) => void;
}) {
  const [form, setForm] = useState<SupplyFormState>(() => supplyFormState(supply));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">
              Inventario
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {supply ? "Editar insumo" : "Nuevo insumo"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            onSave(form);
          }}
          className="space-y-5 px-6 py-6"
        >
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Nombre *</span>
              <input
                required
                value={form.nombre}
                onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Categoria</span>
              <input
                value={form.categoria}
                onChange={(event) => setForm((current) => ({ ...current, categoria: event.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Unidad</span>
              <input
                value={form.unidad}
                onChange={(event) => setForm((current) => ({ ...current, unidad: event.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Stock *</span>
              <input
                required
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Stock minimo *</span>
              <input
                required
                type="number"
                min="0"
                value={form.stock_minimo}
                onChange={(event) => setForm((current) => ({ ...current, stock_minimo: event.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-medium text-slate-700">Fecha de vencimiento</span>
              <input
                type="date"
                value={form.fecha_vencimiento}
                onChange={(event) => setForm((current) => ({ ...current, fecha_vencimiento: event.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MovementModal({
  supply,
  saving,
  error,
  onClose,
  onSave,
}: {
  supply: LabSupplyRecord;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (form: MovementFormState) => void;
}) {
  const [form, setForm] = useState<MovementFormState>({
    tipo: "entrada",
    cantidad: "1",
    motivo: "",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-600">
              Movimiento de stock
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">{supply.nombre}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Stock actual: {supply.stock} {supply.unidad}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            onSave(form);
          }}
          className="space-y-5 px-6 py-6"
        >
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label>
              <span className="text-sm font-medium text-slate-700">Tipo</span>
              <select
                value={form.tipo}
                onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value as MovementFormState["tipo"] }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
              >
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
            </label>
            <label>
              <span className="text-sm font-medium text-slate-700">Cantidad *</span>
              <input
                required
                type="number"
                min="1"
                value={form.cantidad}
                onChange={(event) => setForm((current) => ({ ...current, cantidad: event.target.value }))}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
              />
            </label>
          </div>
          <label>
            <span className="text-sm font-medium text-slate-700">Motivo</span>
            <textarea
              rows={3}
              value={form.motivo}
              onChange={(event) => setForm((current) => ({ ...current, motivo: event.target.value }))}
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-100"
            />
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [supplies, setSupplies] = useState<LabSupplyRecord[]>([]);
  const [alerts, setAlerts] = useState<LabSupplyAlertsResponse>(() => emptyAlerts());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingSupply, setEditingSupply] = useState<LabSupplyRecord | null>(null);
  const [showSupplyModal, setShowSupplyModal] = useState(false);
  const [movementSupply, setMovementSupply] = useState<LabSupplyRecord | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  async function loadData(signal?: AbortSignal) {
    setLoading(true);
    setError(null);
    try {
      const [suppliesResponse, alertsResponse] = await Promise.all([
        fetchLabSupplies(undefined, signal),
        fetchLabSupplyAlerts(signal),
      ]);
      setSupplies(suppliesResponse);
      setAlerts(alertsResponse);
    } catch (loadError) {
      if (!signal?.aborted) {
        setError(getErrorMessage(loadError, "No se pudo cargar el inventario."));
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, []);

  const filteredSupplies = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return supplies;
    return supplies.filter((supply) =>
      [supply.nombre, supply.categoria, supply.unidad].join(" ").toLowerCase().includes(value)
    );
  }, [search, supplies]);

  const stats = useMemo(() => {
    return {
      total: supplies.length,
      lowStock: alerts.summary.lowStock,
      expired: alerts.summary.expired,
      expiringSoon: alerts.summary.expiringSoon,
      totalAlerts: alerts.summary.totalAlerts,
    };
  }, [alerts.summary.expired, alerts.summary.expiringSoon, alerts.summary.lowStock, alerts.summary.totalAlerts, supplies.length]);

  async function saveSupply(form: SupplyFormState) {
    setSaving(true);
    setModalError(null);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        categoria: form.categoria.trim() || "Laboratorio",
        unidad: form.unidad.trim() || "unidad",
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo),
        fecha_vencimiento: form.fecha_vencimiento || null,
      };

      if (editingSupply) {
        await updateLabSupply(editingSupply.id_insumo, payload);
        setSuccess("Insumo actualizado correctamente.");
      } else {
        await createLabSupply(payload);
        setSuccess("Insumo creado correctamente.");
      }

      setShowSupplyModal(false);
      setEditingSupply(null);
      await loadData();
    } catch (saveError) {
      setModalError(getErrorMessage(saveError, "No se pudo guardar el insumo."));
    } finally {
      setSaving(false);
    }
  }

  async function saveMovement(form: MovementFormState) {
    if (!movementSupply) return;
    setSaving(true);
    setModalError(null);
    try {
      await registerLabSupplyMovement(movementSupply.id_insumo, {
        tipo: form.tipo,
        cantidad: Number(form.cantidad),
        motivo: form.motivo.trim() || null,
      });
      setMovementSupply(null);
      setSuccess("Movimiento registrado correctamente.");
      await loadData();
    } catch (movementError) {
      setModalError(getErrorMessage(movementError, "No se pudo registrar el movimiento."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header
        title="Inventario"
        subtitle="Insumos de laboratorio, alertas de stock y vencimiento"
      />

      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Insumos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm text-amber-700">Alertas</p>
            <p className="mt-2 text-3xl font-semibold text-amber-900">{stats.totalAlerts}</p>
          </div>
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <p className="text-sm text-rose-700">Bajo minimo</p>
            <p className="mt-2 text-3xl font-semibold text-rose-900">{stats.lowStock}</p>
          </div>
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="text-sm text-red-700">Vencidos</p>
            <p className="mt-2 text-3xl font-semibold text-red-900">{stats.expired}</p>
          </div>
          <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
            <p className="text-sm text-sky-700">Por vencer</p>
            <p className="mt-2 text-3xl font-semibold text-sky-900">{stats.expiringSoon}</p>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700 shadow-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-start justify-between gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 shadow-sm">
            <span>{success}</span>
            <button type="button" onClick={() => setSuccess(null)} className="text-emerald-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Control de insumos</h2>
              <p className="text-sm text-slate-500">
                Alertas calculadas por el microservicio de inventario
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadData()}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
              <Can module="inventory" action="create">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSupply(null);
                    setModalError(null);
                    setShowSupplyModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo insumo
                </button>
              </Can>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-slate-900">Alertas activas</h3>
              </div>
              <div className="mt-3 space-y-2">
                {alerts.alerts.length ? (
                  alerts.alerts.map((alert) => (
                    <div key={alert.key} className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{alert.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{alert.detail}</p>
                          <p className="mt-1 text-xs text-slate-400">{alert.recommendation}</p>
                        </div>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
                          {alert.badge}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-white px-4 py-8 text-center">
                    <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
                    <p className="mt-3 text-sm text-slate-500">Sin alertas activas.</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar insumo, categoria o unidad"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>

              {loading ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-100 text-slate-400">
                  <Loader2 className="h-7 w-7 animate-spin" />
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Insumo</th>
                          <th className="px-4 py-3">Categoria</th>
                          <th className="px-4 py-3">Stock</th>
                          <th className="px-4 py-3">Vence</th>
                          <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredSupplies.map((supply) => {
                          const low = Number(supply.stock) <= Number(supply.stock_minimo);
                          return (
                            <tr key={supply.id_insumo} className="bg-white">
                              <td className="px-4 py-3">
                                <p className="font-medium text-slate-900">{supply.nombre}</p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  Minimo {supply.stock_minimo} {supply.unidad}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{supply.categoria}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${low ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                                  {supply.stock} {supply.unidad}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                <span className="inline-flex items-center gap-1.5">
                                  <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                                  {formatDate(supply.fecha_vencimiento)}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-end gap-2">
                                  <Can module="inventory" action="edit">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMovementSupply(supply);
                                        setModalError(null);
                                      }}
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50"
                                    >
                                      <ArrowDownUp className="h-3.5 w-3.5" />
                                      Movimiento
                                    </button>
                                  </Can>
                                  <Can module="inventory" action="edit">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingSupply(supply);
                                        setModalError(null);
                                        setShowSupplyModal(true);
                                      }}
                                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                    >
                                      Editar
                                    </button>
                                  </Can>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {!filteredSupplies.length && (
                    <div className="px-6 py-12 text-center">
                      <Package className="mx-auto h-10 w-10 text-slate-300" />
                      <p className="mt-3 text-sm text-slate-500">
                        No hay insumos con ese filtro.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSupplyModal && (
        <SupplyModal
          supply={editingSupply}
          saving={saving}
          error={modalError}
          onClose={() => {
            setShowSupplyModal(false);
            setEditingSupply(null);
          }}
          onSave={saveSupply}
        />
      )}

      {movementSupply && (
        <MovementModal
          supply={movementSupply}
          saving={saving}
          error={modalError}
          onClose={() => setMovementSupply(null)}
          onSave={saveMovement}
        />
      )}
    </div>
  );
}

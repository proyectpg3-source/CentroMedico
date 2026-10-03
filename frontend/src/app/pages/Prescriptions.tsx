import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/layout/Header";
import { Can } from "../auth/usePermissions";
import {
  createPrescription,
  fetchPharmacyProducts,
  fetchPrescriptions,
  DISPENSATION_LABELS,
  getDispensationStatus,
  type PharmacyProduct,
  type PrescriptionRecord,
} from "../api/prescriptions";
import { fetchVisits, type VisitRecord } from "../api/visits";
import {
  AlertCircle,
  FilePlus2,
  Loader2,
  Pill,
  Search,
  Syringe,
  X,
} from "lucide-react";
import {
  formatCurrency,
  formatDateTime,
  getErrorMessage,
  numericValue,
} from "../lib/format";

interface PrescriptionFormState {
  id_visita: string;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  instrucciones: string;
  costo: string;
  id_producto: string;
  cantidad: string;
}

function buildFormState(): PrescriptionFormState {
  return {
    id_visita: "",
    medicamento: "",
    dosis: "",
    frecuencia: "",
    duracion: "",
    instrucciones: "",
    costo: "150",
    id_producto: "",
    cantidad: "1",
  };
}

function PrescriptionFormModal({
  visits,
  products,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  visits: VisitRecord[];
  products: PharmacyProduct[];
  onClose: () => void;
  onSubmit: (form: PrescriptionFormState) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [form, setForm] = useState<PrescriptionFormState>(() => buildFormState());
  const product = products.find((item) => String(item.id) === form.id_producto) ?? null;
  // Con producto vinculado el servidor fija el costo; aqui solo se muestra.
  const catalogCost = product ? (Number(form.cantidad) || 0) * product.precio : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
              Farmacia clinica
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              Registrar prescripcion
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
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(form);
          }}
          className="space-y-5 px-6 py-6"
        >
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">Visita asociada *</label>
            <select
              required
              value={form.id_visita}
              onChange={(event) =>
                setForm((current) => ({ ...current, id_visita: event.target.value }))
              }
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Selecciona una visita</option>
              {visits.map((visit) => (
                <option key={visit.id_visita} value={visit.id_visita}>
                  #{visit.id_visita} - {visit.paciente_nombre || "Paciente"} - {visit.diagnostico}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_140px]">
            <div>
              <label className="text-sm font-medium text-slate-700">Producto de farmacia</label>
              <select
                value={form.id_producto}
                onChange={(event) => {
                  const selected = products.find((item) => String(item.id) === event.target.value);
                  setForm((current) => ({
                    ...current,
                    id_producto: event.target.value,
                    medicamento: selected ? selected.nombre : current.medicamento,
                  }));
                }}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">No dispensar desde farmacia (costo manual)</option>
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre} ({item.codigo}) - {item.stock} {item.unidad} - {formatCurrency(item.precio)}
                  </option>
                ))}
              </select>
            </div>
            {product && (
              <div>
                <label className="text-sm font-medium text-slate-700">Cantidad *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.cantidad}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cantidad: event.target.value }))
                  }
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            )}
          </div>
          {product && Number(form.cantidad) > product.stock && (
            <p className="text-sm text-amber-700">
              Existencia actual: {product.stock} {product.unidad}. Farmacia podra dispensar de forma parcial.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Medicamento *</label>
              <input
                required
                value={form.medicamento}
                onChange={(event) =>
                  setForm((current) => ({ ...current, medicamento: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                Costo *{catalogCost !== null && " (calculado desde el catalogo)"}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                readOnly={catalogCost !== null}
                value={catalogCost !== null ? catalogCost.toFixed(2) : form.costo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, costo: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Dosis *</label>
              <input
                required
                value={form.dosis}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dosis: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Frecuencia *</label>
              <input
                required
                value={form.frecuencia}
                onChange={(event) =>
                  setForm((current) => ({ ...current, frecuencia: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Duracion *</label>
              <input
                required
                value={form.duracion}
                onChange={(event) =>
                  setForm((current) => ({ ...current, duracion: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Instrucciones</label>
            <textarea
              rows={3}
              value={form.instrucciones}
              onChange={(event) =>
                setForm((current) => ({ ...current, instrucciones: event.target.value }))
              }
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar prescripcion
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadData(signal?: AbortSignal) {
    try {
      setLoading(true);
      setError(null);

      const [prescriptionsResponse, visitsResponse, productsResponse] = await Promise.all([
        fetchPrescriptions(undefined, signal),
        fetchVisits(undefined, signal),
        // Sin catalogo se puede seguir prescribiendo con costo manual.
        fetchPharmacyProducts(signal).catch(() => [] as PharmacyProduct[]),
      ]);

      setPrescriptions(prescriptionsResponse);
      setVisits(visitsResponse);
      setProducts(productsResponse);
    } catch (loadError) {
      if (signal?.aborted) {
        return;
      }

      setError(getErrorMessage(loadError, "No se pudieron cargar las prescripciones."));
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

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((prescription) => {
      const normalized = search.trim().toLowerCase();
      return (
        !normalized ||
        [
          prescription.paciente_nombre,
          prescription.medico_nombre,
          prescription.medicamento,
          prescription.instrucciones,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalized)
      );
    });
  }, [prescriptions, search]);

  const stats = useMemo(() => {
    const totalValue = prescriptions.reduce(
      (sum, prescription) => sum + numericValue(prescription.costo),
      0
    );

    return {
      total: prescriptions.length,
      patients: new Set(prescriptions.map((prescription) => prescription.id_paciente)).size,
      visits: new Set(prescriptions.map((prescription) => prescription.id_visita)).size,
      totalValue,
    };
  }, [prescriptions]);

  async function handleCreate(form: PrescriptionFormState) {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await createPrescription({
        id_visita: Number(form.id_visita),
        medicamento: form.medicamento.trim(),
        dosis: form.dosis.trim(),
        frecuencia: form.frecuencia.trim(),
        duracion: form.duracion.trim(),
        instrucciones: form.instrucciones.trim() || null,
        costo: Number(form.costo),
        id_producto: form.id_producto ? Number(form.id_producto) : null,
        cantidad: form.id_producto ? Number(form.cantidad) : null,
      });

      setShowCreateModal(false);
      setSuccessMessage("La prescripcion se registro correctamente.");
      await loadData();
    } catch (createError) {
      setSubmitError(
        getErrorMessage(createError, "No se pudo registrar la prescripcion.")
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header
        title="Prescripciones"
        subtitle="Medicacion indicada por visita con costo y trazabilidad por paciente"
      />

      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Prescripciones</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pacientes medicados</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.patients}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Visitas con receta</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.visits}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Valor acumulado</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {formatCurrency(stats.totalValue)}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  No se pudieron sincronizar las prescripciones.
                </p>
                <p className="mt-1 text-sm text-amber-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-emerald-800">Operacion completada</p>
                <p className="mt-1 text-sm text-emerald-700">{successMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-700 transition-colors hover:text-emerald-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Bandeja de medicacion</h2>
              <p className="text-sm text-slate-500">
                Listado de farmacos indicados, frecuencia y costo por visita
              </p>
            </div>
            <Can module="prescriptions" action="create">
              <button
                type="button"
                onClick={() => {
                  setSubmitError(null);
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                <FilePlus2 className="h-4 w-4" />
                Nueva prescripcion
              </button>
            </Can>
          </div>

          <div className="mt-5 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por paciente, doctor o medicamento"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition-all focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-slate-200 bg-white text-slate-500 shadow-sm">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm">Cargando prescripciones...</p>
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <Pill className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm font-medium text-slate-700">
              No encontramos prescripciones con esos filtros.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredPrescriptions.map((prescription) => (
              <article
                key={prescription.id_prescripcion}
                className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        Visita #{prescription.id_visita}
                      </span>
                      {(() => {
                        const status = DISPENSATION_LABELS[getDispensationStatus(prescription)];
                        return (
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                            {status.label}
                            {prescription.cantidad
                              ? ` · ${prescription.cantidad_dispensada}/${prescription.cantidad}`
                              : ""}
                          </span>
                        );
                      })()}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">
                      {prescription.medicamento}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {prescription.paciente_nombre || "Paciente"} - {prescription.medico_nombre || "Doctor"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Costo
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {formatCurrency(prescription.costo)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Dosis
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{prescription.dosis}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Frecuencia
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{prescription.frecuencia}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      Duracion
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{prescription.duracion}</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Instrucciones
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {prescription.instrucciones || "Sin instrucciones adicionales."}
                  </p>
                </div>

                <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700">
                  <Syringe className="h-4 w-4" />
                  Registrada el {formatDateTime(prescription.created_at)}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <PrescriptionFormModal
          visits={visits}
          products={products}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
          errorMessage={submitError}
        />
      )}
    </div>
  );
}

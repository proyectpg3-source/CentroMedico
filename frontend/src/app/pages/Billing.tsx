import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/layout/Header";
import { Can } from "../auth/usePermissions";
import {
  createPayment,
  fetchCharges,
  fetchPayments,
  type ChargeRecord,
  type ChargeStatus,
  type PaymentRecord,
} from "../api/billing";
import {
  AlertCircle,
  Banknote,
  CreditCard,
  Loader2,
  ReceiptText,
  Search,
  Wallet,
  X,
} from "lucide-react";
import {
  formatCurrency,
  formatDateTime,
  getErrorMessage,
  numericValue,
} from "../lib/format";

interface PaymentFormState {
  monto: string;
  metodo: string;
  referencia: string;
  observaciones: string;
}

const chargeStatuses: ChargeStatus[] = ["pendiente", "parcial", "pagado"];

function buildPaymentFormState(charge: ChargeRecord): PaymentFormState {
  return {
    monto: String(numericValue(charge.saldo)),
    metodo: "Efectivo",
    referencia: "",
    observaciones: "",
  };
}

function PaymentModal({
  charge,
  onClose,
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  charge: ChargeRecord;
  onClose: () => void;
  onSubmit: (form: PaymentFormState) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}) {
  const [form, setForm] = useState<PaymentFormState>(() => buildPaymentFormState(charge));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
              Caja clinica
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              Registrar pago
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {charge.paciente_nombre || "Paciente"} - {charge.descripcion || charge.origen}
            </p>
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

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Total: <strong className="text-slate-900">{formatCurrency(charge.total)}</strong>
            {" · "}
            Saldo actual: <strong className="text-slate-900">{formatCurrency(charge.saldo)}</strong>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Monto *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.monto}
              onChange={(event) =>
                setForm((current) => ({ ...current, monto: event.target.value }))
              }
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Metodo *</label>
              <select
                required
                value={form.metodo}
                onChange={(event) =>
                  setForm((current) => ({ ...current, metodo: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Referencia</label>
              <input
                value={form.referencia}
                onChange={(event) =>
                  setForm((current) => ({ ...current, referencia: event.target.value }))
                }
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Observaciones</label>
            <textarea
              rows={3}
              value={form.observaciones}
              onChange={(event) =>
                setForm((current) => ({ ...current, observaciones: event.target.value }))
              }
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
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
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar pago
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Billing() {
  const [charges, setCharges] = useState<ChargeRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterOrigin, setFilterOrigin] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedCharge, setSelectedCharge] = useState<ChargeRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadData(signal?: AbortSignal) {
    try {
      setLoading(true);
      setError(null);

      const [chargesResponse, paymentsResponse] = await Promise.all([
        fetchCharges(undefined, signal),
        fetchPayments(undefined, signal),
      ]);

      setCharges(chargesResponse);
      setPayments(paymentsResponse);
    } catch (loadError) {
      if (signal?.aborted) {
        return;
      }

      setError(getErrorMessage(loadError, "No se pudo cargar el modulo de cuentas."));
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

  const filteredCharges = useMemo(() => {
    return charges.filter((charge) => {
      const normalized = search.trim().toLowerCase();
      const matchesSearch =
        !normalized ||
        [charge.paciente_nombre, charge.descripcion, charge.origen]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      const matchesStatus =
        filterStatus === "all" || charge.estado_pago === filterStatus;
      const matchesOrigin =
        filterOrigin === "all" || charge.origen === filterOrigin;
      return matchesSearch && matchesStatus && matchesOrigin;
    });
  }, [charges, filterOrigin, filterStatus, search]);

  const stats = useMemo(() => {
    const total = charges.reduce((sum, charge) => sum + numericValue(charge.total), 0);
    const collected = payments.reduce((sum, payment) => sum + numericValue(payment.monto), 0);
    const pending = charges.reduce((sum, charge) => sum + numericValue(charge.saldo), 0);

    return {
      total,
      collected,
      pending,
      charges: charges.length,
      payments: payments.length,
    };
  }, [charges, payments]);

  async function handleCreatePayment(form: PaymentFormState) {
    if (!selectedCharge) {
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await createPayment({
        id_cargo: selectedCharge.id_cargo,
        id_paciente: selectedCharge.id_paciente,
        monto: Number(form.monto),
        metodo: form.metodo.trim(),
        referencia: form.referencia.trim() || null,
        observaciones: form.observaciones.trim() || null,
      });

      setSelectedCharge(null);
      setSuccessMessage("El pago se registro correctamente.");
      await loadData();
    } catch (paymentError) {
      setSubmitError(getErrorMessage(paymentError, "No se pudo registrar el pago."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <Header
        title="Cuentas y pagos"
        subtitle="Cobro simple por paciente y servicio, con saldos y pagos parciales"
      />

      <div className="flex-1 space-y-6 p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Facturado</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(stats.total)}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Cobrado</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(stats.collected)}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pendiente</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(stats.pending)}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Cargos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.charges}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pagos</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.payments}</p>
          </div>
        </div>

        {error && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  No se pudo sincronizar el modulo de cuentas.
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
              <h2 className="text-lg font-semibold text-slate-900">Bandeja de cargos</h2>
              <p className="text-sm text-slate-500">
                Consultas, laboratorio y farmacia con saldos vivos por paciente
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 xl:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por paciente, descripcion u origen"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="all">Todos los estados</option>
              {chargeStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={filterOrigin}
              onChange={(event) => setFilterOrigin(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition-all focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="all">Todos los origenes</option>
              <option value="consulta">Consulta</option>
              <option value="laboratorio">Laboratorio</option>
              <option value="farmacia">Farmacia</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[32px] border border-slate-200 bg-white text-slate-500 shadow-sm">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm">Cargando cargos y pagos...</p>
          </div>
        ) : filteredCharges.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <ReceiptText className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-4 text-sm font-medium text-slate-700">
              No encontramos cargos con esos filtros.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              {filteredCharges.map((charge) => (
                <article
                  key={charge.id_cargo}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {charge.origen}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {charge.estado_pago}
                        </span>
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-slate-900">
                        {charge.paciente_nombre || "Paciente"}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {charge.descripcion || "Cargo sin descripcion"} - DNI {charge.paciente_dni || "N/D"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Saldo
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {formatCurrency(charge.saldo)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Total
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{formatCurrency(charge.total)}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Pagado
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {formatCurrency(charge.total_pagado)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Creado
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {formatDateTime(charge.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Can module="billing" action="create">
                      <button
                        type="button"
                        onClick={() => {
                          setSubmitError(null);
                          setSelectedCharge(charge);
                        }}
                        disabled={numericValue(charge.saldo) <= 0}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CreditCard className="h-4 w-4" />
                        Registrar pago
                      </button>
                    </Can>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700">
                      <Wallet className="h-4 w-4" />
                      Referencia {charge.referencia_tipo} #{charge.referencia_id}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Pagos recientes</h3>
              <div className="mt-4 space-y-3">
                {payments.length > 0 ? (
                  payments.slice(0, 10).map((payment) => (
                    <div key={payment.id_pago} className="rounded-2xl bg-slate-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {payment.paciente_nombre || "Paciente"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {payment.metodo} - {payment.cargo_origen}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            {formatDateTime(payment.fecha_pago)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">
                            {formatCurrency(payment.monto)}
                          </p>
                          {payment.referencia && (
                            <p className="mt-1 text-xs text-slate-500">{payment.referencia}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Aun no hay pagos registrados.
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Banknote className="mt-0.5 h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium text-emerald-900">Cobro simple</p>
                      <p className="text-xs text-emerald-700">
                        El modulo trabaja solo por paciente y servicio, sin convenios ni terceros.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-blue-50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <ReceiptText className="mt-0.5 h-4 w-4 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Estados soportados</p>
                      <p className="text-xs text-blue-700">
                        Pendiente, parcial y pagado con control automatico del saldo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedCharge && (
        <PaymentModal
          charge={selectedCharge}
          onClose={() => setSelectedCharge(null)}
          onSubmit={handleCreatePayment}
          isSubmitting={isSubmitting}
          errorMessage={submitError}
        />
      )}
    </div>
  );
}

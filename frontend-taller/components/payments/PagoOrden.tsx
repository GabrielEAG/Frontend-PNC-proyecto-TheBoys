'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { facturaApi, stripeApi } from '@/lib/api';
import { Factura } from '@/types';
import type { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Receipt,
  Banknote,
  Building2,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

type MetodoUI = 'STRIPE' | 'EFECTIVO' | 'TARJETA';
type ApiError = { response?: { data?: { message?: string } } };

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as ApiError).response?.data?.message || fallback;

interface PagoOrdenProps {
  ordenId: number;
}

const metodosPago: {
  id: MetodoUI;
  titulo: string;
  descripcion: string;
  icono: typeof CreditCard;
}[] = [
  {
    id: 'STRIPE',
    titulo: 'Pagar en línea',
    descripcion: 'Tarjeta de crédito o débito mediante Stripe.',
    icono: CreditCard,
  },
  {
    id: 'EFECTIVO',
    titulo: 'Pago en efectivo',
    descripcion: 'Registrar pago recibido directamente en el taller.',
    icono: Banknote,
  },
  {
    id: 'TARJETA',
    titulo: 'Tarjeta en taller',
    descripcion: 'Registrar pago realizado físicamente con POS.',
    icono: Building2,
  },
];

export default function PagoOrden({ ordenId }: PagoOrdenProps) {
  const [factura, setFactura] = useState<Factura | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [exito, setExito] = useState(false);
  const [metodo, setMetodo] = useState<MetodoUI>('STRIPE');

  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [cardError, setCardError] = useState('');
  const [cardListo, setCardListo] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const cardElementRef = useRef<StripeCardElement | null>(null);

  const fetchFactura = useCallback(async () => {
    if (!ordenId || Number.isNaN(ordenId)) {
      setError('No se pudo identificar la orden solicitada.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await facturaApi.getByOrden(ordenId);
      setFactura(res.data);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'No encontramos una factura pendiente para esta orden. Si el trabajo ya fue finalizado recientemente, intenta actualizar la página.'
        )
      );
    } finally {
      setLoading(false);
    }
  }, [ordenId]);

  useEffect(() => {
    void fetchFactura();
  }, [fetchFactura]);

  useEffect(() => {
    if (metodo !== 'STRIPE' || !factura || factura.estadoPago === 'PAGADO') return;

    let activo = true;
    let cardElement: StripeCardElement | null = null;

    setCardListo(false);
    setCardError('');
    setStripe(null);

    const montarStripe = async () => {
      try {
        const { data } = await stripeApi.getConfig();

        if (!data.publishableKey) {
          setCardError(
            'El pago en línea no está disponible en este momento porque Stripe no tiene una clave pública configurada.'
          );
          return;
        }

        const stripeInstance = await loadStripe(data.publishableKey);

        if (!activo || !stripeInstance) return;

        const elementsInstance: StripeElements = stripeInstance.elements();

        cardElement = elementsInstance.create('card', {
          style: {
            base: {
              fontSize: '16px',
              color: '#1f2937',
              '::placeholder': {
                color: '#9ca3af',
              },
            },
          },
        });

        if (cardRef.current) {
          cardElement.mount(cardRef.current);
        }

        cardElement.on('change', (event) => {
          setCardError(event.error ? event.error.message : '');
        });

        cardElement.on('ready', () => {
          setCardListo(true);
        });

        setStripe(stripeInstance);
        cardElementRef.current = cardElement;
      } catch {
        setCardError(
          'No se pudo cargar el formulario de tarjeta. Verifica la configuración de pagos o intenta con otro método.'
        );
      }
    };

    void montarStripe();

    return () => {
      activo = false;
      cardElement?.unmount();
      cardElementRef.current = null;
    };
  }, [metodo, factura]);

  const handlePagarStripe = async () => {
    if (!stripe || !cardElementRef.current || !factura) return;

    setProcesando(true);
    setError('');

    try {
      const { token, error: tokenError } = await stripe.createToken(cardElementRef.current);

      if (tokenError || !token) {
        setError(tokenError?.message || 'No se pudo validar la tarjeta ingresada.');
        return;
      }

      await stripeApi.pagar({
        facturaId: factura.id,
        token: token.id,
      });

      setExito(true);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'El pago fue rechazado o no pudo completarse. Verifica los datos e intenta nuevamente.'
        )
      );
    } finally {
      setProcesando(false);
    }
  };

  const handlePagarManual = async () => {
    if (!factura) return;

    setProcesando(true);
    setError('');

    try {
      await facturaApi.pagar({
        ordenId: factura.ordenId,
        metodoPago: metodo as 'EFECTIVO' | 'TARJETA',
      });

      setExito(true);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'No se pudo registrar el pago. Verifica la información de la factura e intenta nuevamente.'
        )
      );
    } finally {
      setProcesando(false);
    }
  };

  const handlePagar = () => {
    if (metodo === 'STRIPE') {
      void handlePagarStripe();
      return;
    }

    void handlePagarManual();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700" />
      </div>
    );
  }

  if (error && !factura) {
    return (
      <div className="mx-auto max-w-lg rounded-xl bg-white p-8 text-center shadow-md">
        <AlertCircle className="mx-auto mb-4 h-14 w-14 text-red-500" />

        <h2 className="mb-2 text-xl font-bold text-gray-900">
          No pudimos cargar la factura
        </h2>

        <p className="mb-6 text-sm text-gray-600">{error}</p>

        <Link
          href="/dashboard/mis-ordenes"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
        >
          <ArrowLeft size={16} />
          Volver a Mis Órdenes
        </Link>
      </div>
    );
  }

  if (exito || factura?.estadoPago === 'PAGADO') {
    return (
      <div className="mx-auto max-w-lg rounded-xl bg-white p-8 text-center shadow-md">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-600" />

        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Pago registrado correctamente
        </h2>

        <p className="mb-2 text-gray-600">
          La factura #{factura?.id} de la orden #{factura?.ordenId} fue marcada como pagada.
        </p>

        <p className="mb-6 text-sm text-gray-500">
          Puedes consultar el comprobante y el historial desde la sección de facturas.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard/facturas"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            <Receipt size={16} />
            Ver mis facturas
          </Link>

          <Link
            href="/dashboard/mis-ordenes"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Volver a Mis Órdenes
          </Link>
        </div>
      </div>
    );
  }

  const total = Number(factura?.total || 0);
  const subtotal = Number(factura?.subtotal || 0);
  const impuestos = Number(factura?.impuestos || 0);

  const metodoActual = metodosPago.find((item) => item.id === metodo);
  const MetodoIcon = metodoActual?.icono || CreditCard;

  const stripeNoDisponible = metodo === 'STRIPE' && Boolean(cardError) && !cardListo;
  const pagoDeshabilitado = procesando || (metodo === 'STRIPE' && (!cardListo || !stripe));

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/mis-ordenes"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        Volver a Mis Órdenes
      </Link>

      <div className="overflow-hidden rounded-xl bg-white shadow-md">
        <div className="border-b bg-gray-50 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Confirmar pago de factura
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Orden #{factura?.ordenId} · Vehículo {factura?.vehiculoPatente}
              </p>
            </div>

            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
              Pendiente de pago
            </span>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-700" />

              <div>
                <p className="font-semibold text-blue-900">
                  Revisa el detalle antes de pagar
                </p>

                <p className="mt-1 text-sm text-blue-800">
                  El total mostrado abajo es el monto final de la factura e incluye los impuestos correspondientes.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Receipt size={18} className="text-gray-500" />
              <h2 className="font-semibold text-gray-900">Resumen de la factura</h2>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal por servicios y repuestos</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Impuestos</span>
                <span>${impuestos.toFixed(2)}</span>
              </div>

              <div className="mt-3 flex justify-between border-t pt-3 text-xl font-bold text-gray-900">
                <span>Total a pagar</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-semibold text-gray-900">
              Selecciona un método de pago
            </h2>

            <div className="grid gap-3 sm:grid-cols-3">
              {metodosPago.map((item) => {
                const Icon = item.icono;
                const activo = metodo === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMetodo(item.id);
                      setError('');
                    }}
                    className={`rounded-xl border p-4 text-left transition ${
                      activo
                        ? 'border-blue-700 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
                    }`}
                  >
                    <Icon
                      size={22}
                      className={activo ? 'text-blue-700' : 'text-gray-500'}
                    />

                    <p
                      className={`mt-2 text-sm font-semibold ${
                        activo ? 'text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      {item.titulo}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {item.descripcion}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {metodo === 'STRIPE' && (
            <div className="rounded-xl border border-gray-200 p-4">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Datos de la tarjeta
              </label>

              <div
                ref={cardRef}
                className="rounded-lg border border-gray-300 bg-white p-3"
              />

              {cardError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {cardError}
                </div>
              )}

              <p className="mt-3 text-xs text-gray-500">
                Modo de prueba: usa la tarjeta 4242 4242 4242 4242, una fecha futura y cualquier CVC de 3 dígitos.
              </p>
            </div>
          )}

          {metodo !== 'STRIPE' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <DollarSign size={18} className="mt-0.5" />

                <div>
                  <p className="font-semibold">Registro de pago presencial</p>
                  <p className="mt-1">
                    Este método marcará la factura como pagada por un pago recibido directamente en el taller.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handlePagar}
            disabled={pagoDeshabilitado}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {procesando ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Procesando pago...
              </>
            ) : (
              <>
                <MetodoIcon size={18} />
                Confirmar pago por ${total.toFixed(2)}
              </>
            )}
          </button>

          {stripeNoDisponible && (
            <p className="text-center text-xs text-gray-500">
              Si el pago en línea no está disponible, selecciona un método presencial para registrar el pago en taller.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

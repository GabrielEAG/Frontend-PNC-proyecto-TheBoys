'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { facturaApi, stripeApi } from '@/lib/api';
import { Factura } from '@/types';
import type { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Receipt,
  Banknote,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';

type MetodoUI = 'STRIPE' | 'EFECTIVO';

type ApiError = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

type AppDialog = {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
} | null;

interface PagoOrdenProps {
  ordenId: number;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as ApiError).response?.data?.message || fallback;

const getPublishableKeyFromResponse = (data: any): string => {
  return String(
    data?.publishableKey ||
      data?.publicKey ||
      data?.key ||
      data?.stripePublishableKey ||
      ''
  ).trim();
};

const metodosPago: {
  id: MetodoUI;
  titulo: string;
  descripcion: string;
  icono: typeof CreditCard;
}[] = [
  {
    id: 'STRIPE',
    titulo: 'Pagar en línea',
    descripcion: 'Paga ahora con tarjeta mediante Stripe.',
    icono: CreditCard,
  },
  {
    id: 'EFECTIVO',
    titulo: 'Pago en efectivo',
    descripcion: 'Solicita validación del mecánico al pagar en taller.',
    icono: Banknote,
  },
];

export default function PagoOrden({ ordenId }: PagoOrdenProps) {
  const router = useRouter();

  const [factura, setFactura] = useState<Factura | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [metodo, setMetodo] = useState<MetodoUI>('STRIPE');
  const [dialog, setDialog] = useState<AppDialog>(null);

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
          'No encontramos una factura pendiente para esta orden. Si el trabajo fue finalizado recientemente, intenta actualizar la página.'
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
    if (metodo !== 'STRIPE') return;
    if (!factura) return;
    if (factura.estadoPago === 'PAGADO') return;
    if (
      factura.estadoPago === 'PENDIENTE' &&
      factura.metodoPago === 'EFECTIVO'
    ) {
      return;
    }

    let activo = true;
    let cardElement: StripeCardElement | null = null;

    setCardListo(false);
    setCardError('');
    setStripe(null);
    cardElementRef.current = null;

    const montarStripe = async () => {
      try {
        const { data } = await stripeApi.getConfig();
        const publishableKey = getPublishableKeyFromResponse(data);

        if (!publishableKey) {
          setCardError(
            'El pago en línea no está disponible porque no se recibió la clave pública de Stripe. Verifica que el backend devuelva "publishableKey".'
          );
          return;
        }

        if (!publishableKey.startsWith('pk_')) {
          setCardError(
            'La clave pública de Stripe no es válida. Debe iniciar con "pk_". Revisa que no estén invertidas las claves pública y secreta.'
          );
          return;
        }

        const stripeInstance = await loadStripe(publishableKey);

        if (!activo) return;

        if (!stripeInstance) {
          setCardError('No se pudo inicializar Stripe con la clave pública configurada.');
          return;
        }

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
          'No se pudo cargar el formulario de tarjeta. Intenta nuevamente o selecciona pago en efectivo.'
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
    if (!stripe || !cardElementRef.current || !factura) {
      setCardError('El formulario de tarjeta aún no está listo.');
      return;
    }

    setProcesando(true);
    setError('');
    setCardError('');

    try {
      const { token, error: tokenError } = await stripe.createToken(
        cardElementRef.current
      );

      if (tokenError || !token) {
        setCardError(tokenError?.message || 'No se pudo validar la tarjeta ingresada.');
        return;
      }

      await stripeApi.pagar({
        facturaId: factura.id,
        token: token.id,
      });

      setDialog({
        type: 'success',
        title: 'Pago realizado correctamente',
        message:
          'Tu pago en línea fue procesado correctamente. La factura ya aparece como pagada.',
      });
    } catch (err) {
      setDialog({
        type: 'error',
        title: 'No se pudo procesar el pago',
        message: getErrorMessage(
          err,
          'El pago fue rechazado o no pudo completarse. Verifica los datos e intenta nuevamente.'
        ),
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleSolicitarPagoEfectivo = async () => {
    if (!factura) return;

    setProcesando(true);
    setError('');
    setCardError('');

    try {
      await facturaApi.solicitarPagoEfectivo(factura.id);
      await fetchFactura();

      setDialog({
        type: 'success',
        title: 'Solicitud enviada al mecánico',
        message:
          'Se notificó al mecánico que deseas pagar esta factura en efectivo. La factura quedará pendiente hasta que el mecánico valide el pago en el taller.',
      });
    } catch (err) {
      setDialog({
        type: 'error',
        title: 'No se pudo solicitar pago en efectivo',
        message: getErrorMessage(
          err,
          'No se pudo enviar la solicitud de pago en efectivo. Intenta nuevamente.'
        ),
      });
    } finally {
      setProcesando(false);
    }
  };

  const handlePagar = () => {
    if (metodo === 'STRIPE') {
      void handlePagarStripe();
      return;
    }

    void handleSolicitarPagoEfectivo();
  };

  const handleCerrarDialog = () => {
    const fueExitoso = dialog?.type === 'success';

    setDialog(null);

    if (fueExitoso) {
      router.replace('/dashboard/facturas');
    }
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
          className="inline-flex items-center justify-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          <ArrowLeft size={16} />
          Volver a Mis Órdenes
        </Link>
      </div>
    );
  }

  const total = Number(factura?.total || 0);
  const subtotal = Number(factura?.subtotal || 0);
  const impuestos = Number(factura?.impuestos || 0);

  const facturaPagada = factura?.estadoPago === 'PAGADO';

  const facturaPendienteConfirmacion =
    factura?.estadoPago === 'PENDIENTE' &&
    factura?.metodoPago === 'EFECTIVO';

  const metodoActual = metodosPago.find((item) => item.id === metodo);
  const MetodoIcon = metodoActual?.icono || CreditCard;

  const pagoDeshabilitado =
    procesando ||
    facturaPagada ||
    facturaPendienteConfirmacion ||
    (metodo === 'STRIPE' && (!cardListo || !stripe));

  if (facturaPagada) {
    return (
      <div className="mx-auto max-w-lg rounded-xl bg-white p-8 text-center shadow-md">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-600" />

        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Pago registrado correctamente
        </h2>

        <p className="mb-6 text-gray-600">
          La factura #{factura?.id} ya aparece como pagada.
        </p>

        <Link
          href="/dashboard/facturas"
          className="inline-flex items-center justify-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          <Receipt size={16} />
          Ver mis facturas
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/mis-ordenes"
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
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

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                facturaPendienteConfirmacion
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {facturaPendienteConfirmacion
                ? 'Pendiente de validación'
                : 'Pendiente de pago'}
            </span>
          </div>
        </div>

        <div className="space-y-6 p-6">
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

          {facturaPendienteConfirmacion ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
              <div className="flex items-start gap-2">
                <Banknote size={18} className="mt-0.5 shrink-0" />

                <div>
                  <p className="font-semibold">
                    Su pago en efectivo está en proceso de validación por el mecánico
                  </p>

                  <p className="mt-1 text-sm">
                    La factura se marcará como pagada cuando el mecánico confirme que
                    recibió el efectivo en el taller.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="mb-3 font-semibold text-gray-900">
                  Selecciona un método de pago
                </h2>

                <div className="grid gap-3 sm:grid-cols-2">
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
                          setCardError('');
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
                    className="min-h-[44px] rounded-lg border border-gray-300 bg-white p-3"
                  />

                  {cardError && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {cardError}
                    </div>
                  )}

                  <p className="mt-3 text-xs text-gray-500">
                    Modo de prueba: usa la tarjeta 4242 4242 4242 4242, una fecha futura
                    y cualquier CVC de 3 dígitos.
                  </p>
                </div>
              )}

              {metodo === 'EFECTIVO' && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <div className="flex items-start gap-2">
                    <Banknote size={18} className="mt-0.5 shrink-0" />

                    <div>
                      <p className="font-semibold">Solicitud de pago en efectivo</p>

                      <p className="mt-1">
                        Esta opción no marca la factura como pagada inmediatamente.
                        Se enviará una notificación al mecánico para que valide el pago
                        cuando reciba el dinero en el taller.
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
                    Procesando...
                  </>
                ) : metodo === 'EFECTIVO' ? (
                  <>
                    <Banknote size={18} />
                    Solicitar validación de pago en efectivo
                  </>
                ) : (
                  <>
                    <MetodoIcon size={18} />
                    Pagar en línea ${total.toFixed(2)}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(dialog)}
        onClose={handleCerrarDialog}
        title={dialog?.title || 'Mensaje'}
        size="md"
      >
        {dialog && (
          <div className="space-y-4">
            <div
              className={`rounded-lg border p-4 ${
                dialog.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : dialog.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              <div className="flex items-start gap-2">
                {dialog.type === 'success' ? (
                  <CheckCircle size={20} className="mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle size={20} className="mt-0.5 shrink-0" />
                )}

                <p>{dialog.message}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCerrarDialog}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

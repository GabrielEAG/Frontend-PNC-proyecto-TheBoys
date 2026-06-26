'use client';

import { useEffect, useRef, useState } from 'react';
import { facturaApi, stripeApi } from '@/lib/api';
import { Factura } from '@/types';
import type { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import {
  CreditCard,
  Banknote,
  CheckCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Receipt,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';

type MetodoPagoUI = 'STRIPE' | 'EFECTIVO';

type PagoFormProps = {
  factura: Factura;
  onPagoCompletado?: () => void;
};

type AppDialog = {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
} | null;

const getErrorMessage = (err: any, fallback: string) => {
  return err?.response?.data?.message || fallback;
};

export default function PagoForm({ factura, onPagoCompletado }: PagoFormProps) {
  const [metodo, setMetodo] = useState<MetodoPagoUI>('STRIPE');
  const [procesando, setProcesando] = useState(false);
  const [cardError, setCardError] = useState('');
  const [cardListo, setCardListo] = useState(false);
  const [dialog, setDialog] = useState<AppDialog>(null);

  const [stripe, setStripe] = useState<Stripe | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const cardElementRef = useRef<StripeCardElement | null>(null);

  const total = Number(factura.total || 0);
  const subtotal = Number(factura.subtotal || 0);
  const impuestos = Number(factura.impuestos || 0);

  useEffect(() => {
    if (metodo !== 'STRIPE') return;
    if (factura.estadoPago === 'PAGADO') return;

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

        if (!data.publishableKey.startsWith('pk_')) {
          setCardError(
            'La clave pública de Stripe no es válida. Debe iniciar con "pk_". Revisa la configuración del backend.'
          );
          return;
        }

        const stripeInstance = await loadStripe(data.publishableKey);

        if (!activo) return;

        if (!stripeInstance) {
          setCardError(
            'No se pudo inicializar Stripe. Verifica que la clave pública sea válida.'
          );
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
  }, [metodo, factura.estadoPago]);

  const handlePagarStripe = async () => {
    if (!stripe || !cardElementRef.current) {
      setCardError('El formulario de tarjeta aún no está listo.');
      return;
    }

    setProcesando(true);
    setCardError('');

    try {
      const { token, error } = await stripe.createToken(cardElementRef.current);

      if (error || !token) {
        setCardError(error?.message || 'No se pudo validar la tarjeta ingresada.');
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
          'Tu pago en línea fue procesado con éxito. La factura quedó marcada como pagada y podrás consultarla en tu historial de facturas.',
      });

      onPagoCompletado?.();
    } catch (err: any) {
      setDialog({
        type: 'error',
        title: 'No se pudo procesar el pago',
        message: getErrorMessage(
          err,
          'El pago fue rechazado o no pudo completarse. Revisa los datos de la tarjeta e intenta nuevamente.'
        ),
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleSolicitarPagoEfectivo = async () => {
    setProcesando(true);

    try {
      await facturaApi.solicitarPagoEfectivo(factura.id);

      setDialog({
        type: 'success',
        title: 'Solicitud de pago en efectivo enviada',
        message:
          'Se notificó al mecánico que deseas pagar esta factura en efectivo. La factura quedará pendiente hasta que el mecánico confirme que recibió el dinero en el taller.',
      });

      onPagoCompletado?.();
    } catch (err: any) {
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

  const handleSubmitPago = () => {
    if (metodo === 'STRIPE') {
      void handlePagarStripe();
      return;
    }

    void handleSolicitarPagoEfectivo();
  };

  const pagoDeshabilitado =
    procesando || (metodo === 'STRIPE' && (!stripe || !cardListo));

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-blue-800">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-blue-700" />

          <div>
            <p className="font-semibold text-blue-900">
              Selecciona cómo deseas pagar
            </p>
            <p className="mt-1 text-sm">
              Puedes pagar en línea con tarjeta mediante Stripe o solicitar pago en efectivo.
              Si eliges efectivo, el mecánico deberá confirmar la recepción del dinero para completar el pago.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <Receipt size={18} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900">Resumen de la factura</h3>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
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
        <h3 className="mb-3 font-semibold text-gray-900">
          Método de pago
        </h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setMetodo('STRIPE');
              setCardError('');
            }}
            className={`rounded-xl border p-4 text-left transition ${
              metodo === 'STRIPE'
                ? 'border-blue-700 bg-blue-50 ring-2 ring-blue-100'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
            }`}
          >
            <CreditCard
              size={24}
              className={metodo === 'STRIPE' ? 'text-blue-700' : 'text-gray-500'}
            />

            <p className="mt-2 font-semibold text-gray-900">
              Pago en línea
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Paga ahora con tarjeta mediante Stripe.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setMetodo('EFECTIVO');
              setCardError('');
            }}
            className={`rounded-xl border p-4 text-left transition ${
              metodo === 'EFECTIVO'
                ? 'border-blue-700 bg-blue-50 ring-2 ring-blue-100'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
            }`}
          >
            <Banknote
              size={24}
              className={metodo === 'EFECTIVO' ? 'text-blue-700' : 'text-gray-500'}
            />

            <p className="mt-2 font-semibold text-gray-900">
              Pago en efectivo
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Notifica al mecánico y paga en el taller.
            </p>
          </button>
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

      {metodo === 'EFECTIVO' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <Banknote size={18} className="mt-0.5 shrink-0" />

            <div>
              <p className="font-semibold">
                Pago pendiente de validación
              </p>
              <p className="mt-1">
                Al continuar, el mecánico recibirá una notificación para validar el pago.
                La factura no se marcará como pagada hasta que el mecánico confirme que recibió el efectivo.
              </p>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmitPago}
        disabled={pagoDeshabilitado}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {procesando ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Procesando...
          </>
        ) : metodo === 'STRIPE' ? (
          <>
            <CreditCard size={18} />
            Pagar en línea ${total.toFixed(2)}
          </>
        ) : (
          <>
            <Banknote size={18} />
            Solicitar pago en efectivo
          </>
        )}
      </button>

      <Modal
        isOpen={Boolean(dialog)}
        onClose={() => setDialog(null)}
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
                onClick={() => setDialog(null)}
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
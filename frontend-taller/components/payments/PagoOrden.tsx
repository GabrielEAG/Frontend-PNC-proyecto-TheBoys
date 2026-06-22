'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { facturaApi, stripeApi } from '@/lib/api';
import { Factura } from '@/types';
import type { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CreditCard, DollarSign, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type MetodoUI = 'STRIPE' | 'EFECTIVO' | 'TARJETA';
type ApiError = { response?: { data?: { message?: string } } };

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as ApiError).response?.data?.message || fallback;

interface PagoOrdenProps {
  ordenId: number;
}

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
      setError('Orden invalida');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await facturaApi.getByOrden(ordenId);
      setFactura(res.data);
    } catch (err) {
      setError(getErrorMessage(err, 'No se encontro la factura para esta orden'));
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

    const montarStripe = async () => {
      try {
        const { data } = await stripeApi.getConfig();
        if (!data.publishableKey) {
          setCardError('Stripe no tiene clave publica configurada.');
          return;
        }

        const stripeInstance = await loadStripe(data.publishableKey);
        if (!activo || !stripeInstance) return;

        const elementsInstance: StripeElements = stripeInstance.elements();
        cardElement = elementsInstance.create('card', {
          style: { base: { fontSize: '16px', color: '#1f2937' } },
        });
        if (cardRef.current) cardElement.mount(cardRef.current);
        cardElement.on('change', (event) => setCardError(event.error ? event.error.message : ''));
        cardElement.on('ready', () => setCardListo(true));

        setStripe(stripeInstance);
        cardElementRef.current = cardElement;
      } catch {
        setCardError('No se pudo cargar Stripe. Verifica la clave publica configurada en el backend.');
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
        setError(tokenError?.message || 'No se pudo procesar la tarjeta');
        return;
      }
      await stripeApi.pagar({ facturaId: factura.id, token: token.id });
      setExito(true);
    } catch (err) {
      setError(getErrorMessage(err, 'El pago fue rechazado por Stripe'));
    } finally {
      setProcesando(false);
    }
  };

  const handlePagarManual = async () => {
    if (!factura) return;
    setProcesando(true);
    setError('');
    try {
      await facturaApi.pagar({ ordenId: factura.ordenId, metodoPago: metodo as 'EFECTIVO' | 'TARJETA' });
      setExito(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Error al registrar el pago'));
    } finally {
      setProcesando(false);
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
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center shadow-md">
        <AlertCircle className="mx-auto mb-3 h-12 w-12 text-red-500" />
        <p className="text-gray-700">{error}</p>
        <Link href="/dashboard/mis-ordenes" className="mt-4 inline-block text-blue-700">
          Volver a Mis Ordenes
        </Link>
      </div>
    );
  }

  if (exito || factura?.estadoPago === 'PAGADO') {
    return (
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center shadow-md">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-600" />
        <h2 className="mb-2 text-xl font-bold">Pago realizado</h2>
        <p className="mb-6 text-gray-600">Tu factura #{factura?.id} ha sido pagada correctamente.</p>
        <Link href="/dashboard/facturas" className="inline-block rounded-lg bg-blue-700 px-4 py-2 text-white">
          Ver mis facturas
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/dashboard/mis-ordenes" className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Volver a Mis Ordenes
      </Link>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <h1 className="mb-1 text-xl font-bold">Pagar factura</h1>
        <p className="mb-6 text-sm text-gray-500">
          Orden #{factura?.ordenId} - Vehiculo {factura?.vehiculoPatente}
        </p>

        <div className="mb-6 space-y-1 rounded-lg bg-gray-50 p-4">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${factura?.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Impuestos</span>
            <span>${factura?.impuestos.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t pt-2 text-lg font-bold">
            <span>Total</span>
            <span>${factura?.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="mb-6 flex gap-2">
          {(['STRIPE', 'EFECTIVO', 'TARJETA'] as MetodoUI[]).map((item) => (
            <button
              key={item}
              onClick={() => setMetodo(item)}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition ${
                metodo === item
                  ? 'border-blue-700 bg-blue-700 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {item === 'STRIPE' ? 'Tarjeta (Stripe)' : item === 'EFECTIVO' ? 'Efectivo' : 'Tarjeta en taller'}
            </button>
          ))}
        </div>

        {metodo === 'STRIPE' && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">Datos de la tarjeta</label>
            <div ref={cardRef} className="rounded-lg border border-gray-300 bg-white p-3" />
            {cardError && <p className="mt-2 text-sm text-red-600">{cardError}</p>}
            <p className="mt-2 text-xs text-gray-400">
              Modo de prueba: tarjeta 4242 4242 4242 4242, cualquier fecha futura y CVC de 3 digitos.
            </p>
          </div>
        )}

        {metodo !== 'STRIPE' && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            <DollarSign size={16} />
            Este pago se registrara como recibido directamente en el taller.
          </div>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          onClick={metodo === 'STRIPE' ? handlePagarStripe : handlePagarManual}
          disabled={procesando || (metodo === 'STRIPE' && !cardListo)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CreditCard size={18} />
          {procesando ? 'Procesando...' : `Pagar $${factura?.total.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}

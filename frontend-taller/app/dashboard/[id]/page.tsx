'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { facturaApi, stripeApi } from '@/lib/api';
import { Factura } from '@/types';
import type { Stripe, StripeCardElement, StripeElements } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { CreditCard, DollarSign, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type MetodoUI = 'STRIPE' | 'EFECTIVO' | 'TARJETA';

export default function PagoPage() {
  const params = useParams();
  const ordenId = Number(params.id);

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

  useEffect(() => {
    fetchFactura();
  }, [ordenId]);

  const fetchFactura = async () => {
    try {
      setLoading(true);
      const res = await facturaApi.getByOrden(ordenId);
      setFactura(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No se encontró la factura para esta orden');
    } finally {
      setLoading(false);
    }
  };

  // Inicializa Stripe.js + monta el Card Element solo cuando se elige pagar con Stripe
  useEffect(() => {
    if (metodo !== 'STRIPE' || !factura || factura.estadoPago === 'PAGADO') return;
    let activo = true;
    let cardElement: StripeCardElement | null = null;

    (async () => {
      try {
        const { data } = await stripeApi.getConfig();
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
        setCardError('No se pudo cargar Stripe. Verifica la clave pública configurada en el backend.');
      }
    })();

    return () => {
      activo = false;
      cardElement?.unmount();
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'El pago fue rechazado por Stripe');
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar el pago');
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700" />
      </div>
    );
  }

  if (error && !factura) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <p className="text-gray-700">{error}</p>
        <Link href="/dashboard/mis-ordenes" className="mt-4 inline-block text-blue-700">
          Volver a Mis Órdenes
        </Link>
      </div>
    );
  }

  if (exito || factura?.estadoPago === 'PAGADO') {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">¡Pago realizado!</h2>
        <p className="text-gray-600 mb-6">Tu factura #{factura?.id} ha sido pagada correctamente.</p>
        <Link href="/dashboard/facturas" className="bg-blue-700 text-white px-4 py-2 rounded-lg inline-block">
          Ver mis facturas
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Link href="/dashboard/mis-ordenes" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4 text-sm">
        <ArrowLeft size={16} /> Volver a Mis Órdenes
      </Link>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-xl font-bold mb-1">Pagar factura</h1>
        <p className="text-gray-500 text-sm mb-6">
          Orden #{factura?.ordenId} — Vehículo {factura?.vehiculoPatente}
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-1">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span><span>${factura?.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Impuestos</span><span>${factura?.impuestos.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t mt-1">
            <span>Total</span><span>${factura?.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(['STRIPE', 'EFECTIVO', 'TARJETA'] as MetodoUI[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetodo(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                metodo === m ? 'bg-blue-700 text-white border-blue-700' : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              {m === 'STRIPE' ? 'Tarjeta (Stripe)' : m === 'EFECTIVO' ? 'Efectivo' : 'Tarjeta en taller'}
            </button>
          ))}
        </div>

        {metodo === 'STRIPE' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Datos de la tarjeta</label>
            <div ref={cardRef} className="border border-gray-300 rounded-lg p-3 bg-white" />
            {cardError && <p className="text-red-600 text-sm mt-2">{cardError}</p>}
            <p className="text-xs text-gray-400 mt-2">
              Modo de prueba: tarjeta 4242 4242 4242 4242, cualquier fecha futura y CVC de 3 dígitos.
            </p>
          </div>
        )}

        {metodo !== 'STRIPE' && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 flex items-center gap-2">
            <DollarSign size={16} />
            Este pago se registrará como recibido directamente en el taller.
          </div>
        )}

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          onClick={metodo === 'STRIPE' ? handlePagarStripe : handlePagarManual}
          disabled={procesando || (metodo === 'STRIPE' && !cardListo)}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition"
        >
          <CreditCard size={18} />
          {procesando ? 'Procesando...' : `Pagar $${factura?.total.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
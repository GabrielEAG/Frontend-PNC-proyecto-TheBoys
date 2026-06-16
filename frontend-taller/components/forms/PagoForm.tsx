// components/forms/PagoForm.tsx
'use client';

import { useState } from 'react';
import { CreditCard, DollarSign, X } from 'lucide-react';

interface PagoFormProps {
  montoTotal: number;
  ordenId: number;
  onPagoEfectivo: (ordenId: number) => Promise<void>;
  onPagoStripe: (ordenId: number) => Promise<void>;
  onClose: () => void;
}

export default function PagoForm({
  montoTotal,
  ordenId,
  onPagoEfectivo,
  onPagoStripe,
  onClose,
}: PagoFormProps) {
  const [loading, setLoading] = useState(false);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'stripe'>('efectivo');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (metodoPago === 'efectivo') {
        await onPagoEfectivo(ordenId);
      } else {
        await onPagoStripe(ordenId);
      }
      onClose();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Realizar Pago</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
      </div>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">Total a pagar</p>
        <p className="text-3xl font-bold text-blue-700">${montoTotal.toFixed(2)}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-3">
            Selecciona método de pago
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                value="efectivo"
                checked={metodoPago === 'efectivo'}
                onChange={(e) => setMetodoPago(e.target.value as 'efectivo')}
                className="w-4 h-4 text-blue-700"
              />
              <DollarSign className="text-green-600" size={24} />
              <div>
                <p className="font-medium">Pago en Efectivo</p>
                <p className="text-sm text-gray-500">Paga directamente en el taller</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                value="stripe"
                checked={metodoPago === 'stripe'}
                onChange={(e) => setMetodoPago(e.target.value as 'stripe')}
                className="w-4 h-4 text-blue-700"
              />
              <CreditCard className="text-blue-600" size={24} />
              <div>
                <p className="font-medium">Pago en Línea con Stripe</p>
                <p className="text-sm text-gray-500">Paga con tarjeta de crédito/débito</p>
              </div>
            </label>
          </div>
        </div>

        {metodoPago === 'stripe' && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💳 Serás redirigido a la pasarela de pago segura de Stripe
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <CreditCard size={18} />
          {loading ? 'Procesando...' : `Pagar $${montoTotal.toFixed(2)}`}
        </button>
      </form>
    </div>
  );
}
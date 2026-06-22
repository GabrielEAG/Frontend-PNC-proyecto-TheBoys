'use client';

import { useCallback, useEffect, useState } from 'react';
import { useClienteId } from '@/hooks/useClienteId';
import { facturaApi } from '@/lib/api';
import { Factura } from '@/types';
import { FileText, CheckCircle, Clock, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function FacturasPage() {
  const { clienteId, loading: loadingCliente } = useClienteId();
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFacturas = useCallback(async () => {
    if (!clienteId) return;
    try {
      setLoading(true);
      setError('');
      const res = await facturaApi.getByCliente(clienteId);
      setFacturas(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar tus facturas');
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    if (loadingCliente) return;
    if (!clienteId) {
      setFacturas([]);
      setLoading(false);
      setError('No se encontro un perfil de cliente para esta cuenta.');
      return;
    }

    void fetchFacturas();
  }, [clienteId, loadingCliente, fetchFacturas]);

  const getEstadoInfo = (estado: string) => {
    const estados: Record<string, { color: string; text: string; icon: any }> = {
      PENDIENTE:   { color: 'bg-yellow-100 text-yellow-800', text: 'Pendiente de pago', icon: Clock },
      PAGADO:      { color: 'bg-green-100 text-green-800',  text: 'Pagada',             icon: CheckCircle },
      REEMBOLSADO: { color: 'bg-gray-100 text-gray-800',     text: 'Reembolsada',        icon: FileText },
    };
    return estados[estado] || estados.PENDIENTE;
  };

  if (loadingCliente || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mis Facturas</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
      )}

      {facturas.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Todavía no tienes facturas generadas</p>
          <p className="text-sm text-gray-400 mt-1">
            Las facturas se generan cuando el mecánico marca una orden como completada.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-left">
              <tr>
                <th className="px-4 py-3">Factura</th>
                <th className="px-4 py-3">Vehículo</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {facturas.map((f) => {
                const info = getEstadoInfo(f.estadoPago);
                const Icon = info.icon;
                return (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">#{f.id}</td>
                    <td className="px-4 py-3 text-gray-600">{f.vehiculoPatente}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(f.fechaOrden).toLocaleDateString('es-SV')}
                    </td>
                    <td className="px-4 py-3 font-semibold">${f.total.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${info.color}`}>
                        <Icon size={12} /> {info.text}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {f.estadoPago === 'PENDIENTE' && (
                        <Link
                          href={`/dashboard/pago/${f.ordenId}`}
                          className="inline-flex items-center gap-1 bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                        >
                          <CreditCard size={14} /> Pagar
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { ordenApi } from '@/lib/api';
import { useMecanicoId } from '@/hooks/useClienteId';
import { OrdenTrabajo } from '@/types';
import { History, Wrench } from 'lucide-react';

export default function MecanicoHistorialPage() {
  const { mecanicoId, loading: loadingMec } = useMecanicoId();
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mecanicoId) return;
    ordenApi.getByMecanico(mecanicoId)
      .then(res => setOrdenes(res.data.filter((o: OrdenTrabajo) => o.estado === 'COMPLETADA')))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [mecanicoId]);

  if (loadingMec || loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Historial de Órdenes</h1>
      {ordenes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay órdenes completadas aún</p>
        </div>
      ) : ordenes.map(o => (
        <div key={o.id} className="bg-white rounded-lg shadow-md p-5 mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">Orden #{o.id} — {o.patente}</h3>
              <p className="text-sm text-gray-500">Cliente: {o.clienteNombre}</p>
              <p className="text-sm text-gray-500">Fecha: {new Date(o.fechaCreacion).toLocaleDateString('es-SV')}</p>
              {o.sucursalNombre && <p className="text-sm text-gray-500">Sucursal: {o.sucursalNombre}</p>}
            </div>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">Completada</span>
          </div>
          {o.servicios?.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-sm font-medium mb-1 flex items-center gap-1"><Wrench size={14}/> Servicios:</p>
              {o.servicios.map((s, i) => (
                <div key={i} className="flex justify-between text-sm text-gray-600">
                  <span>{s.nombreServicio}</span><span>${s.precioAplicado.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          {o.presupuestoTotal && (
            <p className="mt-2 font-bold text-right">Total: ${o.presupuestoTotal.toFixed(2)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

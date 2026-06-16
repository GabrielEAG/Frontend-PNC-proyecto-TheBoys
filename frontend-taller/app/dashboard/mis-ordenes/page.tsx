'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useClienteId } from '@/hooks/useClienteId';
import { ordenApi } from '@/lib/api';
import { OrdenTrabajoResponse } from '@/types';
import { Clock, CheckCircle, AlertCircle, Eye, CreditCard, Wrench, DollarSign } from 'lucide-react';
import Link from 'next/link';

type TabType = 'activas' | 'historial';

export default function MisOrdenesPage() {
  const { user } = useAuth();
  const { clienteId, loading: loadingCliente } = useClienteId();
  const [activeTab, setActiveTab] = useState<TabType>('activas');
  const [ordenes, setOrdenes] = useState<OrdenTrabajoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (clienteId) fetchOrdenes();
  }, [clienteId]);

  const fetchOrdenes = async () => {
    if (!clienteId) return;
    try {
      setLoading(true);
      const response = await ordenApi.getByCliente(clienteId);
      setOrdenes(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  };

  const ordenesActivas   = ordenes.filter(o => !['COMPLETADA', 'CANCELADA'].includes(o.estado));
  const ordenesHistorial = ordenes.filter(o =>  ['COMPLETADA', 'CANCELADA'].includes(o.estado));

  const getEstadoInfo = (estado: string) => {
    const estados: Record<string, { color: string; text: string; icon: any }> = {
      PENDIENTE:            { color: 'bg-gray-100 text-gray-800',    text: 'Pendiente',             icon: Clock },
      PENDIENTE_APROBACION: { color: 'bg-yellow-100 text-yellow-800',text: 'Pendiente Aprobación',  icon: AlertCircle },
      EN_PROGRESO:          { color: 'bg-purple-100 text-purple-800', text: 'En Progreso',           icon: Wrench },
      COMPLETADA:           { color: 'bg-green-100 text-green-800',   text: 'Completada',            icon: CheckCircle },
      CANCELADA:            { color: 'bg-red-100 text-red-800',       text: 'Cancelada',             icon: AlertCircle },
    };
    return estados[estado] || estados.PENDIENTE;
  };

  const handleAprobarPresupuesto = async (ordenId: number) => {
    try {
      await ordenApi.aprobarPresupuesto(ordenId);
      fetchOrdenes();
      alert('Presupuesto aprobado. La orden está en progreso.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al aprobar presupuesto');
    }
  };

  const handleRechazarPresupuesto = async (ordenId: number) => {
    if (confirm('¿Rechazar el presupuesto? El mecánico será notificado para negociar.')) {
      try {
        await ordenApi.rechazarPresupuesto(ordenId);
        fetchOrdenes();
        alert('Presupuesto rechazado. El mecánico será notificado.');
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error al rechazar presupuesto');
      }
    }
  };

  const OrdenCard = ({ orden }: { orden: OrdenTrabajoResponse }) => {
    const estadoInfo = getEstadoInfo(orden.estado);
    const IconComponent = estadoInfo.icon;
    const totalServicios = orden.servicios?.reduce((s, x) => s + x.precioAplicado, 0) || 0;
    const totalRepuestos = orden.repuestos?.reduce((s, x) => s + x.precioAplicado * x.cantidad, 0) || 0;

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold">Orden #{orden.id}</h3>
            <p className="text-sm text-gray-500">Fecha: {new Date(orden.fechaCreacion).toLocaleDateString('es-SV')}</p>
            <p className="text-sm text-gray-500">Vehículo: {orden.patente}</p>
            {orden.sucursalNombre && <p className="text-sm text-gray-500">Sucursal: {orden.sucursalNombre}</p>}
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${estadoInfo.color}`}>
            <IconComponent size={14} />
            {estadoInfo.text}
          </span>
        </div>

        {/* Presupuesto enviado por el mecánico */}
        {orden.presupuestoTotal && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-yellow-600" />
              <span className="font-semibold text-yellow-800">
                Presupuesto del mecánico: ${orden.presupuestoTotal.toFixed(2)}
              </span>
            </div>
            {orden.fechaFinalizacionEstimada && (
              <p className="text-sm text-yellow-700 mt-1">
                Fecha estimada de entrega: {new Date(orden.fechaFinalizacionEstimada).toLocaleDateString('es-SV')}
              </p>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Servicios: ${totalServicios.toFixed(2)}</p>
            <p className="text-sm text-gray-600">Repuestos: ${totalRepuestos.toFixed(2)}</p>
            <p className="text-lg font-bold mt-1">Total: ${(totalServicios + totalRepuestos).toFixed(2)}</p>
          </div>
          <div>
            {orden.mecanicoNombre && <p className="text-sm text-gray-600">Mecánico: {orden.mecanicoNombre}</p>}
            {orden.comentarios    && <p className="text-sm text-gray-600 mt-1">Nota: {orden.comentarios}</p>}
          </div>
        </div>

        {/* Servicios */}
        {orden.servicios?.length > 0 && (
          <div className="mb-3">
            <h4 className="font-medium mb-1 text-sm">Servicios:</h4>
            {orden.servicios.map((s, i) => (
              <div key={i} className="text-sm text-gray-600 flex justify-between">
                <span>{s.nombreServicio}</span>
                <span>${s.precioAplicado.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Repuestos */}
        {orden.repuestos?.length > 0 && (
          <div className="mb-3">
            <h4 className="font-medium mb-1 text-sm">Repuestos:</h4>
            {orden.repuestos.map((r, i) => (
              <div key={i} className="text-sm text-gray-600 flex justify-between">
                <span>{r.nombreRepuesto} x{r.cantidad}</span>
                <span>${(r.precioAplicado * r.cantidad).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
          {orden.estado === 'PENDIENTE_APROBACION' && (
            <>
              <button
                onClick={() => handleAprobarPresupuesto(orden.id)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
              >
                <CheckCircle size={16} /> Aprobar Presupuesto
              </button>
              <button
                onClick={() => handleRechazarPresupuesto(orden.id)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
              >
                <AlertCircle size={16} /> Rechazar Presupuesto
              </button>
            </>
          )}
          {orden.estado === 'COMPLETADA' && (
            <Link
              href={`/dashboard/pago/${orden.id}`}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
            >
              <CreditCard size={16} /> Realizar Pago
            </Link>
          )}
        </div>
      </div>
    );
  };

  if (loadingCliente || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mis Órdenes</h1>

      <div className="flex gap-2 mb-6 border-b">
        {(['activas', 'historial'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition ${
              activeTab === tab ? 'border-b-2 border-blue-700 text-blue-700' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'activas'
              ? `Activas (${ordenesActivas.length})`
              : `Historial (${ordenesHistorial.length})`}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {activeTab === 'activas' && (
        ordenesActivas.length === 0
          ? <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tienes órdenes activas</p>
              <Link href="/dashboard/citas" className="mt-4 inline-block bg-blue-700 text-white px-4 py-2 rounded-lg">
                Agendar una cita
              </Link>
            </div>
          : ordenesActivas.map(o => <OrdenCard key={o.id} orden={o} />)
      )}

      {activeTab === 'historial' && (
        ordenesHistorial.length === 0
          ? <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay órdenes en el historial</p>
            </div>
          : ordenesHistorial.map(o => <OrdenCard key={o.id} orden={o} />)
      )}
    </div>
  );
}

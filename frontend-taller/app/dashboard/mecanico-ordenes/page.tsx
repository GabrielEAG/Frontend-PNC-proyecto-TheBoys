'use client';

import { useCallback, useEffect, useState } from 'react';
import { ordenApi } from '@/lib/api';
import { useMecanicoId } from '@/hooks/useClienteId';
import { OrdenTrabajo } from '@/types';
import { Wrench, Package, CheckCircle, DollarSign } from 'lucide-react';

export default function MecanicoOrdenesPage() {
  const { mecanicoId, sucursalId, loading: loadingMec } = useMecanicoId();
  const [activeTab, setActiveTab] = useState<'disponibles' | 'misordenes'>('misordenes');
  const [ordenesPendientes, setOrdenesPendientes] = useState<OrdenTrabajo[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrden, setSelectedOrden] = useState<OrdenTrabajo | null>(null);

  const [showPresupuesto, setShowPresupuesto] = useState(false);
  const [presupuestoTotal, setPresupuestoTotal] = useState('');
  const [fechaEstimada, setFechaEstimada] = useState('');
  const [comentarioPresupuesto, setComentarioPresupuesto] = useState('');

  const fetchData = useCallback(async () => {
    if (!mecanicoId || !sucursalId) return;
    try {
      setLoading(true);
      setError('');
      const [ordenesRes, pendientesRes] = await Promise.all([
        ordenApi.getByMecanico(mecanicoId),
        ordenApi.getPendientes(sucursalId),
      ]);
      const activas = ordenesRes.data.filter(
        (o: OrdenTrabajo) => !['COMPLETADA', 'CANCELADA'].includes(o.estado)
      );
      setOrdenes(activas);
      setOrdenesPendientes(pendientesRes.data);
    } catch (err) {
      console.error('Error:', err);
      setError('No se pudieron cargar las ordenes del mecanico.');
    } finally {
      setLoading(false);
    }
  }, [mecanicoId, sucursalId]);

  useEffect(() => {
    if (loadingMec) return;
    if (!mecanicoId || !sucursalId) {
      setOrdenes([]);
      setOrdenesPendientes([]);
      setSelectedOrden(null);
      setLoading(false);
      setError('No se encontro un perfil de mecanico o una sucursal asignada para esta cuenta.');
      return;
    }

    void fetchData();
  }, [mecanicoId, sucursalId, loadingMec, fetchData]);

  const handleAceptarOrden = async (ordenId: number) => {
    if (!mecanicoId) return;
    try {
      await ordenApi.asignarMecanico(ordenId, mecanicoId);
      alert('Orden aceptada. Ahora aparece en "Mis Órdenes".');
      void fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al aceptar la orden');
    }
  };

  const handleEnviarPresupuesto = async () => {
    if (!selectedOrden || !presupuestoTotal) {
      alert('Ingresa el monto del presupuesto');
      return;
    }
    try {
      await ordenApi.enviarPresupuesto(selectedOrden.id, {
        presupuestoTotal: parseFloat(presupuestoTotal),
        fechaFinalizacionEstimada: fechaEstimada || undefined,
        comentarios: comentarioPresupuesto || undefined,
      });
      alert('Presupuesto enviado al cliente. Esperando aprobación.');
      setShowPresupuesto(false);
      setPresupuestoTotal('');
      setFechaEstimada('');
      setComentarioPresupuesto('');
      void fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al enviar presupuesto');
    }
  };

  // ✅ Marcar orden como completada
  const handleCompletarOrden = async (ordenId: number) => {
    if (!confirm('¿Marcar esta orden como completada? Se notificará al cliente para el pago.')) return;
    try {
      await ordenApi.marcarCompletada(ordenId);
      alert('Orden completada. El cliente fue notificado para proceder al pago.');
      void fetchData();
      setSelectedOrden(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al completar orden');
    }
  };

  const getEstadoBadge = (estado: string) => {
    const clases: Record<string, string> = {
      PENDIENTE:            'bg-gray-100 text-gray-800',
      PENDIENTE_APROBACION: 'bg-yellow-100 text-yellow-800',
      EN_PROGRESO:          'bg-blue-100 text-blue-800',
      COMPLETADA:           'bg-green-100 text-green-800',
      CANCELADA:            'bg-red-100 text-red-800',
    };
    return clases[estado] || 'bg-gray-100 text-gray-800';
  };

  if (loadingMec || loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
    </div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      )}

      <div className="flex gap-6 h-full">
      {/* Lista de órdenes */}
      <div className="w-1/3 space-y-3">
        <div className="flex gap-2 mb-4 border-b">
          <button onClick={() => setActiveTab('disponibles')}
            className={`px-3 py-2 text-sm font-medium transition ${activeTab === 'disponibles' ? 'border-b-2 border-blue-700 text-blue-700' : 'text-gray-500'}`}>
            Disponibles ({ordenesPendientes.length})
          </button>
          <button onClick={() => setActiveTab('misordenes')}
            className={`px-3 py-2 text-sm font-medium transition ${activeTab === 'misordenes' ? 'border-b-2 border-blue-700 text-blue-700' : 'text-gray-500'}`}>
            Mis Órdenes ({ordenes.length})
          </button>
        </div>

        {activeTab === 'disponibles' && (
          ordenesPendientes.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No hay órdenes disponibles para aceptar</p>
            </div>
          ) : ordenesPendientes.map(orden => (
            <div key={orden.id} className="bg-white rounded-lg shadow-md p-4">
              <p className="font-semibold">Orden #{orden.id}</p>
              <p className="text-sm text-gray-500">{orden.clienteNombre}</p>
              <p className="text-sm text-gray-500">Vehículo: {orden.patente}</p>
              <button
                onClick={() => handleAceptarOrden(orden.id)}
                className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center justify-center gap-1"
              >
                <CheckCircle size={14} /> Aceptar orden
              </button>
            </div>
          ))
        )}

        {activeTab === 'misordenes' && (
        ordenes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No tienes órdenes activas</p>
          </div>
        ) : ordenes.map(orden => (
          <div
            key={orden.id}
            onClick={() => setSelectedOrden(orden)}
            className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition hover:shadow-lg ${
              selectedOrden?.id === orden.id ? 'border-2 border-blue-700' : ''
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">Orden #{orden.id}</p>
                <p className="text-sm text-gray-500">{orden.clienteNombre}</p>
                <p className="text-sm text-gray-500">Vehículo: {orden.patente}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoBadge(orden.estado)}`}>
                {orden.estado.replace('_', ' ')}
              </span>
            </div>
          </div>
        ))
        )}
      </div>

      {/* Detalle de la orden seleccionada */}
      <div className="flex-1">
        {!selectedOrden ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center h-64 flex items-center justify-center">
            <div>
              <Wrench className="h-16 w-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Selecciona una orden para ver el detalle</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Orden #{selectedOrden.id}</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadge(selectedOrden.estado)}`}>
                {selectedOrden.estado.replace('_', ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600">
              <div><strong>Cliente:</strong> {selectedOrden.clienteNombre}</div>
              <div><strong>Vehículo:</strong> {selectedOrden.patente}</div>
              <div><strong>Tipo:</strong> {selectedOrden.tipoOrden}</div>
              <div><strong>Fecha:</strong> {new Date(selectedOrden.fechaCreacion).toLocaleDateString('es-SV')}</div>
              {selectedOrden.fechaFinalizacionEstimada && (
                <div><strong>Entrega estimada:</strong> {new Date(selectedOrden.fechaFinalizacionEstimada).toLocaleDateString('es-SV')}</div>
              )}
            </div>

            {selectedOrden.comentarios && (
              <div className="bg-gray-50 rounded p-3 mb-4 text-sm">
                <strong>Comentarios:</strong> {selectedOrden.comentarios}
              </div>
            )}

            {/* Servicios */}
            {selectedOrden.servicios?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2 flex items-center gap-1"><Wrench size={16}/> Servicios</h3>
                {selectedOrden.servicios.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-600 py-1 border-b last:border-0">
                    <span>{s.nombreServicio}</span>
                    <span>${s.precioAplicado.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Repuestos */}
            {selectedOrden.repuestos?.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2 flex items-center gap-1"><Package size={16}/> Repuestos</h3>
                {selectedOrden.repuestos.map((r, i) => (
                  <div key={i} className="flex justify-between text-sm text-gray-600 py-1 border-b last:border-0">
                    <span>{r.nombreRepuesto} x{r.cantidad}</span>
                    <span>${(r.precioAplicado * r.cantidad).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {selectedOrden.presupuestoTotal && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 text-sm">
                <strong className="text-yellow-800">Presupuesto enviado: ${selectedOrden.presupuestoTotal.toFixed(2)}</strong>
                <p className="text-yellow-700 mt-1">
                  {selectedOrden.estado === 'PENDIENTE_APROBACION'
                    ? 'Esperando aprobación del cliente...'
                    : selectedOrden.estado === 'EN_PROGRESO'
                    ? '✅ Presupuesto aprobado por el cliente'
                    : ''}
                </p>
              </div>
            )}

            {/* Acciones */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              {selectedOrden.estado === 'PENDIENTE' && (
                <button
                  onClick={() => setShowPresupuesto(true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                >
                  <DollarSign size={16} /> Enviar Presupuesto
                </button>
              )}
              {selectedOrden.estado === 'EN_PROGRESO' && (
                <button
                  onClick={() => handleCompletarOrden(selectedOrden.id)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
                >
                  <CheckCircle size={16} /> Marcar como Completada
                </button>
              )}
            </div>

            {/* Form presupuesto inline */}
            {showPresupuesto && (
              <div className="mt-4 pt-4 border-t bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold mb-3">Enviar Presupuesto al Cliente</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Monto total ($) *</label>
                    <input type="number" step="0.01" value={presupuestoTotal}
                      onChange={e => setPresupuestoTotal(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha estimada de entrega</label>
                    <input type="date" value={fechaEstimada}
                      onChange={e => setFechaEstimada(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Comentarios</label>
                    <textarea value={comentarioPresupuesto}
                      onChange={e => setComentarioPresupuesto(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      rows={2} placeholder="Detalles del trabajo a realizar..." />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleEnviarPresupuesto}
                      className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm">
                      Enviar al Cliente
                    </button>
                    <button onClick={() => setShowPresupuesto(false)}
                      className="border border-gray-300 px-4 py-2 rounded-lg text-sm">
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

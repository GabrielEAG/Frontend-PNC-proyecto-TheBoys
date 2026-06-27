'use client';

import { useClienteId } from '@/hooks/useClienteId';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ordenApi } from '@/lib/api';
import { OrdenTrabajoResponse } from '@/types';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Wrench,
  DollarSign,
  XCircle,
  Receipt,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';

type TabType = 'activas' | 'historial';

type AppDialog = {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
} | null;

const getApiMessage = (err: any, fallback: string) => {
  return err?.response?.data?.message || fallback;
};

export default function MisOrdenesPage() {
  const { clienteId, loading: loadingCliente } = useClienteId();

  const requestIdRef = useRef(0);

  const [activeTab, setActiveTab] = useState<TabType>('activas');
  const [ordenes, setOrdenes] = useState<OrdenTrabajoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dialog, setDialog] = useState<AppDialog>(null);
  const [ordenARechazar, setOrdenARechazar] = useState<OrdenTrabajoResponse | null>(null);

  const [aprobandoOrdenId, setAprobandoOrdenId] = useState<number | null>(null);
  const [rechazandoOrdenId, setRechazandoOrdenId] = useState<number | null>(null);

  const fetchOrdenes = useCallback(async () => {
    if (!clienteId) return;

    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setError('');

      const response = await ordenApi.getByCliente(clienteId);

      if (requestId !== requestIdRef.current) return;

      setOrdenes(response.data);
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;

      setError(
        getApiMessage(
          err,
          'No se pudieron cargar tus órdenes. Intenta nuevamente.'
        )
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [clienteId]);

  useEffect(() => {
    if (loadingCliente) return;

    if (!clienteId) {
      setOrdenes([]);
      setLoading(false);
      setError('No se encontró un perfil de cliente para esta cuenta.');
      return;
    }

    void fetchOrdenes();

    return () => {
      requestIdRef.current += 1;
    };
  }, [clienteId, loadingCliente, fetchOrdenes]);

  const ordenesActivas = ordenes.filter(
    (orden) => !['COMPLETADA', 'CANCELADA'].includes(orden.estado)
  );

  const ordenesHistorial = ordenes.filter(
    (orden) => ['COMPLETADA', 'CANCELADA'].includes(orden.estado)
  );

  const getEstadoInfo = (estado: string) => {
    const estados: Record<
      string,
      { color: string; text: string; icon: typeof Clock; description: string }
    > = {
      PENDIENTE: {
        color: 'bg-gray-100 text-gray-800',
        text: 'Pendiente',
        icon: Clock,
        description: 'La orden está pendiente de revisión por el taller.',
      },
      PENDIENTE_APROBACION: {
        color: 'bg-yellow-100 text-yellow-800',
        text: 'Pendiente de aprobación',
        icon: AlertCircle,
        description: 'El mecánico envió un presupuesto y necesita tu aprobación.',
      },
      EN_PROGRESO: {
        color: 'bg-purple-100 text-purple-800',
        text: 'En progreso',
        icon: Wrench,
        description: 'El taller está trabajando en tu vehículo.',
      },
      COMPLETADA: {
        color: 'bg-green-100 text-green-800',
        text: 'Completada',
        icon: CheckCircle,
        description: 'El trabajo finalizó. Puedes proceder con el pago si aún está pendiente.',
      },
      CANCELADA: {
        color: 'bg-red-100 text-red-800',
        text: 'Cancelada',
        icon: AlertCircle,
        description: 'Esta orden fue cancelada.',
      },
    };

    return estados[estado] || estados.PENDIENTE;
  };

  const handleAprobarPresupuesto = async (ordenId: number) => {
    setAprobandoOrdenId(ordenId);

    try {
      await ordenApi.aprobarPresupuesto(ordenId);
      await fetchOrdenes();

      setDialog({
        type: 'success',
        title: 'Presupuesto aprobado',
        message:
          'El presupuesto fue aprobado correctamente. La orden ahora está en progreso y el taller continuará con el trabajo indicado.',
      });
    } catch (err: any) {
      setDialog({
        type: 'error',
        title: 'No se pudo aprobar el presupuesto',
        message: getApiMessage(
          err,
          'Ocurrió un error al aprobar el presupuesto. Intenta nuevamente.'
        ),
      });
    } finally {
      setAprobandoOrdenId(null);
    }
  };

  const abrirConfirmacionRechazo = (orden: OrdenTrabajoResponse) => {
    setOrdenARechazar(orden);
  };

  const confirmarRechazoPresupuesto = async () => {
    if (!ordenARechazar) return;

    setRechazandoOrdenId(ordenARechazar.id);

    try {
      await ordenApi.rechazarPresupuesto(ordenARechazar.id);
      await fetchOrdenes();

      setOrdenARechazar(null);

      setDialog({
        type: 'success',
        title: 'Presupuesto rechazado',
        message:
          'El presupuesto fue rechazado correctamente. El mecánico será notificado para revisar la propuesta o coordinar una nueva alternativa contigo.',
      });
    } catch (err: any) {
      setDialog({
        type: 'error',
        title: 'No se pudo rechazar el presupuesto',
        message: getApiMessage(
          err,
          'Ocurrió un error al rechazar el presupuesto. Intenta nuevamente.'
        ),
      });
    } finally {
      setRechazandoOrdenId(null);
    }
  };

  const OrdenCard = ({ orden }: { orden: OrdenTrabajoResponse }) => {
    const estadoInfo = getEstadoInfo(orden.estado);
    const IconComponent = estadoInfo.icon;

    const totalServicios =
      orden.servicios?.reduce(
        (total, servicio) => total + Number(servicio.precioAplicado || 0),
        0
      ) || 0;

    const totalRepuestos =
      orden.repuestos?.reduce(
        (total, repuesto) =>
          total + Number(repuesto.precioAplicado || 0) * Number(repuesto.cantidad || 0),
        0
      ) || 0;

    const totalDetalle = totalServicios + totalRepuestos;
    const presupuestoMecanico = Number(orden.presupuestoTotal || 0);
    const totalEstimado = presupuestoMecanico > 0 ? presupuestoMecanico : totalDetalle;

    return (
      <div className="mb-4 rounded-xl bg-white p-6 shadow-md">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Orden #{orden.id}</h3>

            <div className="mt-1 space-y-0.5 text-sm text-gray-500">
              <p>Fecha: {new Date(orden.fechaCreacion).toLocaleDateString('es-SV')}</p>
              <p>Vehículo: {orden.patente}</p>
              {orden.sucursalNombre && <p>Sucursal: {orden.sucursalNombre}</p>}
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${estadoInfo.color}`}
            title={estadoInfo.description}
          >
            <IconComponent size={14} />
            {estadoInfo.text}
          </span>
        </div>

        {orden.estado === 'PENDIENTE_APROBACION' && (
          <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-yellow-900">
            <div className="flex items-start gap-3">
              <DollarSign className="mt-0.5 h-5 w-5 text-yellow-700" />

              <div className="flex-1">
                <p className="text-sm font-semibold">Presupuesto pendiente de aprobación</p>

                <p className="mt-1 text-2xl font-bold">
                  Total estimado a aprobar: ${totalEstimado.toFixed(2)}
                </p>

                <p className="mt-2 text-sm text-yellow-800">
                  Este es el monto propuesto por el taller para continuar con el trabajo.
                  Revisa el detalle de servicios y repuestos antes de aprobar.
                </p>

                {orden.fechaFinalizacionEstimada && (
                  <p className="mt-2 text-sm text-yellow-800">
                    Entrega estimada:{' '}
                    {new Date(orden.fechaFinalizacionEstimada).toLocaleDateString('es-SV')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {orden.estado !== 'PENDIENTE_APROBACION' && presupuestoMecanico > 0 && (
          <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-gray-600" />
              <span className="font-semibold text-gray-800">
                Presupuesto registrado: ${presupuestoMecanico.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Receipt size={17} className="text-gray-500" />
            <p className="font-semibold text-gray-900">Resumen del trabajo</p>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Servicios</span>
              <span>${totalServicios.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>Repuestos</span>
              <span>${totalRepuestos.toFixed(2)}</span>
            </div>

            <div className="mt-2 flex justify-between border-t pt-2 text-lg font-bold text-gray-900">
              <span>Total estimado</span>
              <span>${totalEstimado.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="mb-4 grid gap-4 md:grid-cols-2">
          <div>
            {orden.servicios?.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold text-gray-900">
                  <Wrench size={15} />
                  Servicios incluidos
                </h4>

                <div className="space-y-1">
                  {orden.servicios.map((servicio, index) => (
                    <div
                      key={`${servicio.nombreServicio}-${index}`}
                      className="flex justify-between text-sm text-gray-600"
                    >
                      <span>{servicio.nombreServicio}</span>
                      <span>${Number(servicio.precioAplicado || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            {orden.repuestos?.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold text-gray-900">
                  <Package size={15} />
                  Repuestos incluidos
                </h4>

                <div className="space-y-1">
                  {orden.repuestos.map((repuesto, index) => (
                    <div
                      key={`${repuesto.nombreRepuesto}-${index}`}
                      className="flex justify-between text-sm text-gray-600"
                    >
                      <span>
                        {repuesto.nombreRepuesto} x{repuesto.cantidad}
                      </span>
                      <span>
                        $
                        {(
                          Number(repuesto.precioAplicado || 0) *
                          Number(repuesto.cantidad || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {orden.mecanicoNombre && (
              <p className="mt-3 text-sm text-gray-600">
                <span className="font-medium">Mecánico asignado:</span>{' '}
                {orden.mecanicoNombre}
              </p>
            )}

            {orden.comentarios && (
              <p className="mt-1 text-sm text-gray-600">
                <span className="font-medium">Nota del taller:</span>{' '}
                {orden.comentarios}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 border-t pt-4">
          {orden.estado === 'PENDIENTE_APROBACION' && (
            <>
              <button
                type="button"
                onClick={() => handleAprobarPresupuesto(orden.id)}
                disabled={aprobandoOrdenId === orden.id || rechazandoOrdenId === orden.id}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle size={16} />
                {aprobandoOrdenId === orden.id
                  ? 'Aprobando...'
                  : `Aprobar presupuesto de $${totalEstimado.toFixed(2)}`}
              </button>

              <button
                type="button"
                onClick={() => abrirConfirmacionRechazo(orden)}
                disabled={aprobandoOrdenId === orden.id || rechazandoOrdenId === orden.id}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <XCircle size={16} />
                Rechazar presupuesto
              </button>
            </>
          )}

          {orden.estado === 'COMPLETADA' && (
            <Link
              href={`/dashboard/pago/${orden.id}`}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <CreditCard size={16} />
              Pagar factura
            </Link>
          )}
        </div>
      </div>
    );
  };

  if (loadingCliente || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Mis Órdenes</h1>
      <p className="mb-6 text-sm text-gray-500">
        Revisa el estado de tus órdenes, aprueba presupuestos y realiza pagos cuando el trabajo esté finalizado.
      </p>

      <div className="mb-6 flex gap-2 border-b">
        {(['activas', 'historial'] as TabType[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition ${
              activeTab === tab
                ? 'border-b-2 border-blue-700 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'activas'
              ? `Activas (${ordenesActivas.length})`
              : `Historial (${ordenesHistorial.length})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {activeTab === 'activas' &&
        (ordenesActivas.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-md">
            <Clock className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <p className="text-gray-600">No tienes órdenes activas en este momento.</p>
            <Link
              href="/dashboard/citas"
              className="mt-4 inline-block rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
            >
              Agendar una cita
            </Link>
          </div>
        ) : (
          ordenesActivas.map((orden) => <OrdenCard key={orden.id} orden={orden} />)
        ))}

      {activeTab === 'historial' &&
        (ordenesHistorial.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-md">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <p className="text-gray-600">Aún no tienes órdenes finalizadas o canceladas.</p>
          </div>
        ) : (
          ordenesHistorial.map((orden) => <OrdenCard key={orden.id} orden={orden} />)
        ))}

      <Modal
        isOpen={Boolean(ordenARechazar)}
        onClose={() => {
          if (!rechazandoOrdenId) {
            setOrdenARechazar(null);
          }
        }}
        title="Rechazar presupuesto"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-semibold">¿Quieres rechazar este presupuesto?</p>
            <p className="mt-1 text-sm">
              El mecánico será notificado para revisar la propuesta o coordinar una nueva alternativa contigo.
            </p>

            {ordenARechazar && (
              <div className="mt-3 text-sm">
                <p>
                  <span className="font-medium">Orden:</span> #{ordenARechazar.id}
                </p>
                <p>
                  <span className="font-medium">Vehículo:</span> {ordenARechazar.patente}
                </p>
                {ordenARechazar.presupuestoTotal && (
                  <p>
                    <span className="font-medium">Presupuesto:</span> $
                    {Number(ordenARechazar.presupuestoTotal).toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOrdenARechazar(null)}
              disabled={Boolean(rechazandoOrdenId)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mantener presupuesto
            </button>

            <button
              type="button"
              onClick={confirmarRechazoPresupuesto}
              disabled={Boolean(rechazandoOrdenId)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {rechazandoOrdenId ? 'Rechazando...' : 'Sí, rechazar presupuesto'}
            </button>
          </div>
        </div>
      </Modal>

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
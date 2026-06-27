'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { facturaApi, inventarioApi, ordenApi, servicioApi } from '@/lib/api';
import { useMecanicoId } from '@/hooks/useClienteId';
import { OrdenTrabajo } from '@/types';
import {
  Wrench,
  Package,
  CheckCircle,
  DollarSign,
  AlertCircle,
  X,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';

type TabType = 'disponibles' | 'misordenes';

type PresupuestoForm = {
  presupuestoTotal: string;
  fechaFinalizacionEstimada: string;
  comentarios: string;
};

type ServicioDisponible = {
  id: number;
  nombre: string;
  precioBase: number;
  estado?: string;
};

type InventarioSucursal = {
  id: number;
  repuestoId?: number;
  repuesto?: string | { id?: number; nombre?: string };
  nombreRepuesto?: string;
  nombre?: string;
  categoria?: string;
  precioUnitario?: number;
  precio?: number;
  stockTotal?: number;
  sucursal?: string;
};

type RepuestoSeleccionado = {
  repuestoId: number;
  nombre: string;
  cantidad: number;
  precioAplicado: number;
  stockTotal: number;
};

type AppDialog = {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
} | null;

type FacturaOrden = {
  id: number;
  ordenId: number;
  estadoPago: string;
  metodoPago?: string | null;
  total?: number;
};

const emptyPresupuestoForm: PresupuestoForm = {
  presupuestoTotal: '',
  fechaFinalizacionEstimada: '',
  comentarios: '',
};

const getErrorMessage = (err: any, fallback: string) => {
  return err?.response?.data?.message || fallback;
};

export default function MecanicoOrdenesPage() {
  const { mecanicoId, sucursalId, loading: loadingMec } = useMecanicoId();

  const requestIdRef = useRef(0);

  const [activeTab, setActiveTab] = useState<TabType>('misordenes');
  const [ordenesPendientes, setOrdenesPendientes] = useState<OrdenTrabajo[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrden, setSelectedOrden] = useState<OrdenTrabajo | null>(null);

  const [showPresupuestoForm, setShowPresupuestoForm] = useState(false);
  const [presupuestoForm, setPresupuestoForm] = useState<PresupuestoForm>(emptyPresupuestoForm);

  const [serviciosDisponibles, setServiciosDisponibles] = useState<ServicioDisponible[]>([]);
  const [inventarioSucursal, setInventarioSucursal] = useState<InventarioSucursal[]>([]);
  const [serviciosExtra, setServiciosExtra] = useState<number[]>([]);
  const [repuestosSeleccionados, setRepuestosSeleccionados] = useState<RepuestoSeleccionado[]>([]);

  const [successMessage, setSuccessMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [dialog, setDialog] = useState<AppDialog>(null);

  const [ordenACompletar, setOrdenACompletar] = useState<OrdenTrabajo | null>(null);
  const [completandoOrden, setCompletandoOrden] = useState(false);
  const [enviandoPresupuesto, setEnviandoPresupuesto] = useState(false);
  const [aceptandoOrdenId, setAceptandoOrdenId] = useState<number | null>(null);

  const [facturasPorOrden, setFacturasPorOrden] = useState<Record<number, FacturaOrden>>({});
  const [confirmandoPagoFacturaId, setConfirmandoPagoFacturaId] = useState<number | null>(null);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setActionError('');

    window.setTimeout(() => {
      setSuccessMessage('');
    }, 4000);
  };

  const showActionError = (message: string) => {
    setActionError(message);
    setSuccessMessage('');
  };

  const showDialog = (config: NonNullable<AppDialog>) => {
    setDialog(config);
  };

  const fetchData = useCallback(async () => {
  if (!mecanicoId || !sucursalId) return;

  const requestId = ++requestIdRef.current;

  try {
    setLoading(true);
    setError('');

    const [ordenesRes, pendientesRes] = await Promise.all([
      ordenApi.getByMecanico(mecanicoId),
      ordenApi.getPendientes(sucursalId),
    ]);

    if (requestId !== requestIdRef.current) return;

   const ordenesDelMecanico = ordenesRes.data.filter(
  (orden: OrdenTrabajo) => orden.estado !== 'CANCELADA' && orden.estado !== 'COMPLETADA'
);

    const facturasResults = await Promise.allSettled(
      ordenesDelMecanico.map((orden: OrdenTrabajo) =>
        facturaApi.getByOrden(orden.id).then((response) => ({
          ordenId: orden.id,
          factura: response.data as FacturaOrden,
        }))
      )
    );

    if (requestId !== requestIdRef.current) return;

    const facturasMap: Record<number, FacturaOrden> = {};

    facturasResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        facturasMap[result.value.ordenId] = result.value.factura;
      }
    });

    setFacturasPorOrden(facturasMap);
    setOrdenes(ordenesDelMecanico);
    setOrdenesPendientes(pendientesRes.data);

    setSelectedOrden((prev) => {
      if (!prev) return null;
      return ordenesDelMecanico.find((orden: OrdenTrabajo) => orden.id === prev.id) || null;
    });
  } catch (err: any) {
    if (requestId !== requestIdRef.current) return;

    setError(
      getErrorMessage(
        err,
        'No se pudieron cargar las órdenes del mecánico.'
      )
    );
  } finally {
    if (requestId === requestIdRef.current) {
      setLoading(false);
    }
  }
}, [mecanicoId, sucursalId]);

  const cargarCatalogos = useCallback(async () => {
    if (!sucursalId) return;

    try {
      setLoadingCatalogos(true);

      const [serviciosRes, inventarioRes] = await Promise.all([
        servicioApi.getAll(),
        inventarioApi.getBySucursal(sucursalId),
      ]);

      setServiciosDisponibles(
        serviciosRes.data.filter(
          (servicio: ServicioDisponible) => servicio.estado === 'ACTIVO'
        )
      );

      setInventarioSucursal(inventarioRes.data);
    } catch (err: any) {
      showActionError(
        getErrorMessage(
          err,
          'No se pudieron cargar servicios o repuestos de la sucursal.'
        )
      );
    } finally {
      setLoadingCatalogos(false);
    }
  }, [sucursalId]);

  useEffect(() => {
    if (loadingMec) return;

    if (!mecanicoId || !sucursalId) {
      setOrdenes([]);
      setOrdenesPendientes([]);
      setSelectedOrden(null);
      setLoading(false);
      setError('No se encontró un perfil de mecánico o una sucursal asignada para esta cuenta.');
      return;
    }

    void fetchData();
    void cargarCatalogos();

    return () => {
      requestIdRef.current += 1;
    };
  }, [mecanicoId, sucursalId, loadingMec, fetchData, cargarCatalogos]);

  const serviciosYaEnOrden = useMemo(() => {
    return (
      selectedOrden?.servicios
        ?.map((servicio: any) => servicio.servicioId)
        .filter(Boolean) || []
    );
  }, [selectedOrden]);

  const serviciosParaAgregar = useMemo(() => {
    return serviciosDisponibles.filter(
      (servicio) => !serviciosYaEnOrden.includes(servicio.id)
    );
  }, [serviciosDisponibles, serviciosYaEnOrden]);

  const totalServiciosActuales = useMemo(() => {
    return (
      selectedOrden?.servicios?.reduce(
        (total: number, servicio: any) => total + Number(servicio.precioAplicado || 0),
        0
      ) || 0
    );
  }, [selectedOrden]);

  const totalRepuestosActuales = useMemo(() => {
    return (
      selectedOrden?.repuestos?.reduce(
        (total: number, repuesto: any) =>
          total + Number(repuesto.precioAplicado || 0) * Number(repuesto.cantidad || 0),
        0
      ) || 0
    );
  }, [selectedOrden]);

  const totalServiciosExtra = useMemo(() => {
    return serviciosExtra.reduce((total, servicioId) => {
      const servicio = serviciosDisponibles.find((item) => item.id === servicioId);
      return total + Number(servicio?.precioBase || 0);
    }, 0);
  }, [serviciosExtra, serviciosDisponibles]);

  const totalRepuestosExtra = useMemo(() => {
    return repuestosSeleccionados.reduce(
      (total, repuesto) => total + repuesto.precioAplicado * repuesto.cantidad,
      0
    );
  }, [repuestosSeleccionados]);

  const totalPresupuestoCalculado = useMemo(() => {
    return (
      totalServiciosActuales +
      totalRepuestosActuales +
      totalServiciosExtra +
      totalRepuestosExtra
    );
  }, [
    totalServiciosActuales,
    totalRepuestosActuales,
    totalServiciosExtra,
    totalRepuestosExtra,
  ]);

  const resetPresupuesto = () => {
    setPresupuestoForm(emptyPresupuestoForm);
    setServiciosExtra([]);
    setRepuestosSeleccionados([]);
    setShowPresupuestoForm(false);
  };

  const handleAceptarOrden = async (ordenId: number) => {
    if (!mecanicoId) {
      showActionError('No se pudo identificar tu perfil de mecánico.');
      return;
    }

    setAceptandoOrdenId(ordenId);

    try {
      await ordenApi.asignarMecanico(ordenId, mecanicoId);
      await fetchData();

      setActiveTab('misordenes');

      showSuccess('Orden aceptada correctamente. Ahora aparece en “Mis Órdenes”.');

      showDialog({
        type: 'success',
        title: 'Orden aceptada',
        message:
          'La orden fue aceptada correctamente. Ahora puedes gestionarla desde la pestaña “Mis Órdenes”.',
      });
    } catch (err: any) {
      showDialog({
        type: 'error',
        title: 'No se pudo aceptar la orden',
        message: getErrorMessage(err, 'No se pudo aceptar la orden.'),
      });
    } finally {
      setAceptandoOrdenId(null);
    }
  };

  const handleOpenPresupuesto = () => {
    if (!selectedOrden) return;

    setShowPresupuestoForm(true);
    setActionError('');

    const presupuestoExistente = Number(selectedOrden.presupuestoTotal || 0);
    const sugerido = presupuestoExistente > 0 ? presupuestoExistente : totalPresupuestoCalculado;

    setPresupuestoForm({
      presupuestoTotal: sugerido > 0 ? sugerido.toFixed(2) : '',
      fechaFinalizacionEstimada: '',
      comentarios: selectedOrden.comentarios || '',
    });
  };

  const handleEnviarPresupuesto = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrden) {
      showActionError('Selecciona una orden antes de enviar el presupuesto.');
      return;
    }

    const presupuestoTotal = Number(presupuestoForm.presupuestoTotal);

    if (!Number.isFinite(presupuestoTotal) || presupuestoTotal <= 0) {
      showActionError('El monto total debe ser mayor a cero.');
      return;
    }

    const servicioSinPrecio = serviciosExtra.find((servicioId) => {
      const servicio = serviciosDisponibles.find((item) => item.id === servicioId);
      return !servicio || Number(servicio.precioBase || 0) <= 0;
    });

    if (servicioSinPrecio) {
      showActionError('Hay un servicio seleccionado sin precio válido.');
      return;
    }

    const repuestoSinId = repuestosSeleccionados.find((repuesto) => !repuesto.repuestoId);

    if (repuestoSinId) {
      showActionError('Hay un repuesto seleccionado sin identificador válido.');
      return;
    }

    const repuestoSinStock = repuestosSeleccionados.find(
      (repuesto) => repuesto.cantidad > repuesto.stockTotal
    );

    if (repuestoSinStock) {
      showActionError(
        `La cantidad seleccionada de ${repuestoSinStock.nombre} supera el stock disponible.`
      );
      return;
    }

    const repuestoSinPrecio = repuestosSeleccionados.find(
      (repuesto) => !Number.isFinite(repuesto.precioAplicado) || repuesto.precioAplicado <= 0
    );

    if (repuestoSinPrecio) {
      showActionError(`El repuesto ${repuestoSinPrecio.nombre} no tiene precio válido.`);
      return;
    }

    setEnviandoPresupuesto(true);

    try {
      await ordenApi.enviarPresupuesto(selectedOrden.id, {
        presupuestoTotal,
        fechaFinalizacionEstimada: presupuestoForm.fechaFinalizacionEstimada || null,
        comentarios: presupuestoForm.comentarios.trim(),
        servicios: serviciosExtra.map((servicioId) => {
          const servicio = serviciosDisponibles.find((item) => item.id === servicioId);

          return {
            servicioId,
            precioAplicado: Number(servicio?.precioBase || 0),
          };
        }),
        repuestos: repuestosSeleccionados.map((repuesto) => ({
          repuestoId: repuesto.repuestoId,
          cantidad: repuesto.cantidad,
          precioAplicado: repuesto.precioAplicado,
        })),
      });

      resetPresupuesto();

      await fetchData();

      showSuccess('Presupuesto enviado correctamente al cliente.');

      showDialog({
        type: 'success',
        title: 'Presupuesto enviado',
        message:
          'El presupuesto fue enviado correctamente al cliente. La orden quedará pendiente de aprobación hasta que el cliente acepte o rechace la propuesta.',
      });
    } catch (err: any) {
      showDialog({
        type: 'error',
        title: 'Error al enviar presupuesto',
        message: getErrorMessage(
          err,
          'No se pudo enviar el presupuesto. Revisa servicios, repuestos y stock disponible.'
        ),
      });
    } finally {
      setEnviandoPresupuesto(false);
    }
  };

  const confirmarCompletarOrden = async () => {
    if (!ordenACompletar) return;

    setCompletandoOrden(true);

    try {
      await ordenApi.marcarCompletada(ordenACompletar.id);

      await fetchData();

      setOrdenACompletar(null);
      setSelectedOrden(null);

      showSuccess('Orden completada. El cliente fue notificado para proceder al pago.');

      showDialog({
        type: 'success',
        title: 'Orden completada',
        message:
          'La orden fue marcada como completada correctamente. El cliente será notificado para proceder con el pago.',
      });
    } catch (err: any) {
      showDialog({
        type: 'error',
        title: 'No se pudo completar la orden',
        message: getErrorMessage(err, 'Error al completar orden.'),
      });
    } finally {
      setCompletandoOrden(false);
    }
  };

  const handleConfirmarPagoEfectivo = async (facturaId: number) => {
    setConfirmandoPagoFacturaId(facturaId);

    try {
      await facturaApi.confirmarPagoEfectivo(facturaId);

      await fetchData();

      setDialog({
        type: 'success',
        title: 'Pago confirmado',
        message:
          'El pago en efectivo fue confirmado correctamente. El cliente será notificado y la factura quedó pagada.',
      });
    } catch (err: any) {
      setDialog({
        type: 'error',
        title: 'No se pudo confirmar el pago',
        message:
          err.response?.data?.message ||
          'No se pudo confirmar el pago en efectivo. Intenta nuevamente.',
      });
    } finally {
      setConfirmandoPagoFacturaId(null);
    }
  };

  const handleConfirmarPagoSeguro = async (facturaId: number) => {
    setConfirmandoPagoFacturaId(facturaId);

    try {
      await facturaApi.confirmarPagoSeguro(facturaId);

      await fetchData();

      setDialog({
        type: 'success',
        title: 'Pago del seguro confirmado',
        message:
          'El pago del seguro fue confirmado correctamente. El cliente será notificado y la factura quedó pagada.',
      });
    } catch (err: any) {
      setDialog({
        type: 'error',
        title: 'No se pudo confirmar el pago del seguro',
        message:
          err.response?.data?.message ||
          'No se pudo confirmar el pago del seguro. Intenta nuevamente.',
      });
    } finally {
      setConfirmandoPagoFacturaId(null);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const clases: Record<string, string> = {
      PENDIENTE: 'bg-gray-100 text-gray-800',
      PENDIENTE_APROBACION: 'bg-yellow-100 text-yellow-800',
      EN_PROGRESO: 'bg-blue-100 text-blue-800',
      COMPLETADA: 'bg-green-100 text-green-800',
      CANCELADA: 'bg-red-100 text-red-800',
    };

    return clases[estado] || 'bg-gray-100 text-gray-800';
  };

  const getEstadoTexto = (estado: string) => {
    const textos: Record<string, string> = {
      PENDIENTE: 'Pendiente',
      PENDIENTE_APROBACION: 'Pendiente de aprobación',
      EN_PROGRESO: 'En progreso',
      COMPLETADA: 'Completada',
      CANCELADA: 'Cancelada',
    };

    return textos[estado] || estado.replace('_', ' ');
  };

  const getInventarioRepuestoId = (item: InventarioSucursal) => {
    const repuestoComoObjeto =
      typeof item.repuesto === 'object' && item.repuesto !== null ? item.repuesto : null;

    return Number(item.repuestoId ?? repuestoComoObjeto?.id ?? 0);
  };

  const getInventarioNombre = (item: InventarioSucursal) => {
    const repuestoComoObjeto =
      typeof item.repuesto === 'object' && item.repuesto !== null ? item.repuesto : null;

    if (typeof item.repuesto === 'string') return item.repuesto;

    return item.nombreRepuesto || repuestoComoObjeto?.nombre || item.nombre || 'Repuesto';
  };

  const getInventarioPrecio = (item: InventarioSucursal) => {
    return Number(item.precioUnitario ?? item.precio ?? 0);
  };

  const handleCantidadRepuesto = (item: InventarioSucursal, cantidad: number) => {
    const repuestoId = getInventarioRepuestoId(item);
    const nombre = getInventarioNombre(item);
    const precioAplicado = getInventarioPrecio(item);
    const stockTotal = Number(item.stockTotal || 0);

    if (!repuestoId) {
      showActionError(`No se pudo identificar el repuesto ${nombre}.`);
      return;
    }

    setRepuestosSeleccionados((prev) => {
      const sinActual = prev.filter((repuesto) => repuesto.repuestoId !== repuestoId);

      if (!cantidad || cantidad <= 0) {
        return sinActual;
      }

      return [
        ...sinActual,
        {
          repuestoId,
          nombre,
          cantidad,
          precioAplicado,
          stockTotal,
        },
      ];
    });
  };

  if (loadingMec || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          {successMessage}
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {actionError}
        </div>
      )}

      <div className="flex h-full gap-6">
        <div className="w-1/3 space-y-3">
          <div className="mb-4 flex gap-2 border-b">
            <button
              type="button"
              onClick={() => setActiveTab('disponibles')}
              className={`px-3 py-2 text-sm font-medium transition ${
                activeTab === 'disponibles'
                  ? 'border-b-2 border-blue-700 text-blue-700'
                  : 'text-gray-500'
              }`}
            >
              Disponibles ({ordenesPendientes.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('misordenes')}
              className={`px-3 py-2 text-sm font-medium transition ${
                activeTab === 'misordenes'
                  ? 'border-b-2 border-blue-700 text-blue-700'
                  : 'text-gray-500'
              }`}
            >
              Mis Órdenes ({ordenes.length})
            </button>
          </div>

          {activeTab === 'disponibles' &&
            (ordenesPendientes.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center shadow-md">
                <Wrench className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                <p className="text-gray-500">No hay órdenes disponibles para aceptar</p>
              </div>
            ) : (
              ordenesPendientes.map((orden) => (
                <div key={orden.id} className="rounded-lg bg-white p-4 shadow-md">
                  <p className="font-semibold">Orden #{orden.id}</p>
                  <p className="text-sm text-gray-500">{orden.clienteNombre}</p>
                  <p className="text-sm text-gray-500">Vehículo: {orden.patente}</p>

                  <button
                    type="button"
                    onClick={() => handleAceptarOrden(orden.id)}
                    disabled={aceptandoOrdenId === orden.id}
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle size={14} />
                    {aceptandoOrdenId === orden.id ? 'Aceptando...' : 'Aceptar orden'}
                  </button>
                </div>
              ))
            ))}

          {activeTab === 'misordenes' &&
            (ordenes.length === 0 ? (
              <div className="rounded-lg bg-white p-8 text-center shadow-md">
                <Wrench className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                <p className="text-gray-500">No tienes órdenes activas</p>
              </div>
            ) : (
              ordenes.map((orden) => (
                <div
                  key={orden.id}
                  onClick={() => {
                    setSelectedOrden(orden);
                    setShowPresupuestoForm(false);
                    setActionError('');
                  }}
                  className={`cursor-pointer rounded-lg bg-white p-4 shadow-md transition hover:shadow-lg ${
                    selectedOrden?.id === orden.id ? 'border-2 border-blue-700' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">Orden #{orden.id}</p>
                      <p className="text-sm text-gray-500">{orden.clienteNombre}</p>
                      <p className="text-sm text-gray-500">Vehículo: {orden.patente}</p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${getEstadoBadge(
                        orden.estado
                      )}`}
                    >
                      {getEstadoTexto(orden.estado)}
                    </span>
                  </div>
                </div>
              ))
            ))}
        </div>

        <div className="flex-1">
          {!selectedOrden ? (
            <div className="flex h-64 items-center justify-center rounded-lg bg-white p-12 text-center shadow-md">
              <div>
                <Wrench className="mx-auto mb-3 h-16 w-16 text-gray-300" />
                <p className="text-gray-400">Selecciona una orden para ver el detalle</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg bg-white p-6 shadow-md">
              {(() => {
                const factura = facturasPorOrden[selectedOrden.id];

                const puedeConfirmarPagoEfectivo =
                  factura?.metodoPago === 'EFECTIVO' &&
                  factura?.estadoPago === 'PENDIENTE_CONFIRMACION';

                const puedeConfirmarPagoSeguro =
                  factura?.metodoPago === 'SEGURO' &&
                  factura?.estadoPago === 'PENDIENTE_CONFIRMACION';

                return (
                  <>
                    <div className="mb-4 flex items-start justify-between">
                      <h2 className="text-xl font-bold">Orden #{selectedOrden.id}</h2>

                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${getEstadoBadge(
                          selectedOrden.estado
                        )}`}
                      >
                        {getEstadoTexto(selectedOrden.estado)}
                      </span>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <strong>Cliente:</strong> {selectedOrden.clienteNombre}
                      </div>
                      <div>
                        <strong>Vehículo:</strong> {selectedOrden.patente}
                      </div>
                      <div>
                        <strong>Tipo:</strong> {selectedOrden.tipoOrden}
                      </div>
                      <div>
                        <strong>Fecha:</strong>{' '}
                        {new Date(selectedOrden.fechaCreacion).toLocaleDateString('es-SV')}
                      </div>

                      {selectedOrden.fechaFinalizacionEstimada && (
                        <div>
                          <strong>Entrega estimada:</strong>{' '}
                          {new Date(selectedOrden.fechaFinalizacionEstimada).toLocaleDateString(
                            'es-SV'
                          )}
                        </div>
                      )}
                    </div>

                    {selectedOrden.comentarios && (
                      <div className="mb-4 rounded bg-gray-50 p-3 text-sm">
                        <strong>Comentarios:</strong> {selectedOrden.comentarios}
                      </div>
                    )}

                    {puedeConfirmarPagoEfectivo && (
                      <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                        <p className="font-semibold">Pago en efectivo pendiente de confirmación</p>
                        <p className="mt-1">
                          El cliente indicó que pagará esta factura en efectivo. Confirma el pago
                          solo cuando hayas recibido el dinero en el taller.
                        </p>
                      </div>
                    )}

                    {puedeConfirmarPagoSeguro && (
                      <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                        <p className="font-semibold">Pago de seguro pendiente de confirmación</p>
                        <p className="mt-1">
                          El cliente ha indicado que el seguro cubrirá esta factura. Confirma el pago
                          solo cuando hayas recibido la confirmación del seguro.
                        </p>
                      </div>
                    )}

                    {selectedOrden.servicios?.length > 0 && (
                      <div className="mb-4">
                        <h3 className="mb-2 flex items-center gap-1 font-semibold">
                          <Wrench size={16} /> Servicios
                        </h3>

                        {selectedOrden.servicios.map((servicio: any, index: number) => (
                          <div
                            key={`${servicio.servicioId || servicio.nombreServicio}-${index}`}
                            className="flex justify-between border-b py-1 text-sm text-gray-600 last:border-0"
                          >
                            <span>{servicio.nombreServicio}</span>
                            <span>${Number(servicio.precioAplicado || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedOrden.repuestos?.length > 0 && (
                      <div className="mb-4">
                        <h3 className="mb-2 flex items-center gap-1 font-semibold">
                          <Package size={16} /> Repuestos
                        </h3>

                        {selectedOrden.repuestos.map((repuesto: any, index: number) => (
                          <div
                            key={`${repuesto.repuestoId || repuesto.nombreRepuesto}-${index}`}
                            className="flex justify-between border-b py-1 text-sm text-gray-600 last:border-0"
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
                    )}

                    {selectedOrden.presupuestoTotal && (
                      <div className="mb-4 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm">
                        <strong className="text-yellow-800">
                          Presupuesto enviado: $
                          {Number(selectedOrden.presupuestoTotal).toFixed(2)}
                        </strong>

                        <p className="mt-1 text-yellow-700">
                          {selectedOrden.estado === 'PENDIENTE_APROBACION' ? (
                            'Esperando aprobación del cliente...'
                          ) : selectedOrden.estado === 'EN_PROGRESO' ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle size={16} /> Presupuesto aprobado por el cliente
                            </span>
                          ) : (
                            ''
                          )}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 border-t pt-4">
                      {selectedOrden.estado === 'PENDIENTE' && (
                        <button
                          type="button"
                          onClick={handleOpenPresupuesto}
                          className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm text-white hover:bg-yellow-600"
                        >
                          <DollarSign size={16} /> Enviar Presupuesto
                        </button>
                      )}

                      {selectedOrden.estado === 'EN_PROGRESO' && (
                        <button
                          type="button"
                          onClick={() => setOrdenACompletar(selectedOrden)}
                          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
                        >
                          <CheckCircle size={16} /> Marcar como Completada
                        </button>
                      )}

                      {puedeConfirmarPagoEfectivo && factura && (
                        <button
                          type="button"
                          onClick={() => {
                            void handleConfirmarPagoEfectivo(factura.id);
                          }}
                          disabled={confirmandoPagoFacturaId === factura.id}
                          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {confirmandoPagoFacturaId === factura.id
                            ? 'Confirmando pago...'
                            : '💰 Confirmar pago en efectivo'}
                        </button>
                      )}

                      {puedeConfirmarPagoSeguro && factura && (
                        <button
                          type="button"
                          onClick={() => {
                            void handleConfirmarPagoSeguro(factura.id);
                          }}
                          disabled={confirmandoPagoFacturaId === factura.id}
                          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {confirmandoPagoFacturaId === factura.id
                            ? 'Confirmando pago...'
                            : '✅ Confirmar pago del seguro'}
                        </button>
                      )}
                    </div>

                    {showPresupuestoForm && (
                      <form
                        onSubmit={handleEnviarPresupuesto}
                        className="mt-4 space-y-4 rounded-lg border-t bg-gray-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold">Enviar Presupuesto al Cliente</h4>
                            <p className="text-sm text-gray-500">
                              Agrega servicios o repuestos si el diagnóstico requiere trabajo
                              adicional.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={resetPresupuesto}
                            className="text-gray-400 hover:text-gray-600"
                            title="Cerrar"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <div className="rounded-lg bg-blue-50 p-3 text-blue-800">
                          <p className="text-sm">Total calculado sugerido:</p>
                          <p className="text-2xl font-bold">
                            ${totalPresupuestoCalculado.toFixed(2)}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              setPresupuestoForm({
                                ...presupuestoForm,
                                presupuestoTotal: totalPresupuestoCalculado.toFixed(2),
                              })
                            }
                            className="mt-2 rounded bg-blue-700 px-3 py-1.5 text-sm text-white hover:bg-blue-800"
                          >
                            Usar este total
                          </button>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Monto total ($) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={presupuestoForm.presupuestoTotal}
                            onChange={(e) =>
                              setPresupuestoForm({
                                ...presupuestoForm,
                                presupuestoTotal: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            placeholder="0.00"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Fecha estimada de entrega
                          </label>
                          <input
                            type="date"
                            value={presupuestoForm.fechaFinalizacionEstimada}
                            onChange={(e) =>
                              setPresupuestoForm({
                                ...presupuestoForm,
                                fechaFinalizacionEstimada: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Servicios adicionales
                          </label>

                          <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
                            {loadingCatalogos ? (
                              <p className="text-sm text-gray-500">Cargando servicios...</p>
                            ) : serviciosParaAgregar.length === 0 ? (
                              <p className="text-sm text-gray-500">
                                No hay servicios adicionales disponibles para agregar.
                              </p>
                            ) : (
                              serviciosParaAgregar.map((servicio) => (
                                <label
                                  key={servicio.id}
                                  className="flex cursor-pointer items-center justify-between gap-3 rounded p-2 hover:bg-gray-50"
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={serviciosExtra.includes(servicio.id)}
                                      onChange={() => {
                                        setServiciosExtra((prev) =>
                                          prev.includes(servicio.id)
                                            ? prev.filter((id) => id !== servicio.id)
                                            : [...prev, servicio.id]
                                        );
                                      }}
                                    />
                                    <span className="text-sm">{servicio.nombre}</span>
                                  </div>

                                  <span className="text-sm font-semibold text-blue-700">
                                    ${Number(servicio.precioBase || 0).toFixed(2)}
                                  </span>
                                </label>
                              ))
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Repuestos disponibles en esta sucursal
                          </label>

                          <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3">
                            {loadingCatalogos ? (
                              <p className="text-sm text-gray-500">Cargando repuestos...</p>
                            ) : inventarioSucursal.length === 0 ? (
                              <p className="text-sm text-gray-500">
                                No hay repuestos disponibles en esta sucursal.
                              </p>
                            ) : (
                              inventarioSucursal.map((item) => {
                                const repuestoId = getInventarioRepuestoId(item);
                                const nombre = getInventarioNombre(item);
                                const precio = getInventarioPrecio(item);
                                const stockTotal = Number(item.stockTotal || 0);
                                const seleccionado = repuestosSeleccionados.find(
                                  (repuesto) => repuesto.repuestoId === repuestoId
                                );

                                return (
                                  <div
                                    key={`${item.id}-${repuestoId || nombre}`}
                                    className="grid gap-2 rounded border border-gray-100 p-2 sm:grid-cols-[1fr_100px]"
                                  >
                                    <div>
                                      <p className="text-sm font-medium">{nombre}</p>
                                      <p className="text-xs text-gray-500">
                                        Stock: {stockTotal} | Precio: ${precio.toFixed(2)}
                                      </p>
                                    </div>

                                    <input
                                      type="number"
                                      min={0}
                                      max={stockTotal}
                                      value={seleccionado?.cantidad || ''}
                                      placeholder="Cant."
                                      className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                                      onChange={(e) => {
                                        const cantidad = Number(e.target.value);
                                        handleCantidadRepuesto(item, cantidad);
                                      }}
                                    />
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Comentarios
                          </label>
                          <textarea
                            value={presupuestoForm.comentarios}
                            onChange={(e) =>
                              setPresupuestoForm({
                                ...presupuestoForm,
                                comentarios: e.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                            rows={3}
                            placeholder="Detalles del trabajo a realizar..."
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="submit"
                            disabled={enviandoPresupuesto}
                            className="rounded-lg bg-blue-700 px-4 py-2 text-sm text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {enviandoPresupuesto ? 'Enviando...' : 'Enviar al Cliente'}
                          </button>

                          <button
                            type="button"
                            onClick={resetPresupuesto}
                            disabled={enviandoPresupuesto}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(ordenACompletar)}
        onClose={() => {
          if (!completandoOrden) {
            setOrdenACompletar(null);
          }
        }}
        title="Marcar orden como completada"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
            <p className="font-semibold">¿Quieres marcar esta orden como completada?</p>
            <p className="mt-1 text-sm">
              El cliente será notificado para proceder con el pago.
            </p>

            {ordenACompletar && (
              <div className="mt-3 text-sm">
                <p>
                  <span className="font-medium">Orden:</span> #{ordenACompletar.id}
                </p>
                <p>
                  <span className="font-medium">Vehículo:</span> {ordenACompletar.patente}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOrdenACompletar(null)}
              disabled={completandoOrden}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={confirmarCompletarOrden}
              disabled={completandoOrden}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {completandoOrden ? 'Completando...' : 'Sí, completar orden'}
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
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
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
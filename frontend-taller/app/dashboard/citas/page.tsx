'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { citaApi, sucursalApi, vehiculoApi, servicioApi, ordenApi } from '@/lib/api';
import { useClienteId } from '@/hooks/useClienteId';
import { Cita, Sucursal, Vehiculo, Servicio } from '@/types';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  X,
  CheckCircle,
  RefreshCw,
  Car,
  AlertCircle,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import CitaForm, { CitaFormData } from '@/components/forms/CitaForm';
import VehiculoForm, { VehiculoFormData } from '@/components/forms/VehiculoForm';

type ApiError = { response?: { data?: { message?: string } } };

type AppDialog = {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
} | null;

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as ApiError).response?.data?.message || fallback;

export default function CitasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const servicioParam = searchParams.get('servicio');

  const servicioPreseleccionadoId =
    servicioParam && Number.isFinite(Number(servicioParam))
      ? Number(servicioParam)
      : undefined;

  const { clienteId, loading: loadingCliente } = useClienteId();

  const requestIdRef = useRef(0);

  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [dialog, setDialog] = useState<AppDialog>(null);

  const [showCitaForm, setShowCitaForm] = useState(false);
  const [showVehiculoForm, setShowVehiculoForm] = useState(false);

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);

  const [citaACancelar, setCitaACancelar] = useState<Cita | null>(null);
  const [cancelandoCita, setCancelandoCita] = useState(false);

  const [bloquearAutoAperturaCatalogo, setBloquearAutoAperturaCatalogo] = useState(false);
  const [aceptandoReprogramacionId, setAceptandoReprogramacionId] = useState<number | null>(null);

  const serviciosActivos = useMemo(
    () => servicios.filter((servicio) => servicio.estado === 'ACTIVO'),
    [servicios]
  );

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

    window.setTimeout(() => {
      setActionError('');
    }, 5000);
  };

  const fetchData = useCallback(async () => {
    if (!clienteId) {
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError('');

    const [sucRes, vehRes, servRes, citasRes] = await Promise.allSettled([
      sucursalApi.getAll(),
      vehiculoApi.getByCliente(clienteId),
      servicioApi.getAll(),
      citaApi.getByCliente(clienteId),
    ]);

    if (requestId !== requestIdRef.current) return;

    if (sucRes.status === 'fulfilled') {
      setSucursales(sucRes.value.data);
    }

    if (vehRes.status === 'fulfilled') {
      setVehiculos(vehRes.value.data);
    }

    if (servRes.status === 'fulfilled') {
      setServicios(servRes.value.data);
    }

    if (citasRes.status === 'fulfilled') {
      setCitas(citasRes.value.data);
    } else {
      setCitas([]);
    }

    const falloDatosNecesarios =
      sucRes.status === 'rejected' ||
      vehRes.status === 'rejected' ||
      servRes.status === 'rejected';

    if (falloDatosNecesarios) {
      setError(
        'No se pudieron cargar todos los datos necesarios para agendar. Revisa tu conexión o intenta nuevamente.'
      );
    }

    setLoading(false);
  }, [clienteId]);

  useEffect(() => {
    if (!loadingCliente && clienteId) {
      void fetchData();
    }

    return () => {
      requestIdRef.current += 1;
    };
  }, [clienteId, loadingCliente, fetchData]);

  useEffect(() => {
    if (!servicioPreseleccionadoId) {
      setBloquearAutoAperturaCatalogo(false);
      return;
    }

    if (bloquearAutoAperturaCatalogo) return;

    const servicioExisteYActivo = serviciosActivos.some(
      (servicio) => servicio.id === servicioPreseleccionadoId
    );

    if (servicioExisteYActivo && vehiculos.length > 0 && sucursales.length > 0) {
      setShowCitaForm(true);
    }
  }, [
    servicioPreseleccionadoId,
    serviciosActivos,
    vehiculos.length,
    sucursales.length,
    bloquearAutoAperturaCatalogo,
  ]);

  const closeCitaForm = () => {
    setShowCitaForm(false);

    if (servicioParam) {
      router.replace('/dashboard/citas');
    }
  };

  const handleSubmitCita = async (data: CitaFormData) => {
    if (!clienteId) {
      showActionError('No se pudo identificar tu perfil de cliente.');
      return;
    }

    try {
      const sucursalId = Number(data.sucursalId);
      const hora = data.hora.length === 5 ? `${data.hora}:00` : data.hora;

      const citaRes = await citaApi.create({
        clienteId,
        sucursalId,
        fecha: data.fecha,
        hora,
        servicioIds: data.serviciosIds,
      });

      await ordenApi.create({
        citaId: citaRes.data?.id,
        patente: data.patente,
        clienteId,
        sucursalId,
        tipoOrden: 'ESTANDAR',
        servicios: data.serviciosIds.map((servicioId) => ({
          servicioId,
          precioAplicado:
            servicios.find((servicio) => servicio.id === servicioId)?.precioBase || 0,
        })),
        repuestos: [],
      });

      setBloquearAutoAperturaCatalogo(true);
      closeCitaForm();

      await fetchData();

      showSuccess('Cita creada correctamente. Espera a que un mecánico la acepte.');
    } catch (err) {
      showActionError(getErrorMessage(err, 'Error al crear cita.'));
      throw err;
    }
  };

  const handleSubmitVehiculo = async (data: VehiculoFormData) => {
    if (!clienteId) {
      showActionError(
        'No se pudo identificar tu perfil de cliente. Cierra sesión e inicia sesión nuevamente.'
      );
      return;
    }

    try {
      const payload = {
        ...data,
        clienteId,
        patente: data.patente.trim().toUpperCase(),
        marca: data.marca.trim(),
        modelo: data.modelo.trim(),
      };

      const response = await vehiculoApi.create(payload);

      setVehiculos((prev) => {
        const patenteCreada = response.data?.patente || payload.patente;
        const existe = prev.some((vehiculo) => vehiculo.patente === patenteCreada);

        if (existe) return prev;

        return [
          ...prev,
          {
            ...response.data,
            patente: patenteCreada,
            marca: response.data?.marca || payload.marca,
            modelo: response.data?.modelo || payload.modelo,
          },
        ];
      });

      setShowVehiculoForm(false);
      showSuccess('Vehículo registrado correctamente.');

      void fetchData();
    } catch (err) {
      showActionError(getErrorMessage(err, 'Error al registrar vehículo.'));
      throw err;
    }
  };

  const abrirConfirmacionCancelar = (cita: Cita) => {
    setCitaACancelar(cita);
  };

  const confirmarCancelacion = async () => {
    if (!citaACancelar) return;

    setCancelandoCita(true);

    try {
      await citaApi.cancelar(citaACancelar.id);
      await fetchData();

      setCitaACancelar(null);
      showSuccess('Cita cancelada correctamente.');
    } catch (err) {
      showActionError(getErrorMessage(err, 'Error al cancelar la cita.'));
    } finally {
      setCancelandoCita(false);
    }
  };

  const handleAceptarReprogramacion = async (citaId: number) => {
    setAceptandoReprogramacionId(citaId);

    try {
      await citaApi.aceptarReprogramacion(citaId);
      await fetchData();

      showSuccess('Nueva fecha aceptada correctamente.');

      setDialog({
        type: 'success',
        title: 'Reprogramación aceptada',
        message:
          'La nueva fecha propuesta por el mecánico fue aceptada correctamente. Tu cita quedó actualizada con la nueva fecha y hora.',
      });
    } catch (err) {
      const message = getErrorMessage(err, 'Error al aceptar la reprogramación.');

      showActionError(message);

      setDialog({
        type: 'error',
        title: 'No se pudo aceptar la reprogramación',
        message,
      });
    } finally {
      setAceptandoReprogramacionId(null);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const clases: Record<string, string> = {
      PROGRAMADA: 'bg-yellow-100 text-yellow-800',
      CONFIRMADA: 'bg-green-100 text-green-800',
      REPROGRAMADA: 'bg-orange-100 text-orange-800',
      COMPLETADA: 'bg-gray-100 text-gray-800',
      CANCELADA: 'bg-red-100 text-red-800',
    };

    return clases[estado] || 'bg-gray-100 text-gray-800';
  };

  if (loadingCliente || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700" />
      </div>
    );
  }

  if (!clienteId) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        No se pudo cargar tu perfil de cliente. Cierra sesión e inicia sesión nuevamente.
      </div>
    );
  }

  const noHayVehiculos = vehiculos.length === 0;
  const noHaySucursales = sucursales.length === 0;
  const noHayServiciosActivos = serviciosActivos.length === 0;

  const requisitosPendientes = [
    noHayVehiculos ? 'Registra al menos un vehículo.' : null,
    noHaySucursales
      ? 'No hay sucursales disponibles. Un administrador debe registrar al menos una sucursal.'
      : null,
    noHayServiciosActivos
      ? 'No hay servicios activos. Un administrador debe activar al menos un servicio del catálogo.'
      : null,
  ].filter(Boolean) as string[];

  const puedeCrearCita = requisitosPendientes.length === 0;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis Citas</h1>
          <p className="text-sm text-gray-500">
            Agenda y revisa el estado de tus visitas al taller.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowVehiculoForm(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Car size={16} /> Agregar vehículo
          </button>

          <button
            type="button"
            onClick={() => {
              if (!puedeCrearCita) return;
              setShowCitaForm(true);
            }}
            disabled={!puedeCrearCita}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
              puedeCrearCita
                ? 'bg-blue-700 hover:bg-blue-800'
                : 'cursor-not-allowed bg-gray-400'
            }`}
          >
            Nueva cita
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          {successMessage}
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {actionError}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {requisitosPendientes.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <p className="mb-2 font-semibold">
            Antes de crear una cita debes completar estos requisitos:
          </p>

          <ul className="list-inside list-disc space-y-1 text-sm">
            {requisitosPendientes.map((mensaje) => (
              <li key={mensaje}>{mensaje}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {citas.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-md">
            <CalendarIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <p className="text-gray-500">No tienes citas agendadas</p>
          </div>
        ) : (
          citas.map((cita) => (
            <div key={cita.id} className="rounded-lg bg-white p-6 shadow-md">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getEstadoBadge(
                        cita.estado
                      )}`}
                    >
                      {cita.estado}
                    </span>

                    {cita.mecanicoNombre && (
                      <span className="text-sm text-gray-500">
                        Mecánico: {cita.mecanicoNombre}
                      </span>
                    )}
                  </div>

                  <p className="flex items-center gap-2 text-gray-600">
                    <CalendarIcon size={16} />
                    {cita.fecha}
                  </p>

                  <p className="flex items-center gap-2 text-gray-600">
                    <Clock size={16} />
                    {String(cita.hora).slice(0, 5)}
                  </p>

                  <p className="flex items-center gap-2 text-gray-600">
                    <MapPin size={16} />
                    {cita.sucursalNombre}
                  </p>

                  {cita.servicios && cita.servicios.length > 0 && (
                    <p className="text-sm text-gray-500">
                      Servicios: {cita.servicios.join(', ')}
                    </p>
                  )}

                  {cita.estado === 'REPROGRAMADA' && cita.nuevaFechaPropuesta && (
                    <div className="mt-2 rounded border border-orange-200 bg-orange-50 p-2 text-sm">
                      <p className="flex items-center gap-1 font-medium text-orange-800">
                        <RefreshCw size={14} /> El mecánico propone nueva fecha:
                      </p>

                      <p className="text-orange-700">
                        {cita.nuevaFechaPropuesta} a las{' '}
                        {String(cita.nuevaHoraPropuesta || '').slice(0, 5)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {cita.estado === 'REPROGRAMADA' && (
                    <button
                      type="button"
                      onClick={() => handleAceptarReprogramacion(cita.id)}
                      disabled={aceptandoReprogramacionId === cita.id}
                      className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle size={14} />
                      {aceptandoReprogramacionId === cita.id
                        ? 'Aceptando...'
                        : 'Aceptar fecha'}
                    </button>
                  )}

                  {(cita.estado === 'PROGRAMADA' || cita.estado === 'REPROGRAMADA') && (
                    <button
                      type="button"
                      onClick={() => abrirConfirmacionCancelar(cita)}
                      className="text-red-600 hover:text-red-700"
                      title="Cancelar cita"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={showCitaForm}
        onClose={closeCitaForm}
        title="Agendar nueva cita"
        size="lg"
      >
        <CitaForm
          key={servicioPreseleccionadoId ?? 'nueva-cita'}
          sucursales={sucursales}
          vehiculos={vehiculos}
          servicios={servicios}
          servicioPreseleccionado={servicioPreseleccionadoId}
          onSubmit={handleSubmitCita}
          onClose={closeCitaForm}
          onAddVehiculo={() => {
            setShowCitaForm(false);
            setShowVehiculoForm(true);
          }}
        />
      </Modal>

      <Modal
        isOpen={showVehiculoForm}
        onClose={() => setShowVehiculoForm(false)}
        title="Registrar vehículo"
        size="md"
      >
        <VehiculoForm
          clienteId={clienteId}
          onSubmit={handleSubmitVehiculo}
          onClose={() => setShowVehiculoForm(false)}
        />
      </Modal>

      <Modal
        isOpen={Boolean(citaACancelar)}
        onClose={() => {
          if (!cancelandoCita) {
            setCitaACancelar(null);
          }
        }}
        title="Cancelar cita"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-semibold">¿Quieres cancelar esta cita?</p>

            {citaACancelar && (
              <div className="mt-2 space-y-1 text-sm">
                <p>
                  <span className="font-medium">Fecha:</span> {citaACancelar.fecha}
                </p>
                <p>
                  <span className="font-medium">Hora:</span>{' '}
                  {String(citaACancelar.hora).slice(0, 5)}
                </p>
                {'sucursalNombre' in citaACancelar && citaACancelar.sucursalNombre && (
                  <p>
                    <span className="font-medium">Sucursal:</span>{' '}
                    {citaACancelar.sucursalNombre}
                  </p>
                )}
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600">
            Esta acción cambiará el estado de la cita y no podrás revertirla desde esta pantalla.
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setCitaACancelar(null)}
              disabled={cancelandoCita}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              No, mantener cita
            </button>

            <button
              type="button"
              onClick={confirmarCancelacion}
              disabled={cancelandoCita}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelandoCita ? 'Cancelando...' : 'Sí, cancelar cita'}
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

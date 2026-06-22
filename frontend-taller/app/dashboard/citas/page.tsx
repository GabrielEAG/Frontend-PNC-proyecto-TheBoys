'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { citaApi, sucursalApi, vehiculoApi, servicioApi, ordenApi } from '@/lib/api';
import { useClienteId } from '@/hooks/useClienteId';
import { Cita, Sucursal, Vehiculo, Servicio } from '@/types';
import { Calendar as CalendarIcon, Clock, MapPin, X, CheckCircle, RefreshCw, Car } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import CitaForm, { CitaFormData } from '@/components/forms/CitaForm';
import VehiculoForm, { VehiculoFormData } from '@/components/forms/VehiculoForm';
import { useCallback } from 'react';

type ApiError = { response?: { data?: { message?: string } } };

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as ApiError).response?.data?.message || fallback;

export default function CitasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const servicioParam = searchParams.get('servicio');
  const servicioPreseleccionadoId = servicioParam && Number.isFinite(Number(servicioParam))
    ? Number(servicioParam)
    : undefined;
  const { clienteId, loading: loadingCliente } = useClienteId();

  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCitaForm, setShowCitaForm] = useState(false);
  const [showVehiculoForm, setShowVehiculoForm] = useState(false);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);

  const serviciosActivos = useMemo(
    () => servicios.filter((servicio) => servicio.estado === 'ACTIVO'),
    [servicios]
  );

  const fetchData = useCallback(async () => {
    if (!clienteId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [sucRes, vehRes, servRes, citasRes] = await Promise.all([
        sucursalApi.getAll(),
        vehiculoApi.getByCliente(clienteId),
        servicioApi.getAll(),
        citaApi.getByCliente(clienteId),
      ]);
      setSucursales(sucRes.data);
      setVehiculos(vehRes.data);
      setServicios(servRes.data);
      setCitas(citasRes.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Error al cargar tus citas'));
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {

  if (!loadingCliente && clienteId) {
    void fetchData();
  }

}, [clienteId, loadingCliente, fetchData]);

  useEffect(() => {
    if (servicioPreseleccionadoId && servicios.length > 0) {
      setShowCitaForm(true);
    }
  }, [servicioPreseleccionadoId, servicios.length]);

  const closeCitaForm = () => {
    setShowCitaForm(false);
    if (servicioParam) router.replace('/dashboard/citas');
  };

  const handleSubmitCita = async (data: CitaFormData) => {
    if (!clienteId) {
      alert('No se pudo identificar tu perfil de cliente');
      return;
    }

    try {
      const sucursalId = Number(data.sucursalId);
      const hora = data.hora.length === 5 ? `${data.hora}:00` : data.hora;

      await citaApi.create({
        clienteId,
        sucursalId,
        fecha: data.fecha,
        hora,
        servicioIds: data.serviciosIds,
      });

      await ordenApi.create({
        patente: data.patente,
        clienteId,
        sucursalId,
        tipoOrden: 'ESTANDAR',
        servicios: data.serviciosIds.map((servicioId) => ({
          servicioId,
          precioAplicado: servicios.find((servicio) => servicio.id === servicioId)?.precioBase || 0,
        })),
        repuestos: [],
      });

      await fetchData();
      alert('Cita y orden creadas. Espera a que un mecanico la acepte.');
    } catch (err) {
      alert(getErrorMessage(err, 'Error al crear cita'));
      throw err;
    }
  };

  const handleSubmitVehiculo = async (data: VehiculoFormData) => {
    try {
      await vehiculoApi.create(data);
      await fetchData();
      alert('Vehiculo registrado correctamente.');
    } catch (err) {
      const mensaje = getErrorMessage(
    err,
    'Error al registrar vehículo'
);
alert(mensaje);
      throw err;
    }
  };

  const handleCancelar = async (citaId: number) => {
    if (!confirm('Cancelar esta cita?')) return;
    try {
      await citaApi.cancelar(citaId);
      await fetchData();
    } catch (err) {
      alert(getErrorMessage(err, 'Error al cancelar'));
    }
  };

  const handleAceptarReprogramacion = async (citaId: number) => {
    try {
      await citaApi.aceptarReprogramacion(citaId);
      await fetchData();
      alert('Reprogramacion aceptada.');
    } catch (err) {
      alert(getErrorMessage(err, 'Error al aceptar reprogramacion'));
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
        No se pudo cargar tu perfil de cliente. Cierra sesion e inicia sesion nuevamente.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis Citas</h1>
          <p className="text-sm text-gray-500">Agenda y revisa el estado de tus visitas al taller.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowVehiculoForm(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Car size={16} /> Agregar vehiculo
          </button>
          <button
            onClick={() => setShowCitaForm(true)}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Nueva cita
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      {vehiculos.length === 0 && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
          <p className="font-medium">Aun no tienes vehiculos registrados.</p>
          <p className="text-sm">Agrega tu primer vehiculo para poder crear una cita.</p>
        </div>
      )}

      {sucursales.length === 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          No hay sucursales disponibles. Pide al administrador que registre al menos una sucursal.
        </div>
      )}

      {serviciosActivos.length === 0 && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          No hay servicios activos. Pide al administrador que active el catalogo de servicios.
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
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getEstadoBadge(cita.estado)}`}>
                      {cita.estado}
                    </span>
                    {cita.mecanicoNombre && (
                      <span className="text-sm text-gray-500">Mecanico: {cita.mecanicoNombre}</span>
                    )}
                  </div>
                  <p className="flex items-center gap-2 text-gray-600">
                    <CalendarIcon size={16} />
                    {cita.fecha}
                  </p>
                  <p className="flex items-center gap-2 text-gray-600">
                    <Clock size={16} />
                    {cita.hora}
                  </p>
                  <p className="flex items-center gap-2 text-gray-600">
                    <MapPin size={16} />
                    {cita.sucursalNombre}
                  </p>
                  {cita.servicios && cita.servicios.length > 0 && (
                    <p className="text-sm text-gray-500">Servicios: {cita.servicios.join(', ')}</p>
                  )}
                  {cita.estado === 'REPROGRAMADA' && cita.nuevaFechaPropuesta && (
                    <div className="mt-2 rounded border border-orange-200 bg-orange-50 p-2 text-sm">
                      <p className="flex items-center gap-1 font-medium text-orange-800">
                        <RefreshCw size={14} /> El mecanico propone nueva fecha:
                      </p>
                      <p className="text-orange-700">
                        {cita.nuevaFechaPropuesta} a las {cita.nuevaHoraPropuesta}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {cita.estado === 'REPROGRAMADA' && (
                    <button
                      onClick={() => handleAceptarReprogramacion(cita.id)}
                      className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
                    >
                      <CheckCircle size={14} /> Aceptar fecha
                    </button>
                  )}
                  {(cita.estado === 'PROGRAMADA' || cita.estado === 'REPROGRAMADA') && (
                    <button
                      onClick={() => handleCancelar(cita.id)}
                      className="text-red-600 hover:text-red-700"
                      title="Cancelar"
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

      <Modal isOpen={showCitaForm} onClose={closeCitaForm} title="Agendar nueva cita" size="lg">
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

      <Modal isOpen={showVehiculoForm} onClose={() => setShowVehiculoForm(false)} title="Registrar vehiculo" size="md">
        <VehiculoForm
          clienteId={clienteId}
          onSubmit={handleSubmitVehiculo}
          onClose={() => setShowVehiculoForm(false)}
        />
      </Modal>
    </div>
  );
}

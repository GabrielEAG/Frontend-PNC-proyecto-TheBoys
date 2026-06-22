'use client';

import { useMemo, useState } from 'react';
import { Sucursal, Vehiculo, Servicio } from '@/types';
import { Calendar, Clock, MapPin, Car, Wrench } from 'lucide-react';

export interface CitaFormData {
  sucursalId: string;
  patente: string;
  fecha: string;
  hora: string;
  serviciosIds: number[];
}

interface CitaFormProps {
  sucursales: Sucursal[];
  vehiculos: Vehiculo[];
  servicios: Servicio[];
  onSubmit: (data: CitaFormData) => Promise<void>;
  onClose: () => void;
  onAddVehiculo?: () => void;
  servicioPreseleccionado?: number;
}

const buildInitialForm = (servicioPreseleccionado?: number): CitaFormData => ({
  sucursalId: '',
  patente: '',
  fecha: '',
  hora: '',
  serviciosIds: servicioPreseleccionado ? [servicioPreseleccionado] : [],
});

export default function CitaForm({
  sucursales,
  vehiculos,
  servicios,
  onSubmit,
  onClose,
  onAddVehiculo,
  servicioPreseleccionado,
}: CitaFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CitaFormData>(() => buildInitialForm(servicioPreseleccionado));
  const [formError, setFormError] = useState('');

  const serviciosActivos = useMemo(
    () => servicios.filter((servicio) => servicio.estado === 'ACTIVO'),
    [servicios]
  );

  const horasDisponibles = useMemo(() => {
    const horas = Array.from({ length: 10 }, (_, i) => `${(9 + i).toString().padStart(2, '0')}:00`);
    const hoy = new Date().toISOString().split('T')[0];
    if (formData.fecha !== hoy) return horas;

    const ahora = new Date();
    return horas.filter((hora) => {
      const [hour] = hora.split(':').map(Number);
      return hour > ahora.getHours();
    });
  }, [formData.fecha]);

  const faltanDatosBase = sucursales.length === 0 || vehiculos.length === 0 || serviciosActivos.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setFormError('');

  if (loading) return;

  if (sucursales.length === 0) {
    setFormError('No hay sucursales disponibles para agendar una cita.');
    return;
  }

  if (vehiculos.length === 0) {
    setFormError('Debes registrar un vehículo antes de crear una cita.');
    return;
  }

  if (serviciosActivos.length === 0) {
    setFormError('No hay servicios activos para seleccionar.');
    return;
  }

  if (!formData.sucursalId || !formData.patente || !formData.fecha || !formData.hora) {
    setFormError('Completa todos los campos obligatorios.');
    return;
  }

  if (formData.serviciosIds.length === 0) {
    setFormError('Selecciona al menos un servicio.');
    return;
  }

  setLoading(true);

  try {
    await onSubmit(formData);
    onClose();
  } catch {
    setFormError('No se pudo crear la cita. Revisa los datos e intenta nuevamente.');
  } finally {
    setLoading(false);
  }
};

  const toggleServicio = (servicioId: number) => {
    setFormData((prev) => ({
      ...prev,
      serviciosIds: prev.serviciosIds.includes(servicioId)
        ? prev.serviciosIds.filter((id) => id !== servicioId)
        : [...prev.serviciosIds, servicioId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
  {faltanDatosBase && (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      {sucursales.length === 0 && <p>No hay sucursales disponibles para agendar.</p>}

      {vehiculos.length === 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>Registra un vehiculo antes de crear una cita.</p>
          {onAddVehiculo && (
            <button
              type="button"
              onClick={onAddVehiculo}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
            >
              Agregar vehiculo
            </button>
          )}
        </div>
      )}

      {serviciosActivos.length === 0 && <p>No hay servicios activos para seleccionar.</p>}
    </div>
  )}

  {formError && (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {formError}
    </div>
  )}

  <div>
    <label className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-700">
      <MapPin size={16} /> Sucursal *
    </label>
        <select
          value={formData.sucursalId}
          onChange={(e) => setFormData({ ...formData, sucursalId: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={sucursales.length === 0}
          required
        >
          <option value="">Seleccionar sucursal</option>
          {sucursales.map((sucursal) => (
            <option key={sucursal.id} value={sucursal.id}>
              {sucursal.nombre} - {sucursal.departamento}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-700">
          <Car size={16} /> Vehiculo *
        </label>
        <select
          value={formData.patente}
          onChange={(e) => setFormData({ ...formData, patente: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={vehiculos.length === 0}
          required
        >
          <option value="">Seleccionar vehiculo</option>
          {vehiculos.map((vehiculo) => (
            <option key={vehiculo.patente} value={vehiculo.patente}>
              {vehiculo.marca} {vehiculo.modelo} - {vehiculo.patente}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-700">
            <Calendar size={16} /> Fecha *
          </label>
          <input
            type="date"
            value={formData.fecha}
            onChange={(e) => setFormData({ ...formData, fecha: e.target.value, hora: '' })}
            min={new Date().toISOString().split('T')[0]}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-700">
            <Clock size={16} /> Hora *
          </label>
          <select
            value={formData.hora}
            onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!formData.fecha || horasDisponibles.length === 0}
            required
          >
            <option value="">Seleccionar hora</option>
            {horasDisponibles.map((hora) => (
              <option key={hora} value={hora}>
                {hora}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-700">
          <Wrench size={16} /> Servicios *
        </label>
        <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-2">
          {serviciosActivos.length === 0 ? (
            <p className="p-2 text-sm text-gray-500">No hay servicios activos.</p>
          ) : (
            serviciosActivos.map((servicio) => (
              <label
                key={servicio.id}
                className="flex cursor-pointer items-center gap-2 rounded p-2 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={formData.serviciosIds.includes(servicio.id)}
                  onChange={() => toggleServicio(servicio.id)}
                  className="rounded border-gray-300 text-blue-700 focus:ring-blue-500"
                />
                <span className="min-w-0 flex-1 text-sm">{servicio.nombre}</span>
                <span className="text-sm font-semibold text-blue-700">${servicio.precioBase.toFixed(2)}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        
<button
  type="submit"
  disabled={loading || faltanDatosBase}
  className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${
    loading || faltanDatosBase
      ? 'cursor-not-allowed bg-gray-400'
      : 'bg-blue-700 hover:bg-blue-800'
  }`}
>
  {loading ? 'Agendando...' : 'Agendar cita'}
</button>

      </div>
    </form>
  );
}

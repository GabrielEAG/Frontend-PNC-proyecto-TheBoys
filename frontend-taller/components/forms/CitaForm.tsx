'use client';

import { useState, useEffect } from 'react';
import { Sucursal, Vehiculo, Servicio } from '@/types';
import { Calendar, Clock, MapPin, Car, Wrench, X } from 'lucide-react';

interface CitaFormProps {
  sucursales: Sucursal[];
  vehiculos: Vehiculo[];
  servicios: Servicio[];
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
  servicioPreseleccionado?: number;
}

export default function CitaForm({
  sucursales, vehiculos, servicios, onSubmit, onClose, servicioPreseleccionado,
}: CitaFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    sucursalId: '',
    // ✅ Vehiculo no tiene id, usa patente como identificador
    patente: '',
    fecha: '',
    hora: '',
    serviciosIds: [] as number[],
  });

  useEffect(() => {
    if (servicioPreseleccionado && !formData.serviciosIds.includes(servicioPreseleccionado)) {
      setFormData(prev => ({ ...prev, serviciosIds: [...prev.serviciosIds, servicioPreseleccionado] }));
    }
  }, [servicioPreseleccionado]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sucursalId || !formData.patente || !formData.fecha || !formData.hora) {
      alert('Por favor completa todos los campos obligatorios'); return;
    }
    if (formData.serviciosIds.length === 0) { alert('Selecciona al menos un servicio'); return; }
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleServicio = (servicioId: number) => {
    setFormData(prev => ({
      ...prev,
      serviciosIds: prev.serviciosIds.includes(servicioId)
        ? prev.serviciosIds.filter(id => id !== servicioId)
        : [...prev.serviciosIds, servicioId],
    }));
  };

  const horasDisponibles = Array.from({ length: 11 }, (_, i) =>
    `${(9 + i).toString().padStart(2, '0')}:00`
  );

  return (
    <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Agendar Nueva Cita</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center gap-2">
              <MapPin size={16} /> Sucursal *
            </label>
            <select value={formData.sucursalId}
              onChange={e => setFormData({ ...formData, sucursalId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required>
              <option value="">Seleccionar sucursal</option>
              {sucursales.map(suc => (
                <option key={suc.id} value={suc.id}>{suc.nombre} - {suc.departamento}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center gap-2">
              <Car size={16} /> Vehículo *
            </label>
            <select value={formData.patente}
              onChange={e => setFormData({ ...formData, patente: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required>
              <option value="">Seleccionar vehículo</option>
              {/* ✅ usa patente como key y value, no id */}
              {vehiculos.map(veh => (
                <option key={veh.patente} value={veh.patente}>
                  {veh.marca} {veh.modelo} - {veh.patente}
                </option>
              ))}
            </select>
            <button type="button"
              onClick={() => window.location.href = '/dashboard/citas'}
              className="text-sm text-blue-600 mt-1 hover:underline">
              + Agregar nuevo vehículo
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center gap-2">
              <Calendar size={16} /> Fecha *
            </label>
            <input type="date" value={formData.fecha}
              onChange={e => setFormData({ ...formData, fecha: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center gap-2">
              <Clock size={16} /> Hora (9:00 - 19:00) *
            </label>
            <select value={formData.hora}
              onChange={e => setFormData({ ...formData, hora: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required>
              <option value="">Seleccionar hora</option>
              {horasDisponibles.map(hora => <option key={hora} value={hora}>{hora}</option>)}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2 flex items-center gap-2">
              <Wrench size={16} /> Servicios *
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
              {servicios.filter(s => s.estado === 'ACTIVO').map(serv => (
                <label key={serv.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input type="checkbox"
                    checked={formData.serviciosIds.includes(serv.id)}
                    onChange={() => toggleServicio(serv.id)}
                    className="rounded border-gray-300 text-blue-700 focus:ring-blue-500" />
                  <span className="flex-1">{serv.nombre}</span>
                  <span className="text-sm text-gray-500">${serv.precioBase.toFixed(2)}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50">
            {loading ? 'Agendando...' : 'Agendar Cita'}
          </button>
        </form>
      </div>
    </div>
  );
}

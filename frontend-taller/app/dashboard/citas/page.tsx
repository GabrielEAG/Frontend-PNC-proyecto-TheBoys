'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { citaApi, sucursalApi, vehiculoApi, servicioApi, ordenApi } from '@/lib/api';
import { useClienteId } from '@/hooks/useClienteId';
import { Cita, Sucursal, Vehiculo, Servicio } from '@/types';
import { Calendar as CalendarIcon, Clock, MapPin, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function CitasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const servicioPreseleccionado = searchParams.get('servicio');
  // ✅ ID real del cliente (no hardcodeado)
  const { clienteId, loading: loadingCliente } = useClienteId();

  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [formData, setFormData] = useState({
    sucursalId: '', patente: '', fecha: '', hora: '', serviciosIds: [] as number[],
  });

  useEffect(() => { if (clienteId) fetchData(); }, [clienteId]);

  useEffect(() => {
    if (servicioPreseleccionado && servicios.length > 0) {
      setFormData(prev => ({ ...prev, serviciosIds: [parseInt(servicioPreseleccionado)] }));
      setShowForm(true);
    }
  }, [servicioPreseleccionado, servicios]);

  const fetchData = async () => {
    if (!clienteId) return;
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sucursalId || !formData.patente || !formData.fecha || !formData.hora) {
      alert('Completa todos los campos obligatorios'); return;
    }
    if (formData.serviciosIds.length === 0) { alert('Selecciona al menos un servicio'); return; }
    try {
      // 1. Crear la cita con los servicios seleccionados
      await citaApi.create({
        clienteId,
        sucursalId: parseInt(formData.sucursalId),
        fecha: formData.fecha,
        hora: formData.hora + ':00',
        servicioIds: formData.serviciosIds,
      });
      // 2. Crear la orden de trabajo
      // ✅ clienteId (no clientId)
      await ordenApi.create({
        patente: formData.patente,
        clienteId,
        sucursalId: parseInt(formData.sucursalId),
        tipoOrden: 'ESTANDAR',
        servicios: formData.serviciosIds.map(sid => ({
          servicioId: sid,
          precioAplicado: servicios.find(s => s.id === sid)?.precioBase || 0,
        })),
        repuestos: [],
      });
      alert('¡Cita y orden creadas! Espera a que un mecánico la acepte.');
      setShowForm(false);
      setFormData({ sucursalId: '', patente: '', fecha: '', hora: '', serviciosIds: [] });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al crear cita');
    }
  };

  const handleCancelar = async (citaId: number) => {
    if (confirm('¿Cancelar esta cita?')) {
      try { await citaApi.cancelar(citaId); fetchData(); }
      catch (err: any) { alert(err.response?.data?.message || 'Error al cancelar'); }
    }
  };

  // ✅ NUEVO: cliente acepta reprogramación propuesta por mecánico
  const handleAceptarReprogramacion = async (citaId: number) => {
    try {
      await citaApi.aceptarReprogramacion(citaId);
      fetchData();
      alert('Reprogramación aceptada.');
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
  };

  const getEstadoBadge = (estado: string) => {
    const clases: Record<string, string> = {
      PROGRAMADA:   'bg-yellow-100 text-yellow-800',
      CONFIRMADA:   'bg-green-100 text-green-800',
      REPROGRAMADA: 'bg-orange-100 text-orange-800',
      COMPLETADA:   'bg-gray-100 text-gray-800',
      CANCELADA:    'bg-red-100 text-red-800',
    };
    return clases[estado] || 'bg-gray-100 text-gray-800';
  };

  if (loadingCliente || loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mis Citas</h1>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg">
          + Nueva Cita
        </button>
      </div>

      <div className="space-y-4">
        {citas.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No tienes citas agendadas</p>
          </div>
        ) : citas.map(cita => (
          <div key={cita.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadge(cita.estado)}`}>
                    {cita.estado}
                  </span>
                  {cita.mecanicoNombre && <span className="text-sm text-gray-500">Mecánico: {cita.mecanicoNombre}</span>}
                </div>
                <p className="flex items-center gap-2 text-gray-600"><CalendarIcon size={16} />{cita.fecha}</p>
                <p className="flex items-center gap-2 text-gray-600"><Clock size={16} />{cita.hora}</p>
                <p className="flex items-center gap-2 text-gray-600"><MapPin size={16} />{cita.sucursalNombre}</p>
                {cita.servicios && cita.servicios.length > 0 && (
                  <p className="text-sm text-gray-500">Servicios: {cita.servicios.join(', ')}</p>
                )}
                {/* ✅ NUEVO: mostrar propuesta de reprogramación */}
                {cita.estado === 'REPROGRAMADA' && cita.nuevaFechaPropuesta && (
                  <div className="mt-2 bg-orange-50 border border-orange-200 rounded p-2 text-sm">
                    <p className="text-orange-800 font-medium flex items-center gap-1">
                      <RefreshCw size={14} /> El mecánico propone nueva fecha:
                    </p>
                    <p className="text-orange-700">{cita.nuevaFechaPropuesta} a las {cita.nuevaHoraPropuesta}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                {cita.estado === 'REPROGRAMADA' && (
                  <button onClick={() => handleAceptarReprogramacion(cita.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1">
                    <CheckCircle size={14} /> Aceptar fecha
                  </button>
                )}
                {(cita.estado === 'PROGRAMADA' || cita.estado === 'REPROGRAMADA') && (
                  <button onClick={() => handleCancelar(cita.id)}
                    className="text-red-600 hover:text-red-700" title="Cancelar">
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal nueva cita */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Agendar Nueva Cita</h2>
                <button onClick={() => setShowForm(false)}><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Sucursal *</label>
                  <select value={formData.sucursalId}
                    onChange={e => setFormData({ ...formData, sucursalId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Seleccionar sucursal</option>
                    {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre} - {s.departamento}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Vehículo *</label>
                  <select value={formData.patente}
                    onChange={e => setFormData({ ...formData, patente: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Seleccionar vehículo</option>
                    {vehiculos.map(v => <option key={v.patente} value={v.patente}>{v.marca} {v.modelo} - {v.patente}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Fecha *</label>
                  <input type="date" value={formData.fecha}
                    onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Hora (9:00 - 19:00) *</label>
                  <select value={formData.hora}
                    onChange={e => setFormData({ ...formData, hora: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Seleccionar hora</option>
                    {Array.from({ length: 11 }, (_, i) => `${(9 + i).toString().padStart(2, '0')}:00`).map(h =>
                      <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Servicios *</label>
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                    {servicios.filter(s => s.estado === 'ACTIVO').map(serv => (
                      <label key={serv.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox"
                          checked={formData.serviciosIds.includes(serv.id)}
                          onChange={e => setFormData({
                            ...formData,
                            serviciosIds: e.target.checked
                              ? [...formData.serviciosIds, serv.id]
                              : formData.serviciosIds.filter(id => id !== serv.id),
                          })} />
                        <span className="flex-1 text-sm">{serv.nombre}</span>
                        <span className="text-sm font-semibold text-blue-600">${serv.precioBase.toFixed(2)}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit"
                  className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-lg">
                  Agendar Cita
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

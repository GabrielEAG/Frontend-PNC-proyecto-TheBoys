'use client';

import { useEffect, useState } from 'react';
import { citaApi } from '@/lib/api';
import { useMecanicoId } from '@/hooks/useClienteId';
import { Cita } from '@/types';
import { Calendar, Clock, MapPin, Car, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

type TabType = 'pendientes' | 'miscitas';

export default function MecanicoCitasPage() {
  const { mecanicoId, loading: loadingMec } = useMecanicoId();
  const [activeTab, setActiveTab] = useState<TabType>('pendientes');
  const [citasPendientes, setCitasPendientes] = useState<Cita[]>([]);
  const [misCitas, setMisCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReprogramar, setShowReprogramar] = useState<number | null>(null);
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaHora, setNuevaHora] = useState('');

  useEffect(() => {
    if (mecanicoId) fetchCitas();
  }, [mecanicoId]);

  const fetchCitas = async () => {
    if (!mecanicoId) return;
    try {
      setLoading(true);
      // ✅ GET /citas/pendientes — las sin mecánico para que el mecánico las acepte
      const [pendientesRes, misRes] = await Promise.all([
        citaApi.getPendientes(),
        citaApi.getByMecanico(mecanicoId),
      ]);
      setCitasPendientes(pendientesRes.data);
      setMisCitas(misRes.data);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ PATCH /citas/{id}/aceptar?mecanicoId=X
  const handleAceptar = async (citaId: number) => {
    if (!mecanicoId) return;
    try {
      await citaApi.aceptar(citaId, mecanicoId);
      fetchCitas();
      alert('Cita aceptada. Ahora aparece en "Mis Citas".');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al aceptar cita');
    }
  };

  const handleCancelar = async (citaId: number) => {
    if (confirm('¿Cancelar esta cita?')) {
      try {
        await citaApi.cancelar(citaId);
        fetchCitas();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Error al cancelar');
      }
    }
  };

  // ✅ PATCH /citas/{id}/reprogramar
  const handleReprogramar = async (citaId: number) => {
    if (!nuevaFecha || !nuevaHora) { alert('Selecciona fecha y hora'); return; }
    try {
      await citaApi.reprogramar(citaId, { nuevaFecha, nuevaHora: `${nuevaHora}:00` });
      setShowReprogramar(null);
      setNuevaFecha('');
      setNuevaHora('');
      fetchCitas();
      alert('Nueva fecha propuesta enviada al cliente.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al reprogramar');
    }
  };

  const getEstadoBadge = (estado: string) => {
    const clases: Record<string, string> = {
      PROGRAMADA:  'bg-blue-100 text-blue-800',
      CONFIRMADA:  'bg-green-100 text-green-800',
      REPROGRAMADA:'bg-yellow-100 text-yellow-800',
      COMPLETADA:  'bg-gray-100 text-gray-800',
      CANCELADA:   'bg-red-100 text-red-800',
    };
    return clases[estado] || 'bg-gray-100 text-gray-800';
  };

  if (loadingMec || loading) {
    return <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
    </div>;
  }

  const CitaCard = ({ cita, showAccept }: { cita: Cita; showAccept: boolean }) => (
    <div className="bg-white rounded-lg shadow-md p-5 mb-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{cita.clienteNombre}</h3>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Calendar size={14} />{cita.fecha}</span>
            <span className="flex items-center gap-1"><Clock size={14} />{cita.hora}</span>
            <span className="flex items-center gap-1"><MapPin size={14} />{cita.sucursalNombre}</span>
          </div>
          {cita.servicios && cita.servicios.length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-gray-500">Servicios: </span>
              <span className="text-xs text-gray-700">{cita.servicios.join(', ')}</span>
            </div>
          )}
          {/* Reprogramación propuesta */}
          {cita.estado === 'REPROGRAMADA' && cita.nuevaFechaPropuesta && (
            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
              Nueva fecha propuesta: {cita.nuevaFechaPropuesta} a las {cita.nuevaHoraPropuesta}
            </div>
          )}
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadge(cita.estado)}`}>
          {cita.estado}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 pt-3 border-t">
        {showAccept && (
          <button
            onClick={() => handleAceptar(cita.id)}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
          >
            <CheckCircle size={14} /> Aceptar
          </button>
        )}
        {!showAccept && cita.estado !== 'CANCELADA' && cita.estado !== 'COMPLETADA' && (
          <>
            <button
              onClick={() => { setShowReprogramar(cita.id); setNuevaFecha(''); setNuevaHora(''); }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
            >
              <RefreshCw size={14} /> Proponer nueva fecha
            </button>
            <button
              onClick={() => handleCancelar(cita.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1"
            >
              <XCircle size={14} /> Cancelar
            </button>
          </>
        )}
      </div>

      {/* Modal inline de reprogramar */}
      {showReprogramar === cita.id && (
        <div className="mt-3 pt-3 border-t bg-gray-50 rounded-lg p-3">
          <h4 className="font-medium text-sm mb-2">Proponer nueva fecha</h4>
          <div className="flex gap-2 flex-wrap">
            <input type="date" value={nuevaFecha} onChange={e => setNuevaFecha(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm" min={new Date().toISOString().split('T')[0]} />
            <select value={nuevaHora} onChange={e => setNuevaHora(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm">
              <option value="">Hora</option>
              {Array.from({ length: 10 }, (_, i) => `${9 + i}:00`).map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <button onClick={() => handleReprogramar(cita.id)}
              className="bg-blue-700 text-white px-3 py-1 rounded text-sm">Enviar</button>
            <button onClick={() => setShowReprogramar(null)}
              className="border border-gray-300 px-3 py-1 rounded text-sm">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Gestión de Citas</h1>

      <div className="flex gap-2 mb-6 border-b">
        <button onClick={() => setActiveTab('pendientes')}
          className={`px-4 py-2 font-medium transition ${activeTab === 'pendientes' ? 'border-b-2 border-blue-700 text-blue-700' : 'text-gray-500'}`}>
          Citas disponibles ({citasPendientes.length})
        </button>
        <button onClick={() => setActiveTab('miscitas')}
          className={`px-4 py-2 font-medium transition ${activeTab === 'miscitas' ? 'border-b-2 border-blue-700 text-blue-700' : 'text-gray-500'}`}>
          Mis citas ({misCitas.length})
        </button>
      </div>

      {activeTab === 'pendientes' && (
        citasPendientes.length === 0
          ? <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay citas disponibles para aceptar</p>
            </div>
          : citasPendientes.map(c => <CitaCard key={c.id} cita={c} showAccept={true} />)
      )}

      {activeTab === 'miscitas' && (
        misCitas.length === 0
          ? <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No tienes citas asignadas</p>
            </div>
          : misCitas.map(c => <CitaCard key={c.id} cita={c} showAccept={false} />)
      )}
    </div>
  );
}

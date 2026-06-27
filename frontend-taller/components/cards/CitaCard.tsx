'use client';

import { Cita } from '@/types';
import { Calendar, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface CitaCardProps {
  cita: Cita;
  onAceptar?: (id: number) => void;
  onCancelar?: (id: number) => void;
  onAceptarReprogramacion?: (id: number) => void;
  showActions?: boolean;
  rol?: 'CLIENTE' | 'MECANICO' | 'ADMIN';
}

export default function CitaCard({
  cita, onAceptar, onCancelar, onAceptarReprogramacion, showActions = true, rol = 'CLIENTE'
}: CitaCardProps) {

  const getEstadoInfo = () => {
    switch (cita.estado) {
      case 'CONFIRMADA':
        return { icon: <CheckCircle className="text-green-600" size={18} />, text: 'Confirmada', color: 'bg-green-100 text-green-800' };
      case 'CANCELADA':
        return { icon: <XCircle className="text-red-600" size={18} />, text: 'Cancelada', color: 'bg-red-100 text-red-800' };
      case 'REPROGRAMADA':
        return { icon: <RefreshCw className="text-orange-500" size={18} />, text: 'Reprogramada', color: 'bg-orange-100 text-orange-800' };
      case 'COMPLETADA':
        return { icon: <CheckCircle className="text-gray-500" size={18} />, text: 'Completada', color: 'bg-gray-100 text-gray-800' };
      case 'PROGRAMADA':
      default:
        return { icon: <AlertCircle className="text-yellow-600" size={18} />, text: 'Programada', color: 'bg-yellow-100 text-yellow-800' };
    }
  };

  const estadoInfo = getEstadoInfo();

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          {estadoInfo.icon}
          <span className="text-sm font-medium">Cita #{cita.id}</span>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${estadoInfo.color}`}>
          {estadoInfo.text}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar size={16} /><span className="text-sm">{cita.fecha}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <Clock size={16} /><span className="text-sm">{cita.hora}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin size={16} /><span className="text-sm">{cita.sucursalNombre}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600">
          <User size={16} /><span className="text-sm">{cita.clienteNombre}</span>
        </div>
        {cita.mecanicoNombre && (
          <div className="flex items-center gap-2 text-gray-600">
            <span className="text-sm font-medium">Mecánico:</span>
            <span className="text-sm">{cita.mecanicoNombre}</span>
          </div>
        )}
        {cita.servicios && cita.servicios.length > 0 && (
          <p className="text-xs text-gray-500">Servicios: {cita.servicios.join(', ')}</p>
        )}
        {cita.estado === 'REPROGRAMADA' && cita.nuevaFechaPropuesta && (
          <div className="bg-orange-50 border border-orange-200 rounded p-2 text-xs text-orange-800">
            Nueva fecha propuesta: {cita.nuevaFechaPropuesta} a las {cita.nuevaHoraPropuesta}
          </div>
        )}
      </div>

      {showActions && (
        <div className="flex gap-2 pt-4 border-t">
          {rol === 'MECANICO' && cita.estado === 'PROGRAMADA' && onAceptar && (
            <button onClick={() => onAceptar(cita.id)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center justify-center gap-1">
              <CheckCircle size={14} /> Aceptar
            </button>
          )}
          {rol === 'CLIENTE' && cita.estado === 'REPROGRAMADA' && onAceptarReprogramacion && (
            <button onClick={() => onAceptarReprogramacion(cita.id)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center justify-center gap-1">
              <CheckCircle size={14} /> Aceptar nueva fecha
            </button>
          )}
          {rol === 'CLIENTE' && (cita.estado === 'PROGRAMADA' || cita.estado === 'REPROGRAMADA') && onCancelar && (
            <button onClick={() => onCancelar(cita.id)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center justify-center gap-1">
              <XCircle size={14} /> Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// components/cards/ServicioCard.tsx
'use client';

import { Servicio } from '@/types';
import { Wrench, Clock, DollarSign, Calendar } from 'lucide-react';

interface ServicioCardProps {
  servicio: Servicio;
  onAgendar?: (servicioId: number) => void;
}

export default function ServicioCard({ servicio, onAgendar }: ServicioCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Wrench className="text-blue-700" size={24} />
          </div>
          <span className="text-2xl font-bold text-blue-700">${servicio.precioBase.toFixed(2)}</span>
        </div>
        
        <h3 className="text-xl font-semibold mb-2">{servicio.nombre}</h3>
        <p className="text-gray-600 mb-4 line-clamp-2">{servicio.descripcion}</p>
        
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Clock size={16} />
          <span>{servicio.tiempoEstimadoMinutos} minutos</span>
        </div>

        {/* Badge de estado */}
        {servicio.estado === 'INACTIVO' && (
          <div className="mb-4">
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
              Temporalmente no disponible
            </span>
          </div>
        )}
        
        {onAgendar && servicio.estado === 'ACTIVO' && (
          <button
            onClick={() => onAgendar(servicio.id)}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Calendar size={18} />
            Agendar Cita
          </button>
        )}

        {servicio.estado === 'INACTIVO' && (
          <button
            disabled
            className="w-full bg-gray-300 cursor-not-allowed text-gray-500 py-2 rounded-lg flex items-center justify-center gap-2"
          >
            <Calendar size={18} />
            No disponible
          </button>
        )}
      </div>
    </div>
  );
}
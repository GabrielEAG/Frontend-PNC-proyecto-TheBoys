'use client';

import { OrdenTrabajo } from '@/types';
import { Clock, CheckCircle, AlertCircle, Wrench, Package, DollarSign, CreditCard } from 'lucide-react';
import Link from 'next/link';

interface OrdenCardProps {
  orden: OrdenTrabajo;
  onAprobarPresupuesto?: (id: number) => void;
  onRechazarPresupuesto?: (id: number) => void;
  showActions?: boolean;
  rol?: 'CLIENTE' | 'MECANICO' | 'ADMIN';
}

export default function OrdenCard({
  orden, onAprobarPresupuesto, onRechazarPresupuesto, showActions = true, rol = 'CLIENTE'
}: OrdenCardProps) {

  const totalServicios = orden.servicios?.reduce((s, x) => s + x.precioAplicado, 0) || 0;
  const totalRepuestos = orden.repuestos?.reduce((s, x) => s + x.precioAplicado * x.cantidad, 0) || 0;
  const totalOrden = orden.presupuestoTotal ?? (totalServicios + totalRepuestos);

  const getEstadoInfo = () => {
    const estados: Record<string, { color: string; text: string; icon: any }> = {
      PENDIENTE:            { color: 'bg-gray-100 text-gray-800',    text: 'Pendiente',           icon: Clock },
      PENDIENTE_APROBACION: { color: 'bg-yellow-100 text-yellow-800',text: 'Esperando aprobación', icon: AlertCircle },
      EN_PROGRESO:          { color: 'bg-blue-100 text-blue-800',    text: 'En Progreso',          icon: Wrench },
      COMPLETADA:           { color: 'bg-green-100 text-green-800',  text: 'Completada',           icon: CheckCircle },
      CANCELADA:            { color: 'bg-red-100 text-red-800',      text: 'Cancelada',            icon: AlertCircle },
    };
    return estados[orden.estado] || { color: 'bg-gray-100 text-gray-800', text: orden.estado, icon: Clock };
  };

  const estadoInfo = getEstadoInfo();
  const IconEstado = estadoInfo.icon;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold">Orden #{orden.id}</h3>
          </div>
          <p className="text-sm text-gray-500">{new Date(orden.fechaCreacion).toLocaleDateString('es-SV')}</p>
          <p className="text-sm text-gray-600 mt-1">Vehículo: {orden.patente}</p>
          {orden.mecanicoNombre && <p className="text-sm text-gray-500">Mecánico: {orden.mecanicoNombre}</p>}
          {orden.sucursalNombre && <p className="text-sm text-gray-500">Sucursal: {orden.sucursalNombre}</p>}
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${estadoInfo.color}`}>
          <IconEstado size={12} />{estadoInfo.text}
        </span>
      </div>

      {orden.presupuestoTotal && (
        <div className="mb-3 bg-yellow-50 border border-yellow-200 rounded p-2 flex items-center gap-2 text-sm">
          <DollarSign size={14} className="text-yellow-600" />
          <span className="text-yellow-800 font-medium">Presupuesto: ${orden.presupuestoTotal.toFixed(2)}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-3">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Wrench size={14} /><span>{orden.servicios?.length || 0} servicios</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Package size={14} /><span>{orden.repuestos?.length || 0} repuestos</span>
          </div>
        </div>
        <p className="text-xl font-bold text-blue-700">${totalOrden.toFixed(2)}</p>
      </div>

      {showActions && (
        <div className="flex gap-2 pt-4 border-t">
          {rol === 'CLIENTE' && orden.estado === 'PENDIENTE_APROBACION' && onAprobarPresupuesto && (
            <>
              <button onClick={() => onAprobarPresupuesto(orden.id)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center justify-center gap-1">
                <CheckCircle size={14} /> Aprobar
              </button>
              {onRechazarPresupuesto && (
                <button onClick={() => onRechazarPresupuesto(orden.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center justify-center gap-1">
                  <AlertCircle size={14} /> Rechazar
                </button>
              )}
            </>
          )}
          {rol === 'CLIENTE' && orden.estado === 'COMPLETADA' && (
            <Link href={`/dashboard/pago/${orden.id}`}
              className="flex-1 bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-sm flex items-center justify-center gap-1">
              <CreditCard size={14} /> Pagar
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

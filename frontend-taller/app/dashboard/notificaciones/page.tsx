'use client';

import { useNotificaciones } from '@/hooks/useNotificaciones';
import { Bell, CheckCircle, Circle, Wrench, Calendar, DollarSign } from 'lucide-react';

// ✅ Íconos basados en el campo "tipo" que devuelve el backend
const getIcono = (tipo: string) => {
  if (tipo?.includes('PRESUPUESTO')) return <DollarSign className="text-yellow-600" size={20} />;
  if (tipo?.includes('ORDEN'))       return <Wrench className="text-blue-600" size={20} />;
  if (tipo?.includes('CITA'))        return <Calendar className="text-green-600" size={20} />;
  return <Bell className="text-gray-600" size={20} />;
};

// ✅ Etiqueta legible del tipo
const getTipoLabel = (tipo: string) => {
  const labels: Record<string, string> = {
    PRESUPUESTO:          'Nuevo presupuesto',
    PRESUPUESTO_APROBADO: 'Presupuesto aprobado',
    PRESUPUESTO_RECHAZADO:'Presupuesto rechazado',
    ORDEN_LISTA:          'Orden lista',
    CITA_CONFIRMADA:      'Cita confirmada',
    CITA_REPROGRAMADA:    'Cita reprogramada',
    REPROGRAMACION_ACEPTADA: 'Reprogramación aceptada',
    PAGO:                 'Pago recibido',
  };
  return labels[tipo] || tipo;
};

export default function NotificacionesPage() {
  const { notificaciones, noLeidas, loading, marcarLeida, marcarTodasLeidas } = useNotificaciones();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          {noLeidas > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              Tienes {noLeidas} notificación{noLeidas !== 1 ? 'es' : ''} sin leer
            </p>
          )}
        </div>
        {noLeidas > 0 && (
          <button
            onClick={marcarTodasLeidas}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
          >
            <CheckCircle size={16} />
            Marcar todas como leídas
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notificaciones.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No tienes notificaciones</p>
          </div>
        ) : (
          notificaciones.map((notif) => (
            <div
              key={notif.id}
              className={`bg-white rounded-lg shadow-md p-4 transition ${
                !notif.leida ? 'border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">{getIcono(notif.tipo)}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      {/* ✅ Usa tipo como título y mensaje como descripción */}
                      <h3 className={`font-semibold ${!notif.leida ? 'text-blue-700' : ''}`}>
                        {getTipoLabel(notif.tipo)}
                      </h3>
                      <p className="text-gray-600 mt-1">{notif.mensaje}</p>
                      {/* ✅ usa fechaCreacion, no fecha */}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notif.fechaCreacion).toLocaleString('es-SV')}
                      </p>
                    </div>
                    {!notif.leida && (
                      <button
                        onClick={() => marcarLeida(notif.id)}
                        className="text-gray-400 hover:text-blue-600 ml-4"
                        title="Marcar como leída"
                      >
                        <Circle size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

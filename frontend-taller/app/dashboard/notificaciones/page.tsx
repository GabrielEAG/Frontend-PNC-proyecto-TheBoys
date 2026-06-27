
'use client';

import { useNotificaciones } from '@/hooks/useNotificaciones';
import { Bell, Calendar, CheckCircle, Circle, DollarSign, Wrench } from 'lucide-react';

const getIcono = (tipo: string) => {
  if (tipo?.includes('PRESUPUESTO')) {
    return <DollarSign className="text-yellow-600" size={20} />;
  }

  if (tipo?.includes('ORDEN')) {
    return <Wrench className="text-blue-600" size={20} />;
  }

  if (tipo?.includes('CITA')) {
    return <Calendar className="text-green-600" size={20} />;
  }

  return <Bell className="text-gray-600" size={20} />;
};

const getTipoLabel = (tipo: string) => {
  const labels: Record<string, string> = {
    PRESUPUESTO: 'Nuevo presupuesto',
    PRESUPUESTO_APROBADO: 'Presupuesto aprobado',
    PRESUPUESTO_RECHAZADO: 'Presupuesto rechazado',
    ORDEN_LISTA: 'Orden lista',
    CITA_CONFIRMADA: 'Cita confirmada',
    CITA_REPROGRAMADA: 'Cita reprogramada',
    REPROGRAMACION_ACEPTADA: 'Reprogramación aceptada',
    PAGO: 'Pago recibido',
  };

  return labels[tipo] || tipo;
};

export default function NotificacionesPage() {
  const {
    notificaciones,
    noLeidas,
    loading,
    marcarLeida,
    marcarTodasLeidas,
  } = useNotificaciones();

  const handleMarcarLeida = async (id: number) => {
    await marcarLeida(id);

    window.dispatchEvent(new CustomEvent('notifications:updated'));
  };

  const handleMarcarTodasLeidas = async () => {
    await marcarTodasLeidas();

    window.dispatchEvent(new CustomEvent('notifications:updated'));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>

          {noLeidas > 0 ? (
            <p className="mt-1 text-sm text-gray-500">
              Tienes {noLeidas} notificación{noLeidas !== 1 ? 'es' : ''} sin leer
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              No tienes notificaciones pendientes de lectura
            </p>
          )}
        </div>

        {noLeidas > 0 && (
          <button
            type="button"
            onClick={handleMarcarTodasLeidas}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <CheckCircle size={16} />
            Marcar todas como leídas
          </button>
        )}
      </div>

      <div className="space-y-3">
        {notificaciones.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-md">
            <Bell className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <p className="text-gray-500">No tienes notificaciones</p>
          </div>
        ) : (
          notificaciones.map((notif) => (
            <div
              key={notif.id}
              className={`relative rounded-lg bg-white p-5 pr-28 shadow-md transition ${
                !notif.leida
                  ? 'border-l-4 border-l-blue-600'
                  : 'border border-gray-100 opacity-80'
              }`}
            >
              <div className="absolute right-4 top-4">
                {notif.leida ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                    <CheckCircle size={14} />
                    Leída
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleMarcarLeida(notif.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition hover:text-blue-600"
                    title="Marcar como leída"
                    aria-label="Marcar notificación como leída"
                  >
                    <Circle size={18} />
                  </button>
                )}
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0">{getIcono(notif.tipo)}</div>

                <div className="min-w-0 flex-1">
                  <h3
                    className={`font-semibold ${
                      !notif.leida ? 'text-blue-700' : 'text-gray-900'
                    }`}
                  >
                    {getTipoLabel(notif.tipo)}
                  </h3>

                  <p className="mt-1 text-gray-600">{notif.mensaje}</p>

                  <p className="mt-2 text-xs text-gray-400">
                    {new Date(notif.fechaCreacion).toLocaleString('es-SV')}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { citaApi } from '@/lib/api';
import { useMecanicoId } from '@/hooks/useClienteId';
import { Cita } from '@/types';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';

type TabType = 'pendientes' | 'miscitas';

type AppDialog = {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
} | null;

type ReprogramacionForm = {
  citaId: number | null;
  nuevaFecha: string;
  nuevaHora: string;
};

const emptyReprogramacionForm: ReprogramacionForm = {
  citaId: null,
  nuevaFecha: '',
  nuevaHora: '',
};

const horasDisponibles = Array.from({ length: 10 }, (_, index) => {
  const hora = 9 + index;
  return `${hora.toString().padStart(2, '0')}:00`;
});

const getErrorMessage = (err: any, fallback: string) => {
  return err?.response?.data?.message || fallback;
};

const formatHoraForApi = (hora: string) => {
  if (!hora) return '';
  return hora.length === 5 ? `${hora}:00` : hora;
};

export default function MecanicoCitasPage() {
  const { mecanicoId, sucursalId, loading: loadingMec } = useMecanicoId();

  const requestIdRef = useRef(0);

  const [activeTab, setActiveTab] = useState<TabType>('pendientes');
  const [citasPendientes, setCitasPendientes] = useState<Cita[]>([]);
  const [misCitas, setMisCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [dialog, setDialog] = useState<AppDialog>(null);

  const [aceptandoCitaId, setAceptandoCitaId] = useState<number | null>(null);
  const [reprogramandoCitaId, setReprogramandoCitaId] = useState<number | null>(null);
  const [cancelandoCita, setCancelandoCita] = useState(false);

  const [reprogramacionForm, setReprogramacionForm] =
    useState<ReprogramacionForm>(emptyReprogramacionForm);

  const [citaACancelar, setCitaACancelar] = useState<Cita | null>(null);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setActionError('');

    window.setTimeout(() => {
      setSuccessMessage('');
    }, 4000);
  };

  const showActionError = (message: string) => {
    setActionError(message);
    setSuccessMessage('');
  };

  const showDialog = (config: NonNullable<AppDialog>) => {
    setDialog(config);
  };

  const fetchCitas = useCallback(async () => {
    if (!mecanicoId || !sucursalId) return;

    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setError('');

      const [pendientesRes, misRes] = await Promise.all([
        citaApi.getPendientes(sucursalId),
        citaApi.getByMecanico(mecanicoId),
      ]);

      if (requestId !== requestIdRef.current) return;

      setCitasPendientes(pendientesRes.data);

      setMisCitas(
        misRes.data.filter(
          (cita: Cita) => !['CANCELADA', 'COMPLETADA'].includes(cita.estado)
        )
      );
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;

      setError(
        getErrorMessage(
          err,
          'No se pudieron cargar las citas del mecánico.'
        )
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [mecanicoId, sucursalId]);

  useEffect(() => {
    if (loadingMec) return;

    if (!mecanicoId || !sucursalId) {
      setCitasPendientes([]);
      setMisCitas([]);
      setLoading(false);
      setError('No se encontró un perfil de mecánico o una sucursal asignada para esta cuenta.');
      return;
    }

    void fetchCitas();

    return () => {
      requestIdRef.current += 1;
    };
  }, [mecanicoId, sucursalId, loadingMec, fetchCitas]);

  const handleAceptar = async (citaId: number) => {
    if (!mecanicoId) {
      showActionError('No se pudo identificar tu perfil de mecánico.');
      return;
    }

    setAceptandoCitaId(citaId);

    try {
      await citaApi.aceptar(citaId, mecanicoId);

      await fetchCitas();

      setActiveTab('miscitas');

      showSuccess('Cita aceptada correctamente. Ahora aparece en “Mis citas”.');

      showDialog({
        type: 'success',
        title: 'Cita aceptada',
        message:
          'La cita fue aceptada correctamente. Ahora puedes darle seguimiento desde la pestaña “Mis citas”.',
      });
    } catch (err: any) {
      showDialog({
        type: 'error',
        title: 'No se pudo aceptar la cita',
        message: getErrorMessage(
          err,
          'No se pudo aceptar la cita. Intenta nuevamente.'
        ),
      });
    } finally {
      setAceptandoCitaId(null);
    }
  };

  const abrirFormularioReprogramacion = (cita: Cita) => {
    setActionError('');

    setReprogramacionForm({
      citaId: cita.id,
      nuevaFecha: cita.nuevaFechaPropuesta || '',
      nuevaHora: cita.nuevaHoraPropuesta
        ? String(cita.nuevaHoraPropuesta).slice(0, 5)
        : '',
    });
  };

  const cerrarFormularioReprogramacion = () => {
    setReprogramacionForm(emptyReprogramacionForm);
  };

  const handleReprogramar = async (citaId: number) => {
    if (!reprogramacionForm.nuevaFecha || !reprogramacionForm.nuevaHora) {
      showActionError('Selecciona una nueva fecha y hora para enviar la propuesta.');
      return;
    }

    setReprogramandoCitaId(citaId);

    try {
      await citaApi.reprogramar(citaId, {
        nuevaFecha: reprogramacionForm.nuevaFecha,
        nuevaHora: formatHoraForApi(reprogramacionForm.nuevaHora),
      });

      await fetchCitas();

      cerrarFormularioReprogramacion();

      showSuccess('Propuesta de nueva fecha enviada correctamente.');

      showDialog({
        type: 'success',
        title: 'Propuesta enviada',
        message:
          'La propuesta de cambio de fecha fue enviada correctamente al cliente. La cita se actualizó y queda pendiente de respuesta del cliente.',
      });
    } catch (err: any) {
      showDialog({
        type: 'error',
        title: 'No se pudo proponer la nueva fecha',
        message: getErrorMessage(
          err,
          'No se pudo proponer una nueva fecha. Verifica la disponibilidad e intenta nuevamente.'
        ),
      });
    } finally {
      setReprogramandoCitaId(null);
    }
  };

  const confirmarCancelacion = async () => {
    if (!citaACancelar) return;

    setCancelandoCita(true);

    try {
      await citaApi.cancelar(citaACancelar.id);

      await fetchCitas();

      setCitaACancelar(null);

      showSuccess('Cita cancelada correctamente.');

      showDialog({
        type: 'success',
        title: 'Cita cancelada',
        message: 'La cita fue cancelada correctamente y el cliente será notificado.',
      });
    } catch (err: any) {
      showDialog({
        type: 'error',
        title: 'No se pudo cancelar la cita',
        message: getErrorMessage(
          err,
          'No se pudo cancelar la cita. Intenta nuevamente.'
        ),
      });
    } finally {
      setCancelandoCita(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const clases: Record<string, string> = {
      PROGRAMADA: 'bg-blue-100 text-blue-800',
      CONFIRMADA: 'bg-green-100 text-green-800',
      REPROGRAMADA: 'bg-yellow-100 text-yellow-800',
      COMPLETADA: 'bg-gray-100 text-gray-800',
      CANCELADA: 'bg-red-100 text-red-800',
    };

    return clases[estado] || 'bg-gray-100 text-gray-800';
  };

  const renderReprogramacionInfo = (cita: Cita) => {
    if (cita.estado !== 'REPROGRAMADA' || !cita.nuevaFechaPropuesta) {
      return null;
    }

    return (
      <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
        <p className="font-semibold">Nueva fecha propuesta al cliente</p>
        <p className="mt-1">
          Fecha: {cita.nuevaFechaPropuesta} | Hora:{' '}
          {String(cita.nuevaHoraPropuesta || '').slice(0, 5)}
        </p>
        <p className="mt-1 text-xs">
          El cliente debe aceptar esta propuesta para confirmar el cambio.
        </p>
      </div>
    );
  };

  const renderReprogramacionForm = (cita: Cita) => {
    if (reprogramacionForm.citaId !== cita.id) return null;

    return (
      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="mb-3 text-sm font-semibold">Proponer nueva fecha</h4>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Nueva fecha
            </label>
            <input
              type="date"
              value={reprogramacionForm.nuevaFecha}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) =>
                setReprogramacionForm((prev) => ({
                  ...prev,
                  nuevaFecha: e.target.value,
                }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Nueva hora
            </label>
            <select
              value={reprogramacionForm.nuevaHora}
              onChange={(e) =>
                setReprogramacionForm((prev) => ({
                  ...prev,
                  nuevaHora: e.target.value,
                }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Hora</option>
              {horasDisponibles.map((hora) => (
                <option key={hora} value={hora}>
                  {hora}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={reprogramandoCitaId === cita.id}
            onClick={() => handleReprogramar(cita.id)}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reprogramandoCitaId === cita.id ? 'Enviando...' : 'Enviar'}
          </button>

          <button
            type="button"
            disabled={reprogramandoCitaId === cita.id}
            onClick={cerrarFormularioReprogramacion}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  };

  const CitaCard = ({ cita, showAccept }: { cita: Cita; showAccept: boolean }) => {
    const puedeGestionar =
      !showAccept &&
      ['PROGRAMADA', 'CONFIRMADA', 'REPROGRAMADA'].includes(cita.estado);

    return (
      <div className="mb-4 rounded-lg bg-white p-5 shadow-md">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{cita.clienteNombre}</h3>

            <div className="mt-1 flex flex-wrap gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {cita.fecha}
              </span>

              <span className="flex items-center gap-1">
                <Clock size={14} />
                {String(cita.hora).slice(0, 5)}
              </span>

              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {cita.sucursalNombre}
              </span>
            </div>

            {cita.servicios && cita.servicios.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-gray-500">Servicios: </span>
                <span className="text-xs text-gray-700">
                  {cita.servicios.join(', ')}
                </span>
              </div>
            )}

            {renderReprogramacionInfo(cita)}
          </div>

          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${getEstadoBadge(
              cita.estado
            )}`}
          >
            {cita.estado}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-3">
          {showAccept && (
            <button
              type="button"
              onClick={() => handleAceptar(cita.id)}
              disabled={aceptandoCitaId === cita.id}
              className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle size={14} />
              {aceptandoCitaId === cita.id ? 'Aceptando...' : 'Aceptar'}
            </button>
          )}

          {puedeGestionar && (
            <>
              <button
                type="button"
                onClick={() => abrirFormularioReprogramacion(cita)}
                className="flex items-center gap-1 rounded-lg bg-yellow-500 px-3 py-1.5 text-sm text-white hover:bg-yellow-600"
              >
                <RefreshCw size={14} />
                Proponer nueva fecha
              </button>

              <button
                type="button"
                onClick={() => setCitaACancelar(cita)}
                className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
              >
                <XCircle size={14} />
                Cancelar
              </button>
            </>
          )}
        </div>

        {renderReprogramacionForm(cita)}
      </div>
    );
  };

  if (loadingMec || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Gestión de Citas</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          {successMessage}
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {actionError}
        </div>
      )}

      <div className="mb-6 flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setActiveTab('pendientes')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'pendientes'
              ? 'border-b-2 border-blue-700 text-blue-700'
              : 'text-gray-500'
          }`}
        >
          Citas disponibles ({citasPendientes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('miscitas')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'miscitas'
              ? 'border-b-2 border-blue-700 text-blue-700'
              : 'text-gray-500'
          }`}
        >
          Mis citas ({misCitas.length})
        </button>
      </div>

      {activeTab === 'pendientes' &&
        (citasPendientes.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-md">
            <Calendar className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <p className="text-gray-500">No hay citas disponibles para aceptar</p>
          </div>
        ) : (
          citasPendientes.map((cita) => (
            <CitaCard key={cita.id} cita={cita} showAccept />
          ))
        ))}

      {activeTab === 'miscitas' &&
        (misCitas.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-md">
            <Calendar className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            <p className="text-gray-500">No tienes citas asignadas</p>
          </div>
        ) : (
          misCitas.map((cita) => (
            <CitaCard key={cita.id} cita={cita} showAccept={false} />
          ))
        ))}

      <Modal
        isOpen={Boolean(citaACancelar)}
        onClose={() => {
          if (!cancelandoCita) {
            setCitaACancelar(null);
          }
        }}
        title="Cancelar cita"
        size="md"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-semibold">¿Quieres cancelar esta cita?</p>
            <p className="mt-1 text-sm">
              Esta acción cambiará el estado de la cita y notificará al cliente.
            </p>

            {citaACancelar && (
              <div className="mt-3 space-y-1 text-sm">
                <p>
                  <span className="font-medium">Cliente:</span>{' '}
                  {citaACancelar.clienteNombre}
                </p>
                <p>
                  <span className="font-medium">Fecha:</span>{' '}
                  {citaACancelar.fecha}
                </p>
                <p>
                  <span className="font-medium">Hora:</span>{' '}
                  {String(citaACancelar.hora).slice(0, 5)}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setCitaACancelar(null)}
              disabled={cancelandoCita}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              No, mantener cita
            </button>

            <button
              type="button"
              onClick={confirmarCancelacion}
              disabled={cancelandoCita}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelandoCita ? 'Cancelando...' : 'Sí, cancelar cita'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(dialog)}
        onClose={() => setDialog(null)}
        title={dialog?.title || 'Mensaje'}
        size="md"
      >
        {dialog && (
          <div className="space-y-4">
            <div
              className={`rounded-lg border p-4 ${
                dialog.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : dialog.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              <div className="flex items-start gap-2">
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
                <p>{dialog.message}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
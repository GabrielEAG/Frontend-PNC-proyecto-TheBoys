'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { User, Mail, Phone, MapPin, Save } from 'lucide-react';
import { clienteApi, usuarioApi } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';

type PerfilFormData = {
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
};

const EMPTY_FORM: PerfilFormData = {
  nombre: '',
  email: '',
  telefono: '',
  direccion: '',
};

export default function PerfilPage() {
  const { user, setUser } = useAuthStore();

  const [clienteId, setClienteId] = useState<number | null>(null);
  const [formData, setFormData] = useState<PerfilFormData>(EMPTY_FORM);
  const [initialData, setInitialData] = useState<PerfilFormData>(EMPTY_FORM);

  const [loading, setLoading] = useState(false);
  const [loadingPerfil, setLoadingPerfil] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const hasChanges = useMemo(() => {
    return (
      formData.nombre.trim() !== initialData.nombre.trim() ||
      formData.telefono.trim() !== initialData.telefono.trim() ||
      formData.direccion.trim() !== initialData.direccion.trim()
    );
  }, [formData, initialData]);

  useEffect(() => {
    const cargarCliente = async () => {
      if (!user) {
        setLoadingPerfil(false);
        return;
      }

      setLoadingPerfil(true);
      setMessage('');

      try {
        const response = await clienteApi.getByUsuarioId(user.id);

        const loadedData: PerfilFormData = {
          nombre: user.nombre || '',
          email: user.email || '',
          telefono: response.data.telefono || '',
          direccion: response.data.direccion || '',
        };

        setClienteId(response.data.id);
        setFormData(loadedData);
        setInitialData(loadedData);
      } catch {
        const fallbackData: PerfilFormData = {
          nombre: user.nombre || '',
          email: user.email || '',
          telefono: '',
          direccion: '',
        };

        setClienteId(null);
        setFormData(fallbackData);
        setInitialData(fallbackData);
      } finally {
        setLoadingPerfil(false);
      }
    };

    void cargarCliente();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !hasChanges || loading) return;

    if (!formData.nombre.trim()) {
      setMessageType('error');
      setMessage('El nombre no puede estar vacío.');
      return;
    }

    if (!clienteId) {
      setMessageType('error');
      setMessage('No se pudo identificar tu perfil de cliente.');
      return;
    }

    if (!formData.telefono.trim()) {
      setMessageType('error');
      setMessage('El teléfono es requerido.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      await usuarioApi.updateMe({
        nombre: formData.nombre.trim(),
        apellido: user.apellido || '',
      });

      await clienteApi.update(clienteId, {
        usuarioId: user.id,
        telefono: formData.telefono.trim(),
        direccion: formData.direccion.trim(),
      });

      const savedData: PerfilFormData = {
        ...formData,
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        direccion: formData.direccion.trim(),
      };

      setFormData(savedData);
      setInitialData(savedData);

      setUser({
        ...user,
        nombre: savedData.nombre,
      });

      setMessageType('success');
      setMessage('Perfil actualizado exitosamente.');
    } catch (err) {
      setMessageType('error');
      setMessage(getApiErrorMessage(err, 'Error al actualizar perfil.'));
    } finally {
      setLoading(false);
    }
  };

  if (loadingPerfil) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mi Perfil</h1>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-10 w-10 text-blue-700" />
            </div>

            <div>
              <h2 className="text-xl font-semibold">{user?.nombre}</h2>
              <p className="text-gray-500 capitalize">
                Rol: {user?.rol?.toLowerCase()}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Nombre Completo
              </label>

              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />

                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Correo Electrónico
              </label>

              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />

                <input
                  type="email"
                  value={formData.email}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  disabled
                  readOnly
                />
              </div>

              <p className="text-xs text-gray-500 mt-1">
                El correo no puede ser modificado
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Teléfono
              </label>

              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />

                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) =>
                    setFormData({ ...formData, telefono: e.target.value })
                  }
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1234-5678"
                />
              </div>

              <p className="text-xs text-gray-500 mt-1">
                Ingresa un número válido, por ejemplo: 7777-0000
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Dirección
              </label>

              <div className="relative">
                <MapPin
                  className="absolute left-3 top-3 text-gray-400"
                  size={18}
                />

                <textarea
                  value={formData.direccion}
                  onChange={(e) =>
                    setFormData({ ...formData, direccion: e.target.value })
                  }
                  className="h-28 w-full resize-none pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  maxLength={255}
                  placeholder="Colonia, Calle, #"
                />
              </div>

              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Máximo 255 caracteres.</span>
                <span>{formData.direccion.length}/255</span>
              </div>
            </div>

            {message && (
              <div
                className={`mb-4 p-3 rounded-lg ${
                  messageType === 'success'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !hasChanges}
              className={`w-full font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 text-white ${
                loading || !hasChanges
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-700 hover:bg-blue-800'
              }`}
            >
              <Save size={18} />
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
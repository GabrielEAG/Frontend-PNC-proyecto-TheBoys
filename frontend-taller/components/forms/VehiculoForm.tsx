'use client';

import { useEffect, useState } from 'react';

export interface VehiculoFormData {
  patente: string;
  marca: string;
  modelo: string;
  clienteId: number;
}

interface VehiculoFormProps {
  onSubmit: (data: VehiculoFormData) => Promise<void>;
  onClose: () => void;
  clienteId?: number | null;
}

export default function VehiculoForm({ onSubmit, onClose, clienteId }: VehiculoFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<VehiculoFormData>({
    patente: '',
    marca: '',
    modelo: '',
    clienteId: clienteId ?? 0,
  });

  useEffect(() => {
    setFormData((prev) => ({ ...prev, clienteId: clienteId ?? 0 }));
  }, [clienteId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      alert('No se pudo identificar tu perfil de cliente');
      return;
    }
    if (!formData.patente || !formData.marca || !formData.modelo) {
      alert('Completa los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        patente: formData.patente.trim().toUpperCase(),
        marca: formData.marca.trim(),
        modelo: formData.modelo.trim(),
        clienteId,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!clienteId && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          No se pudo cargar tu perfil de cliente. Cierra sesion e inicia sesion otra vez.
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-bold text-gray-700">Patente *</label>
        <input
          type="text"
          value={formData.patente}
          onChange={(e) => setFormData({ ...formData, patente: e.target.value.toUpperCase() })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="ABC-1234"
          maxLength={20}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-gray-700">Marca *</label>
        <input
          type="text"
          value={formData.marca}
          onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Toyota, Honda, Nissan..."
          maxLength={50}
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-gray-700">Modelo *</label>
        <input
          type="text"
          value={formData.modelo}
          onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Corolla, Civic, Sentra..."
          maxLength={50}
          required
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading || !clienteId}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Registrando...' : 'Registrar vehiculo'}
        </button>
      </div>
    </form>
  );
}

'use client';

import { useState } from 'react';
import { Car, X } from 'lucide-react';

interface VehiculoFormProps {
  onSubmit: (data: any) => Promise<void>;
  onClose: () => void;
  clienteId?: number;
}

export default function VehiculoForm({ onSubmit, onClose, clienteId }: VehiculoFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patente: '',
    marca: '',
    modelo: '',
    clienteId: clienteId || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patente || !formData.marca || !formData.modelo) {
      alert('Por favor completa los campos obligatorios'); return;
    }
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar el vehículo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Car size={20} /> Registrar Vehículo
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X size={24} /></button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Patente *</label>
          <input type="text" value={formData.patente}
            onChange={e => setFormData({ ...formData, patente: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            placeholder="ABC-1234" required />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Marca *</label>
          <input type="text" value={formData.marca}
            onChange={e => setFormData({ ...formData, marca: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Toyota, Honda, Nissan..." required />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Modelo *</label>
          <input type="text" value={formData.modelo}
            onChange={e => setFormData({ ...formData, modelo: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Corolla, Civic, Sentra..." required />
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50">
          {loading ? 'Registrando...' : 'Registrar Vehículo'}
        </button>
      </form>
    </div>
  );
}

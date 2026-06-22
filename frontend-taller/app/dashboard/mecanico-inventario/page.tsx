'use client';

import { useCallback, useEffect, useState } from 'react';
import { inventarioApi } from '@/lib/api';
import { useMecanicoId } from '@/hooks/useClienteId';
import { Inventario } from '@/types';
import { Package } from 'lucide-react';

const CATEGORIAS = [
  'MOTOR',
  'FRENOS',
  'SUSPENSION',
  'TRANSMISION',
  'ELECTRICO',
  'FILTROS',
  'LLANTAS',
  'CARROCERIA',
  'AIRE_ACONDICIONADO',
  'LUBRICANTES',
  'OTROS',
];

export default function MecanicoInventarioPage() {
  const { mecanicoId, sucursalId, loading: loadingMec } = useMecanicoId();
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoria, setCategoria] = useState('');
  const [nombre, setNombre] = useState('');

  const fetchInventario = useCallback(async () => {
    if (!sucursalId) return;
    try {
      setLoading(true);
      setError('');
      const res = await inventarioApi.filtrar(
        sucursalId,
        categoria || undefined,
        nombre.trim() || undefined
      );
      setInventario(res.data);
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el inventario de la sucursal.');
    } finally {
      setLoading(false);
    }
  }, [sucursalId, categoria, nombre]);

  useEffect(() => {
    if (loadingMec) return;
    if (!mecanicoId || !sucursalId) {
      setInventario([]);
      setLoading(false);
      setError('No se encontro un perfil de mecanico o una sucursal asignada para esta cuenta.');
      return;
    }

    void fetchInventario();
  }, [mecanicoId, sucursalId, loadingMec, fetchInventario]);

  if (loadingMec || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-700" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Inventario de mi Sucursal</h1>

      {error && (
        <div className="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">{error}</div>
      )}

      <div className="mb-6 rounded-lg bg-white p-4 shadow-md">
        <div className="grid items-end gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Categoria</label>
            <select
              value={categoria}
              onChange={(event) => setCategoria(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">Todas</option>
              {CATEGORIAS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Buscar por nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Nombre del repuesto..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>

          <button
            onClick={() => void fetchInventario()}
            className="rounded-lg bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
          >
            Buscar
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow-md">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Repuesto', 'Categoria', 'Precio Unit.', 'Stock disponible'].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {inventario.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  <Package className="mx-auto mb-2 h-12 w-12 text-gray-300" />
                  Sin repuestos en inventario
                </td>
              </tr>
            ) : (
              inventario.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.repuesto}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{item.categoria}</span>
                  </td>
                  <td className="px-4 py-3">${item.precioUnitario?.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${item.stockTotal < 5 ? 'text-red-600' : 'text-green-600'}`}>
                      {item.stockTotal}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

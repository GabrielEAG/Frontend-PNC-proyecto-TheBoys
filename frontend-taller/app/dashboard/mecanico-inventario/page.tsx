'use client';

import { useEffect, useState } from 'react';
import { inventarioApi, sucursalApi } from '@/lib/api';
import { useMecanicoId } from '@/hooks/useClienteId';
import { mecanicoApi } from '@/lib/api';
import { Inventario } from '@/types';
import { Package, Search } from 'lucide-react';

const CATEGORIAS = ['MOTOR','FRENOS','SUSPENSION','TRANSMISION','ELECTRICO','FILTROS','LLANTAS','CARROCERIA','AIRE_ACONDICIONADO','LUBRICANTES','OTROS'];

export default function MecanicoInventarioPage() {
  const { mecanicoId, loading: loadingMec } = useMecanicoId();
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [sucursalId, setSucursalId] = useState<number | null>(null);
  const [categoria, setCategoria] = useState('');
  const [nombre, setNombre] = useState('');

  useEffect(() => {
    if (!mecanicoId) return;
    // Obtener sucursal del mecánico
    mecanicoApi.getById(mecanicoId).then(res => {
      const sid = res.data.sucursalId;
      setSucursalId(sid);
      fetchInventario(sid);
    });
  }, [mecanicoId]);

  const fetchInventario = async (sid?: number) => {
    const id = sid || sucursalId;
    if (!id) return;
    try {
      setLoading(true);
      const res = await inventarioApi.filtrar(id, categoria || undefined, nombre || undefined);
      setInventario(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loadingMec || loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Inventario de mi Sucursal</h1>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">Todas</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Buscar por nombre</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Nombre del repuesto..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <button onClick={() => fetchInventario()}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg">
            Buscar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {['Repuesto','Categoría','Precio Unit.','Stock disponible'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {inventario.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                Sin repuestos en inventario
              </td></tr>
            ) : inventario.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{item.repuesto}</td>
                <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">{item.categoria}</span></td>
                <td className="px-4 py-3">${item.precioUnitario?.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${item.stockTotal < 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {item.stockTotal} {item.stockTotal < 5 && '⚠️'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

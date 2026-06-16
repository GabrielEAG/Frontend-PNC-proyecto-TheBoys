'use client';

import { useEffect, useState } from 'react';
import { sucursalApi, mecanicoApi } from '@/lib/api';
import { Sucursal } from '@/types';
import { Building2, Plus, Edit, Trash2, MapPin, X } from 'lucide-react';

const DEPARTAMENTOS = ['Ahuachapán','Santa Ana','Sonsonate','Chalatenango','La Libertad','San Salvador','Cuscatlán','La Paz','Cabañas','San Vicente','Usulután','San Miguel','Morazán','La Unión'];

export default function AdminSucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Sucursal | null>(null);
  const [mecanicosPorSucursal, setMecanicosPorSucursal] = useState<Record<number, number>>({});
  const [formData, setFormData] = useState({ nombre: '', departamento: '', direccion: '' });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [sucRes, mecRes] = await Promise.all([sucursalApi.getAll(), mecanicoApi.getAll()]);
      setSucursales(sucRes.data);
      const conteo: Record<number, number> = {};
      mecRes.data.forEach((m: any) => { if (m.sucursalId) conteo[m.sucursalId] = (conteo[m.sucursalId] || 0) + 1; });
      setMecanicosPorSucursal(conteo);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editando) {
        await sucursalApi.update(editando.id, formData);
        alert('Sucursal actualizada');
      } else {
        await sucursalApi.create(formData);
        alert('Sucursal creada');
      }
      setShowModal(false);
      setEditando(null);
      setFormData({ nombre: '', departamento: '', direccion: '' });
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleEditar = (suc: Sucursal) => {
    setEditando(suc);
    setFormData({ nombre: suc.nombre, departamento: suc.departamento, direccion: suc.direccion });
    setShowModal(true);
  };

  const handleEliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta sucursal?')) return;
    try {
      await sucursalApi.delete(id);
      fetchData();
    } catch (err: any) {
      // ✅ El backend ya valida que no haya mecánicos
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Sucursales</h1>
        <button onClick={() => { setEditando(null); setFormData({ nombre:'', departamento:'', direccion:'' }); setShowModal(true); }}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={18} /> Nueva Sucursal
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sucursales.map(suc => (
          <div key={suc.id} className="bg-white rounded-lg shadow-md p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Building2 className="text-blue-700" size={24} /></div>
              <div className="flex gap-2">
                <button onClick={() => handleEditar(suc)} className="text-blue-600 hover:text-blue-700"><Edit size={18} /></button>
                <button onClick={() => handleEliminar(suc.id)} className="text-red-600 hover:text-red-700"><Trash2 size={18} /></button>
              </div>
            </div>
            <h3 className="font-bold text-lg">{suc.nombre}</h3>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin size={14} />{suc.departamento}</p>
            <p className="text-sm text-gray-500 mt-1">{suc.direccion}</p>
            <div className="mt-3 pt-3 border-t flex justify-between text-sm">
              <span className="text-gray-500">Mecánicos activos:</span>
              <span className="font-semibold">{mecanicosPorSucursal[suc.id] || 0}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editando ? 'Editar' : 'Nueva'} Sucursal</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Nombre *</label>
                <input value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Departamento *</label>
                <select value={formData.departamento} onChange={e => setFormData({...formData, departamento: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                  <option value="">Seleccionar departamento</option>
                  {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Dirección *</label>
                <input value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-lg">
                {editando ? 'Actualizar' : 'Crear'} Sucursal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

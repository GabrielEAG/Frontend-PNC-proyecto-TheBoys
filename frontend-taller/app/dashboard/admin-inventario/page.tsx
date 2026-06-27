'use client';

import { useEffect, useState } from 'react';
import { inventarioApi, repuestoApi, sucursalApi, proveedorApi } from '@/lib/api';
import { Inventario, Repuesto, Sucursal, Proveedor } from '@/types';
import { Search, Package, Plus, Edit, Trash2, Filter, X } from 'lucide-react';

const CATEGORIAS = ['MOTOR','FRENOS','SUSPENSION','TRANSMISION','ELECTRICO','FILTROS','LLANTAS','CARROCERIA','AIRE_ACONDICIONADO','LUBRICANTES','OTROS'];

export default function AdminInventarioPage() {
  const [inventario, setInventario] = useState<Inventario[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [sucursalId, setSucursalId] = useState('');
  const [categoria, setCategoria] = useState('');
  const [nombre, setNombre] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<'inventario'|'repuestos'>('inventario');
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [repuestoForm, setRepuestoForm] = useState({ nombre:'', categoria:'', precioUnitario:'', proveedorId:'', descripcion:'' });
  const [inventarioForm, setInventarioForm] = useState({ repuestoId:'', sucursalId:'', stockTotal:'' });

  useEffect(() => {
    sucursalApi.getAll().then(r => { setSucursales(r.data); if (r.data[0]) setSucursalId(r.data[0].id.toString()); });
    proveedorApi.getAll().then(r => setProveedores(r.data));
    repuestoApi.getAll().then(r => setRepuestos(r.data));
  }, []);

  useEffect(() => { if (sucursalId) fetchInventario(); }, [sucursalId]);

  const fetchInventario = async () => {
    if (!sucursalId) return;
    try {
      setLoading(true);
      const res = await inventarioApi.filtrar(parseInt(sucursalId), categoria || undefined, nombre || undefined);
      setInventario(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleFiltrar = () => fetchInventario();

  const handleCrearRepuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await repuestoApi.create({ ...repuestoForm, precioUnitario: parseFloat(repuestoForm.precioUnitario), proveedorId: parseInt(repuestoForm.proveedorId) });
      const r = await repuestoApi.getAll(); setRepuestos(r.data);
      setRepuestoForm({ nombre:'', categoria:'', precioUnitario:'', proveedorId:'', descripcion:'' });
      alert('Repuesto creado');
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleAgregarStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inventarioApi.create({ repuestoId: parseInt(inventarioForm.repuestoId), sucursalId: parseInt(inventarioForm.sucursalId), stockTotal: parseInt(inventarioForm.stockTotal) });
      fetchInventario();
      setInventarioForm({ repuestoId:'', sucursalId:'', stockTotal:'' });
      alert('Stock agregado');
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventario</h1>
        <button onClick={() => setShowModal(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={18} /> Gestionar Repuestos
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Sucursal</label>
            <select value={sucursalId} onChange={e => setSucursalId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
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
          <button onClick={handleFiltrar}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg">
            Filtrar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center h-32 items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Repuesto','Categoría','Precio Unit.','Stock','Sucursal'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inventario.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Sin resultados</td></tr>
              ) : inventario.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{item.repuesto}</td>
                  <td className="px-4 py-3"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">{item.categoria}</span></td>
                  <td className="px-4 py-3">${item.precioUnitario?.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${item.stockTotal < 5 ? 'text-red-600' : 'text-green-600'}`}>
                      {item.stockTotal}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{item.sucursal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Gestionar Repuestos</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <div className="flex gap-2 mb-4 border-b">
              {(['inventario','repuestos'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-blue-700 text-blue-700' : 'text-gray-500'}`}>
                  {t === 'inventario' ? 'Agregar Stock' : 'Nuevo Repuesto'}
                </button>
              ))}
            </div>

            {tab === 'repuestos' && (
              <form onSubmit={handleCrearRepuesto} className="space-y-3">
                <input placeholder="Nombre *" value={repuestoForm.nombre} onChange={e => setRepuestoForm({...repuestoForm, nombre: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                <select value={repuestoForm.categoria} onChange={e => setRepuestoForm({...repuestoForm, categoria: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                  <option value="">Categoría *</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" step="0.01" placeholder="Precio unitario *" value={repuestoForm.precioUnitario} onChange={e => setRepuestoForm({...repuestoForm, precioUnitario: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                <select value={repuestoForm.proveedorId} onChange={e => setRepuestoForm({...repuestoForm, proveedorId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                  <option value="">Proveedor *</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <input placeholder="Descripción" value={repuestoForm.descripcion} onChange={e => setRepuestoForm({...repuestoForm, descripcion: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                <button type="submit" className="w-full bg-blue-700 text-white py-2 rounded-lg text-sm">Crear Repuesto</button>
              </form>
            )}

            {tab === 'inventario' && (
              <form onSubmit={handleAgregarStock} className="space-y-3">
                <select value={inventarioForm.repuestoId} onChange={e => setInventarioForm({...inventarioForm, repuestoId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                  <option value="">Repuesto *</option>
                  {repuestos.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
                <select value={inventarioForm.sucursalId} onChange={e => setInventarioForm({...inventarioForm, sucursalId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                  <option value="">Sucursal *</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                <input type="number" placeholder="Cantidad a agregar *" value={inventarioForm.stockTotal} onChange={e => setInventarioForm({...inventarioForm, stockTotal: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                <button type="submit" className="w-full bg-blue-700 text-white py-2 rounded-lg text-sm">Agregar Stock</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

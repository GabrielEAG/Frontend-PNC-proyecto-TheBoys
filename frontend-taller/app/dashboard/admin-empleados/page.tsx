'use client';

import { useEffect, useState } from 'react';
import { mecanicoApi, sucursalApi, usuarioApi } from '@/lib/api';
import { Mecanico, Sucursal } from '@/types';
import { Users, Search, Filter, UserPlus, Trash2, MapPin, Clock, X } from 'lucide-react';

export default function AdminEmpleadosPage() {
  const [empleados, setEmpleados] = useState<Mecanico[]>([]);
  const [filtered, setFiltered] = useState<Mecanico[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sucursalFilter, setSucursalFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [emailBusqueda, setEmailBusqueda] = useState('');
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [buscando, setBuscando] = useState(false);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    let f = empleados;
    if (searchTerm) f = f.filter(e =>
      e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.email.toLowerCase().includes(searchTerm.toLowerCase()));
    if (sucursalFilter) f = f.filter(e => e.sucursalId?.toString() === sucursalFilter);
    setFiltered(f);
  }, [searchTerm, sucursalFilter, empleados]);

  const fetchData = async () => {
    try {
      const [mecRes, sucRes] = await Promise.all([mecanicoApi.getAll(), sucursalApi.getAll()]);
      setEmpleados(mecRes.data);
      setFiltered(mecRes.data);
      setSucursales(sucRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // ✅ Busca por email → cambia rol a MECANICO con sucursal
  const handleCambiarRol = async () => {
    if (!emailBusqueda) { alert('Ingresa el correo'); return; }
    if (!sucursalSeleccionada) { alert('Selecciona una sucursal'); return; }
    setBuscando(true);
    try {
      // 1. Buscar usuario por email
      const busRes = await usuarioApi.buscarPorEmail(emailBusqueda);
      const usuarioId = busRes.data.id;
      // 2. Cambiar rol a MECANICO con sucursalId
      await usuarioApi.cambiarRol(usuarioId, {
        nuevoRol: 'MECANICO',
        sucursalId: parseInt(sucursalSeleccionada),
      });
      alert('Cliente convertido a mecánico exitosamente');
      setShowModal(false);
      setEmailBusqueda('');
      setSucursalSeleccionada('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al cambiar rol');
    } finally { setBuscando(false); }
  };

  // ✅ Cambiar sucursal del mecánico
  const handleCambiarSucursal = async (mecanicoId: number, sucursalId: number) => {
    try {
      // Obtener usuarioId del mecánico
      const mecRes = await mecanicoApi.getById(mecanicoId);
      const usuarioId = mecRes.data.usuarioId;
      await usuarioApi.cambiarRol(usuarioId, { nuevoRol: 'MECANICO', sucursalId });
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
  };

  // ✅ Despedir = eliminar mecánico (baja de rol)
  const handleDespedir = async (mecanicoId: number) => {
    if (!confirm('¿Despedir a este mecánico? Volverá a ser cliente.')) return;
    try {
      const mecRes = await mecanicoApi.getById(mecanicoId);
      const usuarioId = mecRes.data.usuarioId;
      await usuarioApi.cambiarRol(usuarioId, { nuevoRol: 'CLIENTE' });
      fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Error al despedir'); }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Empleados</h1>
        <button onClick={() => setShowModal(true)}
          className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <UserPlus size={18} /> Convertir Cliente a Mecánico
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Buscar por nombre o email..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select value={sucursalFilter} onChange={e => setSucursalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg">
              <option value="">Todas las sucursales</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map(emp => (
          <div key={emp.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-start">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-full"><Users className="text-blue-700" size={24} /></div>
                <div>
                  <h3 className="text-lg font-semibold">{emp.nombre} {emp.apellido}</h3>
                  <p className="text-gray-500">{emp.email}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1"><MapPin size={14} />{emp.sucursal || 'Sin sucursal'}</span>
                    <span className="flex items-center gap-1"><Clock size={14} />{emp.horasTrabajadas || 0} horas trabajadas</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <select defaultValue={emp.sucursalId || ''}
                  onChange={e => e.target.value && handleCambiarSucursal(emp.id, parseInt(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
                  <option value="">Cambiar sucursal</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
                <button onClick={() => handleDespedir(emp.id)} className="text-red-600 hover:text-red-700">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron empleados</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Convertir Cliente a Mecánico</h2>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Correo del Cliente</label>
                <input type="email" value={emailBusqueda} onChange={e => setEmailBusqueda(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="cliente@ejemplo.com" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Sucursal</label>
                <select value={sucursalSeleccionada} onChange={e => setSucursalSeleccionada(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  <option value="">Seleccionar sucursal</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <button onClick={handleCambiarRol} disabled={buscando}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-lg disabled:opacity-50">
                {buscando ? 'Procesando...' : 'Convertir a Mecánico'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

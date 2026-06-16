'use client';

import { useEffect, useState } from 'react';
import { clienteApi, ordenApi } from '@/lib/api';
import { OrdenTrabajo } from '@/types';
import { Users, Search, X } from 'lucide-react';

interface ClienteInfo {
  id: number;
  usuarioId: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono?: string;
}

export default function AdminClientesPage() {
  const [clientes, setClientes] = useState<ClienteInfo[]>([]);
  const [filtered, setFiltered] = useState<ClienteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<ClienteInfo | null>(null);
  const [ordenesCliente, setOrdenesCliente] = useState<OrdenTrabajo[]>([]);

  useEffect(() => { fetchClientes(); }, []);
  useEffect(() => {
    setFiltered(clientes.filter(c =>
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())));
  }, [searchTerm, clientes]);

  const fetchClientes = async () => {
    try {
      // ✅ usa clienteApi en lugar de adminApi.getClientes (que no existe)
      const res = await clienteApi.getAll();
      setClientes(res.data);
      setFiltered(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const verHistorial = async (cliente: ClienteInfo) => {
    setSelectedCliente(cliente);
    try {
      // ✅ Filtra por clienteId correcto
      const res = await ordenApi.getByCliente(cliente.id);
      setOrdenesCliente(res.data);
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Gestión de Clientes</h1>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input type="text" placeholder="Buscar por nombre o email..." value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      <div className="space-y-3">
        {filtered.map(cliente => (
          <div key={cliente.id} className="bg-white rounded-lg shadow-md p-5 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full"><Users className="text-blue-700" size={20} /></div>
              <div>
                <h3 className="font-semibold">{cliente.nombre} {cliente.apellido}</h3>
                <p className="text-sm text-gray-500">{cliente.email}</p>
                {cliente.telefono && <p className="text-sm text-gray-500">{cliente.telefono}</p>}
              </div>
            </div>
            <button onClick={() => verHistorial(cliente)}
              className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-sm">
              Ver historial
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron clientes</p>
          </div>
        )}
      </div>

      {selectedCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Historial — {selectedCliente.nombre}</h2>
              <button onClick={() => setSelectedCliente(null)}><X size={24} /></button>
            </div>
            {ordenesCliente.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Sin órdenes registradas</p>
            ) : ordenesCliente.map(o => (
              <div key={o.id} className="border rounded-lg p-3 mb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Orden #{o.id} — {o.patente}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    o.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700' :
                    o.estado === 'EN_PROGRESO' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'}`}>{o.estado}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(o.fechaCreacion).toLocaleDateString('es-SV')}
                  {o.mecanicoNombre && ` — Mecánico: ${o.mecanicoNombre}`}
                </p>
                {o.presupuestoTotal && (
                  <p className="text-sm font-semibold mt-1">Total: ${o.presupuestoTotal.toFixed(2)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

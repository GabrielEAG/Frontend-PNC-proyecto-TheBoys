'use client';

import { useEffect, useState } from 'react';
import { servicioApi } from '@/lib/api';
import { Servicio } from '@/types';
import { Search, Wrench, Clock, DollarSign, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function CatalogoPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [filtered, setFiltered] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<Servicio | null>(null);

  useEffect(() => { fetchServicios(); }, []);
  useEffect(() => {
    setFiltered(servicios.filter(s =>
      s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    ));
  }, [searchTerm, servicios]);

  const fetchServicios = async () => {
    try {
      const res = await servicioApi.getAll();
      const activos = res.data.filter((s: Servicio) => s.estado === 'ACTIVO');
      setServicios(activos);
      setFiltered(activos);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Catálogo de Servicios</h1>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input type="text" placeholder="Buscar servicios..." value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(servicio => (
          <div key={servicio.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg"><Wrench className="text-blue-700" size={24} /></div>
                <span className="text-2xl font-bold text-blue-700">${servicio.precioBase.toFixed(2)}</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">{servicio.nombre}</h3>
              <p className="text-gray-600 mb-4 line-clamp-2">{servicio.descripcion}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <Clock size={16} />
                <span>{servicio.tiempoEstimadoMinutos} minutos</span>
              </div>
              <button onClick={() => setSelected(servicio)}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white py-2 rounded-lg flex items-center justify-center gap-2">
                <Calendar size={18} /> Agendar Cita
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Wrench className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No se encontraron servicios</p>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-bold mb-2">{selected.nombre}</h3>
            <p className="text-gray-600 mb-4">{selected.descripcion}</p>
            <div className="space-y-2 mb-6">
              <p className="flex items-center gap-2"><DollarSign className="text-green-600" size={18} />
                <span className="font-semibold">Precio: ${selected.precioBase.toFixed(2)}</span></p>
              <p className="flex items-center gap-2"><Clock className="text-blue-600" size={18} />
                <span>Tiempo estimado: {selected.tiempoEstimadoMinutos} minutos</span></p>
            </div>
            <div className="flex gap-3">
              <Link href={`/dashboard/citas?servicio=${selected.id}`}
                className="flex-1 bg-blue-700 hover:bg-blue-800 text-white py-2 rounded-lg text-center"
                onClick={() => setSelected(null)}>
                Agendar Cita
              </Link>
              <button onClick={() => setSelected(null)}
                className="flex-1 border border-gray-300 hover:bg-gray-50 py-2 rounded-lg">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

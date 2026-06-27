'use client';

import { useEffect, useState } from 'react';
import { reporteApi, sucursalApi } from '@/lib/api';
import { Sucursal, ReporteMecanicoHoras, ReporteRepuestoUsado, ReporteOrdenSucursal } from '@/types';
import { BarChart3, TrendingUp, Users, Package, Calendar } from 'lucide-react';

export default function AdminReportesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [mecanicoHoras, setMecanicoHoras] = useState<ReporteMecanicoHoras[]>([]);
  const [repuestosUsados, setRepuestosUsados] = useState<ReporteRepuestoUsado[]>([]);
  const [ordenesSucursal, setOrdenesSucursal] = useState<ReporteOrdenSucursal[]>([]);
  const [resumen, setResumen] = useState<any>(null);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sucursalId, setSucursalId] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  useEffect(() => {
    const hoy = new Date();
    const hace1mes = new Date(); hace1mes.setMonth(hace1mes.getMonth() - 1);
    setFechaInicio(hace1mes.toISOString().split('T')[0]);
    setFechaFin(hoy.toISOString().split('T')[0]);
    fetchData(hace1mes.toISOString().split('T')[0], hoy.toISOString().split('T')[0]);
    sucursalApi.getAll().then(r => setSucursales(r.data));
  }, []);

  const fetchData = async (desde?: string, hasta?: string, sucId?: string) => {
    const d = desde || fechaInicio;
    const h = hasta || fechaFin;
    try {
      setLoading(true);
      const [horasRes, repuestosRes, sucursalRes, resumenRes, ordenesRes] = await Promise.all([
        reporteApi.getMecanicosPorHoras(),
        reporteApi.getRepuestosMasUsados(),
        reporteApi.getOrdenesPorSucursal(),
        reporteApi.getResumen(),
        reporteApi.getOrdenes(d, h, sucId ? parseInt(sucId) : undefined),
      ]);
      setMecanicoHoras(horasRes.data);
      setRepuestosUsados(repuestosRes.data);
      setOrdenesSucursal(sucursalRes.data);
      setResumen(resumenRes.data);
      setOrdenes(ordenesRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleFiltrar = () => fetchData(fechaInicio, fechaFin, sucursalId);

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
    </div>
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reporte Global</h1>

      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
            <select value={sucursalId} onChange={e => setSucursalId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">Todas las sucursales</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <button onClick={handleFiltrar}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg">
            Filtrar
          </button>
        </div>
      </div>

      {resumen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-gray-500 text-sm">Total Órdenes</p>
            <p className="text-3xl font-bold text-blue-700">{resumen.totalOrdenes}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-gray-500 text-sm">Mecánicos</p>
            <p className="text-3xl font-bold text-green-600">{resumen.totalMecanicos}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-gray-500 text-sm">Órdenes en rango</p>
            <p className="text-3xl font-bold text-purple-600">{ordenes.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-gray-500 text-sm">Sucursales</p>
            <p className="text-3xl font-bold text-orange-600">{sucursales.length}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Users size={20} className="text-blue-700" /> Mecánicos más eficientes
          </h2>
          {mecanicoHoras.length === 0 ? <p className="text-gray-500">Sin datos</p> :
            mecanicoHoras.map((m, i) => (
              <div key={m.mecanicoId} className="flex justify-between items-center py-2 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="font-medium">{m.nombre}</span>
                </div>
                <span className="text-gray-600 text-sm">{m.horasTotales}h trabajadas</span>
              </div>
            ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Package size={20} className="text-blue-700" /> Repuestos más usados
          </h2>
          {repuestosUsados.length === 0 ? <p className="text-gray-500">Sin datos</p> :
            repuestosUsados.map((r, i) => (
              <div key={r.repuestoId} className="flex justify-between items-center py-2 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                  <span className="font-medium">{r.nombre}</span>
                </div>
                <span className="text-gray-600 text-sm">{r.cantidadTotal} unidades</span>
              </div>
            ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-700" /> Órdenes por sucursal
          </h2>
          {ordenesSucursal.length === 0 ? <p className="text-gray-500">Sin datos</p> :
            ordenesSucursal.map(o => (
              <div key={o.sucursalId} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="font-medium">{o.sucursal}</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-sm font-semibold">{o.totalOrdenes}</span>
              </div>
            ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-blue-700" /> Órdenes en el período
          </h2>
          {ordenes.length === 0 ? <p className="text-gray-500">Sin órdenes en ese período</p> :
            ordenes.slice(0, 8).map(o => (
              <div key={o.id} className="flex justify-between items-center py-2 border-b last:border-0 text-sm">
                <span>Orden #{o.id} — {o.clienteNombre}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  o.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700' :
                  o.estado === 'EN_PROGRESO' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'}`}>{o.estado}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: agregar JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: manejar 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============ AUTH ============
export const authApi = {
  login:    (data: any) => api.post('/auth/login', data),
  register: (data: any) => api.post('/auth/register', data),
};

// ============ NOTIFICACIONES ============
export const notificacionApi = {
  getByUsuario:       (usuarioId: number) => api.get(`/notificaciones/usuario/${usuarioId}`),
  getNoLeidas:        (usuarioId: number) => api.get(`/notificaciones/usuario/${usuarioId}/no-leidas`),
  getContadorNoLeidas:(usuarioId: number) => api.get(`/notificaciones/usuario/${usuarioId}/contador`),
  marcarLeida:        (id: number)        => api.patch(`/notificaciones/${id}/leer`),
  marcarTodasLeidas:  (usuarioId: number) => api.patch(`/notificaciones/usuario/${usuarioId}/leer-todas`),
};

// ============ USUARIOS ============
export const usuarioApi = {
  getAll:        ()                          => api.get('/usuarios'),
  getById:       (id: number)                => api.get(`/usuarios/${id}`),
  buscarPorEmail:(email: string)             => api.get(`/usuarios/buscar?email=${email}`),
  update:        (id: number, data: any)     => api.put(`/usuarios/${id}`, data),
  desbloquear:   (id: number)                => api.patch(`/usuarios/${id}/desbloquear`),
  cambiarRol:    (id: number, data: { nuevoRol: string; sucursalId?: number }) =>
    api.patch(`/usuarios/${id}/cambiar-rol`, data),
};

// ============ SUCURSALES ============
export const sucursalApi = {
  getAll:  ()                      => api.get('/sucursales'),
  getById: (id: number)            => api.get(`/sucursales/${id}`),
  create:  (data: any)             => api.post('/sucursales', data),
  update:  (id: number, data: any) => api.put(`/sucursales/${id}`, data),
  delete:  (id: number)            => api.delete(`/sucursales/${id}`),
};

// ============ CLIENTES ============
export const clienteApi = {
  getAll:  ()                      => api.get('/clientes'),
  getById: (id: number)            => api.get(`/clientes/${id}`),
  getByUsuarioId: (usuarioId: number) => api.get(`/clientes/usuario/${usuarioId}`),
  create:  (data: any)             => api.post('/clientes', data),
  update:  (id: number, data: any) => api.put(`/clientes/${id}`, data),
  delete:  (id: number)            => api.delete(`/clientes/${id}`),
};

// ============ MECÁNICOS ============
export const mecanicoApi = {
  getAll:        ()                  => api.get('/mecanicos'),
  getById:       (id: number)        => api.get(`/mecanicos/${id}`),
  getBySucursal: (sucursalId: number)=> api.get(`/mecanicos/sucursal/${sucursalId}`),
  getByUsuarioId:(usuarioId: number) => api.get(`/mecanicos/usuario/${usuarioId}`),
  update:        (id: number, data: any) => api.put(`/mecanicos/${id}`, data),
  delete:        (id: number)        => api.delete(`/mecanicos/${id}`),
};

// ============ VEHÍCULOS ============
export const vehiculoApi = {
  getByPatente: (patente: string)        => api.get(`/vehiculos/${patente}`),
  getByCliente: (clienteId: number)      => api.get(`/vehiculos/cliente/${clienteId}`),
  create:       (data: any)              => api.post('/vehiculos', data),
  update:       (patente: string, data: any) => api.put(`/vehiculos/${patente}`, data),
  delete:       (patente: string)        => api.delete(`/vehiculos/${patente}`),
};

// ============ SERVICIOS ============
export const servicioApi = {
  getAll:                ()              => api.get('/servicios'),
  getActivos:            ()              => api.get('/servicios'),        // alias para compatibilidad
  getAllIncluyendoInactivos: ()           => api.get('/servicios/todos'),
  getById:               (id: number)    => api.get(`/servicios/${id}`),
  create:                (data: any)     => api.post('/servicios', data),
  update:                (id: number, data: any) => api.put(`/servicios/${id}`, data),
  delete:                (id: number)    => api.delete(`/servicios/${id}`),
};

// ============ PROVEEDORES ============
export const proveedorApi = {
  getAll:  ()                      => api.get('/proveedores'),
  getById: (id: number)            => api.get(`/proveedores/${id}`),
  create:  (data: any)             => api.post('/proveedores', data),
  update:  (id: number, data: any) => api.put(`/proveedores/${id}`, data),
  delete:  (id: number)            => api.delete(`/proveedores/${id}`),
};

// ============ REPUESTOS ============
export const repuestoApi = {
  getAll:          ()                    => api.get('/repuestos'),
  getById:         (id: number)          => api.get(`/repuestos/${id}`),
  getByCategoria:  (categoria: string)   => api.get(`/repuestos/categoria/${categoria}`),
  buscarPorNombre: (nombre: string)      => api.get(`/repuestos/buscar?nombre=${nombre}`),
  create:          (data: any)           => api.post('/repuestos', data),
  update:          (id: number, data: any) => api.put(`/repuestos/${id}`, data),
  delete:          (id: number)          => api.delete(`/repuestos/${id}`),
};

// ============ INVENTARIO ============
export const inventarioApi = {
  getBySucursal: (sucursalId: number)    => api.get(`/inventario/sucursal/${sucursalId}`),
  getById:       (id: number)            => api.get(`/inventario/${id}`),
  filtrar: (sucursalId: number, categoria?: string, nombre?: string) => {
    const params = new URLSearchParams();
    if (categoria) params.append('categoria', categoria);
    if (nombre)    params.append('nombre', nombre);
    return api.get(`/inventario/sucursal/${sucursalId}/filtrar?${params.toString()}`);
  },
  create:        (data: any)             => api.post('/inventario', data),
  update:        (id: number, data: any) => api.put(`/inventario/${id}`, data),
  delete:        (id: number)            => api.delete(`/inventario/${id}`),
};

// ============ REGISTRO DE HORAS ============
export const horasApi = {
  getByMecanico: (mecanicoId: number) => api.get(`/horas/mecanico/${mecanicoId}`),
  create:        (data: any)          => api.post('/horas', data),
  delete:        (id: number)         => api.delete(`/horas/${id}`),
};

// ============ FACTURAS ============
export const facturaApi = {
  getAll:       ()                  => api.get('/facturas'),
  getById:      (id: number)        => api.get(`/facturas/${id}`),
  getByOrden:   (ordenId: number)   => api.get(`/facturas/orden/${ordenId}`),
  getByCliente: (clienteId: number) => api.get(`/facturas/cliente/${clienteId}`),
  pagar:        (data: { ordenId: number; metodoPago: 'EFECTIVO' | 'TARJETA' | 'STRIPE' }) =>
    api.post('/facturas/pagar', data),
};

// ============ PAGOS STRIPE ============
export const stripeApi = {
  getConfig: () => api.get('/pagos/stripe/config'),
  pagar: (data: { facturaId: number; token: string }) => api.post('/pagos/stripe', data),
};

// ============ CITAS ============
export const citaApi = {
  getById:        (id: number)                      => api.get(`/citas/${id}`),
  getByCliente:   (clienteId: number)               => api.get(`/citas/cliente/${clienteId}`),
  getByMecanico:  (mecanicoId: number)              => api.get(`/citas/mecanico/${mecanicoId}`),
  getBySucursal:  (sucursalId: number, fecha?: string) => {
    const url = fecha
      ? `/citas/sucursal/${sucursalId}?fecha=${fecha}`
      : `/citas/sucursal/${sucursalId}`;
    return api.get(url);
  },
  getPendientes:  (sucursalId?: number)             => api.get('/citas/pendientes', { params: sucursalId ? { sucursalId } : {} }),
  create:         (data: any)                       => api.post('/citas', data),
  aceptar:        (id: number, mecanicoId: number)  => api.patch(`/citas/${id}/aceptar?mecanicoId=${mecanicoId}`),
  reprogramar:    (id: number, data: { nuevaFecha: string; nuevaHora: string }) =>
    api.patch(`/citas/${id}/reprogramar`, data),
  aceptarReprogramacion: (id: number)              => api.patch(`/citas/${id}/aceptar-reprogramacion`),
  confirmar:      (id: number)                      => api.patch(`/citas/${id}/confirmar`),
  cancelar:       (id: number)                      => api.delete(`/citas/${id}`),
};

// ============ ÓRDENES DE TRABAJO ============
export const ordenApi = {
  create:               (data: any)           => api.post('/ordenes', data),
  getAll:               ()                    => api.get('/ordenes'),
  getById:              (id: number)          => api.get(`/ordenes/${id}`),
  getByCliente:         (clienteId: number)   => api.get(`/ordenes/cliente/${clienteId}`),
  getByMecanico:        (mecanicoId: number)  => api.get(`/ordenes/mecanico/${mecanicoId}`),
  getByVehiculo:        (patente: string)     => api.get(`/ordenes/vehiculo/${patente}`),
  getPendientes:        (sucursalId?: number) => api.get('/ordenes/pendientes', { params: sucursalId ? { sucursalId } : {} }),
  asignarMecanico:      (id: number, mecanicoId: number) =>
    api.patch(`/ordenes/${id}/asignar-mecanico`, null, { params: { mecanicoId } }),
  cambiarEstado:        (id: number, estado: string) =>
    api.patch(`/ordenes/${id}/estado?estado=${estado}`),
  enviarPresupuesto:    (id: number, data: any) => api.patch(`/ordenes/${id}/presupuesto`, data),
  aprobarPresupuesto:   (id: number)          => api.patch(`/ordenes/${id}/aprobar-presupuesto`),
  rechazarPresupuesto:  (id: number)          => api.patch(`/ordenes/${id}/rechazar-presupuesto`),
  marcarCompletada:     (id: number)          => api.patch(`/ordenes/${id}/completar`),
  cancelar:             (id: number)          => api.delete(`/ordenes/${id}`),
};

// ============ REPORTES (solo ADMIN) ============
export const reporteApi = {
  // Órdenes por rango de fechas, con filtro opcional de sucursal
  getOrdenes: (desde: string, hasta: string, sucursalId?: number) => {
    const params = new URLSearchParams({ desde, hasta });
    if (sucursalId) params.append('sucursalId', sucursalId.toString());
    return api.get(`/reportes/ordenes?${params.toString()}`);
  },
  // Mecánicos con más horas
  getMecanicosPorHoras: () => api.get('/reportes/mecanicos/horas'),
  // Repuestos más usados
  getRepuestosMasUsados: () => api.get('/reportes/repuestos/mas-usados'),
  // Órdenes por sucursal
  getOrdenesPorSucursal: () => api.get('/reportes/ordenes/por-sucursal'),
  // Resumen global
  getResumen: () => api.get('/reportes/resumen'),
};

export default api;
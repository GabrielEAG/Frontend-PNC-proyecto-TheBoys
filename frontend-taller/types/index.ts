export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellido?: string;
  rol: 'ADMIN' | 'MECANICO' | 'CLIENTE';
  bloqueado?: boolean;
  clienteId?: number | null;
  mecanicoId?: number | null;
  sucursalId?: number | null;
}

export interface AuthResponse {
  token: string;
  email: string;
  rol: string;
  nombre: string;
  apellido?: string;
  id?: number;
  clienteId?: number | null;
  mecanicoId?: number | null;
  sucursalId?: number | null;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  direccion?: string;
  rol?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Notificacion {
  id: number;
  mensaje: string;
  leida: boolean;
  fechaCreacion: string;
  tipo: string;
  referenciaId?: number;
}

export interface Cliente {
  id: number;
  usuarioId: number;
  nombre?: string;
  apellido?: string;
  email?: string;
  telefono: string;
  direccion?: string | null;
}

export interface Mecanico {
  id: number;
  usuarioId: number;
  nombre: string;
  apellido: string;
  email: string;
  sucursalId?: number;
  sucursal?: string;
  horasTrabajadas?: number;
}

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  departamento: string;
}

export interface Vehiculo {
  patente: string;
  marca: string;
  modelo: string;
  clienteId?: number;
  clienteNombre?: string;
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  tiempoEstimadoMinutos: number;
  precioBase: number;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface Proveedor {
  id: number;
  nombre: string;
  marca: string;
  contacto: string;
}

export interface Repuesto {
  id: number;
  nombre: string;
  precioUnitario: number;
  proveedor?: string;
  proveedorId?: number;
  categoria?: string;
  descripcion?: string;
}

export interface Inventario {
  id: number;
  sucursalId: number;
  sucursal: string;
  repuestoId: number;
  repuesto: string;
  categoria?: string;
  precioUnitario?: number;
  stockTotal: number;
  fechaActualizacion: string;
}

export interface OrdenServicio {
  servicioId: number;
  nombreServicio: string;
  precioAplicado: number;
}

export interface OrdenRepuesto {
  repuestoId: number;
  nombreRepuesto: string;
  cantidad: number;
  precioAplicado: number;
}

export interface RegistroHoras {
  id: number;
  mecanicoId: number;
  ordenId: number;
  horasInvertidas: number;
}

export interface Factura {
  id: number;
  ordenId: number;
  vehiculoPatente: string;
  fechaOrden: string;
  subtotal: number;
  impuestos: number;
  total: number;
  estadoPago: 'PENDIENTE' | 'PAGADO' | 'REEMBOLSADO';
  metodoPago: 'EFECTIVO' | 'TARJETA' | 'STRIPE' | 'SEGURO' | null;
}

export interface Cita {
  id: number;
  clienteNombre: string;
  clienteId: number;
  sucursalNombre: string;
  sucursalId: number;
  mecanicoNombre?: string;
  mecanicoId?: number;
  fecha: string;
  hora: string;
  estado: 'PROGRAMADA' | 'CONFIRMADA' | 'REPROGRAMADA' | 'COMPLETADA' | 'CANCELADA';
  servicios?: string[];
  nuevaFechaPropuesta?: string;
  nuevaHoraPropuesta?: string;
  tipoOrden?: 'ESTANDAR' | 'EXPRESS' | 'GARANTIA' | 'SEGURO';
  facturaGarantiaId?: number;
}

export interface OrdenServicioRequest {
  servicioId: number;
  precioAplicado: number;
}

export interface OrdenRepuestoRequest {
  repuestoId: number;
  cantidad: number;
  precioAplicado: number;
}

export interface OrdenTrabajoRequest {
  patente: string;
  clienteId: number;
  mecanicoId?: number;
  sucursalId?: number;
  tipoOrden: string;
  comentarios?: string;
  servicios: OrdenServicioRequest[];
  repuestos: OrdenRepuestoRequest[];
}

export interface OrdenServicioResponse {
  servicioId: number;
  nombreServicio: string;
  precioAplicado: number;
}

export interface OrdenRepuestoResponse {
  repuestoId: number;
  nombreRepuesto: string;
  cantidad: number;
  precioAplicado: number;
}

export interface OrdenTrabajoResponse {
  id: number;
  patente: string;
  clienteNombre: string;
  mecanicoNombre?: string;
  mecanicoId?: number;
  sucursalNombre?: string;
  sucursalId?: number;
  tipoOrden: string;
  estado: 'PENDIENTE' | 'PENDIENTE_APROBACION' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA';
  fechaCreacion: string;
  fechaFinalizacionEstimada?: string;
  comentarios?: string;
  presupuestoTotal?: number;
  servicios: OrdenServicioResponse[];
  repuestos: OrdenRepuestoResponse[];
}

export type OrdenTrabajo = OrdenTrabajoResponse;

export interface ReporteMecanicoHoras {
  mecanicoId: number;
  nombre: string;
  horasTotales: number;
}

export interface ReporteRepuestoUsado {
  repuestoId: number;
  nombre: string;
  cantidadTotal: number;
}

export interface ReporteOrdenSucursal {
  sucursalId: number;
  sucursal: string;
  totalOrdenes: number;
}

export interface ReporteResumen {
  totalOrdenes: number;
  totalMecanicos: number;
  ordenesPorEstado: Array<[string, number]>;
}

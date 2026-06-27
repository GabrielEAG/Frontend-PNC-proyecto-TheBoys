
export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};


export const formatDateTime = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};


export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};


export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('es-SV').format(num);
};


export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};


export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPatente = (patente: string): boolean => {
  const patenteRegex = /^[A-Z]{3}-\d{3,4}$/;
  return patenteRegex.test(patente.toUpperCase());
};


export const getEstadoOrdenText = (estado: string): string => {
  const estados: Record<string, string> = {
    PENDIENTE_APROBACION: 'Pendiente de Aprobación',
    APROBADA: 'Aprobada',
    EN_PROCESO: 'En Proceso',
    COMPLETADA: 'Completada',
    CANCELADA: 'Cancelada',
  };
  return estados[estado] || estado;
};


export const getEstadoCitaText = (estado: string): string => {
  const estados: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    CONFIRMADA: 'Confirmada',
    RECHAZADA: 'Rechazada',
    COMPLETADA: 'Completada',
  };
  return estados[estado] || estado;
};


export const getEstadoColor = (estado: string): string => {
  const colores: Record<string, string> = {
    PENDIENTE: 'bg-yellow-100 text-yellow-800',
    PENDIENTE_APROBACION: 'bg-yellow-100 text-yellow-800',
    CONFIRMADA: 'bg-green-100 text-green-800',
    APROBADA: 'bg-blue-100 text-blue-800',
    EN_PROCESO: 'bg-purple-100 text-purple-800',
    COMPLETADA: 'bg-green-100 text-green-800',
    RECHAZADA: 'bg-red-100 text-red-800',
    CANCELADA: 'bg-red-100 text-red-800',
  };
  return colores[estado] || 'bg-gray-100 text-gray-800';
};


export const timeAgo = (date: string | Date): string => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Justo ahora';
  if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins !== 1 ? 's' : ''}`;
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  if (diffDays < 30) return `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
  
  return formatDate(date);
};


export const generateTempId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};


export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}


export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
};
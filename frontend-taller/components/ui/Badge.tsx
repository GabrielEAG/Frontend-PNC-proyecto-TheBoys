interface BadgeProps {
  status: string;
}

export default function Badge({ status }: BadgeProps) {
  const variants: Record<string, string> = {
    PENDIENTE: 'bg-yellow-100 text-yellow-800',
    CONFIRMADA: 'bg-green-100 text-green-800',
    COMPLETADA: 'bg-blue-100 text-blue-800',
    RECHAZADA: 'bg-red-100 text-red-800',
    APROBADA: 'bg-green-100 text-green-800',
    EN_PROCESO: 'bg-purple-100 text-purple-800',
  };

  const texts: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    CONFIRMADA: 'Confirmada',
    COMPLETADA: 'Completada',
    RECHAZADA: 'Rechazada',
    APROBADA: 'Aprobada',
    EN_PROCESO: 'En Proceso',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${variants[status] || 'bg-gray-100 text-gray-800'}`}>
      {texts[status] || status}
    </span>
  );
}
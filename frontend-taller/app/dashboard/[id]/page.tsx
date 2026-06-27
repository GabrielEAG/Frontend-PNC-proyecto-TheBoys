'use client';

import { useParams } from 'next/navigation';
import PagoOrden from '@/components/payments/PagoOrden';

export default function PagoPage() {
  const params = useParams<{ id: string }>();
  const ordenId = Number(params.id);

  return <PagoOrden ordenId={ordenId} />;
}

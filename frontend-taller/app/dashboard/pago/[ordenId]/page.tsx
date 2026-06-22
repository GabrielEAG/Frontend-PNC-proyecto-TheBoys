'use client';

import { useParams } from 'next/navigation';
import PagoOrden from '@/components/payments/PagoOrden';

export default function PagoOrdenPage() {
  const params = useParams<{ ordenId: string }>();
  const ordenId = Number(params.ordenId);

  return <PagoOrden ordenId={ordenId} />;
}

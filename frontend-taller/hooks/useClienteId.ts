'use client';

import { useEffect, useState } from 'react';
import { clienteApi, mecanicoApi } from '@/lib/api';
import { useAuth } from './useAuth';

export function useClienteId() {
  const { user } = useAuth();
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    clienteApi.getByUsuarioId(user.id)
      .then(res => setClienteId(res.data.id))
      .catch(() => setClienteId(null))
      .finally(() => setLoading(false));
  }, [user?.id]);

  return { clienteId, loading };
}

export function useMecanicoId() {
  const { user } = useAuth();
  const [mecanicoId, setMecanicoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    mecanicoApi.getByUsuarioId(user.id)
      .then(res => setMecanicoId(res.data.id))
      .catch(() => setMecanicoId(null))
      .finally(() => setLoading(false));
  }, [user?.id]);

  return { mecanicoId, loading };
}

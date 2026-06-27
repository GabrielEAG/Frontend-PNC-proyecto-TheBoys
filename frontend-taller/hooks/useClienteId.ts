'use client';

import { useEffect, useState } from 'react';
import { clienteApi, mecanicoApi } from '@/lib/api';
import { useAuth } from './useAuth';

export function useClienteId() {
  const { user } = useAuth();
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || user.rol !== 'CLIENTE') {
      setClienteId(null);
      setLoading(false);
      return;
    }
    if (user.clienteId) {
      setClienteId(user.clienteId);
      setLoading(false);
      return;
    }
    setLoading(true);
    clienteApi.getByUsuarioId(user.id)
      .then(res => setClienteId(res.data.id))
      .catch(() => setClienteId(null))
      .finally(() => setLoading(false));
  }, [user?.id, user?.rol, user?.clienteId]);

  return { clienteId, loading };
}

export function useMecanicoId() {
  const { user } = useAuth();
  const [mecanicoId, setMecanicoId] = useState<number | null>(null);
  const [sucursalId, setSucursalId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || user.rol !== 'MECANICO') {
      setMecanicoId(null);
      setSucursalId(null);
      setLoading(false);
      return;
    }
    if (user.mecanicoId) {
      setMecanicoId(user.mecanicoId);
      setSucursalId(user.sucursalId ?? null);
      setLoading(false);
      return;
    }
    setLoading(true);
    mecanicoApi.getByUsuarioId(user.id)
      .then(res => {
        setMecanicoId(res.data.id);
        setSucursalId(res.data.sucursalId ?? null);
      })
      .catch(() => { setMecanicoId(null); setSucursalId(null); })
      .finally(() => setLoading(false));
  }, [user?.id, user?.rol, user?.mecanicoId, user?.sucursalId]);

  return { mecanicoId, sucursalId, loading };
}

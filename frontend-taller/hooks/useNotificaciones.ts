'use client';

import { useEffect, useState, useCallback } from 'react';
import { notificacionApi } from '@/lib/api';
import { Notificacion } from '@/types';
import { useAuth } from './useAuth';

export function useNotificaciones() {
  const { user, isAuthenticated } = useAuth();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotificaciones = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    try {
      setLoading(true);
      const response = await notificacionApi.getByUsuario(user.id);
      setNotificaciones(response.data);

      const contadorResponse = await notificacionApi.getContadorNoLeidas(user.id);
      setNoLeidas(contadorResponse.data.noLeidas);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  const marcarLeida = async (id: number) => {
    if (!user?.id) return;
    try {
      await notificacionApi.marcarLeida(id);
      setNotificaciones(prev => prev.map(n => (n.id === id ? { ...n, leida: true } : n)));
      const contadorResponse = await notificacionApi.getContadorNoLeidas(user.id);
      setNoLeidas(contadorResponse.data.noLeidas);
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const marcarTodasLeidas = async () => {
    if (!user?.id) return;
    try {
      await notificacionApi.marcarTodasLeidas(user.id);
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
      setNoLeidas(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  useEffect(() => {
    fetchNotificaciones();
    const interval = setInterval(fetchNotificaciones, 10000);
    return () => clearInterval(interval);
  }, [fetchNotificaciones]);

  return { notificaciones, noLeidas, loading, error, fetchNotificaciones, marcarLeida, marcarTodasLeidas };
}

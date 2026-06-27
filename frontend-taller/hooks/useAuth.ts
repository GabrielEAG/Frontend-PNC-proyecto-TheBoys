'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter, usePathname } from 'next/navigation';

const publicRoutes = ['/login', '/register', '/'];

const roleRoutes = {
  ADMIN: [
    '/dashboard',
    '/dashboard/perfil',
    '/dashboard/notificaciones',
    '/dashboard/admin-reportes',
    '/dashboard/admin-inventario',
    '/dashboard/admin-empleados',
    '/dashboard/admin-clientes',
    '/dashboard/admin-sucursales',
  ],
  MECANICO: [
    '/dashboard',
    '/dashboard/perfil',
    '/dashboard/notificaciones',
    '/dashboard/mecanico-citas',
    '/dashboard/mecanico-ordenes',
    '/dashboard/mecanico-inventario',
    '/dashboard/mecanico-historial',
  ],
  CLIENTE: [
    '/dashboard',
    '/dashboard/perfil',
    '/dashboard/notificaciones',
    '/dashboard/mis-ordenes',
    '/dashboard/catalogo',
    '/dashboard/citas',
    '/dashboard/facturas',
    '/dashboard/pago',
  ],
};

const isPublicRoute = (pathname: string) => {
  return publicRoutes.includes(pathname);
};

const getDefaultRouteByRole = (rol?: string) => {
  if (rol === 'ADMIN') return '/dashboard/admin-reportes';
  if (rol === 'MECANICO') return '/dashboard/mecanico-citas';
  if (rol === 'CLIENTE') return '/dashboard/catalogo';

  return '/dashboard';
};

const hasRoleAccess = (rol: keyof typeof roleRoutes, pathname: string) => {
  return roleRoutes[rol].some((route) => pathname === route || pathname.startsWith(`${route}/`));
};

export function useAuth() {
  const {
    user,
    token,
    isLoading,
    hasHydrated,
    login,
    register,
    logout,
    bootstrapSession,
  } = useAuthStore();

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hasHydrated) return;
    bootstrapSession();
  }, [hasHydrated, bootstrapSession]);

  useEffect(() => {
    if (!hasHydrated || isLoading) return;

    if (!token && !isPublicRoute(pathname)) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`);
      return;
    }

    if (token && isPublicRoute(pathname)) {
      router.replace(getDefaultRouteByRole(user?.rol));
    }
  }, [token, user?.rol, hasHydrated, isLoading, pathname, router]);

  useEffect(() => {
    if (!hasHydrated || isLoading) return;
    if (!token || !user) return;
    if (!pathname.startsWith('/dashboard')) return;

    const rol = user.rol as keyof typeof roleRoutes;

    if (!roleRoutes[rol]) {
      logout();
      return;
    }

    const allowed = hasRoleAccess(rol, pathname);

    if (!allowed) {
      router.replace(getDefaultRouteByRole(user.rol));
    }
  }, [token, user, hasHydrated, isLoading, pathname, router, logout]);

  return {
    user,
    token,
    isLoading: isLoading || !hasHydrated,
    hasHydrated,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
  };
}
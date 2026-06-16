// hooks/useAuth.ts
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter, usePathname } from 'next/navigation';

const publicRoutes = ['/login', '/register', '/'];

const roleRoutes = {
  ADMIN: ['/dashboard/admin-reportes', '/dashboard/admin-inventario', '/dashboard/admin-empleados', '/dashboard/admin-clientes', '/dashboard/admin-sucursales'],
  MECANICO: ['/dashboard/mecanico-citas', '/dashboard/mecanico-ordenes', '/dashboard/mecanico-inventario', '/dashboard/mecanico-historial'],
  CLIENTE: ['/dashboard/mis-ordenes', '/dashboard/catalogo', '/dashboard/citas', '/dashboard/notificaciones'],
};

export function useAuth() {
  const { user, token, isLoading, login, register, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !token && !publicRoutes.includes(pathname)) {
      router.push(`/login?from=${pathname}`);
    }
  }, [token, isLoading, pathname, router]);

  useEffect(() => {
    if (token && user && !publicRoutes.includes(pathname)) {
      // Verificar acceso por rol
      if (pathname.startsWith('/dashboard')) {
        let hasAccess = false;
        
        if (user.rol === 'ADMIN') {
          hasAccess = true;
        } else if (user.rol === 'MECANICO') {
          hasAccess = roleRoutes.MECANICO.some(route => pathname.startsWith(route));
        } else if (user.rol === 'CLIENTE') {
          hasAccess = roleRoutes.CLIENTE.some(route => pathname.startsWith(route));
        }

        if (!hasAccess && pathname !== '/dashboard') {
          // Redirigir al dashboard correspondiente
          if (user.rol === 'MECANICO') router.push('/dashboard/mecanico-citas');
          else if (user.rol === 'CLIENTE') router.push('/dashboard/mis-ordenes');
          else router.push('/dashboard/admin-reportes');
        }
      }
    }
  }, [token, user, pathname, router]);

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return rolesArray.includes(user.rol);
  };

  return {
    user,
    token,
    isLoading,
    isAuthenticated: !!token,
    hasRole,
    login,
    register,
    logout,
  };
}
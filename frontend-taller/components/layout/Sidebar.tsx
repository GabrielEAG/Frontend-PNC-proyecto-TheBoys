'use client';

import { useCallback, useEffect, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  Wrench,
  Bell,
  Package,
  History,
  BarChart3,
  Users,
  Building2,
  ClipboardList,
  Settings,
  CreditCard,
} from 'lucide-react';
import { notificacionApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface SidebarProps {
  sidebarOpen: boolean;
  userRole: string;
}

type IconType = ComponentType<{
  size?: number;
  className?: string;
}>;

type MenuItem = {
  name: string;
  href: string;
  icon: IconType;
};

const getStoredUserId = (): number | null => {
  if (typeof window === 'undefined') return null;

  const userRaw = localStorage.getItem('user');

  if (userRaw) {
    try {
      const parsedUser = JSON.parse(userRaw);
      const parsedId = Number(parsedUser?.id);

      if (Number.isFinite(parsedId) && parsedId > 0) {
        return parsedId;
      }
    } catch {
    }
  }

  const authStorageRaw = localStorage.getItem('auth-storage');

  if (authStorageRaw) {
    try {
      const parsedAuthStorage = JSON.parse(authStorageRaw);
      const parsedId = Number(parsedAuthStorage?.state?.user?.id);

      if (Number.isFinite(parsedId) && parsedId > 0) {
        return parsedId;
      }
    } catch {
    }
  }

  return null;
};

const extractUnreadCount = (payload: any): number | null => {
  if (typeof payload === 'number') {
    return Number.isFinite(payload) ? payload : 0;
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const possibleValues = [
    payload.contador,
    payload.total,
    payload.count,
    payload.noLeidas,
    payload.no_leidas,
    payload.unreadCount,
    payload.unread,
    payload.data,
  ];

  for (const value of possibleValues) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

export default function Sidebar({ sidebarOpen, userRole }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const [unreadCount, setUnreadCount] = useState(0);

  const getUsuarioId = useCallback(() => {
    const storeUserId = Number(user?.id);

    if (Number.isFinite(storeUserId) && storeUserId > 0) {
      return storeUserId;
    }

    return getStoredUserId();
  }, [user?.id]);

  const fetchUnreadCount = useCallback(async () => {
    const usuarioId = getUsuarioId();

    if (!usuarioId) {
      setUnreadCount(0);
      return;
    }

    try {
      const response = await notificacionApi.getContadorNoLeidas(usuarioId);
      const parsedCount = extractUnreadCount(response.data);

      if (parsedCount !== null) {
        setUnreadCount(Math.max(parsedCount, 0));
        return;
      }

      const fallbackResponse = await notificacionApi.getNoLeidas(usuarioId);
      const fallbackCount = Array.isArray(fallbackResponse.data)
        ? fallbackResponse.data.length
        : extractUnreadCount(fallbackResponse.data) ?? 0;

      setUnreadCount(Math.max(fallbackCount, 0));
    } catch {
      try {
        const fallbackResponse = await notificacionApi.getNoLeidas(usuarioId);
        const fallbackCount = Array.isArray(fallbackResponse.data)
          ? fallbackResponse.data.length
          : extractUnreadCount(fallbackResponse.data) ?? 0;

        setUnreadCount(Math.max(fallbackCount, 0));
      } catch {
        setUnreadCount(0);
      }
    }
  }, [getUsuarioId]);

  useEffect(() => {
    void fetchUnreadCount();

    const handleUpdate = () => {
      void fetchUnreadCount();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchUnreadCount();
      }
    };

    window.addEventListener('notifications:updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = window.setInterval(() => {
      void fetchUnreadCount();
    }, 30000);

    return () => {
      window.removeEventListener('notifications:updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  const menuItems: Record<string, MenuItem[]> = {
    CLIENTE: [
      { name: 'Mis Órdenes', href: '/dashboard/mis-ordenes', icon: ClipboardList },
      { name: 'Mis Facturas', href: '/dashboard/facturas', icon: CreditCard },
      { name: 'Catálogo', href: '/dashboard/catalogo', icon: Package },
      { name: 'Citas', href: '/dashboard/citas', icon: Calendar },
      { name: 'Notificaciones', href: '/dashboard/notificaciones', icon: Bell },
    ],
    MECANICO: [
      { name: 'Citas', href: '/dashboard/mecanico-citas', icon: Calendar },
      { name: 'Órdenes Activas', href: '/dashboard/mecanico-ordenes', icon: Wrench },
      { name: 'Inventario', href: '/dashboard/mecanico-inventario', icon: Package },
      { name: 'Historial', href: '/dashboard/mecanico-historial', icon: History },
      { name: 'Notificaciones', href: '/dashboard/notificaciones', icon: Bell },
    ],
    ADMIN: [
      { name: 'Reporte Global', href: '/dashboard/admin-reportes', icon: BarChart3 },
      { name: 'Inventario', href: '/dashboard/admin-inventario', icon: Package },
      { name: 'Empleados', href: '/dashboard/admin-empleados', icon: Users },
      { name: 'Clientes', href: '/dashboard/admin-clientes', icon: Users },
      { name: 'Sucursales', href: '/dashboard/admin-sucursales', icon: Building2 },
      { name: 'Notificaciones', href: '/dashboard/notificaciones', icon: Bell },
    ],
  };

  const normalizedRole = userRole?.toUpperCase?.() || '';
  const items = menuItems[normalizedRole] || [];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const renderNotificationBadge = () => {
    if (unreadCount <= 0) return null;

    
    return (
      <span
        className={`inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-blue-700 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-sm ring-2 ring-white ${
          sidebarOpen ? 'ml-auto' : 'absolute right-2 top-2'
        }`}
        title={`${unreadCount} notificación${unreadCount !== 1 ? 'es' : ''} sin leer`}
        aria-label={`${unreadCount} notificación${unreadCount !== 1 ? 'es' : ''} sin leer`}
      >
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    );

  };

  return (
    <aside
      className={`fixed left-0 top-16 z-20 h-full bg-white shadow-lg transition-all duration-300 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <nav className="mt-6">
        <Link
          href="/dashboard"
          className={`relative mb-2 flex items-center px-4 py-3 transition hover:bg-blue-50 ${
            sidebarOpen ? 'gap-3' : 'justify-center'
          } ${
            pathname === '/dashboard'
              ? 'border-r-4 border-blue-700 bg-blue-50 text-blue-700'
              : 'text-gray-700'
          }`}
          title={!sidebarOpen ? 'Inicio' : undefined}
        >
          <Home size={20} />
          {sidebarOpen && <span>Inicio</span>}
        </Link>

        {items.map((item) => {
          const Icon = item.icon;
          const isNotificationsItem = item.href === '/dashboard/notificaciones';

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative mb-2 flex items-center px-4 py-3 transition hover:bg-blue-50 ${
                sidebarOpen ? 'gap-3' : 'justify-center'
              } ${
                isActive(item.href)
                  ? 'border-r-4 border-blue-700 bg-blue-50 text-blue-700'
                  : 'text-gray-700'
              }`}
              title={!sidebarOpen ? item.name : undefined}
            >
              <Icon size={20} />

              {sidebarOpen && (
                <span className="min-w-0 flex-1 truncate">
                  {item.name}
                </span>
              )}

              {isNotificationsItem && renderNotificationBadge()}
            </Link>
          );
        })}

        <Link
          href="/dashboard/perfil"
          className={`relative mt-4 flex items-center px-4 py-3 transition hover:bg-blue-50 ${
            sidebarOpen ? 'gap-3' : 'justify-center'
          } ${
            pathname === '/dashboard/perfil'
              ? 'border-r-4 border-blue-700 bg-blue-50 text-blue-700'
              : 'text-gray-700'
          }`}
          title={!sidebarOpen ? 'Configuración' : undefined}
        >
          <Settings size={20} />
          {sidebarOpen && <span>Configuración</span>}
        </Link>
      </nav>
    </aside>
  );
}


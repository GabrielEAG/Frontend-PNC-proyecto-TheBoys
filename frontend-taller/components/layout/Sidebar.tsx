// components/layout/Sidebar.tsx
'use client';

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

interface SidebarProps {
  sidebarOpen: boolean;
  userRole: string;
}

export default function Sidebar({ sidebarOpen, userRole }: SidebarProps) {
  const pathname = usePathname();

  const menuItems = {
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
    ],
    ADMIN: [
      { name: 'Reporte Global', href: '/dashboard/admin-reportes', icon: BarChart3 },
      { name: 'Inventario', href: '/dashboard/admin-inventario', icon: Package },
      { name: 'Empleados', href: '/dashboard/admin-empleados', icon: Users },
      { name: 'Clientes', href: '/dashboard/admin-clientes', icon: Users },
      { name: 'Sucursales', href: '/dashboard/admin-sucursales', icon: Building2 },
    ],
  };

  const items = menuItems[userRole as keyof typeof menuItems] || [];

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`fixed left-0 top-16 h-full bg-white shadow-lg transition-all duration-300 z-20 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <nav className="mt-6">
        {/* Home siempre visible */}
        <Link
          href="/dashboard"
          className={`flex items-center space-x-3 px-4 py-3 mb-2 hover:bg-blue-50 transition ${
            pathname === '/dashboard' ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' : 'text-gray-700'
          }`}
        >
          <Home size={20} />
          {sidebarOpen && <span>Inicio</span>}
        </Link>

        {/* Menú según rol */}
        {items.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center space-x-3 px-4 py-3 mb-2 hover:bg-blue-50 transition ${
              isActive(item.href) ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' : 'text-gray-700'
            }`}
          >
            <item.icon size={20} />
            {sidebarOpen && <span>{item.name}</span>}
          </Link>
        ))}

        {/* Perfil al final */}
        <Link
          href="/dashboard/perfil"
          className={`flex items-center space-x-3 px-4 py-3 mt-4 hover:bg-blue-50 transition ${
            pathname === '/dashboard/perfil' ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700' : 'text-gray-700'
          }`}
        >
          <Settings size={20} />
          {sidebarOpen && <span>Configuración</span>}
        </Link>
      </nav>
    </aside>
  );
}
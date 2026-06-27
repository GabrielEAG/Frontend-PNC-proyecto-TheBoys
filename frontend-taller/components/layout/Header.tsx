'use client';

import { Menu, X, User, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { useState } from 'react';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-blue-900 text-white shadow-lg z-30">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 hover:bg-blue-800 rounded-lg transition"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <Link href="/dashboard" className="flex items-center space-x-2 hover:opacity-90 transition">
            <div className="text-2xl">🔧</div>
            <h1 className="text-xl font-bold">Taller Automotriz</h1>
          </Link>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 hover:bg-blue-800 px-3 py-1 rounded-lg transition"
          >
            <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center">
              <User size={18} />
            </div>
            <span className="hidden md:inline">{user?.nombre?.split(' ')[0]}</span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-40">
              <Link
                href="/dashboard/perfil"
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                onClick={() => setShowUserMenu(false)}
              >
                <User size={16} />
                <span>Mi Perfil</span>
              </Link>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-gray-100 transition w-full text-left"
              >
                <LogOut size={16} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
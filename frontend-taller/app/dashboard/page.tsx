'use client';

import { useAuthStore } from '@/store/authStore';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      switch (user.rol) {
        case 'ADMIN':
          router.replace('/dashboard/admin-reportes')
          break;
        case 'MECANICO':
          router.replace('/dashboard/mecanico-citas')
          break;
        case 'CLIENTE':
          router.replace('/dashboard/mis-ordenes')
          break;
        default:
          router.replace('/dashboard')
      }
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirigiendo...</p>
      </div>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { getAuthErrorMessage } from '@/lib/errors';
import { Wrench, Mail, Lock, User, Phone, Eye, EyeOff, UserCircle, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    telefono: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('La Contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const email = formData.email.trim().toLowerCase();
    const telefono = formData.telefono.trim();

if (!formData.nombre.trim() || !formData.apellido.trim() || !email || !telefono || !formData.password) {
  setError('Completa todos los campos requeridos.');
  return;
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  setError('Ingresa un correo electrónico válido.');
  return;
}

if (formData.password.length < 6) {
  setError('La contraseña debe tener al menos 6 caracteres.');
  return;
}

if (!/^[0-9+() -]{7,20}$/.test(telefono)) {
  setError('Ingresa un número de teléfono válido.');
  return;
}

    try {
      await register({
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      email,
      telefono,
      password: formData.password,
  rol: 'CLIENTE',
});
      router.replace('/dashboard');
    } catch (err) {
      setError(getAuthErrorMessage(err, 'No se pudo crear la cuenta. Revisa tus datos.'));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-blue-900 to-blue-700 px-4 py-8">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <Wrench className="h-12 w-12 text-blue-700" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Crear cuenta</h2>
          <p className="text-gray-600">Registrate para agendar tus citas</p>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">Nombre *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => {
                    setError('');
                    setFormData({ ...formData, nombre: e.target.value });
                  }}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Juan"
                  autoComplete="given-name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">Apellido *</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.apellido}
                  onChange={(e) => {
                    setError('');
                    setFormData({ ...formData, apellido: e.target.value });
                  }}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Perez"
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-gray-700">Correo electronico *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setError('');
                  setFormData({ ...formData, email: e.target.value });
                }}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-gray-700">Telefono *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={formData.telefono}
                onChange={(e) => {
                  setError('');
                  setFormData({ ...formData, telefono: e.target.value });
                }}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1234-5678"
                autoComplete="tel"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-2 block text-sm font-bold text-gray-700">Contraseña *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => {
                  setError('');
                  setFormData({ ...formData, password: e.target.value });
                }}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="********"
                autoComplete="new-password"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Ocultar Contraseña' : 'Mostrar Contraseña'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-700 px-4 py-2 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Ya tienes cuenta?{' '}
          <Link href="/login" className="font-semibold text-blue-700 hover:text-blue-800">
            Inicia sesion aqui
          </Link>
        </p>
      </div>
    </div>
  );
}

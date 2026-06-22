// lib/auth.ts
import api from './api';
import { AuthResponse, LoginRequest, RegisterRequest, Usuario } from '@/types';

const buildStoredUser = (data: AuthResponse): Usuario => ({
  id: Number(data.id) || 0,
  email: data.email,
  nombre: data.nombre,
  apellido: data.apellido,
  rol: data.rol as Usuario['rol'],
  clienteId: data.clienteId ?? null,
  mecanicoId: data.mecanicoId ?? null,
  sucursalId: data.sucursalId ?? null,
});

export const auth = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    
    // Guardar token y datos en localStorage
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(buildStoredUser(response.data)));
    
    return response.data;
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    // Por defecto, el rol es CLIENTE
    const data = { ...userData, rol: userData.rol || 'CLIENTE' };
    const response = await api.post('/auth/register', data);
    
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(buildStoredUser(response.data)));
    
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getCurrentUser(): Usuario | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

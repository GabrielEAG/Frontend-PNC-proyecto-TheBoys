import api from './api';
import { AuthResponse, LoginRequest, RegisterRequest, Usuario } from '@/types';

const isBrowser = () => typeof window !== 'undefined';

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

const saveSession = (token: string, user: Usuario) => {
  if (!isBrowser()) return;

  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

const clearSession = () => {
  if (!isBrowser()) return;

  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('auth-storage');

  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

export const auth = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials);
    const user = buildStoredUser(response.data);

    saveSession(response.data.token, user);

    return response.data;
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const data = { ...userData, rol: userData.rol || 'CLIENTE' };
    const response = await api.post('/auth/register', data);
    const user = buildStoredUser(response.data);

    saveSession(response.data.token, user);

    return response.data;
  },

  logout(): void {
    clearSession();
  },

  getCurrentUser(): Usuario | null {
    if (!isBrowser()) return null;

    const userStr = localStorage.getItem('user');

    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem('token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};

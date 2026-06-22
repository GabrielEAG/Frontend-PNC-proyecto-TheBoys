import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Usuario, LoginRequest, RegisterRequest } from '@/types';
import { auth } from '@/lib/auth';

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildUserFromAuthResponse = (response: {
  id?: unknown;
  email: string;
  nombre: string;
  apellido?: string;
  rol: string;
  clienteId?: number | null;
  mecanicoId?: number | null;
  sucursalId?: number | null;
}): Usuario => ({
  id: toNumber(response.id),
  email: response.email,
  nombre: response.nombre,
  apellido: response.apellido,
  rol: response.rol as Usuario['rol'],
  clienteId: response.clienteId ?? null,
  mecanicoId: response.mecanicoId ?? null,
  sucursalId: response.sucursalId ?? null,
});

// ✅ Interface completa con todos los campos que se usan en useAuth, login y register
interface AuthState {
  user: Usuario | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  setUser: (user: Usuario | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await auth.login(credentials);
          set({
            user: buildUserFromAuthResponse(response),
            token: response.token,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (userData) => {
        set({ isLoading: true });
        try {
          const response = await auth.register(userData);
          set({
            user: buildUserFromAuthResponse(response),
            token: response.token,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        auth.logout();
        set({ user: null, token: null });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

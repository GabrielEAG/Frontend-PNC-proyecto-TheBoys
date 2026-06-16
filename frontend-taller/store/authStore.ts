import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Usuario, LoginRequest } from '@/types';
import { auth } from '@/lib/auth';

// ✅ Interface completa con todos los campos que se usan en useAuth, login y register
interface AuthState {
  user: Usuario | null;
  token: string | null;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: any) => Promise<void>;
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
          const userId = typeof response.id === 'number'
            ? response.id
            : parseInt(response.id as any) || 0;
          set({
            user: {
              id: userId,
              email: response.email,
              nombre: response.nombre,
              apellido: response.apellido,
              rol: response.rol as 'ADMIN' | 'MECANICO' | 'CLIENTE',
            },
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
          const userId = typeof response.id === 'number'
            ? response.id
            : parseInt(response.id as any) || 0;
          set({
            user: {
              id: userId,
              email: response.email,
              nombre: response.nombre,
              apellido: response.apellido,
              rol: response.rol as 'ADMIN' | 'MECANICO' | 'CLIENTE',
            },
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
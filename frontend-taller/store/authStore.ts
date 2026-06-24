import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Usuario, LoginRequest, RegisterRequest } from '@/types';
import { auth } from '@/lib/auth';

const isBrowser = () => typeof window !== 'undefined';

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

const saveLegacySession = (token: string | null, user: Usuario | null) => {
  if (!isBrowser()) return;

  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');

  if (user) localStorage.setItem('user', JSON.stringify(user));
  else localStorage.removeItem('user');
};

const readLegacySession = (): { token: string | null; user: Usuario | null } => {
  if (!isBrowser()) return { token: null, user: null };

  const token = localStorage.getItem('token');

  const userStr = localStorage.getItem('user');
  let user: Usuario | null = null;

  if (userStr) {
    try {
      user = JSON.parse(userStr);
    } catch {
      user = null;
    }
  }

  return { token, user };
};

const clearAllSessionStorage = () => {
  if (!isBrowser()) return;

  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('auth-storage');

  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
};

interface AuthState {
  user: Usuario | null;
  token: string | null;
  isLoading: boolean;
  hasHydrated: boolean;

  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: (redirect?: boolean) => void;
  setUser: (user: Usuario | null) => void;
  setHasHydrated: (value: boolean) => void;
  bootstrapSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      bootstrapSession: () => {
        if (!isBrowser()) return;

        const current = get();

        if (current.token && current.user) {
          saveLegacySession(current.token, current.user);
          return;
        }

        const legacy = readLegacySession();

        if (legacy.token && legacy.user) {
          set({
            token: legacy.token,
            user: legacy.user,
          });
        }
      },

      login: async (credentials) => {
        set({ isLoading: true });

        try {
          const response = await auth.login(credentials);
          const user = buildUserFromAuthResponse(response);

          saveLegacySession(response.token, user);

          set({
            user,
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
          const user = buildUserFromAuthResponse(response);

          saveLegacySession(response.token, user);

          set({
            user,
            token: response.token,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: (redirect = true) => {
        clearAllSessionStorage();

        set({
          user: null,
          token: null,
          isLoading: false,
        });

        if (redirect && isBrowser() && !window.location.pathname.includes('/login')) {
          window.location.replace('/login');
        }
      },

      setUser: (user) => {
        const token = get().token;
        saveLegacySession(token, user);
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        state?.bootstrapSession();
      },
    }
  )
);

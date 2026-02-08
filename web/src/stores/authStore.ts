import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@/types';

type AuthUser = {
  id?: string;
  username: string;
  name?: string;
  martId?: string;
  email?: string;
  phone?: string;
  role: UserRole;
  token: string;
  permissions?: string[]; // optional permissions granted to the user
};

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ role?: UserRole; message?: string } | false>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        // Default to local backend in dev when VITE_API_URL is not set
        const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:4000');
        try {
          const res = await fetch(API_BASE + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });

          if (!res.ok) {
            try {
              const err = await res.json();
              console.warn('Login failed:', err);
              return { message: err && err.message ? String(err.message) : `status ${res.status}` };
            } catch (_) {
              console.warn('Login failed: status', res.status);
              return { message: `status ${res.status}` };
            }
          }

          const data = await res.json();
          if (data && data.token && data.user) {
            // normalize backend role -> frontend UserRole
            const rawRole = String(data.user.role || '').trim();
            const roleMap: Record<string, import('@/types').UserRole> = {
              systemAdmin: 'system_admin',
              system_admin: 'system_admin',
              owner: 'owner',
              manager: 'manager',
              cashier: 'cashier',
              storeKeeper: 'store_keeper',
              store_keeper: 'store_keeper',
            } as const;

            const normalizedRole = (roleMap[rawRole] || 'owner') as import('@/types').UserRole;

            set({
              user: {
                id: data.user.id || data.user._id || undefined,
                username: data.user.username,
                martId: data.user.martId || data.user.shopId || data.user.mart || undefined,
                name: data.user.name,
                email: data.user.email,
                phone: data.user.phone,
                role: normalizedRole,
                token: data.token,
                permissions: Array.isArray(data.user.permissions) ? data.user.permissions : [],
              },

              isAuthenticated: true,
              isLoading: false,
            });

            return { role: normalizedRole };
          }

          return false;
        } catch (e) {
          console.error('Login error', e);
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => set({ user: null, isAuthenticated: false }),

      setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

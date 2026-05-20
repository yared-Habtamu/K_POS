import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserRole } from '@/types';
import { useCartStore } from './cartStore';
import { useProductStore } from './productStore';

type AuthUser = {
  id?: string;
  username: string;
  name?: string;
  martId?: string;
  email?: string;
  phone?: string;
  profilePictureUrl?: string;
  role: UserRole;
  token: string;
  permissions?: string[]; // optional permissions granted to the user
  openCashBalance?: number;
};

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  rememberMe: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{ role?: UserRole; message?: string } | false>;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  setRememberMe: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,
      rememberMe: true,

      login: async (username: string, password: string, rememberMe: boolean = true) => {
        set({ isLoading: true, rememberMe });
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
            // Always start a fresh cart for each authenticated session.
            useCartStore.getState().clearCart();
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
                profilePictureUrl: data.user.profilePictureUrl,
                role: normalizedRole,
                token: data.token,
                permissions: Array.isArray(data.user.permissions) ? data.user.permissions : [],
                openCashBalance: Number(data.user.openCashBalance || 0),
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

      logout: () => {
        useCartStore.getState().clearCart();
        useProductStore.setState({ products: [], totalProducts: 0 });
        try {
          (window as any).posApi?.setCachedProducts?.([]);
        } catch (e) {}
        set({ user: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setRememberMe: (val) => set({ rememberMe: val }),
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => () => {
        set({ isHydrated: true });
      },
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          return sessionStorage.getItem(name) || localStorage.getItem(name) || null;
        },
        setItem: (name, value) => {
          try {
            const state = typeof value === 'string' ? JSON.parse(value) : value;
            if (state?.state?.rememberMe === false) {
              sessionStorage.setItem(name, value);
              localStorage.removeItem(name);
            } else {
              localStorage.setItem(name, value);
              sessionStorage.removeItem(name);
            }
          } catch (e) {
            localStorage.setItem(name, typeof value === 'string' ? value : JSON.stringify(value));
          }
        },
        removeItem: (name) => {
          localStorage.removeItem(name);
          sessionStorage.removeItem(name);
        }
      })),
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated, 
        rememberMe: state.rememberMe 
      } as any),
    }
  )
);

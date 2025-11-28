import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

// Mock users for demo
const mockUsers: Record<UserRole, User> = {
  system_admin: {
    id: 'admin-001',
    name: 'System Administrator',
    email: 'admin@smartpos.com',
    role: 'system_admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  owner: {
    id: 'owner-001',
    name: 'Abebe Kebede',
    email: 'owner@kiyamart.com',
    phone: '+251911234567',
    role: 'owner',
    shopId: 'shop-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  manager: {
    id: 'manager-001',
    name: 'Tigist Haile',
    phone: '+251922345678',
    role: 'manager',
    salary: 15000,
    shopId: 'shop-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  cashier: {
    id: 'cashier-001',
    name: 'Dawit Tadesse',
    phone: '+251933456789',
    role: 'cashier',
    salary: 8000,
    shopId: 'shop-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  store_keeper: {
    id: 'storekeeper-001',
    name: 'Mulugeta Assefa',
    phone: '+251944567890',
    role: 'store_keeper',
    salary: 9000,
    shopId: 'shop-001',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username: string, password: string, role: UserRole) => {
        set({ isLoading: true });
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // For demo, accept any password with 'demo' or matching username
        if (password === 'demo' || password === username) {
          const user = mockUsers[role];
          set({ user, isAuthenticated: true, isLoading: false });
          return true;
        }
        
        set({ isLoading: false });
        return false;
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

import { ReactNode, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { UserRole } from '@/types';

interface RoleLayoutProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export function RoleLayout({ children, allowedRoles }: RoleLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to their own dashboard
    const roleDashboards: Record<UserRole, string> = {
      system_admin: '/admin',
      owner: '/owner',
      manager: '/manager',
      cashier: '/cashier',
      store_keeper: '/store-keeper',
    };
    return <Navigate to={roleDashboards[user.role]} replace />;
  }

  return (
    <div className="h-screen flex w-full bg-background overflow-hidden">
      <Sidebar role={user.role} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Header onToggleSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6">
          <div className="w-full max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Settings,
  Receipt,
  Wallet,
  Building2,
  BarChart3,
  AlertTriangle,
  Boxes,
  ClipboardList,
  UserCog,
  Barcode,
  Image,
  Store,
} from 'lucide-react';

interface SidebarProps {
  role: UserRole;
}

interface SidebarPropsExtended extends SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const roleNavItems: Record<UserRole, NavItem[]> = {
  cashier: [
    { label: 'pos', icon: ShoppingCart, path: '/cashier' },
    { label: 'daily_report', icon: FileText, path: '/cashier/report' },
  ],
  manager: [
    { label: 'dashboard', icon: LayoutDashboard, path: '/manager' },
    { label: 'pos', icon: ShoppingCart, path: '/owner/pos' },
    { label: 'employees', icon: Users, path: '/manager/employees' },
    { label: 'inventory', icon: Package, path: '/manager/inventory' },
    { label: 'assets', icon: Boxes, path: '/manager/assets' },
    { label: 'reports', icon: BarChart3, path: '/manager/reports' },
    { label: 'alerts', icon: AlertTriangle, path: '/alerts' },
  ],
  owner: [
    { label: 'dashboard', icon: LayoutDashboard, path: '/owner' },
    { label: 'pos', icon: ShoppingCart, path: '/owner/pos' },
    { label: 'products', icon: Package, path: '/owner/products' },
    { label: 'inventory', icon: Boxes, path: '/inventory' },
    { label: 'employees', icon: Users, path: '/owner/employees' },
    { label: 'expenses', icon: Wallet, path: '/owner/expenses' },
    { label: 'alerts', icon: AlertTriangle, path: '/alerts' },
    { label: 'reports', icon: BarChart3, path: '/owner/reports' },
    {label: 'assets', icon: Boxes, path: '/manager/assets'},
    { label: 'settings', icon: Settings, path: '/owner/settings' },
  ],
  store_keeper: [
    { label: 'inventory', icon: Package, path: '/store-keeper' },
    { label: 'add_stock', icon: ClipboardList, path: '/store-keeper/add-stock' },
    { label: 'barcode', icon: Barcode, path: '/store-keeper/barcode' },
    { label: 'products', icon: Image, path: '/store-keeper/pictures' },
    { label: 'alerts', icon: AlertTriangle, path: '/alerts' },
  ],
  system_admin: [
    { label: 'dashboard', icon: BarChart3, path: '/admin/reports' },
    { label: 'shop', icon: Building2, path: '/admin/shops' },
   
  ],
};

export function Sidebar({ role, mobileOpen, onClose }: SidebarPropsExtended) {
  const { t } = useTranslation();
  const location = useLocation();
  const navItems = roleNavItems[role];

  return (
    <>
      <aside className="sidebar-desktop w-64 flex-col glass-strong border-r border-border/50">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Store className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">{t('app_name')}</h1>
            <p className="text-xs text-muted-foreground capitalize">{t(role)}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          // ✅ FIXED: Exact path match only
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {/* Remove the motion div if you don't want the left accent bar */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <item.icon className="w-5 h-5" />
              <span>{t(item.label)}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <div className="text-xs text-muted-foreground text-center">
          Smart POS v2.1
        </div>
      </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 glass border-r border-border/50">
            <div className="h-16 flex items-center px-6 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                  <Store className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="font-bold text-lg text-foreground">{t('app_name')}</h1>
                  <p className="text-xs text-muted-foreground capitalize">{t(role)}</p>
                </div>
              </div>
            </div>

            <nav className="py-4 px-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path + '/'));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive ? 'bg-primary text-primary-foreground shadow-glow' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{t(item.label)}</span>
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
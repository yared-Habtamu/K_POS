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
  Warehouse,
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
  activePaths?: string[];
}

interface NavGroup {
  groupLabel?: string;
  items: NavItem[];
}

function normalizePath(path: string) {
  if (!path) return '/';
  const normalized = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
  return normalized || '/';
}

function getNavItemMatchScore(pathname: string, item: NavItem) {
  const currentPath = normalizePath(pathname);
  const candidatePaths = [item.path, ...(item.activePaths ?? [])].map(normalizePath);
  let bestScore = -1;
  candidatePaths.forEach((candidatePath) => {
    if (currentPath === candidatePath) {
      bestScore = Math.max(bestScore, candidatePath.length + 1000);
      return;
    }
    if (candidatePath === '/') {
      if (currentPath === '/') bestScore = Math.max(bestScore, 1000);
      return;
    }
    if (currentPath.startsWith(`${candidatePath}/`)) {
      bestScore = Math.max(bestScore, candidatePath.length);
    }
  });
  return bestScore;
}

function getActiveNavPath(pathname: string, groups: NavGroup[]) {
  const allItems = groups.flatMap(g => g.items);
  let activePath: string | null = null;
  let bestScore = -1;
  allItems.forEach((item) => {
    const score = getNavItemMatchScore(pathname, item);
    if (score > bestScore) {
      bestScore = score;
      activePath = item.path;
    }
  });
  return activePath;
}

const roleNavGroups: Record<UserRole, NavGroup[]> = {
  cashier: [
    {
      items: [
        { label: 'dashboard', icon: LayoutDashboard, path: '/cashier/today-sales' },
        { label: 'pos', icon: ShoppingCart, path: '/cashier' },
      ],
    },
    {
      groupLabel: 'reports',
      items: [
        { label: 'daily_report', icon: FileText, path: '/cashier/report' },
        { label: 'customers', icon: Users, path: '/cashier/customers' },
      ],
    },
  ],
  manager: [
    {
      items: [
        { label: 'dashboard', icon: LayoutDashboard, path: '/manager' },
        { label: 'pos', icon: ShoppingCart, path: '/owner/pos' },
      ],
    },
    {
      groupLabel: 'inventory',
      items: [
        { label: 'products', icon: Package, path: '/manager/products' },
        { label: 'inventory', icon: Warehouse, path: '/manager/inventory' },
        { label: 'assets', icon: Boxes, path: '/manager/assets' },
      ],
    },
    {
      groupLabel: 'employees',
      items: [
        { label: 'employees', icon: Users, path: '/manager/employees' },
        { label: 'customers', icon: Users, path: '/manager/customers' },
        { label: 'approvals', icon: ClipboardList, path: '/manager/approvals' },
      ],
    },
    {
      groupLabel: 'analytics',
      items: [
        { label: 'reports', icon: BarChart3, path: '/manager/reports' },
        { label: 'today_sales', icon: Receipt, path: '/manager/today-sales' },
        { label: 'alerts', icon: AlertTriangle, path: '/alerts' },
      ],
    },
  ],
  owner: [
    {
      items: [
        { label: 'dashboard', icon: LayoutDashboard, path: '/owner' },
        { label: 'pos', icon: ShoppingCart, path: '/owner/pos' },
        { label: 'today_sales', icon: Receipt, path: '/owner/today-sales' },
      ],
    },
    {
      groupLabel: 'inventory',
      items: [
        { label: 'products', icon: Package, path: '/owner/products', activePaths: ['/owner/products/add'] },
        { label: 'inventory', icon: Warehouse, path: '/owner/inventory', activePaths: ['/inventory'] },
        { label: 'add_stock', icon: ClipboardList, path: '/store-keeper/add-stock' },
        { label: 'assets', icon: Boxes, path: '/owner/assets', activePaths: ['/manager/assets'] },
      ],
    },
    {
      groupLabel: 'employees',
      items: [
        { label: 'employees', icon: Users, path: '/owner/employees' },
        { label: 'customers', icon: Users, path: '/owner/customers' },
      ],
    },
    {
      groupLabel: 'finance',
      items: [
        { label: 'expenses', icon: Wallet, path: '/owner/expenses' },
        { label: 'reports', icon: BarChart3, path: '/owner/reports' },
        { label: 'alerts', icon: AlertTriangle, path: '/owner/alerts', activePaths: ['/alerts'] },
      ],
    },
    {
      groupLabel: 'settings',
      items: [
        { label: 'settings', icon: Settings, path: '/owner/settings' },
      ],
    },
  ],
  store_keeper: [
    {
      items: [
        { label: 'inventory', icon: Package, path: '/store-keeper', activePaths: ['/store-keeper/inventory'] },
        { label: 'add_stock', icon: ClipboardList, path: '/store-keeper/add-stock' },
      ],
    },
    {
      groupLabel: 'products',
      items: [
        { label: 'barcode', icon: Barcode, path: '/store-keeper/barcode' },
        { label: 'products', icon: Image, path: '/store-keeper/products' },
        { label: 'alerts', icon: AlertTriangle, path: '/alerts' },
      ],
    },
  ],
  system_admin: [
    {
      items: [
        { label: 'dashboard', icon: BarChart3, path: '/admin', activePaths: ['/admin/reports'] },
        { label: 'shop', icon: Building2, path: '/admin/shops' },
      ],
    },
  ],
};

function NavGroupSection({
  group,
  activeNavPath,
  onClick,
}: {
  group: NavGroup;
  activeNavPath: string | null;
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mb-1">
      {group.groupLabel && (
        <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
          {t(group.groupLabel)}
        </p>
      )}
      {group.items.map((item) => {
        const isActive = activeNavPath === item.path;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClick}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative',
              isActive
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="sidebar-indicator"
                className="absolute left-0 w-1 h-7 bg-primary rounded-r-full"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{t(item.label)}</span>
          </NavLink>
        );
      })}
    </div>
  );
}

export function Sidebar({ role, mobileOpen, onClose }: SidebarPropsExtended) {
  const { t } = useTranslation();
  const location = useLocation();
  const groups = roleNavGroups[role] ?? [];
  const activeNavPath = getActiveNavPath(location.pathname, groups);

  const NavContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <nav className="flex-1 min-h-0 py-3 px-3 overflow-y-auto">
      {groups.map((group, i) => (
        <NavGroupSection
          key={i}
          group={group}
          activeNavPath={activeNavPath}
          onClick={onItemClick}
        />
      ))}
    </nav>
  );

  return (
    <>
      <aside className="sidebar-desktop sticky top-0 h-screen w-64 shrink-0 flex-col overflow-hidden glass-strong border-r border-border/50">
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

        <NavContent />

        {/* Footer */}
        <div className="p-4 border-t border-border/50">
          <div className="text-xs text-muted-foreground text-center">Kiya Smart POS v2.1</div>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-64 glass border-r border-border/50 flex flex-col">
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
            <NavContent onItemClick={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
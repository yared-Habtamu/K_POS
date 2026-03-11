import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  LogOut,
  Settings,
  Bell,
  Globe,
  Menu,
  Moon,
  Sun,
  User,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuthStore();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const role = user?.role;
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);


  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'am' : 'en');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const getInitials = (name?: string) => {
    return String(name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 h-16 glass-strong border-b border-border/50 flex items-center justify-between px-3 sm:px-4 md:px-6">
      {/* Mobile menu button */}
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => onToggleSidebar?.()}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Connection status */}
      <div className="flex items-center gap-2 min-w-0">
        <motion.div
          animate={{ scale: isOnline ? 1 : [1, 1.1, 1] }}
          transition={{ repeat: isOnline ? 0 : Infinity, duration: 2 }}
        >
          {isOnline ? (
            <Badge variant="secondary" className="gap-1.5 bg-success/10 text-success border-success/20">
              <Wifi className="h-3 w-3" />
              <span className="hidden sm:inline">{t('online')}</span>
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1.5 bg-warning/10 text-warning border-warning/20">
              <WifiOff className="h-3 w-3" />
              <span className="hidden sm:inline">{t('offline')}</span>
            </Badge>
          )}
        </motion.div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Language toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="gap-2"
        >
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{i18n.language === 'en' ? 'EN' : 'አማ'}</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? t('switch_to_light_mode') : t('switch_to_dark_mode')}
          title={theme === 'dark' ? t('light_mode') : t('dark_mode')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-3">
              <Avatar className="h-8 w-8">
                {user?.profilePictureUrl ? <AvatarImage src={user.profilePictureUrl} alt={user?.name || user?.username} /> : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {user ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{user ? t(user.role) : ''}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email || user?.phone}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              {t('profile')}
            </DropdownMenuItem>
            {user?.role === 'owner' && (
              <DropdownMenuItem onClick={() => navigate('/owner/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                {t('settings')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t('logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

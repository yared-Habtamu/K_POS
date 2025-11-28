import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import type { UserRole } from '@/types';
import { Store, Eye, EyeOff, Loader2 } from 'lucide-react';

const roleDashboards: Record<UserRole, string> = {
  system_admin: '/admin',
  owner: '/owner',
  manager: '/manager',
  cashier: '/cashier',
  store_keeper: '/store-keeper',
};

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await login(username, password, role);
    
    if (success) {
      toast({
        title: 'Welcome!',
        description: `Logged in as ${t(role)}`,
      });
      navigate(roleDashboards[role]);
    } else {
      toast({
        title: 'Login Failed',
        description: t('login_error'),
        variant: 'destructive',
      });
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'am' : 'en');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <Button variant="outline" size="sm" onClick={toggleLanguage} className="gap-2">
            {i18n.language === 'en' ? '🇪🇹 አማርኛ' : '🇺🇸 English'}
          </Button>
        </div>

        <div className="glass-strong rounded-2xl p-8 shadow-card">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
              className="w-20 h-20 mx-auto rounded-2xl gradient-primary flex items-center justify-center shadow-glow mb-4"
            >
              <Store className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground">{t('app_name')}</h1>
            <p className="text-muted-foreground mt-1">Smart POS & Inventory System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label htmlFor="role">{t('select_role')}</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">{t('cashier')}</SelectItem>
                  <SelectItem value="manager">{t('manager')}</SelectItem>
                  <SelectItem value="owner">{t('owner')}</SelectItem>
                  <SelectItem value="store_keeper">{t('store_keeper')}</SelectItem>
                  <SelectItem value="system_admin">{t('system_admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">{t('username')}</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="h-12"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="h-12 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                t('login')
              )}
            </Button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 p-4 rounded-xl bg-accent/50 border border-border">
            <p className="text-sm text-muted-foreground text-center">
              <span className="font-medium text-foreground">Demo:</span> Use "demo" as password for any role
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

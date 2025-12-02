import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import {
  Store,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Shield,
  Wifi,
  Globe,
  ArrowRight,
  UserPlus,
} from 'lucide-react';

const features = [
  { icon: ShoppingCart, title: 'POS System', description: 'Fast checkout with barcode scanning' },
  { icon: Package, title: 'Inventory', description: 'Real-time stock management' },
  { icon: Users, title: 'Multi-Role', description: '5 user roles with permissions' },
  { icon: BarChart3, title: 'Reports', description: 'Sales and financial analytics' },
  { icon: Wifi, title: 'Offline Mode', description: 'Works without internet' },
  { icon: Globe, title: 'Bilingual', description: 'English & Amharic support' },
];

export default function Index() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const handleGetStarted = () => {
    if (isAuthenticated && user) {
      const routes = {
        system_admin: '/admin',
        owner: '/owner',
        manager: '/manager',
        cashier: '/cashier',
        store_keeper: '/store-keeper',
      };
      navigate(routes[user.role]);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="flex justify-end mb-8">
            <Button variant="outline" size="sm" onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'am' : 'en')}>
              {i18n.language === 'en' ? '🇪🇹 አማርኛ' : '🇺🇸 English'}
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
              className="w-24 h-24 mx-auto rounded-3xl gradient-primary flex items-center justify-center shadow-glow mb-8"
            >
              <Store className="w-12 h-12 text-primary-foreground" />
            </motion.div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Smart <span className="text-gradient">POS</span> System
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Complete point-of-sale and inventory management solution for Ethiopian supermarkets and retail stores.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={handleGetStarted} className="text-lg h-14 px-8">
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/owner/register')} className="text-lg h-14 px-8">
                <UserPlus className="mr-2 h-5 w-5" />
                Register Your Mart
              </Button>
              {!isAuthenticated && (
                <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="text-lg h-14 px-8">
                  <Shield className="mr-2 h-5 w-5" />
                  Login
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-20">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl font-bold text-center mb-12"
        >
          Everything you need to run your business
        </motion.h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>Smart POS v2.1 • Built for Ethiopian Retail</p>
        </div>
      </footer>
    </div>
  );
}

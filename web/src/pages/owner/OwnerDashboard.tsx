import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProductStore } from '@/stores/productStore';
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

// Mock data for charts
const dailyData = [
  { name: 'Mon', sales: 4500 },
  { name: 'Tue', sales: 5200 },
  { name: 'Wed', sales: 4800 },
  { name: 'Thu', sales: 6100 },
  { name: 'Fri', sales: 7200 },
  { name: 'Sat', sales: 8500 },
  { name: 'Sun', sales: 5900 },
];

const weeklyData = [
  { name: 'Week 1', sales: 12000 },
  { name: 'Week 2', sales: 15000 },
  { name: 'Week 3', sales: 9000 },
  { name: 'Week 4', sales: 18000 },
];

const monthlyData = [
  { name: 'January', sales: 42000 },
  { name: 'February', sales: 38000 },
  { name: 'March', sales: 45000 },
  { name: 'April', sales: 47000 },
  { name: 'May', sales: 52000 },
  { name: 'June', sales: 49000 },
  { name: 'July', sales: 53000 },
  { name: 'August', sales: 55000 },
  { name: 'September', sales: 50000 },
  { name: 'October', sales: 57000 },
  { name: 'November', sales: 60000 },
  { name: 'December', sales: 65000 },
];

const topProducts = [
  { name: 'Coca Cola 500ml', sold: 145, revenue: 3625 },
  { name: 'Fresh Milk 1L', sold: 98, revenue: 5880 },
  { name: 'White Bread', sold: 87, revenue: 1566 },
  { name: 'Sugar 1kg', sold: 65, revenue: 5525 },
  { name: 'Lays Chips', sold: 52, revenue: 2600 },
];

export default function OwnerDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const { products, getLowStockProducts, searchProducts } = useProductStore();
  const [search, setSearch] = useState('');

  const filteredProducts = search ? searchProducts(search) : products;
  const lowStock = getLowStockProducts();
  const chartData = range === 'daily' ? dailyData : range === 'weekly' ? weeklyData : monthlyData;

  const stats = [
    {
      title: t('today_sales'),
      value: '42,350',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-primary',
    },
    {
      title: 'Transactions',
      value: '156',
      change: '+8.2%',
      trend: 'up',
      icon: ShoppingCart,
      color: 'text-success',
    },
    {
      title: t('products'),
      value: products.length.toString(),
      change: `${lowStock.length} low`,
      trend: 'down',
      icon: Package,
      color: 'text-warning',
    },
    {
      title: t('profit'),
      value: '15,420',
      change: '+5.3%',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-chart-2',
    },
  ];

  return (
    <RoleLayout allowedRoles={['owner']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
              <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => {
                const url = `${window.location.origin}/owner/register`;
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(url).then(() => {
                    toast({ title: 'Link copied', description: 'Registration link copied to clipboard.' });
                  }).catch(() => {
                    toast({ title: 'Copy failed', description: 'Could not copy link to clipboard.' });
                  });
                } else {
                  try {
                    // fallback
                    window.prompt?.('Copy this link', url);
                  } catch {
                    toast({ title: 'Copy failed', description: 'Could not copy link to clipboard.' });
                  }
                }
              }}>
                <Share2 className="mr-2 h-4 w-4" />
                Invite Owner
              </Button>
              <Button size="sm" onClick={() => navigate('/owner/register')}>
                <UserPlus className="mr-2 h-4 w-4" />
                Register a Mart
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">{stat.value} {stat.title.includes('Sales') || stat.title.includes('Profit') ? t('etb') : ''}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {stat.trend === 'up' ? (
                          <ArrowUpRight className="h-3 w-3 text-success" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-destructive" />
                        )}
                        <span className={`text-xs ${stat.trend === 'up' ? 'text-success' : 'text-destructive'}`}>
                          {stat.change}
                        </span>
                      </div>
                    </div>
                    <div className={`p-3 rounded-xl bg-accent ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Sales Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>{(range === 'daily' ? 'Daily' : range === 'monthly' ? 'Monthly' : 'Weekly') + ' Sales'}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" className={`${range === 'daily' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'} h-8 px-3`}
                    onClick={() => setRange('daily')}>Daily</Button>
                  <Button size="sm" className={`${range === 'weekly' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'} h-8 px-3`}
                    onClick={() => setRange('weekly')}>Weekly</Button>
                  <Button size="sm" className={`${range === 'monthly' ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'} h-8 px-3`}
                    onClick={() => setRange('monthly')}>Monthly</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: 'hsl(var(--primary))' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Products */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('top_selling')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="sold" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        
      </div>
    </RoleLayout>
  );
}

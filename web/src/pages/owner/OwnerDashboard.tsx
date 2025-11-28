import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProductStore } from '@/stores/productStore';
import {
  DollarSign,
  ShoppingCart,
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
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
const salesData = [
  { name: 'Mon', sales: 4500 },
  { name: 'Tue', sales: 5200 },
  { name: 'Wed', sales: 4800 },
  { name: 'Thu', sales: 6100 },
  { name: 'Fri', sales: 7200 },
  { name: 'Sat', sales: 8500 },
  { name: 'Sun', sales: 5900 },
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
  const { products, getLowStockProducts, getExpiringProducts } = useProductStore();
  
  const lowStock = getLowStockProducts();
  const expiring = getExpiringProducts(7);

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
          <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
          <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
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
              <CardHeader>
                <CardTitle>{t('this_week')} Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesData}>
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

        {/* Alerts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Low Stock Alert */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  {t('low_stock')} {t('alerts')}
                  <Badge variant="secondary" className="ml-auto">{lowStock.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lowStock.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
                      <div className="flex items-center gap-3">
                        {product.pictureUrl ? (
                          <img src={product.pictureUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.category}</p>
                        </div>
                      </div>
                      <Badge variant="destructive">{product.supermarketQuantity} left</Badge>
                    </div>
                  ))}
                  {lowStock.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No low stock alerts</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Expiring Products */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-destructive" />
                  {t('expiring_soon')}
                  <Badge variant="secondary" className="ml-auto">{expiring.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expiring.slice(0, 5).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
                      <div className="flex items-center gap-3">
                        {product.pictureUrl ? (
                          <img src={product.pictureUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.quantity} units</p>
                        </div>
                      </div>
                      <Badge variant="destructive">
                        {product.expiryDate && new Date(product.expiryDate).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                  {expiring.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No expiring products</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </RoleLayout>
  );
}

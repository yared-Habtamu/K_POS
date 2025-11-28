import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProductStore } from '@/stores/productStore';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  Clock,
  Crown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Mock cashier performance data
const cashierPerformance = [
  { name: 'Dawit T.', sales: 45200, transactions: 156 },
  { name: 'Sara B.', sales: 38900, transactions: 142 },
  { name: 'Yonas G.', sales: 32500, transactions: 118 },
  { name: 'Meron A.', sales: 28700, transactions: 98 },
];

const topSelling = [
  { name: 'Coca Cola 500ml', sold: 245 },
  { name: 'Fresh Milk 1L', sold: 189 },
  { name: 'White Bread', sold: 167 },
  { name: 'Sugar 1kg', sold: 134 },
  { name: 'Pepsi 330ml', sold: 112 },
];

export default function ManagerDashboard() {
  const { t } = useTranslation();
  const { getLowStockProducts, getExpiringProducts } = useProductStore();
  
  const lowStock = getLowStockProducts();
  const expiring = getExpiringProducts(7);

  return (
    <RoleLayout allowedRoles={['manager']}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
          <p className="text-muted-foreground">Monitor daily operations and team performance</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('today_sales')}</p>
                    <p className="text-2xl font-bold">42,350 {t('etb')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Cashiers</p>
                    <p className="text-2xl font-bold">4</p>
                  </div>
                  <div className="p-3 rounded-xl bg-success/10 text-success">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('low_stock')}</p>
                    <p className="text-2xl font-bold">{lowStock.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-warning/10 text-warning">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('expiring_soon')}</p>
                    <p className="text-2xl font-bold">{expiring.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive">
                    <Clock className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Cashier Performance */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-warning" />
                  Cashier Performance Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashierPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" className="text-xs" tickFormatter={(v) => `${v / 1000}K`} />
                      <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`${value.toLocaleString()} ETB`, 'Sales']}
                      />
                      <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Selling Products */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t('top_selling')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topSelling.map((product, index) => (
                    <div key={product.name} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(product.sold / topSelling[0].sold) * 100}%` }}
                            transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                            className="h-full bg-primary rounded-full"
                          />
                        </div>
                      </div>
                      <Badge variant="secondary">{product.sold} sold</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Alerts */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Low Stock */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  {t('low_stock')} Items
                  <Badge variant="secondary" className="ml-auto">{lowStock.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowStock.slice(0, 4).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
                      <span className="font-medium text-sm">{product.name}</span>
                      <Badge variant="destructive">{product.supermarketQuantity} left</Badge>
                    </div>
                  ))}
                  {lowStock.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">All items well stocked</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Expiring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <Clock className="h-5 w-5" />
                  {t('expiring_soon')}
                  <Badge variant="secondary" className="ml-auto">{expiring.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {expiring.slice(0, 4).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
                      <span className="font-medium text-sm">{product.name}</span>
                      <Badge variant="destructive">
                        {product.expiryDate && new Date(product.expiryDate).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))}
                  {expiring.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No expiring items</p>
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

import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { ProductSearch } from '@/components/pos/ProductSearch';
import { Cart } from '@/components/pos/Cart';
import { PaymentPanel } from '@/components/pos/PaymentPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/stores/cartStore';
import { useProductStore } from '@/stores/productStore';
import { ShoppingCart, Package, AlertTriangle, Clock } from 'lucide-react';

export default function CashierPOS() {
  const { t } = useTranslation();
  const { items } = useCartStore();
  const { getLowStockProducts, getExpiringProducts } = useProductStore();

  const lowStock = getLowStockProducts();
  const expiring = getExpiringProducts(7);

  return (
    <RoleLayout allowedRoles={['cashier', 'owner', 'manager']}>
      <div className="h-full flex flex-col lg:flex-row gap-4">
        {/* Left Panel - Products & Cart */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ProductSearch />
          </motion.div>

          {/* Quick Alerts */}
          {(lowStock.length > 0 || expiring.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex flex-wrap gap-2"
            >
              {lowStock.length > 0 && (
                <Badge variant="secondary" className="gap-1.5 bg-warning/10 text-warning border-warning/20">
                  <AlertTriangle className="h-3 w-3" />
                  {lowStock.length} {t('low_stock')}
                </Badge>
              )}
              {expiring.length > 0 && (
                <Badge variant="secondary" className="gap-1.5 bg-destructive/10 text-destructive border-destructive/20">
                  <Clock className="h-3 w-3" />
                  {expiring.length} {t('expiring_soon')}
                </Badge>
              )}
            </motion.div>
          )}

          {/* Cart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex-1 min-h-0"
          >
            <Card className="h-full flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    {t('cart')}
                  </div>
                  {items.length > 0 && (
                    <Badge>{items.length} {t('items')}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0 pb-4">
                <Cart />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Panel - Payment */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:w-96"
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t('payment_method')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentPanel canApplyDiscount={true} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </RoleLayout>
  );
}

import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProductStore } from '@/stores/productStore';
import { AlertTriangle, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export default function OwnerAlerts() {
  const { t } = useTranslation();
  const { getLowStockProducts, getExpiringProducts } = useProductStore();

  const lowStock = getLowStockProducts();
  const expiring = getExpiringProducts(7);

  return (
    <RoleLayout allowedRoles={["owner", "manager", "store_keeper"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('alerts')}</h1>
          <p className="text-muted-foreground">{t('alerts_summary')}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  {t('low_stock')} <Badge variant="secondary" className="ml-auto">{lowStock.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lowStock.slice(0, 10).map((product) => (
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

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  {t('expiring_soon')} <Badge variant="secondary" className="ml-auto">{expiring.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {expiring.slice(0, 10).map((product) => (
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
                      <Badge variant="destructive">{product.expiryDate && new Date(product.expiryDate).toLocaleDateString()}</Badge>
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

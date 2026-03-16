import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AdvancedFilters,
  type AdvancedFilterValues,
} from '@/components/ui/AdvancedFilters';
import { useProductStore } from '@/stores/productStore';
import { AlertTriangle, Package, Trash2, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/stores/authStore';

const defaultFilterValues: AdvancedFilterValues = {
  query: '',
  category: '',
  alertType: '',
  sortBy: '',
};

export default function OwnerAlerts() {
  const { t } = useTranslation();
  const { getLowStockProducts, getExpiringProducts, deleteProduct, fetchProducts } = useProductStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [filterValues, setFilterValues] = useState<AdvancedFilterValues>(defaultFilterValues);

  const lowStock = getLowStockProducts();
  const expiring = getExpiringProducts(7);

  useEffect(() => {
    fetchProducts(1, 10000);
  }, [fetchProducts]);

  const getRemaining = (product: any) => {
    return Number(
      product?.quantity ?? product?.supermarketQuantity ?? product?.storeQuantity ?? 0,
    );
  };

  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(
        [...lowStock, ...expiring]
          .map((product) => String(product?.category || '').trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));

    return categories.map((category) => ({ label: category, value: category }));
  }, [expiring, lowStock]);

  const filterProducts = (products: any[], type: 'low_stock' | 'expiring') => {
    const query = String(filterValues.query || '').trim().toLowerCase();
    const category = String(filterValues.category || '').trim().toLowerCase();
    const alertType = String(filterValues.alertType || '').trim();
    const sortBy = String(filterValues.sortBy || '');

    if (alertType && alertType !== type) {
      return [];
    }

    const filtered = products.filter((product) => {
      const name = String(product?.name || '').toLowerCase();
      const productCategory = String(product?.category || '').trim().toLowerCase();
      const barcode = String(product?.barcode || product?.barcodes?.[0] || '').toLowerCase();

      const matchesQuery =
        !query ||
        name.includes(query) ||
        productCategory.includes(query) ||
        barcode.includes(query);
      const matchesCategory = !category || productCategory === category;

      return matchesQuery && matchesCategory;
    });

    return filtered.sort((left, right) => {
      switch (sortBy) {
        case 'name_asc':
          return String(left?.name || '').localeCompare(String(right?.name || ''));
        case 'name_desc':
          return String(right?.name || '').localeCompare(String(left?.name || ''));
        case 'remaining_asc':
          return getRemaining(left) - getRemaining(right);
        case 'expiry_asc': {
          const leftTime = left?.expiryDate ? new Date(left.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
          const rightTime = right?.expiryDate ? new Date(right.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
          return leftTime - rightTime;
        }
        default:
          if (type === 'expiring') {
            const leftTime = left?.expiryDate ? new Date(left.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
            const rightTime = right?.expiryDate ? new Date(right.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
            return leftTime - rightTime;
          }
          return getRemaining(left) - getRemaining(right);
      }
    });
  };

  const filteredLowStock = useMemo(
    () => filterProducts(lowStock, 'low_stock'),
    [filterValues, lowStock],
  );
  const filteredExpiring = useMemo(
    () => filterProducts(expiring, 'expiring'),
    [expiring, filterValues],
  );

  const handleDelete = async (id?: string) => {
    if (!id) return;
    await deleteProduct(id);
    toast({ title: t('product_deleted') });
  };

  const openDelete = (product: any) => {
    setDeleteTarget(product);
    setDeleteOpen(true);
  };

  const goToEdit = (product: any) => {
    const id = product?.id || product?._id;
    if (!id) return;
    const roleStr = user?.role as string | undefined;
    const basePath = roleStr === 'store_keeper' || roleStr === 'storeKeeper' ? '/store-keeper/products' : '/owner/products';
    navigate(basePath, { state: { editProductId: id } });
  };

  return (
    <RoleLayout allowedRoles={["owner", "manager", "store_keeper"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('alerts')}</h1>
          <p className="text-muted-foreground">{t('alerts_summary')}</p>
        </div>

        <AdvancedFilters
          title="Search and filter alerts"
          description="Filter alerts by product, category, alert type, or urgency."
          fields={[
            {
              key: 'query',
              label: 'Search',
              type: 'search',
              placeholder: 'Search by name, category, or barcode',
            },
            {
              key: 'category',
              label: 'Category',
              type: 'select',
              placeholder: 'All categories',
              options: categoryOptions,
            },
            {
              key: 'alertType',
              label: 'Alert type',
              type: 'select',
              placeholder: 'All alert types',
              options: [
                { label: 'Low Stock', value: 'low_stock' },
                { label: 'Expiring Soon', value: 'expiring' },
              ],
            },
            {
              key: 'sortBy',
              label: 'Sort by',
              type: 'select',
              placeholder: 'Name A -> Z',
              options: [
                { label: 'Name A -> Z', value: 'name_asc' },
                { label: 'Name Z -> A', value: 'name_desc' },
                { label: 'Remaining Low -> High', value: 'remaining_asc' },
                { label: 'Expiry Soonest First', value: 'expiry_asc' },
              ],
            },
          ]}
          values={filterValues}
          onValuesChange={setFilterValues}
          onReset={() => setFilterValues(defaultFilterValues)}
          showActiveBadges={false}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  {t('low_stock')} <Badge variant="secondary" className="ml-auto">{filteredLowStock.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredLowStock.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-accent/50">
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
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{getRemaining(product)} left</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => goToEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(product)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredLowStock.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No low stock alerts match the current filters</p>
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
                  {t('expiring_soon')} <Badge variant="secondary" className="ml-auto">{filteredExpiring.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredExpiring.map((product) => (
                    <div key={product.id} className="flex items-center justify-between gap-3 p-2 rounded-lg bg-accent/50">
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
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{product.expiryDate && new Date(product.expiryDate).toLocaleDateString()}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => goToEdit(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDelete(product)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {filteredExpiring.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No expiring products match the current filters</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The product will be removed from inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDelete(deleteTarget?.id || deleteTarget?._id);
                setDeleteOpen(false);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </RoleLayout>
  );
}

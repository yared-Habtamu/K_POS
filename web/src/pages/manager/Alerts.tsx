import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export default function OwnerAlerts() {
  const { t } = useTranslation();
  const { getLowStockProducts, getExpiringProducts, deleteProduct, fetchProducts } = useProductStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

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
    navigate('/manager/products', { state: { editProductId: id } });
  };

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
                  {expiring.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No expiring products</p>
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

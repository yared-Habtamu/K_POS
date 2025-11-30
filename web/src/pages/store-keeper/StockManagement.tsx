import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { useProductStore } from '@/stores/productStore';
import type { Product } from '@/types';
import {
  Package,
  Search,
  Plus,
  Barcode,
  Warehouse,
  Store,
  ArrowRight,
} from 'lucide-react';

export default function StockManagement() {
  const { t } = useTranslation();
  const { products, updateProduct } = useProductStore();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addQuantity, setAddQuantity] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.includes(search)
  );

  const handleAddStock = async () => {
    if (!selectedProduct || !addQuantity) return;

    const qty = parseInt(addQuantity);
    if (qty <= 0) return;

    // Transfer from store to supermarket
    const newStoreQty = Math.max(0, selectedProduct.storeQuantity - qty);
    const newSupermarketQty = selectedProduct.supermarketQuantity + qty;

    await updateProduct(selectedProduct.id, {
      storeQuantity: newStoreQty,
      supermarketQuantity: newSupermarketQty,
      quantity: newSupermarketQty,
    });

    toast({
      title: 'Stock Updated',
      description: `Added ${qty} units of ${selectedProduct.name} to supermarket`,
    });

    setIsDialogOpen(false);
    setSelectedProduct(null);
    setAddQuantity('');
  };

  const openAddStockDialog = (product: Product) => {
    setSelectedProduct(product);
    setAddQuantity('');
    setIsDialogOpen(true);
  };

  return (
    <RoleLayout allowedRoles={['store_keeper']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('inventory')}</h1>
            <p className="text-muted-foreground">Manage store and supermarket stock levels</p>
          </div>

          <div>
            <Link to="/store-keeper/products/add">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('add_product')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Dashboard stats removed from inventory page to avoid duplication; inventory page focuses on stock management */}

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Inventory grid: search at top and image cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory
              <Badge variant="secondary" className="ml-2">{filteredProducts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6 col-span-full">No products found</p>
              )}

              {filteredProducts.map((product) => {
                const sold = Math.max(0, (product.storeQuantity ?? 0) - (product.supermarketQuantity ?? 0));
                const remaining = product.supermarketQuantity ?? product.quantity ?? 0;
                return (
                  <div key={product.id} className="p-3 rounded-lg bg-accent/50 flex flex-col items-start gap-3">
                    {product.pictureUrl ? (
                      <img src={product.pictureUrl} alt="" className="w-full h-32 rounded-lg object-cover" />
                    ) : (
                      <div className="w-full h-32 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="w-full flex items-center justify-between">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Sold</p>
                        <p className="text-xs text-muted-foreground">{sold}</p>
                        <p className="text-sm font-medium mt-2">Remaining</p>
                        <p className="text-xs text-muted-foreground">{remaining}</p>
                      </div>
                    </div>
                    <div className="w-full flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => openAddStockDialog(product)}>
                        <Plus className="h-3 w-3 mr-1" />
                        {t('add_stock')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Add Stock Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('add_stock')}</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-4">
                {/* Product Info */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-accent/50">
                  {selectedProduct.pictureUrl ? (
                    <img src={selectedProduct.pictureUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{selectedProduct.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedProduct.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">
                        <Barcode className="w-3 h-3 mr-1" />
                        {selectedProduct.barcode}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Current Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Warehouse className="w-4 h-4" />
                      Warehouse Stock
                    </p>
                    <p className="text-2xl font-bold text-warning">{selectedProduct.storeQuantity}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Store className="w-4 h-4" />
                      Supermarket Stock
                    </p>
                    <p className="text-2xl font-bold text-success">{selectedProduct.supermarketQuantity}</p>
                  </div>
                </div>

                {/* Add Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="addQty">Quantity to Transfer (Warehouse → Supermarket)</Label>
                  <Input
                    id="addQty"
                    type="number"
                    placeholder="Enter quantity"
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(e.target.value)}
                    max={selectedProduct.storeQuantity}
                    min={1}
                  />
                  {selectedProduct.storeQuantity > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Max available: {selectedProduct.storeQuantity} units
                    </p>
                  )}
                </div>

                {/* Preview */}
                {addQuantity && parseInt(addQuantity) > 0 && (
                  <div className="p-4 rounded-xl bg-accent border border-border">
                    <p className="text-sm font-medium mb-2">After Transfer:</p>
                    <div className="flex items-center justify-between text-sm">
                      <span>Warehouse: {Math.max(0, selectedProduct.storeQuantity - parseInt(addQuantity))}</span>
                      <ArrowRight className="w-4 h-4" />
                      <span>Supermarket: {selectedProduct.supermarketQuantity + parseInt(addQuantity)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button 
                    onClick={handleAddStock}
                    disabled={!addQuantity || parseInt(addQuantity) <= 0 || parseInt(addQuantity) > selectedProduct.storeQuantity}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Transfer Stock
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleLayout>
  );
}

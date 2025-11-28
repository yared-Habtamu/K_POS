import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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
  Image as ImageIcon,
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
        <div>
          <h1 className="text-2xl font-bold">{t('inventory')}</h1>
          <p className="text-muted-foreground">Manage store and supermarket stock levels</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Products</p>
                    <p className="text-2xl font-bold">{products.length}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <Package className="h-6 w-6" />
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
                    <p className="text-sm text-muted-foreground">In Warehouse</p>
                    <p className="text-2xl font-bold">{products.reduce((sum, p) => sum + p.storeQuantity, 0)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-warning/10 text-warning">
                    <Warehouse className="h-6 w-6" />
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
                    <p className="text-sm text-muted-foreground">In Supermarket</p>
                    <p className="text-2xl font-bold">{products.reduce((sum, p) => sum + p.supermarketQuantity, 0)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-success/10 text-success">
                    <Store className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

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

        {/* Products Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Stock Management
              <Badge variant="secondary" className="ml-2">{filteredProducts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Image</TableHead>
                    <TableHead>{t('product_name')}</TableHead>
                    <TableHead>{t('category')}</TableHead>
                    <TableHead className="text-center">{t('store_quantity')}</TableHead>
                    <TableHead className="w-10"></TableHead>
                    <TableHead className="text-center">{t('supermarket_quantity')}</TableHead>
                    <TableHead>{t('barcode')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        {product.pictureUrl ? (
                          <img src={product.pictureUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
                          <Warehouse className="w-3 h-3 mr-1" />
                          {product.storeQuantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                          <Store className="w-3 h-3 mr-1" />
                          {product.supermarketQuantity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{product.barcode || '-'}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => openAddStockDialog(product)}>
                            <Plus className="h-3 w-3 mr-1" />
                            {t('add_stock')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

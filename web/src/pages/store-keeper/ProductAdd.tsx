import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { useProductStore } from '@/stores/productStore';
import type { ProductUnit } from '@/types';
import { Barcode, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const units: ProductUnit[] = ['pcs', 'kg', 'g', 'l', 'ml', 'box'];

export default function ProductAdd() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { categories, addProduct } = useProductStore();

  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    name: '',
    category: '',
    unit: 'pcs' as ProductUnit,
    purchasePrice: '',
    sellingPrice: '',
    quantity: '',
    lowStockThreshold: '10',
    expiryDate: '',
    barcode: '',
  });

  const resetForm = () => {
    setForm({
      name: '',
      category: '',
      unit: 'pcs',
      purchasePrice: '',
      sellingPrice: '',
      quantity: '',
      lowStockThreshold: '10',
      expiryDate: '',
      barcode: '',
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const onFileChange = useCallback((file?: File) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileChange(f);
  };

  const openFilePicker = (capture?: boolean) => {
    const input = fileRef.current;
    if (!input) return;
    if (capture) input.setAttribute('capture', 'environment');
    else input.removeAttribute('capture');
    input.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('image/')) onFileChange(f);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const productData = {
      name: form.name,
      category: form.category,
      unit: form.unit,
      purchasePrice: parseFloat(form.purchasePrice),
      sellingPrice: parseFloat(form.sellingPrice),
      quantity: parseInt(form.quantity),
      storeQuantity: parseInt(form.quantity),
      supermarketQuantity: parseInt(form.quantity),
      lowStockThreshold: parseInt(form.lowStockThreshold),
      expiryDate: form.expiryDate ? new Date(form.expiryDate) : undefined,
      barcode: form.barcode || `${Date.now()}`.slice(-12),
      pictureUrl: imagePreview || undefined,
      shopId: 'shop-001',
    } as any;

    await addProduct(productData);
    toast({ title: t('product_added') });
    setIsLoading(false);
    resetForm();
    navigate('/store-keeper');
  };

  const generateBarcode = () => setForm({ ...form, barcode: `${Date.now()}`.slice(-12) });

  return (
    <RoleLayout allowedRoles={["store_keeper"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('add_product')}</h1>
          <p className="text-muted-foreground">{t('product_add_description') || 'Add a new product to the shop'}</p>
        </div>

        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Hidden file input used for both choose and capture */}
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileInput} className="hidden" />

              {/* Image picker */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="flex items-center gap-4 p-4 border border-dashed rounded-md bg-muted/20"
              >
                <div className="flex-shrink-0">
                  <Avatar>
                    {imagePreview ? (
                      <AvatarImage src={imagePreview} alt={form.name || 'product'} />
                    ) : (
                      <AvatarFallback>
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>

                <div className="flex-1">
                  <p className="font-medium">Product Image</p>
                  <p className="text-sm text-muted-foreground">Drag & drop an image, pick from device, or take a photo.</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" onClick={() => openFilePicker(false)} variant="outline">
                      Choose Image
                    </Button>
                    <Button type="button" onClick={() => openFilePicker(true)} variant="outline">
                      Take Photo
                    </Button>
                    {imagePreview && (
                      <Button type="button" onClick={removeImage} variant="ghost" className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('product_name')} *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">{t('category')} *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">{t('unit')} *</Label>
                  <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v as ProductUnit })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u} value={u}>{u.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">{t('quantity')} *</Label>
                  <Input id="quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">{t('purchase_price')} (ETB) *</Label>
                  <Input id="purchasePrice" type="number" step="0.01" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">{t('selling_price')} (ETB) *</Label>
                  <Input id="sellingPrice" type="number" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lowStock">Low Stock Threshold</Label>
                  <Input id="lowStock" type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">{t('expiry_date')}</Label>
                  <Input id="expiryDate" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="barcode">{t('barcode')}</Label>
                  <div className="flex gap-2">
                    <Input id="barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Enter or generate barcode" />
                    <Button type="button" variant="outline" onClick={generateBarcode}>
                      <Barcode className="mr-2 h-4 w-4" />
                      Generate
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate('/store-keeper')}>{t('cancel')}</Button>
                <Button type="submit" disabled={isLoading}>{isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>) : t('save')}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}

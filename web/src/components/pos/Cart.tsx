import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/stores/cartStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus, Trash2, Package, ShoppingCart } from 'lucide-react';

export function Cart() {
  const { t } = useTranslation();
  const { items, updateQuantity, removeItem, getSubtotal, getDiscountAmount, getExtraChargesTotal, getTax, getTotal } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
        <ShoppingCart className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">{t('cart')} is empty</p>
        <p className="text-sm">Scan or search products to add</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Cart items */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.product.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-accent/50 border border-border/50"
            >
              {/* Product image */}
              {item.product.pictureUrl ? (
                <img
                  src={item.product.pictureUrl}
                  alt={item.product.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
              )}

              {/* Product info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.product.sellingPrice} {t('etb')} × {item.quantity}
                </p>
                {item.discount && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    -{item.discount.type === 'percentage' ? `${item.discount.value}%` : `${item.discount.value} ETB`}
                  </Badge>
                )}
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                  className="w-14 h-8 text-center px-1"
                  min={1}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {/* Subtotal */}
              <div className="text-right min-w-[80px]">
                <p className="font-bold">{item.subtotal.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{t('etb')}</p>
              </div>

              {/* Remove button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeItem(item.product.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Totals */}
      <div className="mt-4 pt-4 border-t border-border space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('subtotal')}</span>
          <span>{getSubtotal().toFixed(2)} {t('etb')}</span>
        </div>
        
        {getDiscountAmount() > 0 && (
          <div className="flex justify-between text-sm text-success">
            <span>{t('discount')}</span>
            <span>-{getDiscountAmount().toFixed(2)} {t('etb')}</span>
          </div>
        )}
        
        {getExtraChargesTotal() > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('extra_charges')}</span>
            <span>+{getExtraChargesTotal().toFixed(2)} {t('etb')}</span>
          </div>
        )}
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('tax')}</span>
          <span>{getTax().toFixed(2)} {t('etb')}</span>
        </div>
        
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
          <span>{t('total')}</span>
          <span className="text-primary">{getTotal().toFixed(2)} {t('etb')}</span>
        </div>
      </div>
    </div>
  );
}

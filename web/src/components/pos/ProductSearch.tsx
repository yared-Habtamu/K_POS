import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useProductStore } from '@/stores/productStore';
import { useCartStore } from '@/stores/cartStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Search, Barcode, X, Package } from 'lucide-react';
import type { Product } from '@/types';

export function ProductSearch() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { searchProducts, getProductByBarcode } = useProductStore();
  const { addItem } = useCartStore();

  useEffect(() => {
    if (query.length >= 2) {
      const found = searchProducts(query);
      setResults(found.slice(0, 8));
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query, searchProducts]);

  const handleSelect = (product: Product) => {
    addItem(product, 1);
    toast({
      title: t('product_added'),
      description: `${product.name} added to cart`,
    });
    setQuery('');
    setShowResults(false);
    inputRef.current?.focus();
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if it's a barcode (numeric)
    if (/^\d+$/.test(query)) {
      const product = getProductByBarcode(query);
      if (product) {
        handleSelect(product);
      } else {
        toast({
          title: 'Not Found',
          description: 'No product found with this barcode',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleBarcodeSubmit}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('scan_barcode')}
            className="pl-12 pr-12 h-14 text-lg rounded-xl"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setShowResults(false); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>

      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
          >
            {results.map((product) => (
              <button
                key={product.id}
                onClick={() => handleSelect(product)}
                className="w-full flex items-center gap-4 p-3 hover:bg-accent transition-colors text-left"
              >
                {product.pictureUrl ? (
                  <img
                    src={product.pictureUrl}
                    alt={product.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{product.category}</span>
                    {product.barcode && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Barcode className="h-3 w-3" />
                          {product.barcode}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{product.sellingPrice} {t('etb')}</p>
                  <Badge variant={product.supermarketQuantity > product.lowStockThreshold ? 'secondary' : 'destructive'} className="text-xs">
                    {product.supermarketQuantity} {t('stock')}
                  </Badge>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

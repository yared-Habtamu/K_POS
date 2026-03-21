import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useProductStore } from "@/stores/productStore";
import { useCartStore } from "@/stores/cartStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Search, Barcode, X, Package, ScanBarcode } from "lucide-react";
import { BarcodeScanner } from "@/components/barcode/BarcodeScanner";
import type { Product } from "@/types";

interface ProductSearchProps {
  value?: string;
  onValueChange?: (value: string) => void;
  autoFocus?: boolean;
  onProductAdded?: (product: Product) => void;
}

function getMartQuantity(product: Product) {
  return Number(product.quantity ?? product.supermarketQuantity ?? 0);
}

export function ProductSearch({
  value,
  onValueChange,
  autoFocus = true,
  onProductAdded,
}: ProductSearchProps) {
  const { t } = useTranslation();
  const [internalQuery, setInternalQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const query = value ?? internalQuery;

  const searchProducts = useProductStore((s) => s.searchProducts);
  const getProductByBarcode = useProductStore((s) => s.getProductByBarcode);
  const { addItem } = useCartStore();

  const updateQuery = (nextValue: string) => {
    if (onValueChange) {
      onValueChange(nextValue);
      return;
    }

    setInternalQuery(nextValue);
  };

  useEffect(() => {
    if (query.length >= 2) {
      const found = searchProducts(query).filter((product) => getMartQuantity(product) > 0);
      setResults(found.slice(0, 8));
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [query, searchProducts]);

  const handleSelect = (product: Product) => {
    const available = getMartQuantity(product);
    if (available <= 0) {
      toast({
        title: t("out_of_stock") || "Out of stock",
        description: `${product.name} cannot be sold because mart quantity is 0.`,
        variant: "destructive",
      });
      return;
    }

    const inCart = useCartStore
      .getState()
      .items.find((item) => item.product.id === product.id)?.quantity || 0;
    if (inCart >= available) {
      toast({
        title: t("stock_limit_reached") || "Stock limit reached",
        description: `${product.name} reached available mart quantity (${available}).`,
        variant: "destructive",
      });
      return;
    }

    addItem(product, 1);
    onProductAdded?.(product);
    toast({
      title: t("product_added"),
      description: `${product.name} added to cart`,
    });
    updateQuery("");
    setShowResults(false);
    inputRef.current?.focus();
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if it's a barcode (numeric)
    if (/^\d+$/.test(query)) {
      const product = getProductByBarcode(query);
      if (product && getMartQuantity(product) > 0) {
        handleSelect(product);
      } else {
        toast({
          title: "Not Found",
          description: "No in-stock product found with this barcode",
          variant: "destructive",
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
            onChange={(e) => updateQuery(e.target.value)}
            placeholder={t("scan_barcode")}
            className="pl-12 pr-20 h-14 text-lg rounded-xl"
            autoFocus={autoFocus}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
            {query && (
              <button
                type="button"
                onClick={() => {
                  updateQuery("");
                  setShowResults(false);
                }}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="text-primary hover:text-primary/80 p-1 transition-colors"
              title={t("scan")}
            >
              <ScanBarcode className="h-6 w-6" />
            </button>
          </div>
        </div>
      </form>

      {isScannerOpen && (
        <BarcodeScanner
          onScan={(code) => {
            updateQuery(code);
            setIsScannerOpen(false);
          }}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

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
                    {product.barcodes && product.barcodes.length > 0 ? (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Barcode className="h-3 w-3" />
                          {(product.barcodes || []).join(", ")}
                        </span>
                      </>
                    ) : product.barcode ? (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Barcode className="h-3 w-3" />
                          {product.barcode}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">
                    {product.sellingPrice} {t("etb")}
                  </p>
                  <Badge
                    variant={
                      getMartQuantity(product) > product.lowStockThreshold
                        ? "secondary"
                        : "destructive"
                    }
                    className="text-xs"
                  >
                    {getMartQuantity(product)} {t("stock")}
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

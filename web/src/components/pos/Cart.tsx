import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/stores/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Minus, Plus, Trash2, Package, ShoppingCart } from "lucide-react";

function getMartQuantity(product: { quantity?: number; supermarketQuantity?: number }) {
  const quantity = Number(product.quantity ?? product.supermarketQuantity ?? 0);
  return Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
}

export function Cart() {
  const { t } = useTranslation();
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const {
    items,
    updateQuantity,
    removeItem,
    getSubtotal,
    getDiscountAmount,
    getExtraChargesTotal,
    getTax,
    getTotal,
    taxRate,
  } = useCartStore();

  useEffect(() => {
    setQuantityDrafts((prev) => {
      const next: Record<string, string> = {};
      for (const item of items) {
        next[item.product.id] = prev[item.product.id] ?? String(item.quantity);
      }
      return next;
    });
  }, [items]);

  const getAvailableForItem = (item: (typeof items)[number]) =>
    Math.max(getMartQuantity(item.product), 0);

  const showStockLimitToast = (productName: string, available: number) => {
    toast({
      title: t("stock_limit_reached") || "Stock limit reached",
      description: `${productName} only has ${available} in mart stock.`,
      variant: "destructive",
    });
  };

  const commitQuantity = (item: (typeof items)[number], rawValue: string) => {
    const available = getAvailableForItem(item);

    if (available <= 0) {
      showStockLimitToast(item.product.name, 0);
      removeItem(item.product.id);
      return;
    }

    const trimmed = String(rawValue ?? "").trim();
    if (!trimmed) {
      setQuantityDrafts((prev) => ({
        ...prev,
        [item.product.id]: String(item.quantity),
      }));
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setQuantityDrafts((prev) => ({
        ...prev,
        [item.product.id]: String(item.quantity),
      }));
      return;
    }

    if (parsed > available) {
      showStockLimitToast(item.product.name, available);
      updateQuantity(item.product.id, available);
      setQuantityDrafts((prev) => ({
        ...prev,
        [item.product.id]: String(available),
      }));
      return;
    }

    updateQuantity(item.product.id, parsed);
    setQuantityDrafts((prev) => ({
      ...prev,
      [item.product.id]: String(parsed),
    }));
  };

  const incrementQuantity = (item: (typeof items)[number]) => {
    const available = getAvailableForItem(item);
    if (item.quantity >= available) {
      showStockLimitToast(item.product.name, available);
      return;
    }

    const next = item.quantity + 1;
    updateQuantity(item.product.id, next);
    setQuantityDrafts((prev) => ({ ...prev, [item.product.id]: String(next) }));
  };

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12">
        <ShoppingCart className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">{t("cart_is_empty")}</p>
        <p className="text-sm">{t("scan_or_search_products_to_add")}</p>
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
                  {item.product.sellingPrice} {t("etb")} × {item.quantity}
                </p>
                {item.discount && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    -
                    {item.discount.type === "percentage"
                      ? `${item.discount.value}%`
                      : `${item.discount.value} ETB`}
                  </Badge>
                )}
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    updateQuantity(item.product.id, item.quantity - 1)
                  }
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <Input
                  type="number"
                  value={quantityDrafts[item.product.id] ?? String(item.quantity)}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    setQuantityDrafts((prev) => ({
                      ...prev,
                      [item.product.id]: rawValue,
                    }));

                    const trimmed = String(rawValue ?? "").trim();
                    if (!trimmed) {
                      // Keep draft only while input is empty; don't remove item.
                      return;
                    }

                    const parsed = Number.parseInt(trimmed, 10);
                    if (!Number.isFinite(parsed) || parsed <= 0) {
                      return;
                    }

                    const available = getAvailableForItem(item);
                    if (available <= 0) {
                      showStockLimitToast(item.product.name, 0);
                      removeItem(item.product.id);
                      return;
                    }

                    if (parsed > available) {
                      showStockLimitToast(item.product.name, available);
                      updateQuantity(item.product.id, available);
                      setQuantityDrafts((prev) => ({
                        ...prev,
                        [item.product.id]: String(available),
                      }));
                      return;
                    }

                    updateQuantity(item.product.id, parsed);
                  }}
                  onBlur={() =>
                    commitQuantity(
                      item,
                      quantityDrafts[item.product.id] ?? String(item.quantity),
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitQuantity(
                        item,
                        quantityDrafts[item.product.id] ?? String(item.quantity),
                      );
                    }
                  }}
                  className="w-14 h-8 text-center px-1"
                  min={1}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => incrementQuantity(item)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {/* Subtotal */}
              <div className="text-right min-w-[80px]">
                <p className="font-bold">{item.subtotal.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{t("etb")}</p>
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
          <span className="text-muted-foreground">{t("subtotal")}</span>
          <span>
            {getSubtotal().toFixed(2)} {t("etb")}
          </span>
        </div>

        {getDiscountAmount() > 0 && (
          <div className="flex justify-between text-sm text-success">
            <span>{t("discount")}</span>
            <span>
              -{getDiscountAmount().toFixed(2)} {t("etb")}
            </span>
          </div>
        )}

        {getExtraChargesTotal() > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("extra_charges")}</span>
            <span>
              +{getExtraChargesTotal().toFixed(2)} {t("etb")}
            </span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{`Tax (VAT ${Number(
            taxRate ?? 0,
          ).toFixed(2)}%)`}</span>
          <span>
            {getTax().toFixed(2)} {t("etb")}
          </span>
        </div>

        <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
          <span>{t("total")}</span>
          <span className="text-primary">
            {getTotal().toFixed(2)} {t("etb")}
          </span>
        </div>
      </div>
    </div>
  );
}

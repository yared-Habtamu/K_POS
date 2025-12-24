import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useCartStore } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useProductStore } from "@/stores/productStore";
import { ReceiptPreview } from "./ReceiptPreview";
import type { PaymentMethod, DiscountType, Sale, Receipt } from "@/types";
import {
  Banknote,
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  Percent,
  DollarSign,
  Plus,
  X,
  Receipt as ReceiptIcon,
  Loader2,
} from "lucide-react";

const paymentMethods: {
  value: PaymentMethod;
  label: string;
  icon: React.ElementType;
}[] = [
  { value: "cash", label: "cash", icon: Banknote },
  { value: "card", label: "card", icon: CreditCard },
  { value: "telebirr", label: "telebirr", icon: Smartphone },
  { value: "cbe_bank", label: "cbe_bank", icon: Building2 },
  { value: "wallet", label: "wallet", icon: Wallet },
  { value: "other", label: "other", icon: Wallet },
];

interface PaymentPanelProps {
  canApplyDiscount?: boolean;
}

export function PaymentPanel({ canApplyDiscount = false }: PaymentPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    items,
    paymentMethod,
    discount,
    extraCharges,
    setPaymentMethod,
    setCartDiscount,
    removeCartDiscount,
    addExtraCharge,
    removeExtraCharge,
    clearCart,
    getSubtotal,
    getDiscountAmount,
    getExtraChargesTotal,
    getTax,
    getTotal,
    setTaxRate,
    taxRate,
  } = useCartStore();

  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [newChargeType, setNewChargeType] = useState<string>("service_charge");
  const [newChargeCustomName, setNewChargeCustomName] = useState("");
  const [newChargeAmount, setNewChargeAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const [savedSalePayload, setSavedSalePayload] = useState<Sale | null>(null);
  const [paymentAccounts, setPaymentAccounts] = useState<Record<string, string>>({});
  const [martCurrency, setMartCurrency] = useState<string | null>(null);

  const handleApplyDiscount = () => {
    const value = parseFloat(discountValue);
    if (value > 0) {
      setCartDiscount(discountType, value);
      setDiscountValue("");
    }
  };

  const chargeTypeToLabel = (type: string) => {
    switch (type) {
      case "service_charge":
        return t("service_charge") || "Service Charge";
      case "delivery_charge":
        return t("delivery_charge") || "Delivery Charge";
      case "packaging_charge":
        return t("packaging_charge") || "Packaging Charge";
      case "others":
        return t("others") || "Others";
      default:
        return type;
    }
  };

  const handleAddCharge = () => {
    const name =
      newChargeType === "others"
        ? newChargeCustomName.trim()
        : chargeTypeToLabel(newChargeType);
    if (name && parseFloat(newChargeAmount) > 0) {
      addExtraCharge({
        id: `charge-${Date.now()}`,
        name,
        amount: parseFloat(newChargeAmount),
      });
      setNewChargeCustomName("");
      setNewChargeAmount("");
      setNewChargeType("service_charge");
    }
  };

  const handleCompleteSale = async () => {
    if (items.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Add items to complete a sale",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const saleId = `SALE-${Date.now()}`;
    const receiptId = `RCP-${Date.now().toString(36).toUpperCase()}`;

    // Create receipt
    const receipt: Receipt = {
      id: receiptId,
      saleId,
      qrCodeData: JSON.stringify({
        receiptId,
        total: getTotal(),
        date: new Date().toISOString(),
        shop: "Kiya Supermarket",
      }),
      shopName: "Kiya Supermarket",
      shopAddress: "Addis Ababa, Ethiopia",
      shopPhone: "+251 911 234 567",
      items,
      subtotal: getSubtotal(),
      discount: discount
        ? {
            ...discount,
            amount: getDiscountAmount(),
          }
        : undefined,
      extraCharges,
      tax: getTax(),
      taxRate: taxRate,
      total: getTotal(),
      paymentMethod,
      cashierName: user?.name || "Unknown",
      date: new Date(),
      receiptHeader: "Thank you for shopping with us!",
      receiptSlogan: "Quality products at affordable prices",
    };

    // prepare sale payload but do NOT send it yet; save when user presses Done on the receipt
    const salePayload: Sale = {
      martId: user?.martId,
      receiptId,
      items: items.map((it) => ({
        productId: it.product.id,
        name: it.product.name,
        price: it.product.sellingPrice,
        quantity: it.quantity,
        total: it.subtotal,
      })),
      subtotal: getSubtotal(),
      discount: receipt.discount,
      extraCharges: receipt.extraCharges,
      tax: receipt.tax,
      taxRate: receipt.taxRate,
      total: receipt.total,
      paymentMethod: receipt.paymentMethod,
    } as any;

    setSavedSalePayload(salePayload);
    setCurrentReceipt(receipt);
    setShowReceipt(true);
    setIsProcessing(false);

    toast({
      title: t("receipt_ready") || "Receipt ready",
      description: `Receipt: ${receiptId}`,
    });
  };

  const handleDoneReceipt = async () => {
    // Save the sale to backend when Done is pressed on the receipt.
    if (!savedSalePayload) {
      // nothing to save, just close
      setShowReceipt(false);
      setCurrentReceipt(null);
      return;
    }

    setIsProcessing(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const token = user?.token;
      const res = await fetch(`${API_BASE}/api/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(savedSalePayload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn("Failed to record sale", err);
        toast({
          title: "Failed to save sale",
          description: (err && err.message) || "Server error",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      toast({
        title: t("sale_complete"),
        description: `Receipt: ${savedSalePayload.receiptId}`,
      });
      // refresh products so UI reflects updated quantities
      try {
        await useProductStore.getState().fetchProducts?.();
      } catch (e) {
        // ignore refresh errors
      }
      // clear cart and close receipt
      setShowReceipt(false);
      setCurrentReceipt(null);
      setSavedSalePayload(null);
      clearCart();
    } catch (err) {
      console.error("Record sale error", err);
      toast({
        title: "Failed to save sale",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Fetch mart settings (payment accounts, currency, tax) and normalize keys
  useEffect(() => {
    let mounted = true;

    const fetchMart = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "";
        const martId = user?.martId;
        const token = user?.token;
        if (!martId) return;

        // avoid refetching the same mart repeatedly
        if ((PaymentPanel as any)._cachedMartId === martId) return;

        const res = await fetch(`${API_BASE}/api/marts/${martId}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted) return;

        const accounts: Record<string, string> = {};
        let raw: any = undefined;
        if (Array.isArray(json.customPaymentFields)) {
          for (const entry of json.customPaymentFields) {
            try {
              if (!entry) continue;
              const k = String((entry as any).key || "").trim().toLowerCase();
              const v = (entry as any).value == null ? "" : String((entry as any).value);
              if (k) accounts[k] = v;
            } catch (e) {
              continue;
            }
          }
        } else {
          raw = json.paymentAccounts;
        }

        try {
          if (Array.isArray(raw)) {
            if (raw.length > 0 && raw.every((r) => typeof r === "string")) {
              for (let i = 0; i + 1 < raw.length; i += 2) {
                const k = String(raw[i] || "").trim().toLowerCase();
                const v = String(raw[i + 1] || "");
                if (k) accounts[k] = v;
              }
            } else {
              for (const entry of raw) {
                if (!entry) continue;
                if (typeof entry === "object") {
                  if ("key" in entry && "value" in entry) {
                    accounts[String((entry as any).key || "").trim().toLowerCase()] = String((entry as any).value || "");
                  } else {
                    Object.entries(entry as any).forEach(([k, v]) => {
                      const nk = String(k || "").trim().toLowerCase();
                      accounts[nk] = Array.isArray(v) ? String((v as any)[0] || "") : String(v || "");
                    });
                  }
                }
              }
            }
          } else if (raw && typeof raw === "object") {
            Object.entries(raw).forEach(([k, v]) => {
              const nk = String(k || "").trim().toLowerCase();
              if (Array.isArray(v)) accounts[nk] = String((v as any)[0] || "");
              else accounts[nk] = v == null ? "" : String(v);
            });
          }
        } catch (e) {
          // fallback to empty
        }

        if (!accounts.card && accounts.bank) accounts.card = accounts.bank;
        if (!accounts.wallet && accounts.amole) accounts.wallet = accounts.amole;
        if (!accounts.telebirr && (accounts.telebirr_number || accounts.tel || accounts.phone)) {
          accounts.telebirr = accounts.telebirr_number || accounts.tel || accounts.phone;
        }

        setPaymentAccounts((prev) => {
          try {
            const prevJson = JSON.stringify(prev || {});
            const nextJson = JSON.stringify(accounts || {});
            return prevJson === nextJson ? prev : accounts;
          } catch {
            return accounts;
          }
        });

        // DEV: show normalized accounts so owners can see what the cashier reads
        if (import.meta.env.DEV) console.debug("Normalized payment accounts:", accounts);

        setMartCurrency((prev) => (prev === (json.currency || null) ? prev : json.currency || null));

        const incomingRate = Number(json.taxRate) || 0;
        if (typeof setTaxRate === "function") {
          try {
            const curr = taxRate;
            if (Number(curr) !== Number(incomingRate)) setTaxRate(incomingRate);
          } catch {
            setTaxRate(incomingRate);
          }
        }

        // cache mart id to avoid repeated fetches
        (PaymentPanel as any)._cachedMartId = martId;
      } catch (err) {
        console.error("Load mart settings error", err);
      }
    };

    fetchMart();

    const handleMartSettingsUpdated = (ev: any) => {
      try {
        const changedId = ev?.detail?.martId;
        if (changedId && changedId === user?.martId) {
          // invalidate cache and refetch
          (PaymentPanel as any)._cachedMartId = null;
          fetchMart();
        }
      } catch (e) {}
    };

    window.addEventListener("mart-settings-updated", handleMartSettingsUpdated as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener("mart-settings-updated", handleMartSettingsUpdated as EventListener);
    };
  }, [user?.martId]);

  const handleCloseReceipt = () => {
    // Close the receipt preview without saving. Cart remains intact so the user can retry.
    setShowReceipt(false);
    setCurrentReceipt(null);
  };

  return (
    <div className="space-y-4">
      {/* Payment Method */}
      <div className="space-y-2">
        <Label>{t("payment_method")}</Label>
        <div className="grid grid-cols-3 gap-2">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            return (
              <Button
                key={method.value}
                variant={paymentMethod === method.value ? "default" : "outline"}
                className="h-auto py-3 flex flex-col items-center gap-1"
                onClick={() => setPaymentMethod(method.value)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{t(method.label)}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Saved Accounts (show all configured payment accounts) */}
      {Object.keys(paymentAccounts || {}).length > 0 && (
        <div className="space-y-2 pt-2">
          <Label>{t("saved_accounts") || "Saved Accounts"}</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(paymentAccounts).map(([key, value]) => {
              const niceKey = String(key || "").replace(/_/g, " ").toUpperCase();
              return (
                <div
                  key={key}
                  className="p-2 border rounded-lg bg-muted flex items-center justify-between"
                >
                  <div className="text-sm">
                    <div className="text-xs text-muted-foreground">{niceKey}</div>
                    <div className="text-sm font-medium mt-1">
                      {value || t("not_configured")}
                    </div>
                  </div>
                  {value ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        try {
                          navigator.clipboard?.writeText(value);
                          toast({ title: t("copied") });
                        } catch {}
                      }}
                    >
                      Copy
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Discount Section */}
      {canApplyDiscount && (
        <div className="space-y-2">
          <Label>{t("discount")}</Label>
          {discount ? (
            <div className="flex items-center gap-2 p-2 bg-accent rounded-lg">
              <span className="flex-1 text-sm">
                {discount.type === "percentage"
                  ? `${discount.value}%`
                  : `${discount.value} ETB`}{" "}
                off
              </span>
              <Button variant="ghost" size="sm" onClick={removeCartDiscount}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as DiscountType)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-1">
                      <Percent className="h-3 w-3" />%
                    </div>
                  </SelectItem>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ETB
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Value"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleApplyDiscount} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Extra Charges */}
      <div className="space-y-2">
        <Label>{t("extra_charges")}</Label>
        {extraCharges.map((charge) => (
          <div
            key={charge.id}
            className="flex items-center gap-2 p-2 bg-accent rounded-lg"
          >
            <span className="flex-1 text-sm">{charge.name}</span>
            <span className="text-sm font-medium">{charge.amount} ETB</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeExtraCharge(charge.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2 items-center">
          <Select
            value={newChargeType}
            onValueChange={(v) => setNewChargeType(v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="service_charge">Service Charge</SelectItem>
              <SelectItem value="delivery_charge">Delivery Charge</SelectItem>
              <SelectItem value="packaging_charge">Packaging Charge</SelectItem>
              <SelectItem value="others">Others</SelectItem>
            </SelectContent>
          </Select>

          {newChargeType === "others" && (
            <Input
              placeholder="Custom name"
              value={newChargeCustomName}
              onChange={(e) => setNewChargeCustomName(e.target.value)}
              className="flex-1"
            />
          )}

          <Input
            type="number"
            placeholder="Amount"
            value={newChargeAmount}
            onChange={(e) => setNewChargeAmount(e.target.value)}
            className="w-24"
          />
          <Button onClick={handleAddCharge} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-4">
        <Button
          className="w-full h-14 text-lg font-bold"
          onClick={handleCompleteSale}
          disabled={items.length === 0 || isProcessing}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ReceiptIcon className="mr-2 h-5 w-5" />
              {t("complete_sale")} - {getTotal().toFixed(2)} {t("etb")}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={clearCart}
          disabled={items.length === 0}
        >
          {t("clear_cart")}
        </Button>
      </div>

      {/* Receipt Dialog */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("receipt_preview")}</DialogTitle>
          </DialogHeader>
          {currentReceipt && (
            <ReceiptPreview
              receipt={currentReceipt}
              onDone={handleDoneReceipt}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

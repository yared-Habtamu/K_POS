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
  } = useCartStore();

  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [newChargeType, setNewChargeType] = useState<string>("service_charge");
  const [newChargeCustomName, setNewChargeCustomName] = useState("");
  const [newChargeAmount, setNewChargeAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const [paymentAccounts, setPaymentAccounts] = useState<
    Record<string, string>
  >({});
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
      total: getTotal(),
      paymentMethod,
      cashierName: user?.name || "Unknown",
      date: new Date(),
      receiptHeader: "Thank you for shopping with us!",
      receiptSlogan: "Quality products at affordable prices",
    };

    // send sale to backend
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const token = user?.token;
      const salePayload: Sale = {
        martId: user?.martId,
        receiptId,
        items: items.map((it) => ({
          productId: it.id,
          name: it.name,
          price: it.price,
          quantity: it.quantity,
          total: it.price * it.quantity,
        })),
        subtotal: getSubtotal(),
        discount: receipt.discount,
        extraCharges: receipt.extraCharges,
        tax: receipt.tax,
        total: receipt.total,
        paymentMethod: receipt.paymentMethod,
      } as any;

      const res = await fetch(`${API_BASE}/api/sales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(salePayload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn("Failed to record sale", err);
      }
    } catch (err) {
      console.error("Record sale error", err);
    }

    setCurrentReceipt(receipt);
    setShowReceipt(true);
    setIsProcessing(false);

    toast({
      title: t("sale_complete"),
      description: `Receipt: ${receiptId}`,
    });
  };

  useEffect(() => {
    (async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "";
        const martId = user?.martId;
        const token = user?.token;
        if (!martId) return;
        const res = await fetch(`${API_BASE}/api/marts/${martId}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) return;
        const json = await res.json();
        // paymentAccounts may be stored as object or map
        const accounts = json.paymentAccounts || {};
        setPaymentAccounts(accounts);
        setMartCurrency(json.currency || null);
      } catch (err) {
        console.error("Load mart settings error", err);
      }
    })();
  }, [user?.martId]);

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setCurrentReceipt(null);
    clearCart();
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

      {/* show configured account details for selected payment method */}
      {paymentMethod && (
        <div className="pt-2">
          <p className="text-sm text-muted-foreground">
            {t("payment_details")}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 p-3 border rounded-lg bg-muted">
              <div className="text-xs text-muted-foreground">
                {paymentMethod.toUpperCase()}
              </div>
              <div className="text-sm font-medium mt-1">
                {paymentAccounts[paymentMethod] || t("not_configured")}
              </div>
            </div>
            {paymentAccounts[paymentMethod] && (
              <Button
                size="sm"
                onClick={() => {
                  try {
                    navigator.clipboard?.writeText(
                      paymentAccounts[paymentMethod]
                    );
                    toast({ title: t("copied") });
                  } catch {}
                }}
              >
                Copy
              </Button>
            )}
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
              onClose={handleCloseReceipt}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

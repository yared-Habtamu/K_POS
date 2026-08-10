import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useCartStore } from "@/stores/cartStore";
import { fetchCustomers, createCustomer } from "@/lib/api/customers";
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
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/hooks/use-toast";
import { useProductStore } from "@/stores/productStore";
import { ReceiptPreview } from "./ReceiptPreview";
import type { PaymentMethod, DiscountType, Sale, Receipt } from "@/types";
import {
  Banknote,
  CircleDollarSign,
  CreditCard,
  Smartphone,
  Building2,
  Landmark,
  Wallet,
  Plus,
  Copy,
  X,
  Receipt as ReceiptIcon,
  Loader2,
} from "lucide-react";

// module-level cache for mart id to avoid using `any` on the component object
let paymentPanelCachedMartId: string | null = null;

// shape for outgoing sale request saved temporarily before POST
type SaleRequest = { receiptId?: string; [key: string]: unknown };

type PaymentTypeDto = {
  _id?: string;
  name?: string;
  icon?: string;
};

type SavedPaymentAccount = {
  label: string;
  value: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
};

const paymentMethodIconMap: Record<string, React.ElementType> = {
  Banknote,
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  Landmark,
  CircleDollarSign,
};

const defaultIconByPaymentMethod: Record<string, string> = {
  cash: "Banknote",
  card: "CreditCard",
  telebirr: "Smartphone",
  cbe_bank: "Building2",
  credit: "Wallet",
  wallet: "Wallet",
  other: "CircleDollarSign",
};

function normalizePaymentMethodName(name: string) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

type MartDiscountPolicy = {
  type: DiscountType;
  rate: number;
  enableByItems: boolean;
  enableByAmount: boolean;
  minItems: number;
  minAmount: number;
};

type MartBranding = {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  receiptHeader?: string;
  receiptSlogan?: string;
};

function getMartQuantityForSaleItem(item: {
  product?: { quantity?: number; supermarketQuantity?: number };
}) {
  const quantity = Number(
    item?.product?.quantity ?? item?.product?.supermarketQuantity ?? 0,
  );
  return Number.isFinite(quantity) ? Math.max(0, quantity) : 0;
}

function buildMartAddress(mart: Record<string, unknown>) {
  const directAddress = String(mart.address || "").trim();
  if (directAddress) return directAddress;

  return [mart.city, mart.region, mart.country]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
}

export function PaymentPanel() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const {
    items,
    paymentMethod,
    discount,
    extraCharges,
    setPaymentMethod,
    setCustomer,
    customerId,
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

  const [newChargeType, setNewChargeType] = useState<string>("service_charge");
  const [newChargeCustomName, setNewChargeCustomName] = useState("");
  const [newChargeAmount, setNewChargeAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const [paymentAccounts, setPaymentAccounts] = useState<
    Record<string, SavedPaymentAccount>
  >({});
  const [martCurrency, setMartCurrency] = useState<string | null>(null);
  const [martDiscountPolicy, setMartDiscountPolicy] =
    useState<MartDiscountPolicy>({
      type: "percentage",
      rate: 0,
      enableByItems: false,
      enableByAmount: false,
      minItems: 0,
      minAmount: 0,
    });
  const [martBranding, setMartBranding] = useState<MartBranding>({
    shopName: "Shop",
  });
  const [configuredPaymentMethods, setConfiguredPaymentMethods] = useState<
    Array<{
      value: PaymentMethod;
      label: string;
      icon: React.ElementType;
    }>
  >([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);

  const [customers, setCustomers] = useState<Array<any>>([]);
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerCity, setNewCustomerCity] = useState("");
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);

  const normalizeMartBranding = (
    json: Record<string, unknown>,
  ): MartBranding => ({
    shopName: String(json.martName || "").trim() || "Shop",
    shopAddress: buildMartAddress(json) || undefined,
    shopPhone:
      String(
        json.phone ||
          (json.ownerId as { phone?: string } | undefined)?.phone ||
          "",
      ).trim() || undefined,
    receiptHeader: String(json.receiptHeader || "").trim() || undefined,
    receiptSlogan:
      String(json.receiptMessage || json.receiptHeader || "").trim() ||
      undefined,
  });

  const fetchMartBranding = async (force = false) => {
    const API_BASE = import.meta.env.VITE_API_URL || "";
    const martId = user?.martId;
    const token = user?.token;
    if (!martId) return martBranding;
    if (
      !force &&
      paymentPanelCachedMartId === martId &&
      martBranding.shopName !== "Shop"
    ) {
      return martBranding;
    }

    const res = await fetch(`${API_BASE}/api/marts/${martId}`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) return martBranding;

    const json = await res.json();
    const nextBranding = normalizeMartBranding(json as Record<string, unknown>);
    setMartBranding((prev) => {
      try {
        return JSON.stringify(prev) === JSON.stringify(nextBranding)
          ? prev
          : nextBranding;
      } catch {
        return nextBranding;
      }
    });
    paymentPanelCachedMartId = martId;
    return nextBranding;
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

  const persistSalePayload = async (salePayload: SaleRequest) => {
    const queueOfflineSale = async (details?: string) => {
      const desktopApi = (
        window as Window & {
          posApi?: {
            saveSale?: (sale: Record<string, unknown>) => Promise<unknown>;
          };
        }
      ).posApi;

      if (!desktopApi?.saveSale) {
        throw new Error("Desktop local database bridge unavailable");
      }

      await desktopApi.saveSale({
        ...salePayload,
        _authToken: user?.token,
        queuedAt: new Date().toISOString(),
      });

      await useProductStore.getState().applyLocalSale?.(
        Array.isArray(salePayload.items)
          ? (
              salePayload.items as Array<{
                productId: string;
                quantity: number;
              }>
            ).map((item) => ({
              productId: String(item.productId || ""),
              quantity: Number(item.quantity || 0),
            }))
          : [],
      );

      toast({
        title: t("sale_complete"),
        description:
          details ||
          "Sale saved locally and queued for sync when internet is available.",
      });
    };

    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const token = user?.token;
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

        if (res.status >= 400 && res.status < 500) {
          toast({
            title: t("failed_to_save_sale"),
            description:
              err && err.message
                ? String(err.message)
                : "Sale could not be recorded.",
            variant: "destructive",
          });
          return false;
        }

        await queueOfflineSale(
          err && err.message
            ? `${err.message}. Saved locally for sync.`
            : "Server unavailable. Sale saved locally for sync.",
        );
        clearCart();
        return true;
      }

      toast({
        title: t("sale_complete"),
        description: `${t("receipt_label")}: ${salePayload.receiptId}`,
      });

      await useProductStore.getState().applyLocalSale?.(
        Array.isArray(salePayload.items)
          ? (
              salePayload.items as Array<{
                productId: string;
                quantity: number;
              }>
            ).map((item) => ({
              productId: String(item.productId || ""),
              quantity: Number(item.quantity || 0),
            }))
          : [],
      );

      useProductStore
        .getState()
        .fetchProducts?.()
        .catch(() => {
          // ignore refresh errors
        });

      clearCart();
      return true;
    } catch (err) {
      console.error("Record sale error", err);
      try {
        await queueOfflineSale("Network unavailable. Sale saved locally for sync.");
        clearCart();
        return true;
      } catch (queueErr) {
        console.error("Failed to queue sale locally", queueErr);
        toast({
          title: t("failed_to_save_sale"),
          description: String(queueErr),
          variant: "destructive",
        });
        return false;
      }
    }
  };

  const handleCompleteSale = async () => {
    if (configuredPaymentMethods.length === 0) {
      toast({
        title: "No payment methods configured",
        description:
          "Owner must configure POS payment methods in Settings first.",
        variant: "destructive",
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: t("empty_cart"),
        description: t("add_items_to_complete_sale"),
        variant: "destructive",
      });
      return;
    }

    // require a customer for credit (wallet) payments
    if (isCreditPayment && !customerId) {
      toast({
        title: t("select_customer_for_credit") || "Select customer",
        description:
          t("select_customer_for_credit_desc") ||
          "Please select a customer for credit sales",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    const invalidStockItems = items
      .map((item) => {
        const available = getMartQuantityForSaleItem(item as any);
        return {
          item,
          available,
          invalid: available <= 0 || item.quantity > available,
        };
      })
      .filter((entry) => entry.invalid);

    if (invalidStockItems.length > 0) {
      const first = invalidStockItems[0];
      toast({
        title: t("out_of_stock") || "Out of stock",
        description:
          first.available <= 0
            ? `${first.item.product.name} is out of stock.`
            : `${first.item.product.name} only has ${first.available} available in mart stock.`,
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    const latestBranding =
      martBranding.shopName !== "Shop"
        ? martBranding
        : await fetchMartBranding(false);

    const saleId = `SALE-${Date.now()}`;
    const receiptId = `RCP-${Date.now().toString(36).toUpperCase()}`;
    const receiptApiBase = (
      (import.meta.env.VITE_RECEIPT_PUBLIC_BASE_URL as string | undefined)
        ?.trim() ||
      (import.meta.env.VITE_API_URL as string | undefined) ||
      "http://localhost:4000"
    ).replace(/\/+$/, "");
    const receiptPublicUrl = `${receiptApiBase}/api/sales/receipt/${encodeURIComponent(receiptId)}/view`;

    // Create receipt
    const receipt: Receipt = {
      id: receiptId,
      saleId,
      shopName: latestBranding.shopName || "Shop",
      shopAddress: latestBranding.shopAddress,
      shopPhone: latestBranding.shopPhone,
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
      receiptHeader: latestBranding.receiptHeader,
      receiptSlogan: latestBranding.receiptSlogan,
    };

    // prepare sale payload but do NOT send it yet; save when user presses Done on the receipt
    const salePayload: SaleRequest = {
      martId: user?.martId,
      customerId: customerId || undefined,
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
    };

    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const token = user?.token;
      if (API_BASE && token) {
        fetch(`${API_BASE}/api/sales/receipt-cache`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ receipt }),
        }).catch((cacheErr) => {
          // Do not block cashier flow if preview cache fails.
          console.warn("Failed to cache receipt preview", cacheErr);
        });
      }
    } catch (cacheErr) {
      // Do not block cashier flow if preview cache setup fails.
      console.warn("Failed to start receipt preview cache", cacheErr);
    }

    const saved = await persistSalePayload(salePayload);
    if (!saved) {
      setIsProcessing(false);
      return;
    }

    setCurrentReceipt(receipt);
    setShowReceipt(true);
    setIsProcessing(false);

    toast({
      title: t("receipt_ready") || "Receipt ready",
      description: `Receipt: ${receiptId}`,
    });
  };

  const handleDoneReceipt = async () => {
    setShowReceipt(false);
    setCurrentReceipt(null);
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

        const res = await fetch(`${API_BASE}/api/marts/${martId}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted) return;

        const accounts: Record<string, SavedPaymentAccount> = {};
        let raw: unknown = undefined;
        if (Array.isArray(json.customPaymentFields)) {
          for (const entry of json.customPaymentFields) {
            try {
              if (!entry || typeof entry !== "object") continue;
              const obj = entry as Record<string, unknown>;
              const bankName = String(obj["bankName"] ?? "").trim();
              const accountHolderName = String(
                obj["accountHolderName"] ?? "",
              ).trim();
              const accountNumber = String(
                obj["accountNumber"] ?? obj["value"] ?? "",
              ).trim();
              const k = String(obj["key"] ?? "")
                .trim()
                .toLowerCase();
              if (!k && !bankName) continue;
              if (
                k === "other" ||
                k === "other_name" ||
                k === "other_bank_name" ||
                k === "other_account_holder" ||
                k === "other_account_number"
              ) {
                continue;
              }
              const key = k || bankName.toLowerCase();
              accounts[key] = {
                label: bankName || key,
                value: accountNumber || String(obj["value"] ?? ""),
                bankName,
                accountHolderName,
                accountNumber,
              };
            } catch (err) {
              // ignore malformed entry
              continue;
            }
          }
        } else {
          raw = json.paymentAccounts;
        }

        try {
          if (Array.isArray(raw)) {
            // case: flat string array [key, value, key, value, ...]
            if (raw.length > 0 && raw.every((r) => typeof r === "string")) {
              for (let i = 0; i + 1 < raw.length; i += 2) {
                const k = String(raw[i] || "")
                  .trim()
                  .toLowerCase();
                const v = String(raw[i + 1] || "");
                if (k) accounts[k] = { label: k, value: v };
              }
            } else {
              // case: array of objects
              for (const entry of raw as unknown[]) {
                if (!entry || typeof entry !== "object") continue;
                const obj = entry as Record<string, unknown>;
                if ("key" in obj && "value" in obj) {
                  const k = String(obj["key"] ?? "")
                    .trim()
                    .toLowerCase();
                  const v = obj["value"] == null ? "" : String(obj["value"]);
                  if (k) accounts[k] = { label: k, value: v };
                } else {
                  Object.entries(obj).forEach(([k, v]) => {
                    const nk = String(k || "")
                      .trim()
                      .toLowerCase();
                    accounts[nk] = {
                      label: nk,
                      value: Array.isArray(v)
                        ? String((v as unknown[])[0] ?? "")
                        : String(v ?? ""),
                    };
                  });
                }
              }
            }
          } else if (raw && typeof raw === "object") {
            Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
              const nk = String(k || "")
                .trim()
                .toLowerCase();
              if (Array.isArray(v))
                accounts[nk] = {
                  label: nk,
                  value: String((v as unknown[])[0] ?? ""),
                };
              else accounts[nk] = { label: nk, value: v == null ? "" : String(v) };
            });
          }
        } catch (e) {
          // fallback to empty
        }

        if (!accounts.card && accounts.bank) accounts.card = accounts.bank;
        if (!accounts.wallet && accounts.amole)
          accounts.wallet = accounts.amole;
        if (
          !accounts.telebirr &&
          (accounts.telebirr_number || accounts.tel || accounts.phone)
        ) {
          accounts.telebirr =
            accounts.telebirr_number || accounts.tel || accounts.phone;
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
        if (import.meta.env.DEV)
          console.debug("Normalized payment accounts:", accounts);

        setMartCurrency((prev) => {
          const nextCurrency = json.currency || "ETB";
          return prev === nextCurrency ? prev : nextCurrency;
        });

        setMartBranding((prev) => {
          const nextBranding = normalizeMartBranding(
            json as Record<string, unknown>,
          );
          try {
            return JSON.stringify(prev) === JSON.stringify(nextBranding)
              ? prev
              : nextBranding;
          } catch {
            return nextBranding;
          }
        });

        const incomingRate = Number(json.taxRate) || 0;
        if (typeof setTaxRate === "function") {
          try {
            const curr = taxRate;
            if (Number(curr) !== Number(incomingRate)) setTaxRate(incomingRate);
          } catch {
            setTaxRate(incomingRate);
          }
        }

        const incomingDiscountRate = Number(json.globalDiscountRate) || 0;
        const incomingDiscountType =
          json.globalDiscountType === "fixed" ? "fixed" : "percentage";
        const incomingEnableByItems = Boolean(json.enableDiscountByItems);
        const incomingEnableByAmount = Boolean(json.enableDiscountByAmount);
        const incomingMinItems = Number(json.discountMinItems) || 0;
        const incomingMinAmount = Number(json.discountMinAmount) || 0;
        setMartDiscountPolicy((prev) => {
          const next = {
            type: incomingDiscountType,
            rate: Math.max(0, incomingDiscountRate),
            enableByItems: incomingEnableByItems,
            enableByAmount: incomingEnableByAmount,
            minItems: Math.max(0, incomingMinItems),
            minAmount: Math.max(0, incomingMinAmount),
          };

          if (
            prev.type === next.type &&
            prev.rate === next.rate &&
            prev.enableByItems === next.enableByItems &&
            prev.enableByAmount === next.enableByAmount &&
            prev.minItems === next.minItems &&
            prev.minAmount === next.minAmount
          ) {
            return prev;
          }

          return next;
        });

        // cache mart id to avoid repeated fetches
        paymentPanelCachedMartId = martId;
      } catch (err) {
        console.error("Load mart settings error", err);
      }
    };

    fetchMart();

    const handleMartSettingsUpdated = (ev: Event) => {
      try {
        const changedId = (ev as CustomEvent)?.detail?.martId;
        if (changedId && changedId === user?.martId) {
          // invalidate cache and refetch
          paymentPanelCachedMartId = null;
          fetchMart();
        }
      } catch (err) {
        console.warn("mart-settings-updated handler error", err);
      }
    };

    window.addEventListener(
      "mart-settings-updated",
      handleMartSettingsUpdated as EventListener,
    );

    return () => {
      mounted = false;
      window.removeEventListener(
        "mart-settings-updated",
        handleMartSettingsUpdated as EventListener,
      );
    };
  }, [user?.martId, user?.token, setTaxRate, taxRate]);

  useEffect(() => {
    let mounted = true;

    const fetchConfiguredPaymentMethods = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "";
        const martId = user?.martId;
        const token = user?.token;
        if (!martId) return;

        setIsLoadingPaymentMethods(true);
        const res = await fetch(
          `${API_BASE}/api/payment-types?martId=${martId}`,
          {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          },
        );

        if (!res.ok) {
          if (mounted) setConfiguredPaymentMethods([]);
          return;
        }

        const list = (await res.json()) as PaymentTypeDto[];
        if (!mounted) return;

        const normalized = (Array.isArray(list) ? list : [])
          .filter((item) => item && item.name)
          .map((item) => {
            const methodName = normalizePaymentMethodName(
              String(item.name || ""),
            );
            const iconKey =
              String(item.icon || "").trim() ||
              defaultIconByPaymentMethod[methodName] ||
              "Wallet";
            return {
              value: methodName as PaymentMethod,
              label: methodName,
              icon: paymentMethodIconMap[iconKey] || Wallet,
            };
          })
          .filter((item) => item.value);

        setConfiguredPaymentMethods(normalized);
      } catch (err) {
        console.error("Failed to load configured payment methods", err);
        if (mounted) setConfiguredPaymentMethods([]);
      } finally {
        if (mounted) setIsLoadingPaymentMethods(false);
      }
    };

    fetchConfiguredPaymentMethods();

    const handleMartSettingsUpdated = (ev: Event) => {
      try {
        const changedId = (ev as CustomEvent)?.detail?.martId;
        if (!changedId || changedId === user?.martId) {
          fetchConfiguredPaymentMethods();
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener(
      "mart-settings-updated",
      handleMartSettingsUpdated as EventListener,
    );

    return () => {
      mounted = false;
      window.removeEventListener(
        "mart-settings-updated",
        handleMartSettingsUpdated as EventListener,
      );
    };
  }, [user?.martId, user?.token]);

  useEffect(() => {
    if (configuredPaymentMethods.length === 0) return;
    if (
      !configuredPaymentMethods.some((item) => item.value === paymentMethod)
    ) {
      setPaymentMethod(configuredPaymentMethods[0].value);
    }
  }, [configuredPaymentMethods, paymentMethod, setPaymentMethod]);

  const isCreditPayment =
    paymentMethod === "wallet" || paymentMethod === "credit";

  // Keep cart discount aligned with mart-level automatic discount policy.
  useEffect(() => {
    const subtotal = getSubtotal();
    const itemCount = items.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0,
    );

    const qualifiesByItems =
      martDiscountPolicy.enableByItems &&
      martDiscountPolicy.minItems > 0 &&
      itemCount > martDiscountPolicy.minItems;
    const qualifiesByAmount =
      martDiscountPolicy.enableByAmount &&
      martDiscountPolicy.minAmount > 0 &&
      subtotal > martDiscountPolicy.minAmount;
    const shouldApply =
      martDiscountPolicy.rate > 0 &&
      (martDiscountPolicy.enableByItems || martDiscountPolicy.enableByAmount) &&
      (qualifiesByItems || qualifiesByAmount);

    if (shouldApply) {
      if (
        !discount ||
        discount.type !== martDiscountPolicy.type ||
        Number(discount.value) !== Number(martDiscountPolicy.rate)
      ) {
        setCartDiscount(martDiscountPolicy.type, martDiscountPolicy.rate);
      }
      return;
    }

    if (discount) {
      removeCartDiscount();
    }
  }, [
    discount,
    getSubtotal,
    items,
    martDiscountPolicy.minAmount,
    martDiscountPolicy.minItems,
    martDiscountPolicy.enableByAmount,
    martDiscountPolicy.enableByItems,
    martDiscountPolicy.rate,
    martDiscountPolicy.type,
    removeCartDiscount,
    setCartDiscount,
  ]);

  // Fetch customers when credit payment is selected
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        if (!isCreditPayment) return;
        const martId = user?.martId;
        if (!martId) return;
        const list = await fetchCustomers({ martId }, user?.token);
        if (!mounted) return;
        if (!Array.isArray(list)) {
          setCustomers([]);
        } else {
          const sorted = list.slice().sort((a: any, b: any) => {
            const ua = Number(a?.totalUnpaid || 0);
            const ub = Number(b?.totalUnpaid || 0);
            return ub - ua; // descending: highest unpaid first
          });
          setCustomers(sorted);
        }
      } catch (err) {
        console.warn("Failed to load customers for credit", err);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [isCreditPayment, user?.martId, user?.token]);

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
        {isLoadingPaymentMethods ? (
          <p className="text-sm text-muted-foreground">
            {t("loading_payment_methods") || "Loading payment methods..."}
          </p>
        ) : configuredPaymentMethods.length === 0 ? (
          <p className="text-sm text-destructive">
            No POS payment methods are configured. Ask the owner to add them in
            Settings.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {configuredPaymentMethods.map((method) => {
              const Icon = method.icon;
              return (
                <Button
                  key={method.value}
                  variant={
                    paymentMethod === method.value ? "default" : "outline"
                  }
                  className="h-auto py-3 flex flex-col items-center gap-1"
                  onClick={() => setPaymentMethod(method.value)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs">
                    {t(method.label) || method.label}
                  </span>
                </Button>
              );
            })}
          </div>
        )}
      </div>
      {isCreditPayment && (
        <div className="space-y-2">
          <Label>{t("customer") || "Customer"}</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select
                value={customerId || undefined}
                onValueChange={(v) =>
                  setCustomer(v && v !== "__none" ? v : null)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customers.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      {t("no_customers") || "No customers"}
                    </SelectItem>
                  ) : (
                    customers.map((c: any) => (
                      <SelectItem
                        key={String(c._id || c.id)}
                        value={String(c._id || c.id)}
                      >
                        {String(c.name || c.phoneNumber || c._id)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddCustomerDialog(true)}
              title={t("add_customer")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add customer dialog for quick registration from POS */}
      <Dialog
        open={showAddCustomerDialog}
        onOpenChange={setShowAddCustomerDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("add_customer") || "Add Customer"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newCustomerName || newCustomerName.trim().length < 2) {
                toast({
                  title: t("valid_name_min2") || "Please enter a valid name",
                  variant: "destructive",
                });
                return;
              }
              setIsAddingCustomer(true);
              try {
                const payload = {
                  name: newCustomerName.trim(),
                  phoneNumber: newCustomerPhone.trim(),
                  city: newCustomerCity.trim() || undefined,
                  martId: user?.martId,
                } as any;
                const created = await createCustomer(payload, user?.token);
                // prepend new customer and select it
                setCustomers((prev) => [created, ...(prev || [])]);
                try {
                  setCustomer(String(created._id || created.id));
                } catch {}
                setShowAddCustomerDialog(false);
                setNewCustomerName("");
                setNewCustomerPhone("");
                setNewCustomerCity("");
                toast({ title: t("customer_added") || "Customer added" });
              } catch (err: any) {
                console.error("Failed to add customer", err);
                toast({
                  title: t("failed_add_customer") || "Failed to add customer",
                  description: err?.message || String(err),
                  variant: "destructive",
                });
              } finally {
                setIsAddingCustomer(false);
              }
            }}
            className="grid gap-3"
          >
            <div>
              <Label htmlFor="pos-new-customer-name">
                {t("name") || "Name"}
              </Label>
              <Input
                id="pos-new-customer-name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pos-new-customer-phone">
                {t("phone_number") || "Phone"}
              </Label>
              <Input
                id="pos-new-customer-phone"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="pos-new-customer-city">
                {t("city") || "City"}
              </Label>
              <Input
                id="pos-new-customer-city"
                value={newCustomerCity}
                onChange={(e) => setNewCustomerCity(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddCustomerDialog(false)}
                type="button"
              >
                {t("cancel") || "Cancel"}
              </Button>
              <Button type="submit" disabled={isAddingCustomer}>
                {isAddingCustomer ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  t("add_customer")
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Saved Accounts (show all configured payment accounts) */}
      {Object.keys(paymentAccounts || {}).length > 0 && (
        <div className="space-y-2 pt-2">
          <Label>{t("saved_accounts") || "Saved Accounts"}</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(paymentAccounts).map(([key, value]) => {
              const account = value;
              const copyValue =
                account.accountNumber || account.value || "";
              const niceKey = String(account.bankName || account.label || key || "")
                .replace(/_/g, " ")
                .toUpperCase();
              return (
                <div
                  key={key}
                  className="p-2 border rounded-lg bg-muted flex items-center justify-between"
                >
                  <div className="text-sm">
                    <div className="text-xs text-muted-foreground">
                      {niceKey}
                    </div>
                    <div className="text-sm font-medium mt-1">
                      {account.accountHolderName ? (
                        <span className="block text-xs text-muted-foreground">
                          {account.accountHolderName}
                        </span>
                      ) : null}
                      {copyValue || t("not_configured")}
                    </div>
                  </div>
                  {copyValue ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("copy") || "Copy"}
                      title={t("copy") || "Copy"}
                      onClick={() => {
                        try {
                          navigator.clipboard?.writeText(copyValue);
                          toast({ title: t("copied") });
                        } catch (err) {
                          console.warn("copy to clipboard failed", err);
                        }
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Discount Section */}
      <div className="space-y-2">
        <Label>{t("discount")}</Label>
        {martDiscountPolicy.rate > 0 ? (
          <div className="space-y-1 rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">
              Auto discount policy:{" "}
              {martDiscountPolicy.type === "percentage"
                ? `${martDiscountPolicy.rate}% off`
                : `${martDiscountPolicy.rate} ETB off`}
            </p>
            <p className="text-xs text-muted-foreground">
              Conditions:{" "}
              {martDiscountPolicy.enableByItems
                ? `items > ${martDiscountPolicy.minItems}`
                : "items condition disabled"}
              {" | "}
              {martDiscountPolicy.enableByAmount
                ? `subtotal > ${martDiscountPolicy.minAmount} ETB`
                : "amount condition disabled"}
            </p>
            <p className="text-sm font-medium">
              {discount
                ? `Applied: -${getDiscountAmount().toFixed(2)} ETB`
                : "Not applied for current cart"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("no_mart_discount_policy_configured")}
          </p>
        )}
      </div>

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
              <SelectItem value="service_charge">
                {t("service_charge")}
              </SelectItem>
              <SelectItem value="delivery_charge">
                {t("delivery_charge")}
              </SelectItem>
              <SelectItem value="packaging_charge">
                {t("packaging_charge")}
              </SelectItem>
              <SelectItem value="others">{t("others")}</SelectItem>
            </SelectContent>
          </Select>

          {newChargeType === "others" && (
            <Input
              placeholder={t("custom_name")}
              value={newChargeCustomName}
              onChange={(e) => setNewChargeCustomName(e.target.value)}
              className="flex-1"
            />
          )}

          <Input
            type="number"
            placeholder={t("amount")}
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
          onClick={() => setConfirmCompleteOpen(true)}
          disabled={
            items.length === 0 ||
            isProcessing ||
            configuredPaymentMethods.length === 0
          }
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t("processing")}
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
      <Dialog
        open={showReceipt}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseReceipt();
            return;
          }

          setShowReceipt(open);
        }}
      >
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

      {/* Complete Sale Confirmation */}
      <Modal
        isOpen={confirmCompleteOpen}
        onClose={() => setConfirmCompleteOpen(false)}
        title={t("complete_sale") || "Complete Sale"}
        type="warning"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Confirm and continue to receipt preview?
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => setConfirmCompleteOpen(false)}
            >
              {t("cancel") || "Cancel"}
            </Button>
            <Button
              onClick={async () => {
                setConfirmCompleteOpen(false);
                await handleCompleteSale();
              }}
            >
              {t("ok") || "OK"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

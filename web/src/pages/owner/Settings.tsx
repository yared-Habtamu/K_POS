import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Banknote,
  Building2,
  CircleDollarSign,
  CreditCard,
  Landmark,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
  Wallet,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { PrinterSettingsCard } from "@/components/settings/PrinterSettingsCard";
import { PrintNodeApiKeyCard } from "@/components/settings/PrintNodeApiKeyCard";

type ConfiguredPaymentType = {
  _id?: string;
  id?: string;
  name: string;
  icon?: string;
  active?: boolean;
};

type PaymentAccountField = {
  key: string;
  value: string;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  _id?: string;
};

const paymentMethodOptions = [
  { value: "cash", labelKey: "cash", fallback: "Cash" },
  { value: "card", labelKey: "card", fallback: "Card" },
  { value: "transfer", labelKey: "transfer", fallback: "Transfer" },
  { value: "credit", labelKey: "credit", fallback: "Credit" },
  { value: "telebirr", labelKey: "telebirr", fallback: "Telebirr" },
  { value: "cbe_bank", labelKey: "cbe_bank", fallback: "CBE Bank" },
  { value: "other", labelKey: "other", fallback: "Other" },
];

const paymentIconOptions = [
  { value: "Banknote", label: "Banknote (Cash)", Icon: Banknote },
  { value: "CreditCard", label: "Credit Card", Icon: CreditCard },
  { value: "Landmark", label: "Landmark (Bank/Transfer)", Icon: Landmark },
  { value: "Smartphone", label: "Smartphone (Mobile Money)", Icon: Smartphone },
  { value: "Building2", label: "Building (Bank)", Icon: Building2 },
  { value: "Wallet", label: "Wallet (Credit/Deposit)", Icon: Wallet },
  { value: "CircleDollarSign", label: "Dollar Circle", Icon: CircleDollarSign },
];

const defaultIconByPaymentMethod: Record<string, string> = {
  cash: "Banknote",
  card: "CreditCard",
  transfer: "Landmark",
  telebirr: "Smartphone",
  cbe_bank: "Building2",
  credit: "Wallet",
  wallet: "Wallet",
  other: "CircleDollarSign",
};

const resolvePaymentMethodLabel = (
  methodName: string,
  t: (key: string) => string,
) => {
  const found = paymentMethodOptions.find((item) => item.value === methodName);
  if (found) return t(found.labelKey) || found.fallback;
  return methodName.replace(/_/g, " ");
};

export default function OwnerSettings() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [slogan, setSlogan] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currency, setCurrency] = useState("ETB");
  const [paymentSystem, setPaymentSystem] = useState("");
  const [paymentAccounts, setPaymentAccounts] = useState<{
    [k: string]: string;
  }>({});
  const [customPaymentFields, setCustomPaymentFields] = useState<
    PaymentAccountField[]
  >([]);
  const [tax, setTax] = useState("");
  const [globalDiscountType, setGlobalDiscountType] = useState<
    "percentage" | "fixed"
  >("percentage");
  const [globalDiscountRate, setGlobalDiscountRate] = useState("");
  const [enableDiscountByItems, setEnableDiscountByItems] = useState(false);
  const [enableDiscountByAmount, setEnableDiscountByAmount] = useState(false);
  const [discountMinItems, setDiscountMinItems] = useState("");
  const [discountMinAmount, setDiscountMinAmount] = useState("");
  const [configuredPaymentTypes, setConfiguredPaymentTypes] = useState<
    ConfiguredPaymentType[]
  >([]);
  const [customPaymentName, setCustomPaymentName] = useState("");
  const [selectedPosPaymentIcon, setSelectedPosPaymentIcon] = useState("Banknote");
  const [newPaymentActive, setNewPaymentActive] = useState(true);
  const [isSavingPosPaymentMethod, setIsSavingPosPaymentMethod] =
    useState(false);
  const [editingPaymentType, setEditingPaymentType] =
    useState<ConfiguredPaymentType | null>(null);
  const [editPaymentName, setEditPaymentName] = useState("");
  const [editPaymentIcon, setEditPaymentIcon] = useState("Banknote");
  const [editPaymentActive, setEditPaymentActive] = useState(true);
  const [isSavingEditPayment, setIsSavingEditPayment] = useState(false);
  const [deletingPaymentTypeId, setDeletingPaymentTypeId] = useState<
    string | null
  >(null);
  const [pendingDeletePaymentType, setPendingDeletePaymentType] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingAccount, setEditingAccount] = useState<{
    key: string;
    value: string;
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
  } | null>(null);
  const [editAccountKey, setEditAccountKey] = useState("");
  const [editAccountValue, setEditAccountValue] = useState("");
  const [pendingDeleteAccount, setPendingDeleteAccount] = useState<{
    key: string;
  } | null>(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [otherBankName, setOtherBankName] = useState("");
  const [otherAccountHolder, setOtherAccountHolder] = useState("");
  const [otherAccountNumber, setOtherAccountNumber] = useState("");
  const { toast } = useToast();
  const auth = useAuthStore((s) => s.user);
  const API_BASE = import.meta.env.VITE_API_URL || "";

  // build a merged view of saved payment fields coming from either
  // `customPaymentFields` (array of {key,value,_id}) or legacy `paymentAccounts` (object)
  const displayPaymentFields = (() => {
    const map: Record<string, PaymentAccountField> = {};
    // take from customPaymentFields first (these may contain _id)
    for (const f of customPaymentFields || []) {
      if (!f) continue;
      const bankName = String(f.bankName || "").trim();
      const accountNumber = String(f.accountNumber || f.value || "").trim();
      const key = String(f.key || bankName || "")
        .trim()
        .toLowerCase();
      if (!key) continue;
      if (
        key === "other" ||
        key === "other_name" ||
        key === "other_bank_name" ||
        key === "other_account_holder" ||
        key === "other_account_number"
      ) {
        continue;
      }
      map[key] = {
        key,
        value: accountNumber || f.value || "",
        bankName,
        accountHolderName: String(f.accountHolderName || "").trim(),
        accountNumber,
        _id: f._id,
      };
    }
    // merge in any legacy paymentAccounts that aren't present yet
    for (const [k, v] of Object.entries(paymentAccounts || {})) {
      if (!k) continue;
      if (
        k === "other" ||
        k === "other_name" ||
        k === "other_bank_name" ||
        k === "other_account_holder" ||
        k === "other_account_number"
      ) {
        continue;
      }
      if (!map[k]) map[k] = { key: k, value: String(v || "") };
    }
    return Object.values(map);
  })();

  // load existing mart settings once (do not overwrite while user is editing)
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const martId = auth?.martId;
        const token = auth?.token;
        if (!martId) return;

        const res = await fetch(`${API_BASE}/api/marts/${martId}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!mounted) return;

        // only set states if the user hasn't already started editing those fields
        // This prevents overwriting values while the owner is typing before saving.

        setName((prev) => (prev ? prev : json.martName || ""));
        setSlogan((prev) =>
          prev ? prev : json.receiptHeader || json.receiptMessage || "",
        );
        setPhone((prev) =>
          prev ? prev : json.phone || json.ownerId?.phone || "",
        );
        setAddress((prev) =>
          prev
            ? prev
            : json.address ||
              [json.city, json.region, json.country].filter(Boolean).join(", "),
        );

        // currency
        setCurrency((prev) => (prev ? prev : json.currency || "ETB"));

        // payment fields: prefer customPaymentFields array but accept legacy map
        if (Array.isArray(json.customPaymentFields)) {
          const arr = (json.customPaymentFields || []).map((raw: unknown) => {
            const it =
              raw && typeof raw === "object"
                ? (raw as Record<string, unknown>)
                : {};
            const hasBankShape =
              "bankName" in it ||
              "accountHolderName" in it ||
              "accountNumber" in it;
            const bankName = String(it.bankName || "").trim();
            const accountHolderName = String(
              it.accountHolderName || "",
            ).trim();
            const accountNumber = String(it.accountNumber || "").trim();
            return {
              key: String(it.key || bankName || "")
                .trim()
                .toLowerCase(),
              value: accountNumber || it.value || "",
              ...(hasBankShape
                ? { bankName, accountHolderName, accountNumber }
                : {}),
              _id: it._id ? String(it._id) : undefined,
            };
          });
          setCustomPaymentFields((prev) => (prev && prev.length ? prev : arr));
          const obj: Record<string, string> = (arr || []).reduce(
            (acc: Record<string, string>, it: any) => ({
              ...acc,
              [it.key]: it.accountNumber || it.value,
            }),
            {},
          );
          setPaymentAccounts((prev) =>
            prev && Object.keys(prev).length ? prev : obj,
          );

          // paymentSystem: prefer explicit server value; otherwise default to first saved key
          setPaymentSystem((prev) => {
            if (prev) return prev; // keep user's selection
            if (json.paymentSystem) return json.paymentSystem;
            if (arr.length > 0) return arr[0].key || "";
            return "";
          });
        } else {
          const accounts: { [k: string]: string } = json.paymentAccounts
            ? Object.fromEntries(
                Object.entries(json.paymentAccounts).map(([k, v]) => [
                  k,
                  String(v),
                ]),
              )
            : {};
          setPaymentAccounts((prev) =>
            prev && Object.keys(prev).length ? prev : accounts,
          );
          const arr = Object.entries(accounts || {}).map(([k, v]) => ({
            key: String(k || "")
              .trim()
              .toLowerCase(),
            value: v as string,
          }));
          setCustomPaymentFields((prev) => (prev && prev.length ? prev : arr));
          setPaymentSystem((prev) =>
            prev
              ? prev
              : json.paymentSystem || (arr.length > 0 ? arr[0].key || "" : ""),
          );
        }

        // tax: only set if owner hasn't changed the input yet
        setTax((prev) => {
          if (prev !== "") return prev;
          const parsedTaxRate = Number(json.taxRate);
          return String(Number.isFinite(parsedTaxRate) ? parsedTaxRate : 0);
        });

        setGlobalDiscountRate((prev) => {
          if (prev !== "") return prev;
          const parsed = Number(json.globalDiscountRate);
          return String(Number.isFinite(parsed) ? parsed : 0);
        });

        setGlobalDiscountType(
          json.globalDiscountType === "fixed" ? "fixed" : "percentage",
        );
        setEnableDiscountByItems(Boolean(json.enableDiscountByItems));
        setEnableDiscountByAmount(Boolean(json.enableDiscountByAmount));

        setDiscountMinItems((prev) => {
          if (prev !== "") return prev;
          const parsed = Number(json.discountMinItems);
          return String(Number.isFinite(parsed) ? parsed : 0);
        });

        setDiscountMinAmount((prev) => {
          if (prev !== "") return prev;
          const parsed = Number(json.discountMinAmount);
          return String(Number.isFinite(parsed) ? parsed : 0);
        });
      } catch (err) {
        console.error("Load settings error", err);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [auth?.martId, auth?.token, API_BASE]);

  const loadPaymentTypes = async () => {
    try {
      const martId = auth?.martId;
      const token = auth?.token;
      if (!martId) return;

      const res = await fetch(
        `${API_BASE}/api/payment-types?martId=${martId}`,
        {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        },
      );

      if (!res.ok) return;
      const list = await res.json();

      const normalized = (Array.isArray(list) ? list : [])
        .filter((item) => item && (item._id || item.id) && item.name)
        .map((item) => ({
          _id: String(item.id || item._id),
          name: String(item.name || "").trim().toLowerCase(),
          icon:
            String(item.icon || "").trim() ||
            defaultIconByPaymentMethod[
              String(item.name || "").trim().toLowerCase()
            ] ||
            "Wallet",
          active: item.active !== false,
        }));

      setConfiguredPaymentTypes(normalized);
    } catch (err) {
      console.error("Failed to load payment types", err);
    }
  };

  useEffect(() => {
    loadPaymentTypes();
  }, [API_BASE, auth?.martId, auth?.token]);

  const createPosPaymentType = async () => {
    const rawName = customPaymentName.trim();
    if (!rawName) {
      toast({
        title: t("payment_method_name_required", {
          defaultValue: "Payment method name is required",
        }),
        variant: "destructive",
      });
      return;
    }
    try {
      const martId = auth?.martId;
      const token = auth?.token;
      if (!martId) {
        toast({ title: t("mart_not_found"), variant: "destructive" });
        return;
      }

      setIsSavingPosPaymentMethod(true);
      const payload = {
        name: rawName,
        icon: selectedPosPaymentIcon,
        active: newPaymentActive,
        martId,
      };

      const res = await fetch(`${API_BASE}/api/payment-types`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: String(json?.message || "Failed to save payment method"),
          variant: "destructive",
        });
        return;
      }

      setCustomPaymentName("");
      toast({ title: "POS payment method saved" });
      await loadPaymentTypes();
      window.dispatchEvent(
        new CustomEvent("mart-settings-updated", { detail: { martId } }),
      );
    } catch (err) {
      console.error("createPosPaymentType error", err);
      toast({ title: "Failed to save payment method", variant: "destructive" });
    } finally {
      setIsSavingPosPaymentMethod(false);
    }
  };

  const togglePaymentTypeActive = async (id: string, currentActive: boolean) => {
    try {
      const martId = auth?.martId;
      const token = auth?.token;
      if (!martId || !id) return;

      const nextActive = !currentActive;
      setConfiguredPaymentTypes((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, active: nextActive } : item,
        ),
      );

      const res = await fetch(`${API_BASE}/api/payment-types/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ active: nextActive }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast({
        title: nextActive
          ? "Payment method enabled"
          : "Payment method disabled",
      });
      window.dispatchEvent(
        new CustomEvent("mart-settings-updated", { detail: { martId } }),
      );
    } catch (err) {
      await loadPaymentTypes();
      toast({
        title: "Failed to update payment method status",
        variant: "destructive",
      });
    }
  };

  const startEditPaymentType = (item: ConfiguredPaymentType) => {
    setEditingPaymentType(item);
    setEditPaymentName(item.name);
    setEditPaymentIcon(item.icon || "Wallet");
    setEditPaymentActive(item.active !== false);
  };

  const saveEditPaymentType = async () => {
    if (!editingPaymentType?._id) return;
    const rawName = editPaymentName.trim();
    if (!rawName) {
      toast({
        title: "Payment method name is required",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSavingEditPayment(true);
      const martId = auth?.martId;
      const token = auth?.token;
      if (!martId) return;

      const res = await fetch(
        `${API_BASE}/api/payment-types/${editingPaymentType._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: rawName,
            icon: editPaymentIcon,
            active: editPaymentActive,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update payment method");
      }

      setEditingPaymentType(null);
      toast({ title: "Payment method updated" });
      await loadPaymentTypes();
      window.dispatchEvent(
        new CustomEvent("mart-settings-updated", { detail: { martId } }),
      );
    } catch (err: any) {
      toast({
        title: err.message || "Failed to update payment method",
        variant: "destructive",
      });
    } finally {
      setIsSavingEditPayment(false);
    }
  };

  const removePosPaymentType = async (id: string) => {
    try {
      const martId = auth?.martId;
      const token = auth?.token;
      if (!martId) {
        toast({ title: t("mart_not_found"), variant: "destructive" });
        return;
      }

      setDeletingPaymentTypeId(id);
      const res = await fetch(`${API_BASE}/api/payment-types/${id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: String(json?.message || "Failed to delete payment method"),
          variant: "destructive",
        });
        return;
      }

      setConfiguredPaymentTypes((prev) =>
        prev.filter((item) => item._id !== id),
      );
      toast({ title: "POS payment method removed" });
      try {
        window.dispatchEvent(
          new CustomEvent("mart-settings-updated", { detail: { martId } }),
        );
      } catch {
        // ignore
      }
    } catch (err) {
      console.error("removePosPaymentType error", err);
      toast({
        title: "Failed to delete payment method",
        variant: "destructive",
      });
    } finally {
      setDeletingPaymentTypeId(null);
    }
  };

  const saveBranding = () => {
    (async () => {
      try {
        const martId = auth?.martId;
        const token = auth?.token;
        if (!martId) return toast({ title: t("mart_not_found") });

        const payload = {
          martName: name.trim(),
          receiptHeader: slogan.trim(),
          receiptMessage: slogan.trim(),
          phone: phone.trim(),
          address: address.trim(),
        };

        const res = await fetch(`${API_BASE}/api/marts/${martId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return toast({
            title: err.message || "Failed to save branding",
            variant: "destructive",
          });
        }

        toast({ title: t("branding_saved") });
        try {
          window.dispatchEvent(
            new CustomEvent("mart-settings-updated", { detail: { martId } }),
          );
        } catch {
          // ignore
        }
      } catch (err) {
        console.error("saveBranding error", err);
        toast({ title: "Failed to save branding", variant: "destructive" });
      }
    })();
  };

  const savePayments = () => {
    (async () => {
      try {
        const martId = auth?.martId;
        const token = auth?.token;
        if (!martId) return toast({ title: t("mart_not_found") });
        const normalizedFields = normalizePaymentFields(customPaymentFields);
        const payload = {
          currency,
          paymentSystem,
          customPaymentFields: normalizedFields,
        };
        const res = await fetch(`${API_BASE}/api/marts/${martId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return toast({
            title: err.message || t("failed_save_payment_settings"),
          });
        }
        applyAccountFields(normalizedFields);
        toast({ title: t("payment_settings_saved") });
        try {
          // notify other windows/components that mart settings changed so they can refresh
          window.dispatchEvent(
            new CustomEvent("mart-settings-updated", { detail: { martId } }),
          );
        } catch (e) {
          // ignore
        }
      } catch (err) {
        console.error("savePayments error", err);
        toast({ title: t("failed_save_payment_settings") });
      }
    })();
  };

  const normalizePaymentFields = (fields: PaymentAccountField[]) => {
    const normalized = (fields || [])
      .map((f) => {
        const bankName = String(f.bankName || "").trim();
        const accountHolderName = String(f.accountHolderName || "").trim();
        const accountNumber = String(f.accountNumber || "").trim();
        const key = String(f.key || bankName || "")
          .trim()
          .toLowerCase();
        if (
          key === "other" ||
          key === "other_name" ||
          key === "other_bank_name" ||
          key === "other_account_holder" ||
          key === "other_account_number"
        ) {
          return null;
        }
        if (bankName || accountHolderName || accountNumber) {
          return {
            key: key || bankName.toLowerCase(),
            value: accountNumber,
            bankName,
            accountHolderName,
            accountNumber,
          };
        }
        return { key, value: String(f.value || "").trim() };
      })
      .filter((f): f is NonNullable<typeof f> => Boolean(f && f.key)) as PaymentAccountField[];

    return normalized;
  };

  const getOtherBankDraft = () => ({
    bankName: otherBankName.trim(),
    accountHolderName: otherAccountHolder.trim(),
    accountNumber: otherAccountNumber.trim(),
  });

  const validateOtherBankAccount = () => {
    const draft = getOtherBankDraft();
    const hasAll =
      draft.bankName && draft.accountHolderName && draft.accountNumber;
    if (hasAll) return true;
    toast({
      title: t("bank_account_fields_required", {
        defaultValue:
          "Bank name, account holder name, and account number are required.",
      }),
      variant: "destructive",
    });
    return false;
  };

  const onAccountChange = (key: string, value: string) => {
    const k = String(key || "")
      .trim()
      .toLowerCase();
    setPaymentAccounts((prev) => ({ ...prev, [k]: value }));
    setCustomPaymentFields((prev) => {
      const found = prev.find((p) => p.key === k);
      if (found) return prev.map((p) => (p.key === k ? { ...p, value } : p));
      return [...prev, { key: k, value }];
    });
  };

  // Persist the full list of saved accounts (key/value pairs) to the mart.
  const persistPaymentFields = async (
    fields: PaymentAccountField[],
    paymentSystemOverride?: string,
  ) => {
    try {
      const martId = auth?.martId;
      const token = auth?.token;
      if (!martId) {
        toast({ title: t("mart_not_found"), variant: "destructive" });
        return false;
      }
      const payload = {
        currency,
        paymentSystem:
          paymentSystemOverride !== undefined
            ? paymentSystemOverride
            : paymentSystem,
        customPaymentFields: normalizePaymentFields(fields),
      };
      const res = await fetch(`${API_BASE}/api/marts/${martId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast({
          title:
            err.message || t("failed_save_payment_settings"),
          variant: "destructive",
        });
        return false;
      }
      toast({ title: t("payment_settings_saved") });
      try {
        window.dispatchEvent(
          new CustomEvent("mart-settings-updated", { detail: { martId } }),
        );
      } catch {
        // ignore
      }
      return true;
    } catch (err) {
      console.error("persistPaymentFields error", err);
      toast({
        title: t("failed_save_payment_settings"),
        variant: "destructive",
      });
      return false;
    }
  };

  const applyAccountFields = (fields: PaymentAccountField[]) => {
    setCustomPaymentFields(fields);
    const obj = fields.reduce<Record<string, string>>(
      (acc, it) => ({ ...acc, [it.key]: it.accountNumber || it.value }),
      {},
    );
    setPaymentAccounts(obj);
  };

  const addOtherBankAccount = async () => {
    if (!validateOtherBankAccount()) return;

    const draft = getOtherBankDraft();
    const key = draft.bankName.toLowerCase();
    if (displayPaymentFields.some((f) => f.key === key)) {
      toast({
        title: t("account_key_exists", {
          defaultValue: "An account with this key already exists.",
        }),
        variant: "destructive",
      });
      return;
    }

    const nextFields: PaymentAccountField[] = [
      ...displayPaymentFields,
      {
        key,
        value: draft.accountNumber,
        bankName: draft.bankName,
        accountHolderName: draft.accountHolderName,
        accountNumber: draft.accountNumber,
      },
    ];

    setSavingAccount(true);
    const ok = await persistPaymentFields(nextFields, paymentSystem);
    if (ok) {
      applyAccountFields(normalizePaymentFields(nextFields));
      setOtherBankName("");
      setOtherAccountHolder("");
      setOtherAccountNumber("");
    }
    setSavingAccount(false);
  };

  const startEditAccount = (field: PaymentAccountField) => {
    setEditingAccount({
      key: field.key,
      value: field.value,
      bankName: field.bankName,
      accountHolderName: field.accountHolderName,
      accountNumber: field.accountNumber,
    });
    setEditAccountKey(field.key);
    setEditAccountValue(field.value);
  };

  const saveAccountEdit = async () => {
    if (!editingAccount) return;
    const newKey = String(editAccountKey || "")
      .trim()
      .toLowerCase();
    const newValue = String(editAccountValue || "").trim();
    if (!newKey) {
      toast({
        title: t("account_key_required", {
          defaultValue: "Account key is required.",
        }),
        variant: "destructive",
      });
      return;
    }
    if (!newValue) {
      toast({
        title: t("account_value_required", {
          defaultValue: "Account value is required.",
        }),
        variant: "destructive",
      });
      return;
    }

    const oldKey = editingAccount.key;
    let fields: PaymentAccountField[] = displayPaymentFields.map((f) => ({
      key: f.key,
      value: f.value,
      bankName: f.bankName,
      accountHolderName: f.accountHolderName,
      accountNumber: f.accountNumber,
    }));
    fields = fields.filter((p) => p.key !== oldKey);
    if (
      newKey !== oldKey &&
      fields.some((p) => p.key === newKey)
    ) {
      toast({
        title: t("account_key_exists", {
          defaultValue: "An account with this key already exists.",
        }),
        variant: "destructive",
      });
      return;
    }
    fields = [
      ...fields,
      editingAccount.bankName ||
      editingAccount.accountHolderName ||
      editingAccount.accountNumber
        ? {
            key: newKey,
            value: newValue,
            bankName: newKey,
            accountHolderName: editingAccount.accountHolderName,
            accountNumber: newValue,
          }
        : { key: newKey, value: newValue },
    ];

    setSavingAccount(true);
    const ok = await persistPaymentFields(
      fields,
      paymentSystem === oldKey ? newKey : paymentSystem,
    );
    if (ok) {
      applyAccountFields(fields);
      if (paymentSystem === oldKey) setPaymentSystem(newKey);
      setEditingAccount(null);
    }
    setSavingAccount(false);
  };

  const removeAccount = async (key: string) => {
    const fields = displayPaymentFields
      .filter((f) => f.key !== key)
      .map((f) => ({
        key: f.key,
        value: f.value,
        bankName: f.bankName,
        accountHolderName: f.accountHolderName,
        accountNumber: f.accountNumber,
      }));

    setSavingAccount(true);
    const ok = await persistPaymentFields(
      fields,
      paymentSystem === key ? "" : paymentSystem,
    );
    if (ok) {
      applyAccountFields(fields);
      if (paymentSystem === key) setPaymentSystem("");
      setPendingDeleteAccount(null);
    }
    setSavingAccount(false);
  };

  const saveTax = () => {
    (async () => {
      try {
        const martId = auth?.martId;
        const token = auth?.token;
        if (!martId) return toast({ title: t("mart_not_found") });
        const payload = { taxRate: Number(tax) };
        const res = await fetch(`${API_BASE}/api/marts/${martId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return toast({ title: err.message || t("failed_save_tax_settings") });
        }
        toast({ title: t("tax_settings_saved") });
      } catch (err) {
        console.error("saveTax error", err);
        toast({ title: t("failed_save_tax_settings") });
      }
    })();
  };

  const saveDiscountPolicy = () => {
    (async () => {
      try {
        const martId = auth?.martId;
        const token = auth?.token;
        if (!martId) return toast({ title: t("mart_not_found") });

        const payload = {
          globalDiscountType,
          globalDiscountRate: Number(globalDiscountRate || 0),
          enableDiscountByItems,
          enableDiscountByAmount,
          discountMinItems: Number(discountMinItems || 0),
          discountMinAmount: Number(discountMinAmount || 0),
        };

        const res = await fetch(`${API_BASE}/api/marts/${martId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return toast({
            title: err.message || "Failed to save discount settings",
            variant: "destructive",
          });
        }

        toast({ title: "Discount settings saved" });
        try {
          window.dispatchEvent(
            new CustomEvent("mart-settings-updated", { detail: { martId } }),
          );
        } catch {
          // ignore
        }
      } catch (err) {
        console.error("saveDiscountPolicy error", err);
        toast({
          title: "Failed to save discount settings",
          variant: "destructive",
        });
      }
    })();
  };

  return (
    <RoleLayout allowedRoles={["owner"]}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t("settings")}</h1>
          <p className="text-muted-foreground">
            {t("configure_owner_settings", { defaultValue: "Configure owner settings by section using tabs." })}
          </p>
        </div>

        <Tabs defaultValue="branding" className="w-full">
          <div className="w-full overflow-x-auto pb-1">
            <TabsList className="inline-flex min-w-max justify-start gap-2">
              <TabsTrigger value="branding" className="shrink-0">
                {t("branding")}
              </TabsTrigger>
              <TabsTrigger value="payments" className="shrink-0">
                {t("payments_and_currency")}
              </TabsTrigger>
              <TabsTrigger value="tax" className="shrink-0">
                {t("tax")}
              </TabsTrigger>
              <TabsTrigger value="discount" className="shrink-0">
                {t("discount", { defaultValue: "Discount" })}
              </TabsTrigger>
              <TabsTrigger value="printer" className="shrink-0">
                {t("printer", { defaultValue: "Printer" })}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Branding Section */}
          <TabsContent value="branding" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("branding")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-sm font-medium">
                      {t("supermarket_name")}
                    </p>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t("enter_name")}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium">{t("slogan")}</p>
                    <Input
                      value={slogan}
                      onChange={(e) => setSlogan(e.target.value)}
                      placeholder={t("enter_slogan")}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium">{t("phone")}</p>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("phone")}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium">{t("address", { defaultValue: "Address" })}</p>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t("enter_receipt_address", { defaultValue: "Enter receipt address" })}
                      className="mt-2"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button onClick={saveBranding}>{t("save_branding")}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments & Currency Section */}
          <TabsContent value="payments" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("payments_and_currency")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-sm font-medium">{t("currency")}</p>
                    <Select
                      value={currency}
                      onValueChange={(v) => setCurrency(v)}
                    >
                      <SelectTrigger className="mt-2 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ETB">ETB</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="Shilling">
                          {t("shilling")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm font-medium">{t("payment_system")}</p>
                    <Select
                      value={paymentSystem || ""}
                      onValueChange={(v) => setPaymentSystem(v)}
                    >
                      <SelectTrigger className="mt-2 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">{t("cash")}</SelectItem>
                        <SelectItem value="telebirr">
                          {t("telebirr")}
                        </SelectItem>
                        <SelectItem value="card">{t("card")}</SelectItem>
                        <SelectItem value="credit">{t("credit")}</SelectItem>
                        <SelectItem value="other">{t("other")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      {t("payment_account_identifier")}
                    </p>
                    {paymentSystem !== "other" ? (
                      <Input
                        value={
                          customPaymentFields.find(
                            (p) => p.key === paymentSystem,
                          )?.value || ""
                        }
                        onChange={(e) =>
                          onAccountChange(paymentSystem || "", e.target.value)
                        }
                        placeholder={
                          paymentSystem === "telebirr"
                            ? t("enter_telebirr_number")
                            : paymentSystem === "card"
                              ? t("enter_card_merchant_account")
                              : paymentSystem === "credit" ||
                                  paymentSystem === "wallet"
                                ? t("enter_credit_number")
                                : t("enter_account_identifier")
                        }
                        className="mt-2"
                      />
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        <Input
                          value={otherBankName}
                          onChange={(e) => setOtherBankName(e.target.value)}
                          placeholder={t("bank_name_example")}
                          className="mt-2"
                        />
                        <Input
                          value={otherAccountHolder}
                          onChange={(e) =>
                            setOtherAccountHolder(e.target.value)
                          }
                          placeholder={t("account_holder_name", {
                            defaultValue: "Account holder name",
                          })}
                          className="mt-2"
                        />
                        <Input
                          value={otherAccountNumber}
                          onChange={(e) =>
                            setOtherAccountNumber(e.target.value)
                          }
                          placeholder={t("account_identifier_number")}
                          className="mt-2"
                        />
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="icon"
                            onClick={() => void addOtherBankAccount()}
                            disabled={
                              savingAccount ||
                              !otherBankName.trim() ||
                              !otherAccountHolder.trim() ||
                              !otherAccountNumber.trim()
                            }
                            aria-label={t("add_bank_account", {
                              defaultValue: "Add bank account",
                            })}
                            title={t("add_bank_account", {
                              defaultValue: "Add bank account",
                            })}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Show quick list of saved accounts */}
                  {displayPaymentFields && displayPaymentFields.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">
                        {t("saved_accounts")}
                      </p>
                      <div className="mt-2 space-y-2">
                        {displayPaymentFields.map((f) =>
                          editingAccount?.key === f.key ? (
                            <div
                              key={f.key}
                              className="space-y-2 rounded-md border p-2"
                            >
                              <div className="grid grid-cols-1 gap-2">
                                <Input
                                  value={editAccountKey}
                                  onChange={(e) =>
                                    setEditAccountKey(e.target.value)
                                  }
                                  placeholder={t("account_key", {
                                    defaultValue: "Account key",
                                  })}
                                />
                                <Input
                                  value={editAccountValue}
                                  onChange={(e) =>
                                    setEditAccountValue(e.target.value)
                                  }
                                  placeholder={t("account_value", {
                                    defaultValue: "Account value",
                                  })}
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingAccount(null)}
                                >
                                  {t("cancel", { defaultValue: "Cancel" })}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => void saveAccountEdit()}
                                  disabled={savingAccount}
                                >
                                  {t("save", { defaultValue: "Save" })}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div
                              key={f.key}
                              className="flex items-center justify-between gap-2 rounded-md border p-2"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-medium">
                                  {f.bankName || f.key}
                                </div>
                                <div className="truncate text-sm text-muted-foreground">
                                  {f.accountHolderName
                                    ? `${f.accountHolderName} - ${
                                        f.accountNumber || f.value
                                      }`
                                    : f.accountNumber || f.value}
                                </div>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => startEditAccount(f)}
                                  disabled={savingAccount}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setPendingDeleteAccount({ key: f.key })
                                  }
                                  disabled={savingAccount}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button onClick={savePayments}>
                      {t("save_payment_settings")}
                    </Button>
                  </div>

                  <div className="border-t pt-6 space-y-5">
                    <div>
                      <h3 className="text-base font-semibold">
                        {t("pos_payment_methods", { defaultValue: "POS Payment Methods" })}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("pos_payment_methods_desc", {
                          defaultValue:
                            "Configure payment options available at checkout. Add custom methods, edit names/icons, or enable/disable them.",
                        })}
                      </p>
                    </div>

                    {/* Add Custom Payment Method */}
                    <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("add_payment_method", { defaultValue: "Add Payment Method" })}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-foreground">
                            {t("method_name", { defaultValue: "Method Name" })}
                          </label>
                          <Input
                            placeholder="e.g. Transfer, Telebirr, CBE Mobile"
                            value={customPaymentName}
                            onChange={(e) => setCustomPaymentName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void createPosPaymentType();
                              }
                            }}
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-foreground">
                            {t("icon", { defaultValue: "Icon" })}
                          </label>
                          <Select
                            value={selectedPosPaymentIcon}
                            onValueChange={setSelectedPosPaymentIcon}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {paymentIconOptions.map(({ value, label, Icon }) => (
                                <SelectItem key={value} value={value}>
                                  <span className="inline-flex items-center gap-2">
                                    <Icon className="h-4 w-4" />
                                    <span>{label}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-end gap-3">
                          <div className="flex items-center gap-2 pb-2">
                            <Switch
                              id="new-active"
                              checked={newPaymentActive}
                              onCheckedChange={setNewPaymentActive}
                            />
                            <label htmlFor="new-active" className="text-xs font-medium cursor-pointer">
                              {newPaymentActive ? t("active", { defaultValue: "Active" }) : t("inactive", { defaultValue: "Inactive" })}
                            </label>
                          </div>

                          <Button
                            className="flex-1 gap-1.5"
                            onClick={createPosPaymentType}
                            disabled={isSavingPosPaymentMethod || !customPaymentName.trim()}
                          >
                            <Plus className="h-4 w-4" />
                            {isSavingPosPaymentMethod ? t("saving", { defaultValue: "Saving..." }) : t("add", { defaultValue: "Add" })}
                          </Button>
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[11px] text-muted-foreground mr-1">
                          {t("quick_presets", { defaultValue: "Presets:" })}
                        </span>
                        {["Cash", "Card", "Transfer", "Credit", "Telebirr", "CBE Mobile"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              setCustomPaymentName(preset);
                              const lower = preset.toLowerCase().replace(/ /g, "_");
                              setSelectedPosPaymentIcon(defaultIconByPaymentMethod[lower] || defaultIconByPaymentMethod[preset.toLowerCase()] || "Wallet");
                            }}
                            className="text-xs px-2 py-0.5 rounded-full border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* List of Configured Payment Methods */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("active_payment_methods", { defaultValue: "Configured Payment Methods" })} ({configuredPaymentTypes.length})
                      </p>

                      {configuredPaymentTypes.length === 0 ? (
                        <div className="text-center py-6 border rounded-xl border-dashed text-muted-foreground text-sm">
                          {t("no_payment_methods_configured", { defaultValue: "No POS payment methods configured yet." })}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {configuredPaymentTypes
                            .slice()
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map((item) => {
                              const iconName =
                                String(item.icon || "").trim() ||
                                defaultIconByPaymentMethod[item.name] ||
                                "Wallet";
                              const IconComp =
                                paymentIconOptions.find((it) => it.value === iconName)?.Icon || Wallet;
                              const isActive = item.active !== false;

                              return (
                                <div
                                  key={item._id}
                                  className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                                    isActive
                                      ? "bg-card border-border shadow-sm"
                                      : "bg-muted/30 border-muted text-muted-foreground opacity-75"
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                        isActive
                                          ? "bg-primary/10 text-primary"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      <IconComp className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold capitalize truncate">
                                        {resolvePaymentMethodLabel(item.name, t)}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        {isActive ? (
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                          >
                                            {t("enabled", { defaultValue: "Enabled" })}
                                          </Badge>
                                        ) : (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] px-1.5 py-0 text-muted-foreground"
                                          >
                                            {t("disabled", { defaultValue: "Disabled" })}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    {/* Enable / Disable Switch */}
                                    <Switch
                                      checked={isActive}
                                      onCheckedChange={() =>
                                        item._id && togglePaymentTypeActive(item._id, isActive)
                                      }
                                      title={isActive ? "Disable this payment method" : "Enable this payment method"}
                                    />

                                    {/* Edit Button */}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                      onClick={() => startEditPaymentType(item)}
                                      title={t("edit", { defaultValue: "Edit" })}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>

                                    {/* Delete Button */}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                                      onClick={() =>
                                        setPendingDeletePaymentType({
                                          id: item._id || "",
                                          name: resolvePaymentMethodLabel(item.name, t),
                                        })
                                      }
                                      disabled={deletingPaymentTypeId === item._id}
                                      title={t("delete", { defaultValue: "Delete" })}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax Section */}
          <TabsContent value="tax" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("tax")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-sm font-medium">
                      {t("tax_setting_percent")}
                    </p>
                    <Input
                      type="number"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      placeholder={t("enter_tax_rate")}
                      className="mt-2 w-44"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button onClick={saveTax}>{t("save_tax")}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Global Discount Section */}
          <TabsContent value="discount" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("global_discount", { defaultValue: "Global Discount" })}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <p className="text-sm font-medium">{t("discount_type", { defaultValue: "Discount Type" })}</p>
                    <Select
                      value={globalDiscountType}
                      onValueChange={(v) =>
                        setGlobalDiscountType(v as "percentage" | "fixed")
                      }
                    >
                      <SelectTrigger className="mt-2 w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          {t("percentage", { defaultValue: "Percentage (%)" })}
                        </SelectItem>
                        <SelectItem value="fixed">{t("fixed_amount", { defaultValue: "Fixed Amount" })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      {globalDiscountType === "percentage"
                        ? t("discount_rate", { defaultValue: "Discount Rate (%)" })
                        : t("discount_value", { defaultValue: "Discount Value (ETB)" })}
                    </p>
                    <Input
                      type="number"
                      value={globalDiscountRate}
                      onChange={(e) => setGlobalDiscountRate(e.target.value)}
                      placeholder={
                        globalDiscountType === "percentage"
                          ? t("enter_discount_percentage", { defaultValue: "Enter discount percentage" })
                          : t("enter_fixed_discount_value", { defaultValue: "Enter fixed discount value" })
                      }
                      className="mt-2 w-44"
                    />
                  </div>

                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">
                        {t("apply_when_items_exceed", { defaultValue: "Apply when total items exceed X" })}
                      </p>
                      <Switch
                        checked={enableDiscountByItems}
                        onCheckedChange={(checked) =>
                          setEnableDiscountByItems(Boolean(checked))
                        }
                      />
                    </div>
                    {enableDiscountByItems && (
                      <Input
                        type="number"
                        value={discountMinItems}
                        onChange={(e) => setDiscountMinItems(e.target.value)}
                        placeholder={t("enter_item_threshold", { defaultValue: "Enter item threshold" })}
                        className="w-44"
                      />
                    )}
                  </div>

                  <div className="space-y-3 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">
                        {t("apply_when_subtotal_exceeds", { defaultValue: "Apply when subtotal exceeds X amount" })}
                      </p>
                      <Switch
                        checked={enableDiscountByAmount}
                        onCheckedChange={(checked) =>
                          setEnableDiscountByAmount(Boolean(checked))
                        }
                      />
                    </div>
                    {enableDiscountByAmount && (
                      <Input
                        type="number"
                        value={discountMinAmount}
                        onChange={(e) => setDiscountMinAmount(e.target.value)}
                        placeholder={t("enter_amount_threshold", { defaultValue: "Enter amount threshold" })}
                        className="w-44"
                      />
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {t("discount_auto_applied_desc", { defaultValue: "Discount is auto-applied when at least one enabled condition is met." })}
                  </p>

                  <div className="flex justify-end pt-2">
                    <Button onClick={saveDiscountPolicy}>{t("save_discount", { defaultValue: "Save Discount" })}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="printer" className="mt-4 space-y-4">
            <PrintNodeApiKeyCard />
            <PrinterSettingsCard
              role="owner"
              title={t("owner_printer", { defaultValue: "Owner Printer" })}
              description={t("owner_printer_desc", { defaultValue: "Configure printers for your shop. Set up PrintNode API key, assign printers to staff, and manage printer settings." })}
            />
          </TabsContent>
        </Tabs>

        <AlertDialog
          open={Boolean(pendingDeletePaymentType)}
          onOpenChange={(open) => !open && setPendingDeletePaymentType(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this payment method?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDeletePaymentType
                  ? `This will remove ${pendingDeletePaymentType.name} from POS payment options.`
                  : "This will remove the selected payment method from POS payment options."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (!pendingDeletePaymentType) return;
                  void removePosPaymentType(pendingDeletePaymentType.id);
                  setPendingDeletePaymentType(null);
                }}
              >
                Yes, delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={Boolean(pendingDeleteAccount)}
          onOpenChange={(open) => !open && setPendingDeleteAccount(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("delete_account_confirm", {
                  defaultValue: "Delete this saved account?",
                })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDeleteAccount
                  ? t("delete_account_confirm_desc", {
                      defaultValue:
                        "This will remove the account from saved accounts.",
                      accountKey: pendingDeleteAccount.key,
                    })
                  : t("delete_account_confirm_desc", {
                      defaultValue:
                        "This will remove the account from saved accounts.",
                    })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t("cancel", { defaultValue: "Cancel" })}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (!pendingDeleteAccount) return;
                  void removeAccount(pendingDeleteAccount.key);
                  setPendingDeleteAccount(null);
                }}
              >
                {t("delete", { defaultValue: "Delete" })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Edit Payment Method Dialog */}
        <Dialog
          open={Boolean(editingPaymentType)}
          onOpenChange={(open) => !open && setEditingPaymentType(null)}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {t("edit_payment_method", { defaultValue: "Edit Payment Method" })}
              </DialogTitle>
              <DialogDescription>
                {t("edit_payment_method_desc", {
                  defaultValue: "Update the method name, display icon, and active status.",
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("method_name", { defaultValue: "Method Name" })}
                </label>
                <Input
                  value={editPaymentName}
                  onChange={(e) => setEditPaymentName(e.target.value)}
                  placeholder="e.g. Transfer, Telebirr, CBE Mobile"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("icon", { defaultValue: "Icon" })}
                </label>
                <Select
                  value={editPaymentIcon}
                  onValueChange={setEditPaymentIcon}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentIconOptions.map(({ value, label, Icon }) => (
                      <SelectItem key={value} value={value}>
                        <span className="inline-flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span>{label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("active_status", { defaultValue: "Active Status" })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {editPaymentActive
                      ? t("active_in_pos", { defaultValue: "Visible in POS checkout" })
                      : t("hidden_in_pos", { defaultValue: "Hidden from POS checkout" })}
                  </p>
                </div>
                <Switch
                  checked={editPaymentActive}
                  onCheckedChange={setEditPaymentActive}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setEditingPaymentType(null)}
                disabled={isSavingEditPayment}
              >
                {t("cancel", { defaultValue: "Cancel" })}
              </Button>
              <Button
                onClick={saveEditPaymentType}
                disabled={isSavingEditPayment || !editPaymentName.trim()}
              >
                {isSavingEditPayment
                  ? t("saving", { defaultValue: "Saving..." })
                  : t("save_changes", { defaultValue: "Save Changes" })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleLayout>
  );
}

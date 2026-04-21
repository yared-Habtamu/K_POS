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
  Banknote,
  Building2,
  CircleDollarSign,
  CreditCard,
  Landmark,
  Smartphone,
  Trash2,
  Wallet,
} from "lucide-react";

type ConfiguredPaymentType = {
  _id: string;
  name: string;
  icon?: string;
};

const paymentMethodOptions = [
  { value: "cash", labelKey: "cash", fallback: "Cash" },
  { value: "card", labelKey: "card", fallback: "Card" },
  { value: "telebirr", labelKey: "telebirr", fallback: "Telebirr" },
  { value: "cbe_bank", labelKey: "cbe_bank", fallback: "CBE Bank" },
  { value: "credit", labelKey: "credit", fallback: "Credit" },
  { value: "other", labelKey: "other", fallback: "Other" },
];

const paymentIconOptions = [
  { value: "Banknote", label: "Banknote", Icon: Banknote },
  { value: "CreditCard", label: "Credit Card", Icon: CreditCard },
  { value: "Smartphone", label: "Smartphone", Icon: Smartphone },
  { value: "Building2", label: "Building", Icon: Building2 },
  { value: "Wallet", label: "Wallet", Icon: Wallet },
  { value: "Landmark", label: "Landmark", Icon: Landmark },
  { value: "CircleDollarSign", label: "Dollar Circle", Icon: CircleDollarSign },
];

const defaultIconByPaymentMethod: Record<string, string> = {
  cash: "Banknote",
  card: "CreditCard",
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
    { key: string; value: string }[]
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
  const [selectedPosPaymentMethod, setSelectedPosPaymentMethod] =
    useState("cash");
  const [selectedPosPaymentIcon, setSelectedPosPaymentIcon] = useState(
    defaultIconByPaymentMethod.cash,
  );
  const [isSavingPosPaymentMethod, setIsSavingPosPaymentMethod] =
    useState(false);
  const [deletingPaymentTypeId, setDeletingPaymentTypeId] = useState<
    string | null
  >(null);
  const [pendingDeletePaymentType, setPendingDeletePaymentType] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const { toast } = useToast();
  const auth = useAuthStore((s) => s.user);
  const API_BASE = import.meta.env.VITE_API_URL || "";

  // build a merged view of saved payment fields coming from either
  // `customPaymentFields` (array of {key,value,_id}) or legacy `paymentAccounts` (object)
  const displayPaymentFields = (() => {
    const map: Record<string, { key: string; value: string; _id?: string }> =
      {};
    // take from customPaymentFields first (these may contain _id)
    for (const f of customPaymentFields || []) {
      if (!f || !f.key) continue;
      map[f.key] = { key: f.key, value: f.value || "", _id: (f as any)._id };
    }
    // merge in any legacy paymentAccounts that aren't present yet
    for (const [k, v] of Object.entries(paymentAccounts || {})) {
      if (!k) continue;
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
          const arr = (json.customPaymentFields || []).map((it: any) => ({
            key: String(it.key || "")
              .trim()
              .toLowerCase(),
            value: it.value || "",
            _id: it._id,
          }));
          // only set if user didn't modify customPaymentFields yet
          setCustomPaymentFields((prev) => (prev && prev.length ? prev : arr));
          const obj = arr.reduce(
            (acc: any, it: any) => ({ ...acc, [it.key]: it.value }),
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

  useEffect(() => {
    let mounted = true;

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
        const list = (await res.json()) as ConfiguredPaymentType[];
        if (!mounted) return;

        const normalized = (Array.isArray(list) ? list : [])
          .filter((item) => item && item._id && item.name)
          .map((item) => ({
            _id: item._id,
            name: String(item.name || "")
              .trim()
              .toLowerCase(),
            icon:
              String(item.icon || "").trim() ||
              defaultIconByPaymentMethod[
                String(item.name || "")
                  .trim()
                  .toLowerCase()
              ] ||
              "Wallet",
          }));

        setConfiguredPaymentTypes(normalized);
      } catch (err) {
        console.error("Failed to load payment types", err);
      }
    };

    loadPaymentTypes();

    return () => {
      mounted = false;
    };
  }, [API_BASE, auth?.martId, auth?.token]);

  const upsertPosPaymentType = async () => {
    try {
      const martId = auth?.martId;
      const token = auth?.token;
      if (!martId) {
        toast({ title: t("mart_not_found"), variant: "destructive" });
        return;
      }

      setIsSavingPosPaymentMethod(true);
      const payload = {
        name: selectedPosPaymentMethod,
        icon: selectedPosPaymentIcon,
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

      const saved = {
        _id: String(json._id),
        name: String(json.name || selectedPosPaymentMethod)
          .trim()
          .toLowerCase(),
        icon:
          String(json.icon || "").trim() ||
          defaultIconByPaymentMethod[selectedPosPaymentMethod] ||
          "Wallet",
      };

      setConfiguredPaymentTypes((prev) => {
        const exists = prev.some((item) => item.name === saved.name);
        if (!exists) return [...prev, saved];
        return prev.map((item) => (item.name === saved.name ? saved : item));
      });

      toast({ title: "POS payment method saved" });
      try {
        window.dispatchEvent(
          new CustomEvent("mart-settings-updated", { detail: { martId } }),
        );
      } catch {
        // ignore
      }
    } catch (err) {
      console.error("upsertPosPaymentType error", err);
      toast({ title: "Failed to save payment method", variant: "destructive" });
    } finally {
      setIsSavingPosPaymentMethod(false);
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
        const normalizedFields = (customPaymentFields || []).map((f) => ({
          key: String(f.key || "")
            .trim()
            .toLowerCase(),
          value: f.value || "",
        }));
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

  // helpers for 'other' bank fields
  const setOtherBankName = (name: string) =>
    onAccountChange("other_name", name);
  const setOtherBankIdentifier = (id: string) => onAccountChange("other", id);

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
        {/* Branding Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("branding")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium">{t("supermarket_name")}</p>
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
                <p className="text-sm font-medium">Address</p>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter receipt address"
                  className="mt-2"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={saveBranding}>{t("save_branding")}</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments & Currency Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("payments_and_currency")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium">{t("currency")}</p>
                <Select value={currency} onValueChange={(v) => setCurrency(v)}>
                  <SelectTrigger className="mt-2 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETB">ETB</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="Shilling">{t("shilling")}</SelectItem>
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
                    <SelectItem value="telebirr">{t("telebirr")}</SelectItem>
                    <SelectItem value="cbe_bank">{t("cbe_bank")}</SelectItem>
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
                      customPaymentFields.find((p) => p.key === paymentSystem)
                        ?.value || ""
                    }
                    onChange={(e) =>
                      onAccountChange(paymentSystem || "", e.target.value)
                    }
                    placeholder={
                      paymentSystem === "telebirr"
                        ? t("enter_telebirr_number")
                        : paymentSystem === "cbe_bank"
                          ? t("enter_cbe_account_number")
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
                      value={
                        customPaymentFields.find((p) => p.key === "other_name")
                          ?.value || ""
                      }
                      onChange={(e) => setOtherBankName(e.target.value)}
                      placeholder={t("bank_name_example")}
                      className="mt-2"
                    />
                    <Input
                      value={
                        customPaymentFields.find((p) => p.key === "other")
                          ?.value || ""
                      }
                      onChange={(e) => setOtherBankIdentifier(e.target.value)}
                      placeholder={t("account_identifier_number")}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>

              {/* Show quick list of saved accounts */}
              {displayPaymentFields && displayPaymentFields.length > 0 && (
                <div>
                  <p className="text-sm font-medium">{t("saved_accounts")}</p>
                  <div className="mt-2 space-y-2">
                    {displayPaymentFields.map((f) => (
                      <div
                        key={f.key}
                        className="flex items-center justify-between gap-2"
                      >
                        <div className="text-sm">{f.key}</div>
                        <div className="text-sm text-muted-foreground">
                          {f.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={savePayments}>
                  {t("save_payment_settings")}
                </Button>
              </div>

              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-semibold">POS Payment Methods</p>
                <p className="text-xs text-muted-foreground">
                  Add the payment methods that should appear on the POS screen.
                  Only methods listed here will be shown to cashier and manager.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-sm font-medium">Method</p>
                    <Select
                      value={selectedPosPaymentMethod}
                      onValueChange={(value) => {
                        setSelectedPosPaymentMethod(value);
                        setSelectedPosPaymentIcon(
                          defaultIconByPaymentMethod[value] || "Wallet",
                        );
                      }}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(option.labelKey) || option.fallback}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <p className="text-sm font-medium">Icon</p>
                    <Select
                      value={selectedPosPaymentIcon}
                      onValueChange={setSelectedPosPaymentIcon}
                    >
                      <SelectTrigger className="mt-2">
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

                  <div className="flex items-end">
                    <Button
                      className="w-full"
                      onClick={upsertPosPaymentType}
                      disabled={isSavingPosPaymentMethod}
                    >
                      {isSavingPosPaymentMethod ? "Saving..." : "Add / Update"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {(configuredPaymentTypes || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No POS payment methods configured yet.
                    </p>
                  ) : (
                    configuredPaymentTypes
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((item) => {
                        const iconName =
                          String(item.icon || "").trim() ||
                          defaultIconByPaymentMethod[item.name] ||
                          "Wallet";
                        const IconComp =
                          paymentIconOptions.find((it) => it.value === iconName)
                            ?.Icon || Wallet;

                        return (
                          <div
                            key={item._id}
                            className="flex items-center justify-between rounded-md border p-2"
                          >
                            <div className="inline-flex items-center gap-2 text-sm">
                              <IconComp className="h-4 w-4" />
                              <span>
                                {resolvePaymentMethodLabel(item.name, t)}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPendingDeletePaymentType({
                                  id: item._id,
                                  name: resolvePaymentMethodLabel(item.name, t),
                                })
                              }
                              disabled={deletingPaymentTypeId === item._id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Section */}
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

        {/* Global Discount Section */}
        <Card>
          <CardHeader>
            <CardTitle>Global Discount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium">Discount Type</p>
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
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-sm font-medium">
                  {globalDiscountType === "percentage"
                    ? "Discount Rate (%)"
                    : "Discount Value (ETB)"}
                </p>
                <Input
                  type="number"
                  value={globalDiscountRate}
                  onChange={(e) => setGlobalDiscountRate(e.target.value)}
                  placeholder={
                    globalDiscountType === "percentage"
                      ? "Enter discount percentage"
                      : "Enter fixed discount value"
                  }
                  className="mt-2 w-44"
                />
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    Apply when total items exceed X
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
                    placeholder="Enter item threshold"
                    className="w-44"
                  />
                )}
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    Apply when subtotal exceeds X amount
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
                    placeholder="Enter amount threshold"
                    className="w-44"
                  />
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                Discount is auto-applied when at least one enabled condition is
                met.
              </p>

              <div className="flex justify-end pt-2">
                <Button onClick={saveDiscountPolicy}>Save Discount</Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
      </div>
    </RoleLayout>
  );
}

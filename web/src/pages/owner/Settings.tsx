import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";

export default function OwnerSettings() {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [slogan, setSlogan] = useState("");
  const [currency, setCurrency] = useState("ETB");
  const [paymentSystem, setPaymentSystem] = useState("");
  const [paymentAccounts, setPaymentAccounts] = useState<{
    [k: string]: string;
  }>({});
  const [customPaymentFields, setCustomPaymentFields] = useState<
    { key: string; value: string }[]
  >([]);
  const [tax, setTax] = useState("");
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
        setTax((prev) => (prev ? prev : String(json.taxRate || 15)));
      } catch (err) {
        console.error("Load settings error", err);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [auth?.martId, auth?.token, API_BASE]);

  const saveBranding = () => {
    toast({ title: "Branding saved" });
  };

  const savePayments = () => {
    (async () => {
      try {
        const martId = auth?.martId;
        const token = auth?.token;
        if (!martId) return toast({ title: "No martId" });
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
            title: err.message || "Failed to save payment settings",
          });
        }
        toast({ title: "Payment settings saved" });
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
        toast({ title: "Failed to save payment settings" });
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
        if (!martId) return toast({ title: "No martId" });
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
          return toast({ title: err.message || "Failed to save tax settings" });
        }
        toast({ title: "Tax settings saved" });
      } catch (err) {
        console.error("saveTax error", err);
        toast({ title: "Failed to save tax settings" });
      }
    })();
  };

  return (
    <RoleLayout allowedRoles={["owner"]}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Branding Section */}
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium">Supermarket Name</p>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter name"
                  className="mt-2"
                />
              </div>

              <div>
                <p className="text-sm font-medium">Logo</p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogo(e.target.files?.[0]?.name ?? null)}
                  className="mt-2"
                />
                {logo && <div className="mt-2 text-xs">Selected: {logo}</div>}
              </div>

              <div>
                <p className="text-sm font-medium">Slogan</p>
                <Input
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  placeholder="Enter slogan"
                  className="mt-2"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={saveBranding}>Save Branding</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments & Currency Section */}
        <Card>
          <CardHeader>
            <CardTitle>Payments & Currency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium">Currency</p>
                <Select value={currency} onValueChange={(v) => setCurrency(v)}>
                  <SelectTrigger className="mt-2 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETB">ETB</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="Shilling">Shilling</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-sm font-medium">Payment System</p>
                <Select
                  value={paymentSystem || ""}
                  onValueChange={(v) => setPaymentSystem(v)}
                >
                  <SelectTrigger className="mt-2 w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="telebirr">Telebirr</SelectItem>
                    <SelectItem value="cbe_bank">CBE Bank</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="wallet">Credit</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-sm font-medium">
                  Payment Account / Identifier
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
                        ? "Enter Telebirr number"
                        : paymentSystem === "cbe_bank"
                          ? "Enter CBE account number"
                          : paymentSystem === "card"
                            ? "Enter card/merchant account"
                            : paymentSystem === "wallet"
                              ? "Enter credit number"
                              : "Enter account identifier"
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
                      placeholder="Bank name (e.g. Abyssinia Bank)"
                      className="mt-2"
                    />
                    <Input
                      value={
                        customPaymentFields.find((p) => p.key === "other")
                          ?.value || ""
                      }
                      onChange={(e) => setOtherBankIdentifier(e.target.value)}
                      placeholder="Account identifier / number"
                      className="mt-2"
                    />
                  </div>
                )}
              </div>

              {/* Show quick list of saved accounts */}
              {displayPaymentFields && displayPaymentFields.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Saved Accounts</p>
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
                <Button onClick={savePayments}>Save Payment Settings</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Section */}
        <Card>
          <CardHeader>
            <CardTitle>Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium">Tax Setting (%)</p>
                <Input
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  placeholder="Enter tax rate"
                  className="mt-2 w-44"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={saveTax}>Save Tax</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}

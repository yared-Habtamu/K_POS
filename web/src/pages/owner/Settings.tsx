import { useState, useEffect } from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";

export default function OwnerSettings() {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [slogan, setSlogan] = useState("");
  const [currency, setCurrency] = useState("");
  const [paymentSystem, setPaymentSystem] = useState("");
  const [paymentAccounts, setPaymentAccounts] = useState<{
    [k: string]: string;
  }>({});
  const [tax, setTax] = useState("");
  const { toast } = useToast();
  const auth = useAuthStore((s) => s.user);
  const API_BASE = import.meta.env.VITE_API_URL || "";

  // load existing mart settings
  useEffect(() => {
    (async () => {
      try {
        const martId = auth?.martId;
        const token = auth?.token;
        if (!martId) return;
        const res = await fetch(`${API_BASE}/api/marts/${martId}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) return;
        const json = await res.json();
        setCurrency(json.currency || "");
        setPaymentSystem(json.paymentSystem || "");
        setPaymentAccounts(
          json.paymentAccounts
            ? Object.fromEntries(Object.entries(json.paymentAccounts))
            : {}
        );
      } catch (err) {
        console.error("Load settings error", err);
      }
    })();
  }, []);

  const saveBranding = () => {
    toast({ title: "Branding saved" });
  };

  const savePayments = () => {
    (async () => {
      try {
        const martId = auth?.martId;
        const token = auth?.token;
        if (!martId) return toast({ title: "No martId" });
        const payload = { currency, paymentSystem, paymentAccounts };
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
      } catch (err) {
        console.error("savePayments error", err);
        toast({ title: "Failed to save payment settings" });
      }
    })();
  };

  const onAccountChange = (key: string, value: string) => {
    setPaymentAccounts((prev) => ({ ...prev, [key]: value }));
  };

  const saveTax = () => {
    toast({ title: "Tax settings saved" });
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
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="ETB, USD, etc."
                  className="mt-2"
                />
              </div>

              <div>
                <p className="text-sm font-medium">Payment System</p>
                <Input
                  value={paymentSystem}
                  onChange={(e) => setPaymentSystem(e.target.value)}
                  placeholder="e.g. CBE, Telebirr, Amole"
                  className="mt-2"
                />
              </div>

              <div>
                <p className="text-sm font-medium">Telebirr Account</p>
                <Input
                  value={paymentAccounts.telebirr || ""}
                  onChange={(e) => onAccountChange("telebirr", e.target.value)}
                  placeholder="Enter Telebirr number"
                  className="mt-2"
                />
              </div>

              <div>
                <p className="text-sm font-medium">CBE Bank Account</p>
                <Input
                  value={paymentAccounts.cbe_bank || ""}
                  onChange={(e) => onAccountChange("cbe_bank", e.target.value)}
                  placeholder="Enter CBE account number"
                  className="mt-2"
                />
              </div>

              <div>
                <p className="text-sm font-medium">
                  Amole / Other Mobile Wallet
                </p>
                <Input
                  value={paymentAccounts.amole || ""}
                  onChange={(e) => onAccountChange("amole", e.target.value)}
                  placeholder="Enter Amole / wallet number"
                  className="mt-2"
                />
              </div>

              <div>
                <p className="text-sm font-medium">
                  Bank Account (Card payments)
                </p>
                <Input
                  value={paymentAccounts.bank || ""}
                  onChange={(e) => onAccountChange("bank", e.target.value)}
                  placeholder="Enter bank account / routing"
                  className="mt-2"
                />
              </div>

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

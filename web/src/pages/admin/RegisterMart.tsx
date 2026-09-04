import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { AutoComplete } from "@/components/ui/AutoComplete";
import { getImageUrl } from "@/utils/imageUrl";
import { ArrowLeft, Boxes, Check, Minus, Plus, Printer, QrCode, Sparkles, Loader2, Package } from "lucide-react";

type SubscriptionPackage = {
  months: number;
  name: string;
  price: number;
  defaultPrice: number;
  discountLabel?: string;
  features: string[];
};

type HardwareProduct = {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  active: boolean;
  imageUrl?: string;
};

const DEFAULT_PACKAGES: SubscriptionPackage[] = [
  {
    months: 0,
    name: "Free Trial",
    price: 0,
    defaultPrice: 0,
    discountLabel: "7 Days Free",
    features: ["7 days full access", "Try all Kiya POS features", "No payment required"],
  },
  {
    months: 1,
    name: "1 Month",
    price: 1000,
    defaultPrice: 1000,
    discountLabel: "",
    features: ["30 days full access", "Unlimited POS sales", "Inventory & Barcode scanning"],
  },
  {
    months: 3,
    name: "3 Months",
    price: 2700,
    defaultPrice: 3000,
    discountLabel: "Save 10%",
    features: ["90 days full access", "~900 ETB / month", "Unlimited POS sales"],
  },
  {
    months: 6,
    name: "6 Months",
    price: 5000,
    defaultPrice: 6000,
    discountLabel: "Save 16%",
    features: ["180 days full access", "~833 ETB / month", "Most Popular choice"],
  },
  {
    months: 12,
    name: "12 Months",
    price: 9000,
    defaultPrice: 12000,
    discountLabel: "Save 25%",
    features: ["365 days full access", "~750 ETB / month", "Best Value annual plan"],
  },
];

type CountryOption = { id: string; label: string };

const COUNTRY_KEY = "pos_admin_country_options_v1";
const BLOCKED_COUNTRIES = new Set([
  "united states",
  "united states of america",
  "usa",
  "u.s.a",
  "us",
  "u.s",
  "united kingdom",
  "uk",
  "u.k",
  "great britain",
]);

const normalizeCountryValue = (value: string) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const isBlockedCountry = (value: string) =>
  BLOCKED_COUNTRIES.has(normalizeCountryValue(value).toLowerCase());

function loadSavedCountries(): CountryOption[] {
  try {
    const raw = localStorage.getItem(COUNTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CountryOption[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        id: String(item?.id || item?.label || "").trim(),
        label: normalizeCountryValue(String(item?.label || "")),
      }))
      .filter((item) => item.id && item.label && !isBlockedCountry(item.label));
  } catch {
    return [];
  }
}

function saveCountries(options: CountryOption[]) {
  try {
    localStorage.setItem(COUNTRY_KEY, JSON.stringify(options));
  } catch {
    // ignore storage errors
  }
}

function dedupeCountryOptions(options: CountryOption[]) {
  const seen = new Set<string>();
  const merged: CountryOption[] = [];
  for (const option of options) {
    const normalized = normalizeCountryValue(option.label);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key) || isBlockedCountry(normalized)) continue;
    seen.add(key);
    merged.push({ id: option.id || key, label: normalized });
  }
  return merged;
}

export default function RegisterMart() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.user?.token);
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const [selectedPackage, setSelectedPackage] = React.useState<SubscriptionPackage>(DEFAULT_PACKAGES[0]);
  
  // Hardware products state
  const [hardwareProducts, setHardwareProducts] = React.useState<HardwareProduct[]>([]);
  const [loadingHardware, setLoadingHardware] = React.useState(true);
  const [hardwareCounts, setHardwareCounts] = React.useState<Record<string, number>>({});
  const [name, setName] = React.useState("");
  const [owner, setOwner] = React.useState("");
  const [ownerEmail, setOwnerEmail] = React.useState("");
  const [country, setCountry] = React.useState("Ethiopia");
  const [region, setRegion] = React.useState("");
  const [city, setCity] = React.useState("Addis Ababa");
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [countryOptions, setCountryOptions] = React.useState<CountryOption[]>(
    () =>
      dedupeCountryOptions([
        { id: "ethiopia", label: "Ethiopia" },
        { id: "kenya", label: "Kenya" },
        { id: "uganda", label: "Uganda" },
        { id: "tanzania", label: "Tanzania" },
        { id: "rwanda", label: "Rwanda" },
        ...loadSavedCountries(),
      ]),
  );

  React.useEffect(() => {
    let mounted = true;

    const loadCountriesFromMarts = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/api/marts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const marts = await res.json().catch(() => []);
        if (!mounted || !Array.isArray(marts)) return;

        const fromMarts: CountryOption[] = marts
          .map((mart: any) => {
            const label = normalizeCountryValue(String(mart?.country || ""));
            if (!label) return null;
            return { id: label.toLowerCase().replace(/\s+/g, "_"), label };
          })
          .filter(Boolean) as CountryOption[];

        setCountryOptions((current) => {
          const merged = dedupeCountryOptions([...current, ...fromMarts]);
          saveCountries(merged);
          return merged;
        });
      } catch {
        // ignore network errors and keep local options
      }
    };

    void loadCountriesFromMarts();

    return () => {
      mounted = false;
    };
  }, [API_BASE, token]);

  // Fetch hardware products
  React.useEffect(() => {
    const loadHardwareProducts = async () => {
      try {
        setLoadingHardware(true);
        const res = await fetch(`${API_BASE}/api/subscriptions/hardware-products`);
        if (res.ok) {
          const data = await res.json();
          const products = Array.isArray(data) ? data : [];
          // Only show active products
          const activeProducts = products.filter((p: HardwareProduct) => p.active);
          setHardwareProducts(activeProducts);
          
          // Initialize counts to 0
          const initialCounts: Record<string, number> = {};
          activeProducts.forEach((p: HardwareProduct) => {
            initialCounts[p.id] = 0;
          });
          setHardwareCounts(initialCounts);
        }
      } catch (error) {
        console.error("Failed to load hardware products:", error);
        toast({
          title: "Warning",
          description: "Could not load hardware products. Using defaults.",
          variant: "destructive",
        });
      } finally {
        setLoadingHardware(false);
      }
    };

    loadHardwareProducts();
  }, [API_BASE]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !name.trim() ||
      !owner.trim() ||
      !username.trim() ||
      !password ||
      !confirmPassword
    ) {
      toast({ title: "Mart, owner, username and password are required" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please login again as system admin.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/marts/admin-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          martName: name.trim(),
          ownerName: owner.trim(),
          ownerUsername: username.trim(),
          ownerPassword: password,
          ownerConfirmPassword: confirmPassword,
          ownerPhone: phone.trim() || undefined,
          phone: phone.trim() || undefined,
          email: ownerEmail.trim() || undefined,
          country: country.trim() || undefined,
          region: region.trim() || undefined,
          city: city.trim() || undefined,
          address: address.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to register mart");
      }

      const martId = data?.mart?.id || data?.mart?._id;
      toast({
        title: "Mart registered",
        description:
          "The mart was created directly in the database and approved. Proceeding to checkout for subscription payment.",
      });

      // Calculate hardware details for checkout
      const hardwareDetails = hardwareProducts
        .filter(product => hardwareCounts[product.id] > 0)
        .map(product => ({
          id: product.id,
          name: product.name,
          count: hardwareCounts[product.id],
          unitPrice: product.unitPrice,
        }));

      // Navigate to checkout with the selected subscription & hardware state
      navigate("/checkout", {
        state: {
          martId,
          martName: name.trim(),
          ownerPhone: phone.trim(),
          packageName: selectedPackage.name,
          packageMonths: selectedPackage.months,
          packagePrice: selectedPackage.price,
          hardwareDetails,
        },
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Registration failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleLayout allowedRoles={["system_admin"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> {t("back") || "Back"}
          </Button>
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t("register_new_mart")}</h1>
          <p className="text-muted-foreground">{t("register_mart_subtitle")}</p>
        </div>

        {/* Subscription & Hardware Selection */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> {t("select_package")} &amp; {t("hardware_addons_optional")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">1. {t("license_package")}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {DEFAULT_PACKAGES.map((pkg) => {
                  const isSelected = selectedPackage.months === pkg.months;
                  const isPopular = pkg.months === 6;
                  const isBestValue = pkg.months === 12;
                  const isFree = pkg.months === 0;

                  return (
                    <div
                      key={pkg.months}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-sm"
                          : "border-border bg-card hover:border-border/80"
                      }`}
                    >
                      {isBestValue && (
                        <span className="absolute -top-2.5 right-2 bg-primary text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {t("best_value")}
                        </span>
                      )}
                      {isPopular && !isBestValue && (
                        <span className="absolute -top-2.5 right-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {t("most_popular")}
                        </span>
                      )}
                      {isFree && (
                        <span className="absolute -top-2.5 right-2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                          {t("seven_days_free")}
                        </span>
                      )}

                      <div>
                        <p className="font-bold text-sm text-foreground pt-1">{pkg.name}</p>
                        <p className="text-xl font-extrabold text-primary my-1">
                          {pkg.price === 0 ? (t("free") || "Free") : `${pkg.price.toLocaleString()} `}
                          {pkg.price > 0 && <span className="text-[10px] font-normal text-muted-foreground">ETB</span>}
                        </p>
                        <ul className="space-y-1 text-[11px] text-muted-foreground mt-2">
                          {pkg.features.map((feat, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-primary shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {isSelected && (
                        <p className="mt-3 flex items-center text-xs font-bold text-primary gap-1 pt-2 border-t border-primary/20">
                          <Check className="w-3.5 h-3.5" /> {t("selected")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border/60">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Boxes className="w-4 h-4 text-primary" /> 2. {t("hardware_addons_optional")}
              </Label>
              {loadingHardware ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading hardware products...
                </div>
              ) : hardwareProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hardware products available at this time.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hardwareProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-2">
                        {product.imageUrl ? (
                          <img 
                            src={getImageUrl(product.imageUrl)} 
                            alt={product.name} 
                            className="w-9 h-9 rounded-lg object-cover border border-border"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            {product.id.includes('scanner') ? <QrCode className="w-4 h-4" /> :
                             product.id.includes('printer') ? <Printer className="w-4 h-4" /> :
                             <Package className="w-4 h-4" />}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-sm">{product.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {product.unitPrice.toLocaleString()} Birr / unit
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => setHardwareCounts(prev => ({
                            ...prev,
                            [product.id]: Math.max(0, (prev[product.id] || 0) - 1)
                          }))}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-xs font-bold w-4 text-center">
                          {hardwareCounts[product.id] || 0}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => setHardwareCounts(prev => ({
                            ...prev,
                            [product.id]: (prev[product.id] || 0) + 1
                          }))}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("total_order_summary")}</p>
                <p className="text-xl font-extrabold text-primary">
                  {(() => {
                    const hardwareTotal = hardwareProducts.reduce((sum, product) => 
                      sum + (hardwareCounts[product.id] || 0) * product.unitPrice, 0
                    );
                    const total = selectedPackage.price + hardwareTotal;
                    return total === 0 ? (t("free") || "Free") : `${total.toLocaleString()} ETB`;
                  })()}
                </p>
              </div>
              <Badge variant="outline" className="bg-card">
                {selectedPackage.name}
                {hardwareProducts.map(product => {
                  const count = hardwareCounts[product.id] || 0;
                  return count > 0 ? ` + ${count} ${product.name}` : '';
                }).join('')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("register_new_mart")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl"
            >
              <div>
                <Label>{t("mart_name")}</Label>
                <Input
                  placeholder="e.g. Kebele Supermarket"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>{t("owner_name")}</Label>
                <Input
                  placeholder="Full name"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>{t("email")}</Label>
                <Input
                  placeholder="owner@company.com"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                />
              </div>
              <div>
                <AutoComplete<CountryOption>
                  id="mart-country-autocomplete"
                  label={t("country")}
                  placeholder="Select or add country"
                  items={countryOptions}
                  value={country}
                  onValueChange={setCountry}
                  getItemLabel={(item) => item.label}
                  getItemValue={(item) => item.id}
                  onSelect={(item) => setCountry(item.label)}
                  allowCreate
                  onCreateOption={async (query) => {
                    const label = normalizeCountryValue(query);
                    if (!label) return null;
                    if (isBlockedCountry(label)) return null;
                    const option = {
                      id: label.toLowerCase().replace(/\s+/g, "_"),
                      label,
                    };

                    setCountryOptions((current) => {
                      const merged = dedupeCountryOptions([...current, option]);
                      saveCountries(merged);
                      return merged;
                    });

                    setCountry(label);
                    return option;
                  }}
                  createOptionLabel={(q) => `Add "${q}"`}
                />
              </div>
              <div>
                <Label>{t("region")}</Label>
                <Input
                  placeholder="Select region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("city")}</Label>
                <Input
                  placeholder="Addis Ababa"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label>{t("address")}</Label>
                <Input
                  placeholder="Street, area"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div>
                <Label>{t("phone")}</Label>
                <Input
                  placeholder="+251 9xx xxx xxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("admin_username")}</Label>
                <Input
                  placeholder="choose-a-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <Label>{t("password")}</Label>
                <Input
                  placeholder="Choose a secure password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <Label>{t("confirm_password")}</Label>
                <Input
                  placeholder="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? t("registering") : t("register_mart_checkout")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setName("");
                    setOwner("");
                    setOwnerEmail("");
                    setCountry("Ethiopia");
                    setRegion("");
                    setCity("Addis Ababa");
                    setAddress("");
                    setPhone("");
                    setUsername("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                >
                  {t("reset")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}

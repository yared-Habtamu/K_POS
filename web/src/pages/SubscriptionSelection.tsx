import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getImageUrl } from "@/utils/imageUrl";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  Loader2,
  Minus,
  Plus,
  Printer,
  QrCode,
  Sparkles,
  Store,
  ShieldCheck,
  Zap,
  Package as PackageIcon,
} from "lucide-react";

type SubscriptionPackage = {
  months: number;
  name: string;
  durationDays: number;
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
    durationDays: 7,
    price: 0,
    defaultPrice: 0,
    discountLabel: "7 Days Free",
    features: [
      "7 days full access",
      "Try all Kiya POS features",
      "No payment required",
      "Single supermarket setup",
      "Basic sales & receipts",
    ],
  },
  {
    months: 1,
    name: "1 Month",
    durationDays: 30,
    price: 1000,
    defaultPrice: 1000,
    discountLabel: "",
    features: [
      "30 days full access",
      "Unlimited POS sales & checkouts",
      "Inventory & barcode scanning",
      "Realtime sales reports",
      "Cloud backups & security",
    ],
  },
  {
    months: 3,
    name: "3 Months",
    durationDays: 90,
    price: 2700,
    defaultPrice: 3000,
    discountLabel: "Save 10%",
    features: [
      "90 days full access",
      "~900 ETB / month",
      "Unlimited POS sales & checkouts",
      "Inventory & barcode management",
      "Multi-user role access",
    ],
  },
  {
    months: 6,
    name: "6 Months",
    durationDays: 180,
    price: 5000,
    defaultPrice: 6000,
    discountLabel: "Save 16%",
    features: [
      "180 days full access",
      "~833 ETB / month",
      "Unlimited POS sales & checkouts",
      "Inventory & barcode management",
      "Realtime reports & cloud backup",
    ],
  },
  {
    months: 12,
    name: "12 Months",
    durationDays: 365,
    price: 9000,
    defaultPrice: 12000,
    discountLabel: "Save 25%",
    features: [
      "365 days full access",
      "~750 ETB / month",
      "Best Value annual plan",
      "Unlimited POS sales & checkouts",
      "Priority customer support",
    ],
  },
];

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function SubscriptionSelection() {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage>(DEFAULT_PACKAGES[1]); // Default to 1 Month
  const [hardwareProducts, setHardwareProducts] = useState<HardwareProduct[]>([]);
  const [hardwareLoading, setHardwareLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Fetch active hardware products from the backend
  useEffect(() => {
    let mounted = true;
    const fetchHardware = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/subscriptions/hardware-products`);
        if (res.ok) {
          const data = await res.json();
          if (mounted && Array.isArray(data)) {
            // Strictly filter to keep ONLY active hardware products
            const active = data.filter((h: HardwareProduct) => h.active !== false);
            setHardwareProducts(active);
          }
        }
      } catch (err) {
        console.error("Failed to load hardware products", err);
      } finally {
        if (mounted) setHardwareLoading(false);
      }
    };
    fetchHardware();
    return () => {
      mounted = false;
    };
  }, []);

  const activeHardware = hardwareProducts.filter((h) => h.active !== false);

  const handleProceedToRegistration = () => {
    const hardwareDetails = activeHardware
      .filter((h) => (counts[h.id] || 0) > 0)
      .map((h) => ({
        id: h.id,
        name: h.name,
        count: counts[h.id] || 0,
        unitPrice: h.unitPrice,
      }));

    navigate("/owner/register", {
      state: {
        packageName: selectedPackage.name,
        packageMonths: selectedPackage.months,
        packagePrice: selectedPackage.price,
        hardwareDetails,
      },
    });
  };

  const hardwareTotal = activeHardware.reduce(
    (sum, h) => sum + (counts[h.id] || 0) * h.unitPrice,
    0,
  );
  const grandTotal = selectedPackage.price + hardwareTotal;

  const renderIcon = (id: string) => {
    if (id.includes("scanner")) return <QrCode className="w-5 h-5" />;
    if (id.includes("printer")) return <Printer className="w-5 h-5" />;
    return <PackageIcon className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar — Logo & Kiya POS System on the LEFT */}
      <div className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Store className="w-4.5 h-4.5" />
            </div>
            <span className="font-bold text-base tracking-tight text-foreground">Kiya POS System</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl py-8 px-4 space-y-8">
        {/* Back Button on the LEFT under the header */}
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>
        </div>
        {/* Header Title Section */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 font-semibold text-xs">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Smart Cart &amp; POS ERP Solutions
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Select License Package &amp; Hardware</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Choose the right subscription plan and optional hardware add-ons (Scanners &amp; Printers) for your supermarket.
          </p>
        </div>

        {/* 1. Package Selection Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Zap className="w-5 h-5 text-primary" /> 1. Select License Package
            </h2>
            <span className="text-xs text-muted-foreground font-medium">Click to choose your preferred plan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {DEFAULT_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage.months === pkg.months;
              const isPopular = pkg.months === 6;
              const isBestValue = pkg.months === 12;
              const isFree = pkg.months === 0;

              return (
                <div
                  key={pkg.months}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`relative rounded-2xl border p-5 cursor-pointer flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:-translate-y-1 ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30 shadow-md shadow-primary/10"
                      : isBestValue
                      ? "border-primary/40 bg-card hover:border-primary/80"
                      : isPopular
                      ? "border-blue-500/40 bg-card hover:border-blue-500/80"
                      : "border-border bg-card hover:border-border/80"
                  }`}
                >
                  {isBestValue && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                      Best Value
                    </span>
                  )}
                  {isPopular && !isBestValue && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                      Most Popular
                    </span>
                  )}
                  {isFree && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-sm">
                      7 Days Free
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between pt-1">
                      <h3 className="font-bold text-base text-foreground">{pkg.name}</h3>
                      {pkg.discountLabel && !isFree && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold text-primary bg-primary/10">
                          {pkg.discountLabel}
                        </Badge>
                      )}
                    </div>

                    <div className="my-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
                          {pkg.price === 0 ? "Free" : pkg.price.toLocaleString()}
                        </span>
                        {pkg.price > 0 && <span className="text-xs font-bold text-muted-foreground">ETB</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {pkg.months > 0
                          ? `~${Math.round(pkg.price / pkg.months).toLocaleString()} ETB / month`
                          : "No payment required"}
                      </p>
                    </div>

                    <ul className="space-y-2 text-xs text-muted-foreground mb-6">
                      {pkg.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isSelected ? "text-primary font-bold" : "text-primary/70"}`} />
                          <span className={isSelected ? "text-foreground font-medium" : ""}>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPackage(pkg);
                    }}
                    className={`w-full font-bold text-xs h-9 ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "variant-outline border-border hover:bg-primary/10 hover:text-primary"
                    }`}
                    variant={isSelected ? "default" : "outline"}
                  >
                    {isSelected ? "Selected" : "Choose Plan"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Hardware Add-ons Section */}
        <div className="space-y-5 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Boxes className="w-5 h-5 text-primary" /> 2. Sold Hardware Add-ons (Optional)
            </h2>
            <span className="text-xs text-muted-foreground font-medium">Select quantity of POS equipment to purchase</span>
          </div>

          {hardwareLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" /> Loading hardware catalog...
            </div>
          ) : activeHardware.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hardware add-ons are currently listed.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeHardware.map((hw) => {
                const count = counts[hw.id] || 0;
                const isSelected = count > 0;

                return (
                  <Card
                    key={hw.id}
                    className={`border transition-all duration-200 shadow-sm ${
                      isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card"
                    }`}
                  >
                    <CardContent className="p-5 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        {hw.imageUrl ? (
                          <img src={getImageUrl(hw.imageUrl)} alt={hw.name} className="w-12 h-12 rounded-xl object-cover border border-border shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                            {renderIcon(hw.id)}
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="font-bold text-base text-foreground">{hw.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{hw.description}</p>
                          <p className="text-xs font-semibold text-primary pt-1">
                            Unit Price: <span className="font-extrabold">{hw.unitPrice.toLocaleString()} Birr</span>
                          </p>
                        </div>
                      </div>

                      {/* Counter Controls */}
                      <div className="flex items-center gap-2 bg-muted/80 p-1.5 rounded-xl shrink-0 border border-border">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-card"
                          onClick={() => setCounts((prev) => ({ ...prev, [hw.id]: Math.max(0, (prev[hw.id] || 0) - 1) }))}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="font-black text-sm w-5 text-center text-foreground">{count}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-card"
                          onClick={() => setCounts((prev) => ({ ...prev, [hw.id]: (prev[hw.id] || 0) + 1 }))}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Order Summary & Action Bar */}
        <div className="bg-card border border-primary/20 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-lg bg-gradient-to-r from-card via-card to-primary/5">
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Order Summary</p>
            <div className="flex items-baseline gap-2 justify-center sm:justify-start">
              <span className="text-3xl font-black text-primary">
                {grandTotal === 0 ? "Free" : grandTotal.toLocaleString()}
              </span>
              {grandTotal > 0 && <span className="text-sm font-bold text-muted-foreground">ETB</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedPackage.name} License Package ({selectedPackage.price > 0 ? `${selectedPackage.price.toLocaleString()} ETB` : "Free Trial"})
              {activeHardware
                .filter((h) => (counts[h.id] || 0) > 0)
                .map((h) => ` + ${counts[h.id]} ${h.name} (${((counts[h.id] || 0) * h.unitPrice).toLocaleString()} ETB)`)
                .join("")}
            </p>
          </div>

          <Button size="lg" onClick={handleProceedToRegistration} className="font-bold px-8 h-12 text-base gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md w-full sm:w-auto">
            Register Your Mart &amp; Proceed <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}


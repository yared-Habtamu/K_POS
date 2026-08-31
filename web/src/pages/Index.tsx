import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import {
  Store,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Shield,
  Wifi,
  Globe,
  ArrowRight,
  UserPlus,
  Building2,
  Sparkles,
  Scissors,
} from "lucide-react";

const features = [
  { icon: ShoppingCart, title: "POS System", description: "Fast checkout with barcode scanning" },
  { icon: Package, title: "Inventory", description: "Real-time stock management" },
  { icon: Users, title: "Multi-Role", description: "5 user roles with permissions" },
  { icon: BarChart3, title: "Reports", description: "Sales and financial analytics" },
  { icon: Wifi, title: "Offline Mode", description: "Works without internet" },
  { icon: Globe, title: "Bilingual", description: "English & Amharic support" },
];

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.resolvedLanguage?.startsWith("am") ?? i18n.language.startsWith("am");

  const [comingSoonSector, setComingSoonSector] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      const routes: Record<string, string> = {
        system_admin: "/admin",
        owner: "/owner",
        manager: "/manager",
        cashier: "/cashier",
        store_keeper: "/store-keeper",
      };
      navigate(routes[user.role] || "/login");
    }
  }, [isAuthenticated, user, navigate]);

  const handleGetStarted = () => {
    if (isAuthenticated && user) {
      const routes: Record<string, string> = {
        system_admin: "/admin",
        owner: "/owner",
        manager: "/manager",
        cashier: "/cashier",
        store_keeper: "/store-keeper",
      };
      navigate(routes[user.role]);
    } else {
      navigate("/login");
    }
  };

  const handleSectorClick = (sector: string) => {
    if (sector === "smart_cart") {
      navigate("/subscription-selection");
    } else {
      setComingSoonSector(sector);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section (Original UI Preserved) */}
      <div className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 py-12 md:py-20">
          <div className="flex justify-end mb-6">
            <Button variant="outline" size="sm" onClick={() => i18n.changeLanguage(isAmharic ? "en" : "am")}>
              {isAmharic ? "🇺🇸 English" : "🇪🇹 አማርኛ"}
            </Button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
              className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-3xl gradient-primary flex items-center justify-center shadow-glow mb-6"
            >
              <Store className="w-10 h-10 md:w-12 md:h-12 text-primary-foreground" />
            </motion.div>

            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              {t("hero_title_part1")} <span className="text-gradient">{t("hero_title_part2")}</span> {t("hero_title_part3")}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Complete point-of-sale and inventory management solution for Ethiopian supermarkets and retail stores.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button size="lg" onClick={handleGetStarted} className="text-lg h-14 px-8 shadow-lg">
                {isAuthenticated ? t("dashboard_go") : t("get_started")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/owner/register")} className="text-lg h-14 px-8">
                <UserPlus className="mr-2 h-5 w-5" />
                {t("register_your_mart")}
              </Button>
              {!isAuthenticated && (
                <Button size="lg" variant="outline" onClick={() => navigate("/login")} className="text-lg h-14 px-8">
                  <Shield className="mr-2 h-5 w-5" />
                  {t("login")}
                </Button>
              )}
            </div>

            {/* Business Sector Choices Section (Added Below Buttons) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="pt-8 border-t border-border/60 max-w-4xl mx-auto space-y-8"
            >
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Choose your business sector</h2>
                <p className="text-muted-foreground text-sm md:text-base">Get the right ERP solution for your business</p>
              </div>

              {/* 4 Sector Cards styled similarly to POS pages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Beauty */}
                <Card
                  onClick={() => handleSectorClick("Beauty")}
                  className="p-6 border-border hover:border-primary hover:shadow-glow cursor-pointer transition-all duration-300 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 group bg-card"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Scissors className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Beauty</h3>
                    <p className="text-[11px] text-muted-foreground">Salon & Spa ERP</p>
                  </div>
                </Card>

                {/* 2. Hotel */}
                <Card
                  onClick={() => handleSectorClick("Hotel")}
                  className="p-6 border-border hover:border-primary hover:shadow-glow cursor-pointer transition-all duration-300 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 group bg-card"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Building2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Hotel</h3>
                    <p className="text-[11px] text-muted-foreground">Hospitality ERP</p>
                  </div>
                </Card>

                {/* 3. Cosmetics */}
                <Card
                  onClick={() => handleSectorClick("Cosmetics")}
                  className="p-6 border-border hover:border-primary hover:shadow-glow cursor-pointer transition-all duration-300 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 group bg-card"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Cosmetics</h3>
                    <p className="text-[11px] text-muted-foreground">Beauty Store ERP</p>
                  </div>
                </Card>

                {/* 4. Smart Cart */}
                <Card
                  onClick={() => handleSectorClick("smart_cart")}
                  className="p-6 border-2 border-primary/40 hover:border-primary hover:shadow-glow ring-2 ring-primary/10 cursor-pointer transition-all duration-300 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 group bg-card relative"
                >
                  <Badge className="absolute -top-2.5 bg-primary text-primary-foreground text-[10px]">Active</Badge>
                  <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <ShoppingCart className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-foreground">Smart Cart</h3>
                    <p className="text-[11px] text-primary font-medium">Smart POS Ready</p>
                  </div>
                </Card>
              </div>

              <p className="text-xs text-muted-foreground italic">Please select an industry from the above list.</p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Features Grid (Original UI Preserved) */}
      <div className="container mx-auto px-4 py-20">
        <motion.h2 className="text-3xl font-bold text-center mb-12">
          Everything you need to run your business
        </motion.h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <motion.div key={feature.title}>
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Footer (Original UI Preserved) */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>Kiya POS System v2.1 • Built for Ethiopian Retail</p>
        </div>
      </footer>

      {/* Coming Soon Dialog */}
      <Dialog open={Boolean(comingSoonSector)} onOpenChange={() => setComingSoonSector(null)}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="space-y-3 pt-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold">
              {comingSoonSector} ERP Coming Soon
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              We are tailoring specialized ERP modules for <strong className="text-foreground">{comingSoonSector}</strong> businesses.
              Our flagship <strong className="text-primary">Smart Cart POS</strong> system is live and ready to deploy!
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              className="w-full"
              onClick={() => {
                setComingSoonSector(null);
                navigate("/subscription-selection");
              }}
            >
              Explore Smart Cart POS
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setComingSoonSector(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

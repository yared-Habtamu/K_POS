import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  Globe,
  ArrowRight,
  UserPlus,
  Building2,
  Sparkles,
  Scissors,
  ChevronDown,
  Facebook,
  Instagram,
  Twitter,
  Send,
  Phone,
  Mail,
  Linkedin,
  Youtube,
  MessageCircle,
  Menu,
  X,
  LucideIcon,
} from "lucide-react";

// ── Contact settings types & API ─────────────────────────────────────────────
export const CONTACT_SETTINGS_KEY = "pos_contact_settings_v2"; // kept for AdminSettings import compat

export type ContactItem = {
  id: string;
  label: string;
  icon: string;
  value: string;
};

export const ICON_OPTIONS: { value: string; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "X / Twitter" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone" },
  { value: "email", label: "Email" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "website", label: "Website / Globe" },
  { value: "youtube", label: "YouTube" },
];

export const defaultContactItems: ContactItem[] = [];

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function fetchContactsFromDB(): Promise<ContactItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/site-settings/contacts`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** @deprecated use fetchContactsFromDB instead — kept so AdminSettings still compiles */
export function loadContactSettings(): ContactItem[] {
  return [];
}

// Icon helper to map icon name to Component & vibrant style
export function getIconConfig(iconName: string): {
  Icon: LucideIcon;
  colorClass: string;
} {
  switch (iconName) {
    case "facebook":
      return {
        Icon: Facebook,
        colorClass:
          "bg-[#1877F2]/15 text-[#1877F2] hover:bg-[#1877F2] hover:text-white border-[#1877F2]/30 shadow-[#1877F2]/20",
      };
    case "instagram":
      return {
        Icon: Instagram,
        colorClass:
          "bg-[#E4405F]/15 text-[#E4405F] hover:bg-[#E4405F] hover:text-white border-[#E4405F]/30 shadow-[#E4405F]/20",
      };
    case "twitter":
      return {
        Icon: Twitter,
        colorClass:
          "bg-[#1DA1F2]/15 text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white border-[#1DA1F2]/30 shadow-[#1DA1F2]/20",
      };
    case "telegram":
      return {
        Icon: Send,
        colorClass:
          "bg-[#229ED9]/15 text-[#229ED9] hover:bg-[#229ED9] hover:text-white border-[#229ED9]/30 shadow-[#229ED9]/20",
      };
    case "whatsapp":
      return {
        Icon: MessageCircle,
        colorClass:
          "bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366] hover:text-white border-[#25D366]/30 shadow-[#25D366]/20",
      };
    case "phone":
      return {
        Icon: Phone,
        colorClass:
          "bg-[#10B981]/15 text-[#10B981] hover:bg-[#10B981] hover:text-white border-[#10B981]/30 shadow-[#10B981]/20",
      };
    case "email":
      return {
        Icon: Mail,
        colorClass:
          "bg-[#EA4335]/15 text-[#EA4335] hover:bg-[#EA4335] hover:text-white border-[#EA4335]/30 shadow-[#EA4335]/20",
      };
    case "linkedin":
      return {
        Icon: Linkedin,
        colorClass:
          "bg-[#0A66C2]/15 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white border-[#0A66C2]/30 shadow-[#0A66C2]/20",
      };
    case "youtube":
      return {
        Icon: Youtube,
        colorClass:
          "bg-[#FF0000]/15 text-[#FF0000] hover:bg-[#FF0000] hover:text-white border-[#FF0000]/30 shadow-[#FF0000]/20",
      };
    case "website":
    default:
      return {
        Icon: Globe,
        colorClass:
          "bg-[#8B5CF6]/15 text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white border-[#8B5CF6]/30 shadow-[#8B5CF6]/20",
      };
  }
}

// ── Nav tabs ──────────────────────────────────────────────────────────────────
const NAV_TABS = [
  { id: "home", label: "Home" },
  { id: "shop", label: "Shop" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAmharic =
    i18n.resolvedLanguage?.startsWith("am") ?? i18n.language.startsWith("am");

  const [comingSoonSector, setComingSoonSector] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [contacts, setContacts] = useState<ContactItem[]>([]);

  // Section refs for scroll-spy / smooth scroll
  const homeRef = useRef<HTMLDivElement>(null);
  const shopRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  // Fetch contacts from DB on mount and when admin saves
  const reloadContacts = () => {
    fetchContactsFromDB().then(setContacts);
  };

  useEffect(() => {
    reloadContacts();
    window.addEventListener("contact-settings-updated", reloadContacts);
    return () => window.removeEventListener("contact-settings-updated", reloadContacts);
  }, []);

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

  // Scroll-spy: update activeTab based on scroll position
  useEffect(() => {
    const refs = [
      { id: "home", ref: homeRef },
      { id: "shop", ref: shopRef },
      { id: "about", ref: aboutRef },
      { id: "contact", ref: contactRef },
    ];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const found = refs.find((r) => r.ref.current === entry.target);
            if (found) setActiveTab(found.id);
          }
        });
      },
      { threshold: 0.3 },
    );
    refs.forEach(({ ref }) => {
      if (ref.current) observer.observe(ref.current);
    });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const map: Record<string, React.RefObject<HTMLDivElement>> = {
      home: homeRef,
      shop: shopRef,
      about: aboutRef,
      contact: contactRef,
    };
    map[id]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

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
    <div className="min-h-screen bg-background scroll-smooth">
      {/* ── Sticky Navigation ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl h-16">
        <div className="container mx-auto px-4 h-full flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
              <Store className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-sm md:text-base">
              Kiya POS
            </span>
          </div>

          {/* Desktop tabs */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => scrollTo(tab.id)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-primary/10 rounded-lg"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => i18n.changeLanguage(isAmharic ? "en" : "am")}
              className="hidden sm:flex text-xs h-8"
            >
              {isAmharic ? "🇺🇸 EN" : "🇪🇹 አማ"}
            </Button>
            <Button size="sm" onClick={handleGetStarted} className="h-8 text-xs shadow-glow">
              {isAuthenticated ? t("dashboard_go") : t("get_started")}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl px-4 py-3 flex flex-col gap-1"
          >
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => scrollTo(tab.id)}
                className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </motion.div>
        )}
      </header>

      {/* ── HOME section (Full Screen Viewport Height) ──────────────────── */}
      <section
        ref={homeRef}
        id="home"
        className="relative overflow-hidden border-b border-border/40 min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center py-12"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 my-auto">
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

            <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight leading-tight">
              {t("hero_title_part1")}{" "}
              <span className="text-gradient">{t("hero_title_part2")}</span>{" "}
              {t("hero_title_part3")}
            </h1>
            <p className="text-base md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Complete point-of-sale and inventory management solution for
              Ethiopian supermarkets and retail stores.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="text-base h-13 px-8 shadow-lg"
              >
                {isAuthenticated ? t("dashboard_go") : t("get_started")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/owner/register")}
                className="text-base h-13 px-8"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                {t("register_your_mart")}
              </Button>
              {!isAuthenticated && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="text-base h-13 px-8"
                >
                  <Shield className="mr-2 h-5 w-5" />
                  {t("login")}
                </Button>
              )}
            </div>

            {/* Scroll Down Animation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="pt-10 flex flex-col items-center justify-center cursor-pointer group select-none"
              onClick={() => scrollTo("shop")}
            >
              <span className="text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors mb-2 tracking-widest uppercase">
                Scroll Down
              </span>
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                className="w-10 h-10 rounded-full bg-accent/80 border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/50 group-hover:bg-primary/10 transition-all duration-300 shadow-sm"
              >
                <ChevronDown className="w-5 h-5" />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── SHOP section ─────────────────────────────────────────────────── */}
      <section ref={shopRef} id="shop" className="border-b border-border/40">
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-4xl mx-auto space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Choose your business sector
              </h2>
              <p className="text-muted-foreground text-sm md:text-base">
                Get the right ERP solution for your business
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Beauty */}
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

              {/* Hotel */}
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

              {/* Beutics */}
              <Card
                onClick={() => handleSectorClick("Beutics")}
                className="p-6 border-border hover:border-primary hover:shadow-glow cursor-pointer transition-all duration-300 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 group bg-card"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Beutics</h3>
                  <p className="text-[11px] text-muted-foreground">Beauty Store ERP</p>
                </div>
              </Card>

              {/* Smart Cart */}
              <Card
                onClick={() => handleSectorClick("smart_cart")}
                className="p-6 border-2 border-primary/40 hover:border-primary hover:shadow-glow ring-2 ring-primary/10 cursor-pointer transition-all duration-300 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 group bg-card relative"
              >
                <Badge className="absolute -top-2.5 bg-primary text-primary-foreground text-[10px]">
                  Active
                </Badge>
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <ShoppingCart className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">Smart Cart</h3>
                  <p className="text-[11px] text-primary font-medium">Smart POS Ready</p>
                </div>
              </Card>
            </div>

            <p className="text-xs text-muted-foreground italic">
              Please select an industry from the above list.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── ABOUT section (Offline Ready Removed) ───────────────────────── */}
      <section ref={aboutRef} id="about" className="border-b border-border/40">
        <div className="container mx-auto px-4 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="text-center space-y-2 mb-12">
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                About Kiya POS
              </h2>
              <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
                Built from the ground up for Ethiopian retail — fast, bilingual, and reliable.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: BarChart3, title: "Analytics", desc: "Real-time sales, profit, and inventory insights at a glance." },
                { icon: Users, title: "Multi-Role", desc: "Owner, Manager, Cashier, Store Keeper — each with tailored permissions." },
                { icon: Globe, title: "Bilingual", desc: "Full English & Amharic support across the entire system." },
                { icon: Package, title: "Inventory", desc: "Track warehouse stock and mart shelves in real time." },
                { icon: Shield, title: "Secure", desc: "Role-based access and encrypted data keep your business safe." },
              ].map((f) => (
                <motion.div
                  key={f.title}
                  whileHover={{ y: -4 }}
                  className="p-6 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-base mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CONTACT section (Primary Light Blue Background, Colorful Icons) ─ */}
      <section ref={contactRef} id="contact">
        <footer className="bg-primary/10 border-t border-primary/20 text-foreground">
          <div className="container mx-auto px-4 py-10">
            <div className="grid gap-8 md:grid-cols-3 items-start">
              {/* Brand column */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center shadow-glow">
                    <Store className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-base text-foreground">Kiya POS</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                  Complete point-of-sale and ERP solution tailored for Ethiopian retail businesses.
                </p>

                {/* Colorful & Highly Visible Social Icons */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  {contacts
                    .filter((c) => c.value && c.value.trim() !== "")
                    .map((item) => {
                      const { Icon, colorClass } = getIconConfig(item.icon);
                      const isUrl = item.value.startsWith("http") || item.value.startsWith("https");
                      const href = isUrl
                        ? item.value
                        : item.icon === "phone"
                          ? `tel:${item.value}`
                          : item.icon === "email"
                            ? `mailto:${item.value}`
                            : item.icon === "telegram"
                              ? `https://t.me/${item.value.replace("@", "")}`
                              : item.value;

                      return (
                        <a
                          key={item.id}
                          href={href}
                          target={isUrl || item.icon === "telegram" ? "_blank" : undefined}
                          rel="noopener noreferrer"
                          title={`${item.label}: ${item.value}`}
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-sm ${colorClass}`}
                        >
                          <Icon className="w-4 h-4" />
                        </a>
                      );
                    })}
                </div>
              </div>

              {/* Quick links */}
              <div className="space-y-3">
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                  Quick Navigation
                </h4>
                <ul className="space-y-1.5">
                  {NAV_TABS.map((tab) => (
                    <li key={tab.id}>
                      <button
                        onClick={() => scrollTo(tab.id)}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        {tab.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Direct Contact List */}
              <div className="space-y-3">
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                  Direct Contact
                </h4>
                <ul className="space-y-2">
                  {contacts
                    .filter(
                      (c) =>
                        c.value &&
                        (c.icon === "telegram" ||
                          c.icon === "phone" ||
                          c.icon === "email"),
                    )
                    .map((item) => {
                      const { Icon, colorClass } = getIconConfig(item.icon);
                      const href =
                        item.icon === "phone"
                          ? `tel:${item.value}`
                          : item.icon === "email"
                            ? `mailto:${item.value}`
                            : item.icon === "telegram"
                              ? `https://t.me/${item.value.replace("@", "")}`
                              : item.value;

                      return (
                        <li key={item.id}>
                          <a
                            href={href}
                            target={item.icon === "telegram" ? "_blank" : undefined}
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                          >
                            <span
                              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-transform group-hover:scale-105 ${colorClass}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <span className="truncate">{item.value}</span>
                          </a>
                        </li>
                      );
                    })}
                  {contacts.filter(
                    (c) =>
                      c.value &&
                      (c.icon === "telegram" ||
                        c.icon === "phone" ||
                        c.icon === "email"),
                  ).length === 0 && (
                    <li className="text-xs text-muted-foreground/60 italic">
                      No direct contacts configured.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Bottom copyright bar (Smaller Word Size) */}
            <div className="mt-8 pt-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground/80">
              <span>© {new Date().getFullYear()} Kiya POS System v2.1 • Built for Ethiopian Retail</span>
              <button
                onClick={() => scrollTo("home")}
                className="hover:text-primary transition-colors text-[11px]"
              >
                Back to top ↑
              </button>
            </div>
          </div>
        </footer>
      </section>

      {/* ── Coming Soon Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={Boolean(comingSoonSector)}
        onOpenChange={() => setComingSoonSector(null)}
      >
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="space-y-3 pt-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold">
              {comingSoonSector} ERP Coming Soon
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              We are tailoring specialized ERP modules for{" "}
              <strong className="text-foreground">{comingSoonSector}</strong>{" "}
              businesses. Our flagship{" "}
              <strong className="text-primary">Smart Cart POS</strong> system is
              live and ready to deploy!
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
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setComingSoonSector(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
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
import { toast } from "@/hooks/use-toast";
import type { UserRole } from "@/types";
import { Store, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const roleDashboards: Record<UserRole, string> = {
  system_admin: "/admin",
  owner: "/owner",
  manager: "/manager",
  cashier: "/cashier",
  store_keeper: "/store-keeper",
};

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();

  // Use uncontrolled inputs (refs) to avoid focus/caret issues caused
  // by repeated re-renders of a controlled input (fixes "one character
  // at a time" typing bug that required clicking the input between
  // characters).
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  // Fallback local state remains for legacy usage if needed
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // prefer reading live values from the DOM refs when available
    const liveUsername = usernameRef?.current?.value ?? username;
    const livePassword = passwordRef?.current?.value ?? password;

    const result = await login(liveUsername, livePassword, rememberMe);
    if (result && (result as any).role) {
      toast({
        title: t("welcome"),
        description: `${t("logged_in_as")} ${(result as any).role}`,
      });
      navigate(roleDashboards[result.role]);
    } else if (result && "message" in result && result.message) {
      const msg =
        result && (result as any).message
          ? (result as any).message
          : t("login_error");
      toast({
        title: t("login_failed"),
        description: msg,
        variant: "destructive",
      });
    } else {
      toast({
        title: t("login_failed"),
        description: t("login_error"),
        variant: "destructive",
      });
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "en" ? "am" : "en");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2 hover:bg-white/10 dark:hover:bg-black/10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back", "Back")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="gap-2"
          >
            {i18n.language === "en" ? "🇪🇹 አማርኛ" : "🇺🇸 English"}
          </Button>
        </div>

        <div className="glass-strong rounded-2xl p-8 shadow-card">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
              className="w-20 h-20 mx-auto rounded-2xl gradient-primary flex items-center justify-center shadow-glow mb-4"
            >
              <Store className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("app_name")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("smart_pos_inventory_system")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* No role selection, only username/password */}

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">{t("username")}</Label>
              <Input
                id="username"
                ref={usernameRef}
                placeholder={t("enter_username")}
                className="h-12"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  ref={passwordRef}
                  type={showPassword ? "text" : "password"}
                  placeholder={t("enter_password")}
                  className="h-12 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(c) => setRememberMe(c as boolean)}
                  className="rounded-sm"
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  {t("remember_me", "Remember me")}
                </label>
              </div>
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={(e) => {
                  e.preventDefault();
                  alert(
                    t(
                      "forgot_password_msg",
                      "Please contact your system administrator or owner to reset your password.",
                    ),
                  );
                }}
              >
                {t("forgot_password", "Forgot password?")}
              </Button>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("logging_in")}
                </>
              ) : (
                t("login")
              )}
            </Button>
          </form>

          {/* Demo hint removed */}
        </div>
      </motion.div>
    </div>
  );
}

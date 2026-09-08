import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { CheckCircle, XCircle, Loader2, Key, Eye, EyeOff } from "lucide-react";

export function PrintNodeApiKeyCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const auth = useAuthStore((s) => s.user);
  const API_BASE = import.meta.env.VITE_API_URL || "";

  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<"loading" | "configured" | "not_configured">("loading");

  useEffect(() => {
    const load = async () => {
      try {
        const token = auth?.token;
        const martId = auth?.martId;
        if (!martId || !token) return;

        const res = await fetch(`${API_BASE}/api/marts/${martId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();

        if (json.printNodeApiKey) {
          setSavedKey(json.printNodeApiKey);
          setStatus("configured");
        } else {
          setStatus("not_configured");
        }
      } catch {
        setStatus("not_configured");
      }
    };
    load();
  }, [auth?.martId, auth?.token, API_BASE]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast({
        variant: "destructive",
        title: t("api_key_required", { defaultValue: "API key is required" }),
      });
      return;
    }

    setSaving(true);
    setVerifying(true);
    try {
      const token = auth?.token;
      const res = await fetch(`${API_BASE}/api/printnode/api-key`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          variant: "destructive",
          title: t("invalid_api_key", { defaultValue: "Invalid API Key" }),
          description: data.error || t("api_key_verification_failed", { defaultValue: "Could not verify the API key" }),
        });
        return;
      }

      setSavedKey(apiKey.trim());
      setApiKey("");
      setStatus("configured");
      toast({
        title: t("api_key_saved", { defaultValue: "PrintNode API Key Saved" }),
        description: t("api_key_verified", { defaultValue: "API key verified successfully" }),
      });
    } catch {
      toast({
        variant: "destructive",
        title: t("save_failed", { defaultValue: "Save failed" }),
        description: t("cannot_connect_backend", { defaultValue: "Cannot connect to backend" }),
      });
    } finally {
      setSaving(false);
      setVerifying(false);
    }
  };

  const maskedKey = savedKey
    ? savedKey.substring(0, 8) + "..." + savedKey.substring(savedKey.length - 4)
    : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          {t("printnode_api_key", { defaultValue: "PrintNode API Key" })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 max-w-xl">
          <p className="text-sm text-muted-foreground">
            {t("printnode_api_key_desc", {
              defaultValue: "Each shop needs its own PrintNode account. Get your API key from printnode.com/account/api-keys. This key is used to send print jobs from your shop's printers.",
            })}
          </p>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {status === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {status === "configured" && <CheckCircle className="h-4 w-4 text-green-500" />}
            {status === "not_configured" && <XCircle className="h-4 w-4 text-orange-500" />}
            <span className="text-sm font-medium">
              {status === "configured"
                ? t("api_key_configured", { defaultValue: "API Key Configured" })
                : status === "not_configured"
                  ? t("api_key_not_configured", { defaultValue: "No API Key Set" })
                  : t("checking", { defaultValue: "Checking..." })}
            </span>
            {status === "configured" && (
              <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">
                {maskedKey}
              </Badge>
            )}
          </div>

          {status === "configured" && (
            <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/20">
              <p className="text-sm text-green-700 dark:text-green-400">
                {t("api_key_active", { defaultValue: "Your shop's PrintNode API key is active. Each cashier in your shop will use this key to print to their local printers." })}
              </p>
            </div>
          )}

          <div>
            <Label>
              {status === "configured"
                ? t("update_api_key", { defaultValue: "Update API Key" })
                : t("enter_api_key", { defaultValue: "Enter PrintNode API Key" })}
            </Label>
            <div className="flex gap-2 mt-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={status === "configured" ? t("enter_new_api_key", { defaultValue: "Enter new API key to replace" }) : t("paste_api_key", { defaultValue: "Paste your PrintNode API key" })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving || !apiKey.trim()}
              >
                {verifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("save_and_verify", { defaultValue: "Save & Verify" })
                )}
              </Button>
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 space-y-2">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              {t("how_to_get_key", { defaultValue: "How to get your PrintNode API Key:" })}
            </p>
            <ol className="text-xs text-blue-600 dark:text-blue-500 list-decimal list-inside space-y-1">
              <li>{t("step1", { defaultValue: "Go to printnode.com and create a free account" })}</li>
              <li>{t("step2", { defaultValue: "Install PrintNode Client on each cashier's computer" })}</li>
              <li>{t("step3", { defaultValue: "Connect your receipt printer to each computer" })}</li>
              <li>{t("step4", { defaultValue: "Go to Account > API Keys and copy your key" })}</li>
              <li>{t("step5", { defaultValue: "Paste the key here and click Save & Verify" })}</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

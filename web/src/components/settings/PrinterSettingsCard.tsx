import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import printNodeBridge from "@/services/printBridge/printNodeBridge";
import { useSettingsStore } from "@/stores/settingsStore";
import type { UserRole } from "@/types";
import { CheckCircle, XCircle, Loader2, Search } from "lucide-react";

type PrinterSettingsCardProps = {
  role: UserRole;
  title?: string;
  description?: string;
};

export function PrinterSettingsCard({
  role,
  title,
  description,
}: PrinterSettingsCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const printNodeId = useSettingsStore((s) => s.printNodeId);
  const setPrintNodeId = useSettingsStore((s) => s.setPrintNodeId);

  const [printNodeStatus, setPrintNodeStatus] = useState<"checking" | "online" | "offline">("checking");
  const [printNodePrinters, setPrintNodePrinters] = useState<{ id: number; name: string }[]>([]);
  const [autoDetecting, setAutoDetecting] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const health = await printNodeBridge.getPrintNodeHealth();
        setPrintNodeStatus(health.reachable ? "online" : health.configured ? "offline" : "offline");
        
        if (health.reachable) {
          const printers = await printNodeBridge.listPrinters();
          setPrintNodePrinters(printers.map((p) => ({ id: p.id, name: p.name })));
          
          if (!printNodeId && printers.length > 0) {
            setPrintNodeId(printers[0].id);
            toast({
              title: t("printer_auto_detected"),
              description: `${t("using_printer")}: ${printers[0].name}`,
            });
          }
        }
      } catch {
        setPrintNodeStatus("offline");
      }
    };
    check();
  }, []);

  const handleAutoDetect = async () => {
    setAutoDetecting(true);
    try {
      const printers = await printNodeBridge.listPrinters();
      setPrintNodePrinters(printers.map((p) => ({ id: p.id, name: p.name })));
      
      if (printers.length > 0) {
        setPrintNodeId(printers[0].id);
        toast({
          title: t("printer_found"),
          description: `${t("using_printer")}: ${printers[0].name}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: t("no_printers_found"),
          description: t("ensure_printnode_running"),
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("detection_failed"),
        description: t("cannot_connect_printnode"),
      });
    } finally {
      setAutoDetecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title || t("device_printer")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 max-w-xl">

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            {printNodeStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            {printNodeStatus === "online" && <CheckCircle className="h-4 w-4 text-green-500" />}
            {printNodeStatus === "offline" && <XCircle className="h-4 w-4 text-orange-500" />}
            <span className="text-sm font-medium">
              {printNodeStatus === "online" ? t("printnode_connected") : printNodeStatus === "offline" ? t("printnode_offline") : t("checking")}
            </span>
            {printNodeStatus === "online" && <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">{t("active")}</Badge>}
          </div>

          <div>
            <Label>{t("printer_label")}</Label>
            
            {printNodeId ? (
              <div className="mt-1 p-3 rounded-lg bg-muted/30 border">
                <p className="text-sm">
                  {t("using_printer_id")} <span className="font-mono font-bold">{printNodeId}</span>
                </p>
                {printNodePrinters.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {printNodePrinters.find(p => p.id === printNodeId)?.name || t("unknown_printer")}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-1 p-3 rounded-lg bg-muted/30 border">
                <p className="text-sm text-muted-foreground">
                  {autoDetecting ? t("detecting_printer") : t("no_printer_detected")}
                </p>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoDetect}
              disabled={autoDetecting || printNodeStatus !== "online"}
              className="mt-2"
            >
              {autoDetecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {printNodeId ? t("detect_different_printer") : t("auto_detect_printer")}
            </Button>
            
            {printNodePrinters.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium">{t("available_printers")}</p>
                {printNodePrinters.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPrintNodeId(p.id)}
                    className={`block w-full text-left text-xs p-2 rounded border ${
                      printNodeId === p.id ? "border-primary bg-primary/5" : "border-muted"
                    }`}
                  >
                    {p.name} (ID: {p.id})
                  </button>
                ))}
              </div>
            )}
            
            <p className="text-xs text-muted-foreground mt-2">
              {t("ensure_printnode_client")}
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            {t("printnode_description")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

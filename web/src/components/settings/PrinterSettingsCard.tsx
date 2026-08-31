import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import qzBridge from "@/services/printBridge/qzBridge";
import useSettingsStore from "@/stores/settingsStore";
import type { UserRole } from "@/types";

type PrinterSettingsCardProps = {
  role: UserRole;
  title?: string;
  description?: string;
};

export function PrinterSettingsCard({
  role,
  title = "Device / Printer",
  description,
}: PrinterSettingsCardProps) {
  const { toast } = useToast();
  const printer = useSettingsStore((s) => s.getPreferredPrinter(role));
  const setPrinterForRole = useSettingsStore((s) => s.setPrinterForRole);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 max-w-xl">
          <div>
            <Label>Preferred Printer (QZ Tray)</Label>
            <Input
              value={printer || ""}
              onChange={(e) =>
                setPrinterForRole(role, e.target.value.trim() || null)
              }
              placeholder="Exact printer name as shown in QZ Tray"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {description ||
                "Leave empty to use the system default printer for this role."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                try {
                  console.info("[PrinterSettings] connecting to QZ Tray...");
                  const printers = await qzBridge.listPrinters();
                  console.info("[PrinterSettings] printers:", printers);

                  toast({
                    title: "Printers detected",
                    description:
                      printers?.length > 0
                        ? printers.join(", ")
                        : "No printers found.",
                  });
                } catch (err: any) {
                  console.error("[PrinterSettings] error:", err);
                  toast({
                    variant: "destructive",
                    title: "Printer detection failed",
                    description:
                      String(err?.message || err || "Check that QZ Tray is installed and running."),
                  });
                }
              }}
            >
              Detect Printers
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Silent printing works only on devices where QZ Tray is installed and
            trusted.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

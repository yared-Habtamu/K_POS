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
                  const ok = await qzBridge.connect();
                  if (!ok) {
                    toast({
                      title: "QZ Tray not connected",
                      description:
                        "Start QZ Tray on this device and trust the local host certificate.",
                    });
                    return;
                  }

                  // Lazy-load the browser bridge only when available.
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  const qz = await import("qz-tray");
                  const printers = await qz.printers.find();

                  toast({
                    title: "Printers detected",
                    description:
                      printers?.length > 0
                        ? printers.join(", ")
                        : "No printers found.",
                  });
                } catch (err) {
                  console.error(err);
                  toast({
                    title: "Printer detection failed",
                    description: "Check that QZ Tray is installed and running.",
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

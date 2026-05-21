import React from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import useSettingsStore from "@/stores/settingsStore";
import qzBridge from "@/services/printBridge/qzBridge";

const KEY = "pos_admin_settings_v1";

type Settings = {
  registrationApprovalRequired: boolean;
  defaultCommission: number;
  notificationEmail: string;
};

const defaults: Settings = {
  registrationApprovalRequired: true,
  defaultCommission: 2.5,
  notificationEmail: "",
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    return JSON.parse(raw) as Settings;
  } catch (e) {
    return defaults;
  }
}

function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = React.useState<Settings>(() =>
    loadSettings(),
  );
  const preferredPrinter = useSettingsStore((s) =>
    s.getPreferredPrinter("system_admin"),
  );
  const setPrinterForRole = useSettingsStore((s) => s.setPrinterForRole);

  const update = (patch: Partial<Settings>) =>
    setSettings((s) => ({ ...s, ...patch }));

  const onSave = () => {
    saveSettings(settings);
    toast({
      title: "Settings saved",
      description: "Admin settings saved locally.",
    });
  };

  const onReset = () => {
    setSettings(defaults);
    saveSettings(defaults);
    toast({ title: "Settings reset", description: "Reverted to defaults." });
  };

  return (
    <RoleLayout allowedRoles={["system_admin"]}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground">
            Configure system behavior and printer settings from tabbed sections.
          </p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <div className="w-full overflow-x-auto pb-1">
            <TabsList className="inline-flex min-w-max justify-start gap-2">
              <TabsTrigger value="general" className="shrink-0">
                General
              </TabsTrigger>
              <TabsTrigger value="printer" className="shrink-0">
                Printer
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="general" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>General</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label>
                        Require approval for new supermarket registrations
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        When enabled, new shops will be set to pending and
                        require admin approval.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.registrationApprovalRequired}
                      onChange={(e) =>
                        update({
                          registrationApprovalRequired: e.target.checked,
                        })
                      }
                      className="toggle"
                    />
                  </div>

                  <div>
                    <Label>Default Commission Rate (%)</Label>
                    <Input
                      type="number"
                      value={String(settings.defaultCommission)}
                      onChange={(e) =>
                        update({
                          defaultCommission: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>Notification Email</Label>
                    <Input
                      type="email"
                      value={settings.notificationEmail}
                      onChange={(e) =>
                        update({ notificationEmail: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button onClick={onSave}>Save Settings</Button>
                    <Button variant="ghost" onClick={onReset}>
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="printer" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Device / Printer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-xl">
                  <div>
                    <Label>Preferred Printer (QZ Tray)</Label>
                    <Input
                      value={preferredPrinter || ""}
                      onChange={(e) =>
                        setPrinterForRole(
                          "system_admin",
                          e.target.value.trim() || null,
                        )
                      }
                      placeholder="Exact printer name as shown in QZ Tray"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Use the exact printer name from the connected machine.
                      Leave empty to use the system default printer.
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

                          // Lazy-load only when available in the browser.
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
                            description:
                              "Check that QZ Tray is installed and running.",
                          });
                        }
                      }}
                    >
                      Detect Printers
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Silent printing only works on machines where QZ Tray is
                    installed and trusted.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleLayout>
  );
}

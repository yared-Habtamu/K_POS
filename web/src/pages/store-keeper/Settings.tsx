import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrinterSettingsCard } from "@/components/settings/PrinterSettingsCard";

export default function StoreKeeperSettings() {
  return (
    <RoleLayout allowedRoles={["store_keeper"]}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Store Keeper Settings</h1>
          <p className="text-muted-foreground">
            Configure store-keeper device preferences and printer mapping.
          </p>
        </div>

        <Tabs defaultValue="printer" className="w-full">
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

          <TabsContent value="general" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Store keeper settings are currently limited to device-specific
                  preferences.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="printer" className="mt-4">
            <PrinterSettingsCard
              role="store_keeper"
              title="Store Keeper Printer"
              description="Set the printer used from store keeper workstations."
            />
          </TabsContent>
        </Tabs>
      </div>
    </RoleLayout>
  );
}

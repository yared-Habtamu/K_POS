import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrinterSettingsCard } from "@/components/settings/PrinterSettingsCard";

export default function CashierSettings() {
  const { t } = useTranslation();

  return (
    <RoleLayout allowedRoles={["cashier"]}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t("cashier")} {t("settings")}</h1>
          <p className="text-muted-foreground">
            {t("printer_settings_desc")}
          </p>
        </div>

        <Tabs defaultValue="printer" className="w-full">
          <div className="w-full overflow-x-auto pb-1">
            <TabsList className="inline-flex min-w-max justify-start gap-2">
              <TabsTrigger value="general" className="shrink-0">
                {t("general") || "General"}
              </TabsTrigger>
              <TabsTrigger value="printer" className="shrink-0">
                {t("printer_settings") || "Printer"}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="general" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  {t("printer_settings_desc")}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="printer" className="mt-4">
            <PrinterSettingsCard
              role="cashier"
              title={`${t("cashier")} ${t("printer_settings") || "Printer"}`}
              description={t("printer_settings_desc")}
            />
          </TabsContent>
        </Tabs>
      </div>
    </RoleLayout>
  );
}

import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";

export default function ManagerOpenCashPage() {
  const { t } = useTranslation();

  return (
    <RoleLayout allowedRoles={["manager"]}>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t("open_cash")}</h1>
        <p className="text-muted-foreground">
          Open Cash management page — to be implemented by Member 1.
        </p>
      </div>
    </RoleLayout>
  );
}

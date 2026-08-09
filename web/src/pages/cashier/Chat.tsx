import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";

export default function CashierChatPage() {
  const { t } = useTranslation();

  return (
    <RoleLayout allowedRoles={["cashier"]}>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t("chat")}</h1>
        <p className="text-muted-foreground">
          Cashier-Manager chat page — to be implemented by Member 3.
        </p>
      </div>
    </RoleLayout>
  );
}

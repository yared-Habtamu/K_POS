import { useTranslation } from "react-i18next";
import RoleLayout from "@/components/layout/RoleLayout";

export default function SaleCancellationsPage() {
  const { t } = useTranslation();

  return (
    <RoleLayout role="owner">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">{t("sale_cancellation")}</h1>
        <p className="text-muted-foreground">
          Sale cancellation approvals page — to be implemented by Member 1.
        </p>
      </div>
    </RoleLayout>
  );
}

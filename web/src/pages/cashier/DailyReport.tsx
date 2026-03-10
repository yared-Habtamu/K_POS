import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { RefreshCw } from "lucide-react";
import {
  FileText,
  DollarSign,
  Banknote,
  Building2,
  Percent,
  Send,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

export default function DailyReport() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const [report, setReport] = useState({
    totalSales: "",
    cashReceived: "",
    bankTransfer: "",
    discountsGiven: "",
    notes: "",
  });
  const [reportsList, setReportsList] = useState<any[]>([]);

  const API_BASE = import.meta.env.VITE_API_URL || "";

  const fetchDaily = async () => {
    try {
      const token = user?.token;
      const martId = user?.martId;
      if (!martId) return;
      const day = new Date().toISOString().slice(0, 10);
      const res = await fetch(
        `${API_BASE}/api/reports/daily?martId=${martId}&date=${day}`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      );
      if (!res.ok) return;
      const data = await res.json();
      setReport({
        totalSales: (data.totalSales || 0).toString(),
        cashReceived: String(
          (data.salesByPaymentMethod || []).find(
            (m: any) => m.method === "cash",
          )?.total || 0,
        ),
        bankTransfer: String(
          (data.salesByPaymentMethod || []).find(
            (m: any) => m.method === "cbe_bank",
          )?.total || 0,
        ),
        discountsGiven: String(data.discountsTotal || 0),
        notes: "",
      });
    } catch (err) {
      console.error("Fetch daily report error", err);
    }
  };

  const fetchReportsList = async () => {
    try {
      const token = user?.token;
      const martId = user?.martId;
      if (!martId) return;
      const day = new Date().toISOString().slice(0, 10);
      const res = await fetch(
        `${API_BASE}/api/reports/daily?martId=${martId}&date=${day}`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      );
      if (!res.ok) return;
      const data = await res.json();
      // Use salesByCashier from the reports endpoint for a live view
      setReportsList(data.salesByCashier || []);
    } catch (err) {
      console.error("Fetch reports list error", err);
    }
  };

  useEffect(() => {
    fetchDaily();
    fetchReportsList();
    const id = setInterval(() => {
      fetchDaily();
      fetchReportsList();
    }, 5000); // poll every 5s
    return () => clearInterval(id);
  }, [user]);

  return (
    <RoleLayout allowedRoles={["cashier", "manager", "owner", "systemAdmin"]}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t("daily_report")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("todays_live_financial_summary")} •{" "}
                  {format(new Date(), "EEEE, MMMM dd, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-medium animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {t("live")}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Report Info */}
              <div className="p-4 rounded-xl bg-accent/50 border border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("active_user")}:
                  </span>
                  <span className="font-medium">{user?.username}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">{t("role")}:</span>
                  <span className="font-medium capitalize">{user?.role}</span>
                </div>
              </div>

              {/* Financial Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="totalSales"
                    className="flex items-center gap-2"
                  >
                    <DollarSign className="h-4 w-4 text-primary" />
                    {t("total_sales")} (ETB)
                  </Label>
                  <Input
                    id="totalSales"
                    type="text"
                    value={Number(report.totalSales).toLocaleString()}
                    readOnly
                    className="h-12 font-bold text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="cashReceived"
                    className="flex items-center gap-2"
                  >
                    <Banknote className="h-4 w-4 text-success" />
                    {t("cash_received")} (ETB)
                  </Label>
                  <Input
                    id="cashReceived"
                    type="text"
                    value={Number(report.cashReceived).toLocaleString()}
                    readOnly
                    className="h-12 font-bold text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="bankTransfer"
                    className="flex items-center gap-2"
                  >
                    <Building2 className="h-4 w-4 text-blue-500" />
                    {t("bank_transfers")} (ETB)
                  </Label>
                  <Input
                    id="bankTransfer"
                    type="text"
                    value={Number(report.bankTransfer).toLocaleString()}
                    readOnly
                    className="h-12 font-bold text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="discounts"
                    className="flex items-center gap-2"
                  >
                    <Percent className="h-4 w-4 text-warning" />
                    {t("discount_given")} (ETB)
                  </Label>
                  <Input
                    id="discounts"
                    type="text"
                    value={Number(report.discountsGiven).toLocaleString()}
                    readOnly
                    className="h-12 font-bold text-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    fetchDaily();
                    fetchReportsList();
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> {t("sync_now")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Cashier Breakdown for managers/owners */}
        {(user?.role === "manager" ||
          user?.role === "owner" ||
          user?.role === "systemAdmin") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{t("cashier_performance")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("active_sales_breakdown_by_cashier")}
                </p>
              </CardHeader>
              <CardContent>
                {reportsList.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    {t("no_active_sales_sessions_today")}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-muted-foreground">
                        <tr className="border-b">
                          <th className="pb-3 px-2">{t("cashier")}</th>
                          <th className="pb-3 px-2 text-right">
                            {t("total_sales")} (ETB)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsList.map((r, i) => (
                          <tr
                            key={i}
                            className="border-b last:border-0 hover:bg-accent/30 transition-colors"
                          >
                            <td className="py-3 px-2 font-medium">
                              {r.cashierName}
                            </td>
                            <td className="py-3 px-2 text-right font-bold text-primary">
                              {Number(r.sales || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </RoleLayout>
  );
}

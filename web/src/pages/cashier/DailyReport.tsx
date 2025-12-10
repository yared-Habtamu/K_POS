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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      if (!res.ok) return;
      const data = await res.json();
      setReport({
        totalSales: (data.totalSales || 0).toString(),
        cashReceived: String(
          (data.salesByPaymentMethod || []).find(
            (m: any) => m.method === "cash"
          )?.total || 0
        ),
        bankTransfer: String(
          (data.salesByPaymentMethod || []).find(
            (m: any) => m.method === "cbe_bank"
          )?.total || 0
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
        `${API_BASE}/api/daily-reports?martId=${martId}&date=${day}`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      if (!res.ok) return;
      const list = await res.json();
      setReportsList(list);
    } catch (err) {
      console.error("Fetch reports list error", err);
    }
  };

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      fetchDaily();
      fetchReportsList();
    }
    const id = setInterval(() => {
      fetchDaily();
      fetchReportsList();
    }, 5000); // poll every 5s
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = user?.token;
      const martId = user?.martId;
      if (!martId) throw new Error("No martId");
      const day = new Date().toISOString().slice(0, 10);
      const payload = {
        martId,
        date: day,
        totalSales: Number(report.totalSales) || 0,
        cashReceived: Number(report.cashReceived) || 0,
        bankTransfer: Number(report.bankTransfer) || 0,
        discountsGiven: Number(report.discountsGiven) || 0,
        notes: report.notes || "",
      };
      const res = await fetch(`${API_BASE}/api/daily-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to submit report");
      }
      const saved = await res.json();
      toast({
        title: t("report_submitted"),
        description: `Daily report for ${format(
          new Date(),
          "MMM dd, yyyy"
        )} submitted successfully`,
      });
      setReport({
        totalSales: "",
        cashReceived: "",
        bankTransfer: "",
        discountsGiven: "",
        notes: "",
      });
      // refresh list
      await fetchReportsList();
    } catch (err: any) {
      console.error("Submit daily report error", err);
      toast({ title: "Failed to submit report", description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <RoleLayout allowedRoles={["cashier", "manager", "owner"]}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("daily_report")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Submit your daily financial report •{" "}
              {format(new Date(), "EEEE, MMMM dd, yyyy")}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Report Info */}
              <div className="p-4 rounded-xl bg-accent/50 border border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cashier:</span>
                  <span className="font-medium">{user?.name}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">
                    {format(new Date(), "MMM dd, yyyy")}
                  </span>
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
                    type="number"
                    placeholder="0.00"
                    value={report.totalSales}
                    onChange={(e) =>
                      setReport({ ...report, totalSales: e.target.value })
                    }
                    required
                    readOnly
                    className="h-12"
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
                    type="number"
                    placeholder="0.00"
                    value={report.cashReceived}
                    onChange={(e) =>
                      setReport({ ...report, cashReceived: e.target.value })
                    }
                    required
                    readOnly
                    className="h-12"
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
                    type="number"
                    placeholder="0.00"
                    value={report.bankTransfer}
                    onChange={(e) =>
                      setReport({ ...report, bankTransfer: e.target.value })
                    }
                    readOnly
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="discounts"
                    className="flex items-center gap-2"
                  >
                    <Percent className="h-4 w-4 text-warning" />
                    {t("discount")} Given (ETB)
                  </Label>
                  <Input
                    id="discounts"
                    type="number"
                    placeholder="0.00"
                    value={report.discountsGiven}
                    onChange={(e) =>
                      setReport({ ...report, discountsGiven: e.target.value })
                    }
                    readOnly
                    className="h-12"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchDaily}
                  className="mr-2"
                >
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <textarea
                  id="notes"
                  placeholder="Any additional information..."
                  value={report.notes}
                  onChange={(e) =>
                    setReport({ ...report, notes: e.target.value })
                  }
                  className="w-full min-h-[100px] rounded-xl border border-input bg-background px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Submit */}
              {user?.role === "cashier" && (
                <Button
                  type="submit"
                  className="w-full h-12"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {t("submit")} {t("daily_report")}
                    </>
                  )}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Submitted reports list for managers/owners */}
        {(user?.role === "manager" ||
          user?.role === "owner" ||
          user?.role === "systemAdmin") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Submitted Daily Reports</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Reports submitted by cashiers for today
                </p>
              </CardHeader>
              <CardContent>
                {reportsList.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No reports submitted yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="p-2">Cashier</th>
                          <th className="p-2">Total Sales</th>
                          <th className="p-2">Cash</th>
                          <th className="p-2">Bank</th>
                          <th className="p-2">Discounts</th>
                          <th className="p-2">Notes</th>
                          <th className="p-2">Submitted At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsList.map((r) => (
                          <tr key={r._id} className="border-t">
                            <td className="p-2">{r.cashierName}</td>
                            <td className="p-2 font-medium">
                              {Number(r.totalSales || 0).toLocaleString()}
                            </td>
                            <td className="p-2">
                              {Number(r.cashReceived || 0).toLocaleString()}
                            </td>
                            <td className="p-2">
                              {Number(r.bankTransfer || 0).toLocaleString()}
                            </td>
                            <td className="p-2">
                              {Number(r.discountsGiven || 0).toLocaleString()}
                            </td>
                            <td className="p-2">{r.notes || "-"}</td>
                            <td className="p-2">
                              {new Date(r.createdAt).toLocaleTimeString()}
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

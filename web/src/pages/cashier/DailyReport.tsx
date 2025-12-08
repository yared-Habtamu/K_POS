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

  useEffect(() => {
    let mounted = true;
    if (mounted) fetchDaily();
    const id = setInterval(fetchDaily, 5000); // poll every 5s to update in near real-time
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: t("report_submitted"),
      description: `Daily report for ${format(
        new Date(),
        "MMM dd, yyyy"
      )} submitted successfully`,
    });

    setIsSubmitting(false);
    setReport({
      totalSales: "",
      cashReceived: "",
      bankTransfer: "",
      discountsGiven: "",
      notes: "",
    });
  };

  return (
    <RoleLayout allowedRoles={["cashier"]}>
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
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </RoleLayout>
  );
}

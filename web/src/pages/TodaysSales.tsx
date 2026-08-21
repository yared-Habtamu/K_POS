import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import useTodaysSales from "@/hooks/useTodaysSales";
import TodaysSalesView from "@/components/reports/TodaysSalesView";
import CashierDashboard from "@/components/reports/CashierDashboard";
import SoldItemsTable from "@/components/reports/SoldItemsTable";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import EthiopianDatePicker from "@/components/ui/ethiopian-date-picker";
import { formatEthiopianDateValue, isAmharicLanguage } from "@/utils/ethiopian-calendar";
import { ChevronLeft, ChevronRight, Receipt } from "lucide-react";

const getTodayKey = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (dateStr: string, days: number): string => {
  if (!dateStr) return getTodayKey();
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayStr = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayStr}`;
};

const formatDisplayDate = (dateStr: string) => {
  const todayKey = getTodayKey();
  if (!dateStr) return "";
  if (isAmharicLanguage()) {
    const eth = formatEthiopianDateValue(`${dateStr}T00:00:00`);
    return dateStr === todayKey ? `ዛሬ (${eth})` : eth;
  }
  const [year, month, day] = dateStr.split("-");
  return dateStr === todayKey
    ? `Today (${day}/${month}/${year})`
    : `${day}/${month}/${year}`;
};

const TodaysSales: React.FC = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isCashier = user?.role === "cashier";

  const todayKey = getTodayKey();
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);

  const { items, totals, loading } = useTodaysSales(selectedDate);

  const handlePrevDay = () => {
    setSelectedDate((current) => addDays(current || todayKey, -1));
  };

  const handleNextDay = () => {
    setSelectedDate((current) => {
      const cur = current || todayKey;
      if (cur >= todayKey) return cur;
      const next = addDays(cur, 1);
      return next > todayKey ? todayKey : next;
    });
  };

  return (
    <RoleLayout allowedRoles={["owner", "manager", "cashier"]}>
      <div className="space-y-6">
        {/* Top Control Bar: Title & Date Picker Only */}
        <Card className="border shadow-xs">
          <CardHeader className="py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Receipt className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">
                    {t("sales_report", "Sales Report")}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("filter_and_review_sales_performance", "Review daily sales transactions")}
                  </p>
                </div>
              </div>

              {/* Date Navigation Bar */}
              <div className="flex items-center gap-2 self-start md:self-auto bg-slate-50 dark:bg-slate-900/40 p-1.5 rounded-2xl border">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevDay}
                  className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-800"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <EthiopianDatePicker
                  value={selectedDate}
                  onChange={(ymd) => {
                    if (ymd && ymd <= todayKey) {
                      setSelectedDate(ymd);
                    }
                  }}
                  disableFuture
                  placeholder="Select date"
                  className="w-[190px]"
                />

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextDay}
                  disabled={selectedDate >= todayKey}
                  className="h-8 w-8 rounded-xl border-slate-200 dark:border-slate-800 disabled:opacity-40"
                  aria-label="Next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Content Section */}
        {isCashier ? (
          <>
            <CashierDashboard items={items} totals={totals} />
            <TodaysSalesView
              items={items}
              loading={loading}
              totals={totals}
              selectedDate={selectedDate}
              hideHeader
            />
            <div className="mt-6">
              <SoldItemsTable items={items} totals={totals} loading={loading} />
            </div>
          </>
        ) : (
          <>
            <TodaysSalesView
              items={items}
              loading={loading}
              totals={totals}
              selectedDate={selectedDate}
            />
            <div className="mt-6">
              <SoldItemsTable items={items} totals={totals} loading={loading} />
            </div>
          </>
        )}
      </div>
    </RoleLayout>
  );
};

export default TodaysSales;

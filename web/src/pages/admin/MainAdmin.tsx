import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";

type SeriesPoint = { date: string; total: number };

type Mart = {
  _id?: string;
  martName?: string;
  status?: string;
  createdAt?: string;
};

type Summary = {
  range?: string;
  start?: string;
  end?: string;
  totalSales?: number;
  grossSales?: number;
  discountsTotal?: number;
  salesByPaymentMethod?: Array<{ method: string; total: number }>;
  salesByCashier?: Array<{
    cashierId?: string;
    cashierName?: string;
    sales?: number;
  }>;
  series?: SeriesPoint[];
  count?: number;
};

export default function MainAdmin() {
  const { t } = useTranslation();
  const auth = useAuthStore((s) => s.user);
  const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || "";

  const [marts, setMarts] = useState<Mart[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [users, setUsers] = useState<Array<{ martId?: string }>>([]);
  const [martsByMonth, setMartsByMonth] = useState<SeriesPoint[]>([]);
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [periodLabel, setPeriodLabel] = useState("Last 6 months");
  const [newApprovedInPeriod, setNewApprovedInPeriod] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      try {
        const token = auth?.token;
        const headers: Record<string, string> | undefined = token
          ? { Authorization: `Bearer ${token}` }
          : undefined;

        // fetch marts
        const mres = await fetch(`${API_BASE}/api/marts`);
        let parsed: Mart[] = [];
        if (mres.ok) {
          const martsJson = await mres.json();
          parsed = Array.isArray(martsJson) ? martsJson : [];
          setMarts(parsed);
          setPendingCount(
            parsed.filter((m: Mart) => m.status === "pending").length
          );
        }

        // fetch platform users
        const ures = await fetch(`${API_BASE}/api/auth/users`, { headers });
        if (ures.ok) {
          const uj = await ures.json();
          setUsers(Array.isArray(uj) ? uj : []);
        }

        // fetch platform summary for selected period
        let summaryUrl = `${API_BASE}/api/reports/summary?range=monthly`;
        let periodStart: Date | undefined;
        let periodEnd: Date | undefined;
        if (period === "week") {
          summaryUrl = `${API_BASE}/api/reports/summary?range=weekly`;
          setPeriodLabel("Last 7 days");
        } else if (period === "month") {
          summaryUrl = `${API_BASE}/api/reports/summary?range=monthly`;
          setPeriodLabel("Last 6 months");
        } else if (period === "year") {
          // use custom for year: last 12 months
          const now2 = new Date();
          periodEnd = new Date(
            now2.getFullYear(),
            now2.getMonth(),
            now2.getDate()
          );
          periodStart = new Date(
            now2.getFullYear() - 1,
            now2.getMonth(),
            now2.getDate()
          );
          const qs = new URLSearchParams({
            range: "custom",
            start: periodStart.toISOString().slice(0, 10),
            end: periodEnd.toISOString().slice(0, 10),
          }).toString();
          summaryUrl = `${API_BASE}/api/reports/summary?${qs}`;
          setPeriodLabel("Last 12 months");
        }
        const sres = await fetch(summaryUrl, { headers });
        if (sres.ok) {
          const sj: Summary = await sres.json();
          setSummary(sj);
          setSeries(Array.isArray(sj.series) ? sj.series : []);
        }

        // compute marts per selected period (last 6 buckets)
        const now = new Date();
        const buckets: string[] = [];
        const byBucket: Record<string, number> = {};
        const byBucketApproved: Record<string, number> = {};
        if (period === "week") {
          // last 6 weeks (label by date range)
          for (let i = 5; i >= 0; i--) {
            const end = new Date(now);
            end.setDate(now.getDate() - i * 7);
            const startOfWeek = new Date(end);
            startOfWeek.setDate(end.getDate() - 6);
            const label = `${startOfWeek.toISOString().slice(0, 10)} to ${end
              .toISOString()
              .slice(0, 10)}`;
            buckets.push(label);
            byBucket[label] = 0;
            byBucketApproved[label] = 0;
          }
          for (const m of parsed) {
            if (!m.createdAt) continue;
            const created = new Date(m.createdAt);
            for (const label of buckets) {
              const [s, e] = label.split(" to ");
              const sd = new Date(s);
              const ed = new Date(e + "T23:59:59.999Z");
              if (created >= sd && created <= ed) {
                byBucket[label] = (byBucket[label] || 0) + 1;
                if (m.status === "approved")
                  byBucketApproved[label] = (byBucketApproved[label] || 0) + 1;
                break;
              }
            }
          }
        } else if (period === "month") {
          // last 6 months
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toISOString().slice(0, 7); // YYYY-MM
            buckets.push(key);
            byBucket[key] = 0;
            byBucketApproved[key] = 0;
          }
          for (const m of parsed) {
            const key = m.createdAt ? m.createdAt.slice(0, 7) : null;
            if (key && buckets.includes(key)) {
              byBucket[key] = (byBucket[key] || 0) + 1;
              if (m.status === "approved")
                byBucketApproved[key] = (byBucketApproved[key] || 0) + 1;
            }
          }
        } else {
          // year: last 6 years
          for (let i = 5; i >= 0; i--) {
            const y = now.getFullYear() - i;
            const key = String(y);
            buckets.push(key);
            byBucket[key] = 0;
            byBucketApproved[key] = 0;
          }
          for (const m of parsed) {
            if (!m.createdAt) continue;
            const y = new Date(m.createdAt).getFullYear();
            const key = String(y);
            if (buckets.includes(key)) {
              byBucket[key] = (byBucket[key] || 0) + 1;
              if (m.status === "approved")
                byBucketApproved[key] = (byBucketApproved[key] || 0) + 1;
            }
          }
        }
        setMartsByMonth(
          buckets.map((k) => ({ date: k, total: byBucket[k] || 0 }))
        );
        setNewApprovedInPeriod(
          Object.keys(byBucketApproved).reduce(
            (acc, k) => acc + (byBucketApproved[k] || 0),
            0
          )
        );
      } catch (err) {
        console.error("Failed to load admin data", err);
      }
    };
    load();
  }, [API_BASE, auth, period]);

  const approvedCount = marts.filter((m) => m.status === "approved").length;
  const activeUsersCount = users.filter((u) => !!u.martId).length;
  // platform revenue: assume each approved mart pays 10,000 birr (monthly)
  const PLATFORM_FEE = 10000;
  const platformRevenue = approvedCount * PLATFORM_FEE;

  const getPeriodLabel = () => {
    if (period === "week") return t("last_6_weeks") || "Last 6 weeks";
    if (period === "year") return t("last_12_months") || "Last 12 months";
    return t("last_6_months") || "Last 6 months";
  };

  return (
    <RoleLayout allowedRoles={["system_admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t("system_administration")}</h1>
          <p className="text-muted-foreground">
            {t("system_admin_overview")}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("platform_revenue")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis
                      className="text-xs"
                      tickFormatter={(v) => `${(v as number) / 1000}K`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [
                        `${value.toLocaleString()} ETB`,
                        t("revenue") || "Revenue",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="rgba(59,130,246,0.12)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("this_month_sales")}
                  </p>
                  <p className="text-2xl font-semibold">
                    {summary
                      ? (summary.totalSales || 0).toLocaleString() + " ETB"
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t("platform_fee_revenue")}
                  </p>
                  <p className="text-2xl font-semibold">
                    {platformRevenue.toLocaleString()} ETB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("quick_stats")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t("total_shops")}</p>
                    <p className="text-lg font-semibold">{marts.length}</p>
                  </div>
                  <Badge variant="secondary">
                    {approvedCount > 0 ? t("active_status") : t("inactive_status")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("total_transactions")}
                    </p>
                    <p className="text-lg font-semibold">
                      {summary ? summary.count : "—"}
                    </p>
                  </div>
                  <Badge variant="secondary">{t("records")}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {t("pending_approvals")}
                    </p>
                    <p className="text-lg font-semibold">{pendingCount}</p>
                  </div>
                  <Badge variant="secondary">{t("review") || "Review"}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>{t("marts_registered")}</CardTitle>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground mr-2 hidden md:block">
                  {getPeriodLabel()}
                </p>
                <select
                  value={period}
                  onChange={(e) =>
                    setPeriod(e.target.value as "week" | "month" | "year")
                  }
                  className="text-sm rounded-md border px-2 py-1 bg-card"
                >
                  <option value="week">{t("week") || "Week"}</option>
                  <option value="month">{t("month") || "Month"}</option>
                  <option value="year">{t("year") || "Year"}</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={martsByMonth}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">{t("active_users")}</p>
                <p className="text-lg font-semibold">{activeUsersCount}</p>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    {t("new_approved_marts")} ({getPeriodLabel()})
                  </p>
                  <p className="text-sm font-medium">{newApprovedInPeriod}</p>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    {t("platform_fee_revenue")} ({getPeriodLabel()})
                  </p>
                  <p className="text-sm font-medium">
                    {(newApprovedInPeriod * PLATFORM_FEE).toLocaleString()} ETB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleLayout>
  );
}

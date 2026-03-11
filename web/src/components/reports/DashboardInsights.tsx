import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { useAuthStore } from "@/stores/authStore";

type CategorySalesEntry = {
  category: string;
  total: number;
  percentage: number;
};

type PaymentMethodEntry = {
  method: string;
  total: number;
};

type DashboardMetrics = {
  categorySales?: CategorySalesEntry[];
  salesByPaymentMethod?: PaymentMethodEntry[];
};

type EmployeeRecord = {
  id?: string;
  _id?: string;
  name?: string;
  username?: string;
  role?: string;
};

type EmployeeSort = "role_asc" | "role_desc" | "name_asc" | "name_desc" | "username_asc" | "username_desc";

const PAYMENT_METHOD_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function normalizeRole(role?: string) {
  const normalized = String(role || "").trim();
  if (normalized === "storeKeeper") return "store_keeper";
  if (normalized === "systemAdmin") return "system_admin";
  return normalized.toLowerCase();
}

function roleLabel(role: string, t: (key: string) => string) {
  switch (role) {
    case "cashier":
      return t("cashier");
    case "store_keeper":
      return t("store_keeper");
    case "manager":
      return t("manager");
    case "owner":
      return t("owner");
    case "system_admin":
      return t("system_admin");
    default:
      return role || t("unknown");
  }
}

function paymentLabel(method: string | undefined, t: (key: string) => string) {
  switch (String(method || "").toLowerCase()) {
    case "cash":
      return t("cash");
    case "card":
      return t("card");
    case "telebirr":
      return t("telebirr");
    case "cbe_bank":
      return t("cbe_bank");
    case "wallet":
      return t("wallet");
    default:
      return String(method || t("unknown")).replace(/_/g, " ");
  }
}

interface DashboardInsightsProps {
  metrics: DashboardMetrics | null;
  isLoadingMetrics: boolean;
  metricsError: string | null;
}

export function DashboardInsights({
  metrics,
  isLoadingMetrics,
  metricsError,
}: DashboardInsightsProps) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState("all");
  const [employeeSort, setEmployeeSort] = useState<EmployeeSort>("role_asc");
  const API_BASE = import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    let mounted = true;

    const fetchEmployees = async () => {
      if (!user?.martId || !user?.token) return;
      setIsLoadingEmployees(true);
      setEmployeeError(null);
      try {
        const res = await fetch(`${API_BASE}/api/auth/users?martId=${user.martId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        const data = await res.json().catch(() => []);
        if (!res.ok) {
          throw new Error(data?.message || `status ${res.status}`);
        }
        if (mounted) {
          setEmployees(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (mounted) {
          setEmployeeError(error instanceof Error ? error.message : t("failed_to_load_employees"));
        }
      } finally {
        if (mounted) {
          setIsLoadingEmployees(false);
        }
      }
    };

    void fetchEmployees();
    const intervalId = window.setInterval(fetchEmployees, 30_000);
    window.addEventListener("focus", fetchEmployees);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", fetchEmployees);
    };
  }, [API_BASE, user?.martId, user?.token]);

  const topCategories = useMemo(
    () => (Array.isArray(metrics?.categorySales) ? metrics.categorySales.slice(0, 5) : []),
    [metrics?.categorySales],
  );

  const paymentMethods = useMemo(
    () =>
      (Array.isArray(metrics?.salesByPaymentMethod) ? metrics.salesByPaymentMethod : []).map((entry) => ({
        ...entry,
        label: paymentLabel(entry.method, t),
      })),
    [metrics?.salesByPaymentMethod, t],
  );

  const employeeRoleOptions = useMemo(() => {
    const roles = Array.from(new Set(employees.map((employee) => normalizeRole(employee.role)).filter(Boolean)));

    return roles
      .map((role) => ({
        value: role,
        label: roleLabel(role, t),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [employees, t]);

  const filteredEmployees = useMemo(() => {
    const roleFiltered =
      employeeRoleFilter === "all"
        ? employees
        : employees.filter((employee) => normalizeRole(employee.role) === employeeRoleFilter);

    const sorted = roleFiltered.slice();
    sorted.sort((left, right) => {
      const leftName = String(left.name || left.username || t("unknown"));
      const rightName = String(right.name || right.username || t("unknown"));
      const leftUsername = String(left.username || "");
      const rightUsername = String(right.username || "");
      const leftRole = roleLabel(normalizeRole(left.role), t);
      const rightRole = roleLabel(normalizeRole(right.role), t);

      switch (employeeSort) {
        case "role_desc":
          return rightRole.localeCompare(leftRole);
        case "name_asc":
          return leftName.localeCompare(rightName);
        case "name_desc":
          return rightName.localeCompare(leftName);
        case "username_asc":
          return leftUsername.localeCompare(rightUsername);
        case "username_desc":
          return rightUsername.localeCompare(leftUsername);
        case "role_asc":
        default:
          return leftRole.localeCompare(rightRole);
      }
    });

    return sorted;
  }, [employeeRoleFilter, employeeSort, employees, t]);

  const employeeSortOptions = useMemo(
    () => [
      { value: "role_asc", label: t("role_a_z") },
      { value: "role_desc", label: t("role_z_a") },
      { value: "name_asc", label: t("name_a_to_z") },
      { value: "name_desc", label: t("name_z_to_a") },
      { value: "username_asc", label: t("username_a_to_z") },
      { value: "username_desc", label: t("username_z_to_a") },
    ],
    [t],
  );

  const employeeColumns = useMemo<Array<DataTableColumn<EmployeeRecord>>>(
    () => [
      {
        key: "name",
        header: t("name"),
        accessor: (employee) => employee.name || employee.username || t("unknown"),
        searchable: true,
      },
      {
        key: "username",
        header: t("username"),
        accessor: (employee) => employee.username || "-",
        searchable: true,
      },
      {
        key: "role",
        header: t("role"),
        accessor: (employee) => roleLabel(normalizeRole(employee.role), t),
      },
    ],
    [t],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{t("top_categories")}</CardTitle>
          <CardDescription>{t("top_categories_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            {isLoadingMetrics ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("loading_category_sales")}</div>
            ) : metricsError ? (
              <div className="p-4 text-sm text-destructive">{t("failed_to_load_category_sales")}: {metricsError}</div>
            ) : topCategories.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("no_category_sales_data_available")}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCategories} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="category" type="category" width={100} className="text-xs" />
                  <Tooltip
                    formatter={(value: number, _name, payload: { payload?: CategorySalesEntry }) => [
                      `${Number(value || 0).toLocaleString()} ETB`,
                      payload?.payload ? `${payload.payload.percentage.toFixed(1)}%` : t("sales"),
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {topCategories.length > 0 ? (
            <div className="mt-4 space-y-2">
              {topCategories.map((entry) => (
                <div key={entry.category} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{entry.category}</span>
                  <span className="font-medium">{entry.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader>
          <CardTitle>{t("payment_methods")}</CardTitle>
          <CardDescription>{t("payment_methods_description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            {isLoadingMetrics ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("loading_payment_methods")}</div>
            ) : metricsError ? (
              <div className="p-4 text-sm text-destructive">{t("failed_to_load_payment_methods")}: {metricsError}</div>
            ) : paymentMethods.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t("no_payment_method_data_available")}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value: number, _name, payload: { payload?: PaymentMethodEntry & { label?: string } }) => [
                      `${Number(value || 0).toLocaleString()} ETB`,
                      payload?.payload?.label || t("total"),
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Pie
                    data={paymentMethods}
                    dataKey="total"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={88}
                    paddingAngle={3}
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell
                        key={entry.method}
                        fill={PAYMENT_METHOD_COLORS[index % PAYMENT_METHOD_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {paymentMethods.length > 0 ? (
            <div className="mt-4 space-y-2">
              {paymentMethods.map((entry, index) => (
                <div key={entry.method} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PAYMENT_METHOD_COLORS[index % PAYMENT_METHOD_COLORS.length] }}
                    />
                    {entry.label}
                  </span>
                  <span className="font-medium">{Number(entry.total || 0).toLocaleString()} ETB</span>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="lg:col-span-2">
        <DataTable
          columns={employeeColumns}
          data={filteredEmployees}
          rowKey={(employee, index) => employee.id || employee._id || employee.username || employee.name || `employee-${index}`}
          title={t("employees_summary")}
          description={t("employees_summary_description")}
          isLoading={isLoadingEmployees}
          loadingMessage={t("loading_employees")}
          emptyMessage={employeeError ? `${t("failed_to_load_employees")}: ${employeeError}` : t("no_employee_records_found")}
          searchable
          searchPlaceholder={t("employee_name")}
          searchKeys={[
            (employee) => employee.name || "",
            (employee) => employee.username || "",
          ]}
          pagination
          initialPageSize={5}
          pageSizeOptions={[5, 10, 20]}
          toolbarContent={
            <>
              <div className="min-w-[180px]">
                <Select value={employeeRoleFilter} onValueChange={setEmployeeRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("select_role")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all_roles")}</SelectItem>
                    {employeeRoleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[180px]">
                <Select value={employeeSort} onValueChange={(value) => setEmployeeSort(value as EmployeeSort)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("sort_by")} />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeSortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="secondary">{t("total_employees")}: {employees.length}</Badge>
            </>
          }
        />
      </div>
    </div>
  );
}
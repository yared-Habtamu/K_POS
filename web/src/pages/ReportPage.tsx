// src/pages/ReportPage.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { RoleLayout } from "@/components/layout/RoleLayout";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import useReports from "@/hooks/useReports";
import EthiopianDatePicker from "@/components/ui/ethiopian-date-picker";
import { formatLocalizedDate, formatEthiopianDateValue } from "@/utils/ethiopian-calendar";
import {
  TrendingUp,
  ShoppingBag,
  Package,
  DollarSign,
  CreditCard,
  Landmark,
  AlertTriangle,
  RefreshCw,
  FileDown,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { toast } from "sonner";

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (v: string | number) =>
  `${Number(v || 0).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;

const fmtN = (v: string | number) => Number(v || 0).toLocaleString();

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

// ─── component ──────────────────────────────────────────────────────────────

const ReportPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState<
    "daily" | "weekly" | "monthly" | "custom"
  >("monthly");
  const [referenceDate, setReferenceDate] = useState<Date>(() => new Date());

  // Default custom range: current month (Gregorian), recalculated on mount
  const [customDates, setCustomDates] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return {
      start: `${year}-${month}-01`,
      end: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
    };
  });
  const TOP_PRODUCTS_CHART_SIZE = 10;

  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const currentRange = React.useMemo(() => {
    const d = new Date(referenceDate);
    if (period === "daily") {
      const ymd = formatYMD(d);
      return { start: ymd, end: ymd, label: formatEthiopianDateValue(d) };
    }
    if (period === "weekly") {
      const end = new Date(d);
      const start = new Date(d);
      start.setDate(d.getDate() - 6);
      return {
        start: formatYMD(start),
        end: formatYMD(end),
        label: `${formatEthiopianDateValue(start)} – ${formatEthiopianDateValue(end)}`,
      };
    }
    if (period === "monthly") {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return {
        start: formatYMD(start),
        end: formatYMD(end),
        label: `${formatEthiopianDateValue(start)} – ${formatEthiopianDateValue(end)}`,
      };
    }
    // custom: use the Ethiopian date label for both endpoints
    return {
      start: customDates.start,
      end: customDates.end,
      label: `${formatEthiopianDateValue(customDates.start)} – ${formatEthiopianDateValue(customDates.end)}`,
    };
  }, [period, referenceDate, customDates]);

  const handleStepDate = (direction: "prev" | "next") => {
    const factor = direction === "prev" ? -1 : 1;
    if (period === "daily") {
      const nextDate = new Date(referenceDate);
      nextDate.setDate(referenceDate.getDate() + factor * 1);
      setReferenceDate(nextDate);
    } else if (period === "weekly") {
      const nextDate = new Date(referenceDate);
      nextDate.setDate(referenceDate.getDate() + factor * 7);
      setReferenceDate(nextDate);
    } else if (period === "monthly") {
      const nextDate = new Date(referenceDate);
      nextDate.setMonth(referenceDate.getMonth() + factor * 1);
      setReferenceDate(nextDate);
    } else if (period === "custom") {
      // Parse start/end as local dates (YYYY-MM-DD) to avoid UTC offset shifting
      const [sy, sm, sd] = customDates.start.split("-").map(Number);
      const [ey, em, ed] = customDates.end.split("-").map(Number);
      const s = new Date(sy, sm - 1, sd);
      const e = new Date(ey, em - 1, ed);
      // Range length in whole days (inclusive), minimum 1 day
      const diffDays = Math.max(
        1,
        Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1,
      );
      const nextS = new Date(sy, sm - 1, sd + factor * diffDays);
      const nextE = new Date(ey, em - 1, ed + factor * diffDays);
      setCustomDates({ start: formatYMD(nextS), end: formatYMD(nextE) });
    }
  };

  const getDateRangeLabel = () => currentRange.label;

  const {
    data: reportsData,
    loading: reportsLoading,
    refetch,
  } = useReports({
    period,
    start: currentRange.start,
    end: currentRange.end,
  });

  const [localData, setLocalData] = useState(() => ({
    totalSales: "0.00",
    totalOrders: 0,
    totalItemsSold: 0,
    avgOrderValue: "0.00",
    expenses: "0.00",
    grossSales: "0.00",
    netSales: "0.00",
    discounts: "0.00",
    refunds: "0.00",
    taxes: "0.00",
    paymentMethods: {
      cash: "0.00",
      card: "0.00",
      mobile: "0.00",
      credit: "0.00",
    },
    topProducts: [] as any[],
    revenue: "0.00",
    cogs: "0.00",
    grossProfit: "0.00",
    grossMargin: 0,
    netProfit: "0.00",
    totalTax: "0.00",
    taxByCategory: [] as any[],
    products: [] as any[],
    expiredProductsCount: 0,
    expiredProducts: [] as any[],
    brokenAssetsCount: 0,
    brokenAssets: [] as any[],
  }));

  React.useEffect(() => {
    if (reportsData) setLocalData(reportsData as any);
  }, [reportsData]);

  // ─── Derived financial figures (computed for accuracy) ─────────────────────
  const derivedFinancials = React.useMemo(() => {
    const revenue = Number(localData.revenue || 0);
    const cogs = Number(localData.cogs || 0);
    const grossProfit = revenue - cogs;
    // Prefer server-provided netProfit (matches dashboard). Otherwise compute as grossProfit - expenses.
    const serverNet = Number(localData.netProfit || 0);
    const expensesVal = Number(localData.expenses || 0);
    const netProfit = serverNet !== 0 ? serverNet : grossProfit - expensesVal;
    return { grossProfit, netProfit };
  }, [localData.revenue, localData.cogs, localData.netProfit, localData.expenses]);

  const paymentData = React.useMemo(() => {
    if (
      Array.isArray((localData as any).salesByPaymentMethod) &&
      (localData as any).salesByPaymentMethod.length > 0
    ) {
      return (localData as any).salesByPaymentMethod
        .filter((d: any) => Number(d.total || 0) > 0)
        .map((d: any) => {
          const rawMethod = String(d.method || "").toLowerCase();
          const translated = t(rawMethod);
          const displayName =
            translated && translated !== rawMethod
              ? translated
              : rawMethod
                  .split("_")
                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(" ");
          return {
            name: displayName,
            value: Number(d.total || 0),
            rawKey: rawMethod,
          };
        });
    }

    const pm = localData.paymentMethods || {};
    return Object.entries(pm)
      .filter(([_, val]) => Number(val || 0) > 0)
      .map(([key, val]) => {
        const rawMethod = String(key || "").toLowerCase();
        const translated = t(rawMethod);
        const displayName =
          translated && translated !== rawMethod
            ? translated
            : rawMethod
                .split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");
        return {
          name: displayName,
          value: Number(val || 0),
          rawKey: rawMethod,
        };
      });
  }, [localData, t]);

  const paymentTotal = React.useMemo(() => {
    return paymentData.reduce((s, d) => s + d.value, 0);
  }, [paymentData]);

  const topProducts = React.useMemo(
    () =>
      Array.isArray(localData.topProducts) ? localData.topProducts : [],
    [localData.topProducts],
  );

  const topProductsChart = React.useMemo(
    () => topProducts.slice(0, TOP_PRODUCTS_CHART_SIZE),
    [topProducts],
  );

  const topProductsRows = React.useMemo(
    () =>
      topProducts.map((item: any, index: number) => ({
        id: item.id || item.productId || item.name || `top-product-${index}`,
        rank: index + 1,
        name: item.name,
        sold: Number(item.sold || 0),
        revenue: Number(item.revenue || 0),
        priceTiers: Array.isArray(item.priceTiers)
          ? item.priceTiers.map((tier: any) => ({
              price: Number(tier.price || 0),
              qty: Number(tier.qty || 0),
              subtotal: Number(tier.subtotal || 0),
            }))
          : [],
      })),
    [topProducts],
  );

  const topProductsColumns = React.useMemo<
    Array<DataTableColumn<{
      id: string;
      rank: number;
      name: string;
      sold: number;
      revenue: number;
      priceTiers: Array<{ price: number; qty: number; subtotal: number }>;
    }>>
  >(
    () => [
      {
        key: "name",
        header: t("product"),
        accessor: "name",
        sortable: true,
        searchable: true,
        className: "font-medium",
      },
      {
        key: "sold",
        header: t("units_sold"),
        accessor: "sold",
        sortable: true,
        className: "text-right",
        headerClassName: "text-right",
        cell: (row) => fmtN(row.sold),
        sortValue: (row) => row.sold,
      },
      {
        key: "revenue",
        header: t("revenue"),
        accessor: "revenue",
        sortable: true,
        className: "text-right font-semibold",
        headerClassName: "text-right",
        cell: (row) => fmt(row.revenue),
        sortValue: (row) => row.revenue,
      },
    ],
    [t],
  );

  // ─── Excel export ──────────────────────────────────────────────────────────
  // Ensure products list is loaded for mart-scoped users (owner/manager)
  const ensureProductsLoaded = async (): Promise<any[]> => {
    try {
      if (Array.isArray(localData.products) && localData.products.length > 0) return localData.products;
      if (!user) return;
      if (!(user.role === "owner" || user.role === "manager")) return;

      // Prefer products included in reportsData if available (avoids extra fetch)
      if (reportsData && Array.isArray((reportsData as any).products) && (reportsData as any).products.length > 0) {
        const list = (reportsData as any).products;
        setLocalData((ld) => ({ ...ld, products: list }));
        return list;
      }

      // Try to proactively refresh reports if products are missing (user may have clicked export immediately)
      try {
        if (typeof refetch === "function") {
          // Await the refetch to get freshest data from server
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          await refetch();
        }
      } catch (e) {
        // ignore refetch errors
      }

      // Wait briefly for reportsData to be populated after refetch
      const start = Date.now();
      while (Date.now() - start < 2500) {
        if (reportsData && Array.isArray((reportsData as any).products) && (reportsData as any).products.length > 0) {
          setLocalData((ld) => ({ ...ld, products: (reportsData as any).products }));
          return;
        }
        await new Promise((r) => setTimeout(r, 150));
      }

      // Fallback: fetch all products from API with a large limit to avoid pagination truncation
      const martId = user.martId;
      if (!martId) return [];
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const url = `${API_BASE}/api/products?martId=${encodeURIComponent(String(martId))}&limit=10000`;
      const res = await fetch(url, {
        headers: { Authorization: user.token ? `Bearer ${user.token}` : "" },
      });
      if (!res.ok) return [];
      const list = await res.json();
      if (!Array.isArray(list)) return [];
      setLocalData((ld) => ({ ...ld, products: list }));
      return list;
    } catch (e) {
      // ignore fetch failure; exports will proceed without products
      console.error("Failed to load products for export", e);
      return [];
    }
  };

  const exportToExcel = async () => {
    const productsList = await ensureProductsLoaded();
    const wb = XLSX.utils.book_new();
    const dl = getDateRangeLabel();
    const salesData = [
      { Metric: t("report_period"), Value: dl },
      { Metric: t("total_sales"), Value: fmt(localData.totalSales) },
      { Metric: t("total_orders"), Value: fmtN(localData.totalOrders) },
      { Metric: t("total_items_sold"), Value: fmtN(localData.totalItemsSold) },
      { Metric: t("total_expenses"), Value: fmt(localData.expenses) },
      { Metric: t("gross_sales"), Value: fmt(localData.grossSales) },
      { Metric: t("net_sales"), Value: fmt(localData.netSales) },
      { Metric: t("discounts"), Value: fmt(localData.discounts) },
      { Metric: t("refunds"), Value: fmt(localData.refunds) },
      { Metric: t("taxes"), Value: fmt(localData.taxes) },
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(salesData),
      "1. Sales Summary",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        paymentData.length > 0
          ? paymentData.map((d) => ({
              Method: d.name,
              Amount: fmt(d.value),
              Percentage: paymentTotal
                ? `${((d.value / paymentTotal) * 100).toFixed(1)}%`
                : "0%",
            }))
          : [{ Method: "None", Amount: "0.00 ETB", Percentage: "0%" }],
      ),
      "2. Payments",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        localData.topProducts.map((p) => ({
          [t("product")]: p.name,
          [t("units_sold")]: p.sold,
          [t("revenue")]: fmt(p.revenue),
        })),
      ),
      "3. Top Products",
    );
    // ── 4b All Products (product name, stock qty, mart qty, selling price)
    const productsForExport = Array.isArray(productsList) && productsList.length > 0 ? productsList : (Array.isArray(localData.products) ? localData.products : []);
    if (productsForExport.length > 0) {
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          productsForExport.map((p: any) => {
            const selling = Number(p.sellingPrice || p.selling || p.price || 0);
            const stockQty = Number(p.storeQuantity || p.store_qty || 0);
            // mart quantity: prefer supermarketQuantity, fall back to quantity
            const martQty = Number(p.supermarketQuantity || p.supermarket_qty || p.quantity || 0);
            return {
              [t("product")]: p.name,
              [t("stock_quantity") || "Stock Quantity"]: fmtN(stockQty),
              [t("mart_quantity") || "Mart Quantity"]: fmtN(martQty),
              [t("selling_price") || "Selling Price"]: fmt(selling),
            };
          }),
        ),
        "4. All Products",
      );
    }
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        ...localData.expiredProducts.map((p: any) => ({
          Type: "Expired Product",
          Name: p.name,
          Date: p.expiryDate
            ? formatLocalizedDate(p.expiryDate)
            : "-",
          Quantity: p.quantity,
        })),
        ...localData.brokenAssets.map((a: any) => ({
          Type: "Broken Asset",
          Name: a.name,
          Date: a.conditions || a.asset_status || "broken",
          Quantity: a.quantity,
        })),
      ]),
      "5. Expired & Broken",
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([
        { Metric: t("revenue"), Value: fmt(localData.revenue) },
        ...(user?.role === "owner"
          ? [
              {
                Metric: t("gross_profit"),
                Value: fmt(derivedFinancials.grossProfit),
              },
              {
                Metric: t("net_profit"),
                Value: fmt(derivedFinancials.netProfit),
              },
            ]
          : []),
      ]),
      "6. Financial",
    );
    XLSX.writeFile(wb, `SmartPOS_Report_${period}.xlsx`);
    toast.success("Excel exported");
  };

  // ─── PDF export ────────────────────────────────────────────────────────────

  const exportToPDF = async () => {
    const productsList = await ensureProductsLoaded();
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const lm = 14;
    const dl = getDateRangeLabel();

    // ── Header ──
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Smart Supermarket", pageWidth / 2, 18, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Bole Road, Addis Ababa, Ethiopia  •  +251 911 234 567  •  info@smartsupermarket.et",
      pageWidth / 2,
      24,
      { align: "center" },
    );
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Sales & Analytics Report", pageWidth / 2, 33, {
      align: "center",
    });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${dl}`, pageWidth / 2, 39, { align: "center" });
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.8);
    doc.line(lm, 43, pageWidth - lm, 43);

    const HEAD_COLOR: [number, number, number] = [34, 197, 94];
    const headStyles = {
      fillColor: HEAD_COLOR,
      textColor: [255, 255, 255] as [number, number, number],
      fontSize: 9,
      fontStyle: "bold" as const,
    };
    const styles = { fontSize: 9, cellPadding: 3 };

    // ── 1. Sales Summary ──
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("1. Sales Summary", lm, 50);
    autoTable(doc, {
      startY: 53,
      head: [["Metric", "Value"]],
      body: [
        [t("total_sales"), fmt(localData.totalSales)],
        [t("total_orders"), fmtN(localData.totalOrders)],
        [t("total_items_sold"), fmtN(localData.totalItemsSold)],
        [t("total_expenses"), fmt(localData.expenses)],
        [t("gross_sales"), fmt(localData.grossSales)],
        [t("net_sales"), fmt(localData.netSales)],
        [t("discounts"), fmt(localData.discounts)],
        [t("refunds"), fmt(localData.refunds)],
        [t("taxes"), fmt(localData.taxes)],
      ],
      theme: "grid",
      headStyles,
      styles,
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50, halign: "right" },
      },
    });

    // ── 2. Payment Methods ──
    const y1 = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("2. Payment Methods", lm, y1);
    autoTable(doc, {
      startY: y1 + 3,
      head: [["Method", "Amount", "% of Total"]],
      body: [
        ...(paymentData.length > 0
          ? paymentData.map((d) => [
              d.name,
              fmt(d.value),
              paymentTotal
                ? `${((d.value / paymentTotal) * 100).toFixed(1)}%`
                : "-",
            ])
          : [["No payments", "0.00 ETB", "0%"]]),
        ["Total", fmt(paymentTotal), "100%"],
      ],
      theme: "grid",
      headStyles,
      styles,
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 60, halign: "right" },
        2: { cellWidth: 30, halign: "center" },
      },
    });

    // Financial summary will be rendered later as section 6

    // ── 3. Top Products ──
    if (localData.topProducts.length > 0) {
      const y3 = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("3. Top Selling Products", lm, y3);
      autoTable(doc, {
        startY: y3 + 3,
        head: [["#", "Product", "Units Sold", "Revenue"]],
        body: localData.topProducts.map((p, i) => [
          i + 1,
          p.name,
          fmtN(p.sold),
          fmt(p.revenue),
        ]),
        theme: "grid",
        headStyles,
        styles,
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 80 },
          2: { cellWidth: 30, halign: "center" },
          3: { cellWidth: 40, halign: "right" },
        },
      });
    }

    // ── 4. All Products (product, stock qty, mart qty, selling price) ──
    const productsForExport = Array.isArray(productsList) && productsList.length > 0 ? productsList : (Array.isArray(localData.products) ? localData.products : []);
    if (productsForExport.length > 0) {
      const yAll = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("4. All Products", lm, yAll);
      autoTable(doc, {
        startY: yAll + 3,
        head: [["#", t("product"), t("stock_quantity") || "Stock Qty", t("mart_quantity") || "Mart Qty", t("selling_price") || "Selling Price"]],
        body: productsForExport.map((p: any, i: number) => {
          const selling = Number(p.sellingPrice || p.selling || p.price || 0);
          const stockQty = Number(p.storeQuantity || p.store_qty || 0);
          const martQty = Number(p.supermarketQuantity || p.supermarket_qty || p.quantity || 0);
          return [i + 1, p.name || "-", fmtN(stockQty), fmtN(martQty), fmt(selling)];
        }),
        theme: "grid",
        headStyles,
        styles,
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 70 },
          2: { cellWidth: 30, halign: "right" },
          3: { cellWidth: 30, halign: "right" },
          4: { cellWidth: 40, halign: "right" },
        },
      });
    }

    // taxByCategory will be included under Financial (section 6)

    const issues = [
      ...(localData.expiredProducts || []).map((p: any) => [
        "Expired Product",
        p.name,
        p.expiryDate ? formatLocalizedDate(p.expiryDate) : "-",
        fmtN(p.quantity || 0),
      ]),
      ...(localData.brokenAssets || []).map((a: any) => [
        "Broken Asset",
        a.name,
        a.conditions || a.asset_status || "broken",
        fmtN(a.quantity || 0),
      ]),
    ];
    if (issues.length > 0) {
      const y5 = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("5. Expired and Broken Items", lm, y5);
      autoTable(doc, {
        startY: y5 + 3,
        head: [["Type", "Name", "Status/Date", "Quantity"]],
        body: issues,
        theme: "grid",
        headStyles,
        styles,
      });
    }

    // ── 6. Financial (includes taxes) ──
    const yFin = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("6. Financial", lm, yFin);
    autoTable(doc, {
      startY: yFin + 3,
      head: [["Metric", "Value"]],
      body: [
        [t("revenue"), fmt(localData.revenue)],
        [t("taxes"), fmt(localData.totalTax || localData.taxes)],
        ...(user?.role === "owner"
          ? [
              [t("gross_profit"), fmt(derivedFinancials.grossProfit)],
              [t("net_profit"), fmt(derivedFinancials.netProfit)],
            ]
          : []),
      ],
      theme: "grid",
      headStyles,
      styles,
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 50, halign: "right" },
      },
    });

    if (localData.taxByCategory && localData.taxByCategory.length > 0) {
      const yTax = (doc as any).lastAutoTable.finalY + 6;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Tax Breakdown", lm, yTax);
      autoTable(doc, {
        startY: yTax + 3,
        head: [[t("category"), t("tax_amount")]],
        body: [
          ...localData.taxByCategory.map((item: any) => [item.category, fmt(item.tax)]),
          ["Total", fmt(localData.totalTax)],
        ],
        theme: "grid",
        headStyles,
        styles,
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 50, halign: "right" },
        },
      });
    }

    // ── Footer ──
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const ph = doc.internal.pageSize.height;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(lm, ph - 16, pageWidth - lm, ph - 16);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("Kiya POS System • Generated automatically", lm, ph - 10);
      doc.text(`Page ${i} / ${pageCount}`, pageWidth - lm, ph - 10, {
        align: "right",
      });
      doc.text(`${dl}`, pageWidth / 2, ph - 10, { align: "center" });
    }

    doc.save(
      `SmartPOS_Report_${period}_${new Date().toISOString().split("T")[0]}.pdf`,
    );
    toast.success("PDF exported");
  };

  // ─── UI ───────────────────────────────────────────────────────────────────

  const summaryCards = [
    {
      title: t("total_sales"),
      value: fmt(localData.totalSales),
      Icon: DollarSign,
      color: "text-emerald-500",
    },
    {
      title: t("total_orders"),
      value: fmtN(localData.totalOrders),
      Icon: ShoppingBag,
      color: "text-blue-500",
    },
    {
      title: t("total_items_sold"),
      value: fmtN(localData.totalItemsSold),
      Icon: Package,
      color: "text-purple-500",
    },
    ...(user?.role === "owner"
      ? [
          {
            title: t("gross_profit"),
            value: fmt(derivedFinancials.grossProfit),
            Icon: TrendingUp,
            color: "text-amber-500",
          },
        ]
      : []),
    {
      title: t("total_expenses"),
      value: fmt(localData.expenses),
      Icon: AlertTriangle,
      color: "text-rose-500",
    },
    ...(user?.role === "owner"
      ? [
          {
            title: t("net_profit"),
            value: fmt(derivedFinancials.netProfit),
            Icon: Landmark,
            color: "text-teal-500",
          },
        ]
      : []),
    {
      title: "Expired Products",
      value: fmtN(localData.expiredProductsCount),
      Icon: AlertTriangle,
      color: "text-amber-500",
    },
    {
      title: "Broken Assets",
      value: fmtN(localData.brokenAssetsCount),
      Icon: AlertTriangle,
      color: "text-rose-500",
    },
  ];

  return (
    <RoleLayout allowedRoles={["owner", "manager"]}>
      <div className="space-y-4 p-4 sm:p-6">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              {t("sales_reports")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {getDateRangeLabel()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={reportsLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${reportsLoading ? "animate-spin" : ""}`}
              />
              {reportsLoading ? "Loading..." : t("refresh")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="border-green-300 text-green-700 hover:bg-green-50"
            >
              <FileDown className="h-4 w-4 mr-2" /> Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        </div>

        {/* ── Period Selector ── */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold mr-1">
                  {t("report_period")}:
                </span>
                {(["daily", "weekly", "monthly", "custom"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period === p ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
                  >
                    {t(p)}
                  </button>
                ))}
                {period === "custom" && (
                  <div className="flex items-center gap-2 ml-2">
                    <EthiopianDatePicker
                      value={customDates.start}
                      onChange={(ymd) =>
                        setCustomDates({ ...customDates, start: ymd })
                      }
                      placeholder="Start"
                      className="w-[170px]"
                    />
                    <span className="text-muted-foreground">–</span>
                    <EthiopianDatePicker
                      value={customDates.end}
                      onChange={(ymd) =>
                        setCustomDates({ ...customDates, end: ymd })
                      }
                      placeholder="End"
                      className="w-[170px]"
                    />
                  </div>
                )}
              </div>

              {/* Stepping Navigation Arrows (Daily: -1/+1 day, Weekly: -7/+7 days, Monthly: -1/+1 month, Custom: -range/+range) */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleStepDate("prev")}
                  title={`Previous ${period}`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span
                  className="text-xs sm:text-sm font-semibold px-2 min-w-[160px] max-w-[260px] text-center select-none truncate"
                  title={currentRange.label}
                >
                  {currentRange.label}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleStepDate("next")}
                  title={`Next ${period}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Summary Cards ── */}
        {/* 4 columns on xl so all metrics (incl. alerts) fit in 2 rows */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {summaryCards.map(({ title, value, Icon, color }, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground leading-tight truncate">
                        {title}
                      </p>
                      <p className="text-2xl font-bold mt-1 leading-tight">
                        {value}
                      </p>
                    </div>
                  <div className={`p-2 rounded-lg bg-muted ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Payment Methods Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t("payment_methods")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {paymentData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={paymentData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {paymentData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => [fmt(v as number), t("amount")]}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Payment-methods table */}
                  <div className="mt-2 divide-y text-sm">
                    {paymentData.map((pm) => (
                      <div
                        key={pm.name}
                        className="flex justify-between py-1.5"
                      >
                        <span className="text-muted-foreground">{pm.name}</span>
                        <span className="font-semibold">
                          {fmt(pm.value)}{" "}
                          <span className="font-normal text-muted-foreground text-xs">
                            (
                            {paymentTotal
                              ? ((pm.value / paymentTotal) * 100).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1.5 font-bold">
                      <span>{t("total")}</span>
                      <span>{fmt(paymentTotal)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  {t("no_payment_methods_yet")}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products Bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t("top_selling_products")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={topProductsChart}
                    margin={{ left: 0, right: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(v) => [fmt(v as number), t("revenue")]}
                    />
                    <Bar
                      dataKey="revenue"
                      name={t("revenue")}
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    >
                      {topProductsChart.map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  {t("no_top_selling_products_yet")}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Top Products Table ── */}
        <DataTable
          columns={topProductsColumns}
          data={topProductsRows}
          rowKey={(row) => row.id}
          title={
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <span>{t("top_selling_products")}</span>
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                {topProductsRows.length}
              </span>
            </div>
          }
          emptyMessage={t("no_products_found", "No products found")}
          pagination
          initialPageSize={10}
          pageSizeOptions={[10]}
          paginationVariant="simple"
          showPageSizeSelector={false}
          showEdgeButtons={false}
          className="overflow-hidden"
          compact
          renderExpandedRow={(row) => {
            // Only products sold at more than one price get an expandable row
            if (!row.priceTiers || row.priceTiers.length <= 1) return null;
            return (
              <div className="px-6 py-3">
                <table className="min-w-full w-full table-auto">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 font-medium">{t("price")}</th>
                      <th className="py-2 text-right font-medium">
                        {t("quantity_short")}
                      </th>
                      <th className="py-2 text-right font-medium">
                        {t("subtotal")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.priceTiers.map((tier, tierIndex) => (
                      <tr
                        key={tierIndex}
                        className="border-t border-border/60"
                      >
                        <td className="py-2 font-medium">{fmt(tier.price)}</td>
                        <td className="py-2 text-right">{fmtN(tier.qty)}</td>
                        <td className="py-2 text-right font-semibold">
                          {fmt(tier.subtotal)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t border-border">
                      <td className="py-2 text-sm font-semibold">
                        {t("total")}
                      </td>
                      <td className="py-2 text-right text-sm font-semibold">
                        {fmtN(row.sold)}
                      </td>
                      <td className="py-2 text-right text-sm font-semibold">
                        {fmt(row.revenue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          }}
        />

        {/* ── Tax Summary + Expired/Broken Detail (side by side) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Tax Summary ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("tax_summary")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/30 border-b">
                  <tr>
                    <th className="text-left py-2 px-4 font-semibold text-muted-foreground">
                      {t("category")}
                    </th>
                    <th className="text-right py-2 px-4 font-semibold text-muted-foreground">
                      {t("tax_amount")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {localData.taxByCategory.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="py-2 px-4">{item.category}</td>
                      <td className="py-2 px-4 text-right font-medium">
                        {fmt(item.tax)}
                      </td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-muted/30 border-t">
                    <td className="py-2 px-4">{t("total")}</td>
                    <td className="py-2 px-4 text-right">
                      {fmt(localData.totalTax)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Expired / Broken Detail ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Expired and Broken Items
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/30 border-b">
                  <tr>
                    <th className="text-left py-2 px-4 font-semibold text-muted-foreground">
                      Type
                    </th>
                    <th className="text-left py-2 px-4 font-semibold text-muted-foreground">
                      Name
                    </th>
                    <th className="text-left py-2 px-4 font-semibold text-muted-foreground">
                      Status / Date
                    </th>
                    <th className="text-right py-2 px-4 font-semibold text-muted-foreground">
                      Quantity
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(localData.expiredProducts || []).map(
                    (p: any, i: number) => (
                      <tr key={`exp-${i}`} className="hover:bg-muted/20">
                        <td className="py-2 px-4">Expired Product</td>
                        <td className="py-2 px-4">{p.name}</td>
                        <td className="py-2 px-4">
                          {p.expiryDate
                            ? formatLocalizedDate(p.expiryDate)
                            : "-"}
                        </td>
                        <td className="py-2 px-4 text-right">
                          {fmtN(p.quantity || 0)}
                        </td>
                      </tr>
                    ),
                  )}
                  {(localData.brokenAssets || []).map((a: any, i: number) => (
                    <tr key={`broken-${i}`} className="hover:bg-muted/20">
                      <td className="py-2 px-4">Broken Asset</td>
                      <td className="py-2 px-4">{a.name}</td>
                      <td className="py-2 px-4">
                        {a.conditions || a.asset_status || "broken"}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {fmtN(a.quantity || 0)}
                      </td>
                    </tr>
                  ))}
                  {!localData.expiredProducts?.length &&
                  !localData.brokenAssets?.length ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-3 px-4 text-center text-muted-foreground"
                      >
                        No expired or broken items found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </RoleLayout>
  );
};

export default ReportPage;

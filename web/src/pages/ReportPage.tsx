// src/pages/ReportPage.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { RoleLayout } from "@/components/layout/RoleLayout";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Area, AreaChart,
} from "recharts";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import useReports from "@/hooks/useReports";
import {
  TrendingUp, ShoppingBag, Package, DollarSign,
  CreditCard, Landmark, AlertTriangle, RefreshCw,
  FileDown, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (v: string | number) =>
  `${Number(v || 0).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB`;

const fmtN = (v: string | number) =>
  Number(v || 0).toLocaleString();

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

// ─── component ──────────────────────────────────────────────────────────────

const ReportPage: React.FC = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "custom">("monthly");
  const [customDates, setCustomDates] = useState({ start: "2025-11-01", end: "2025-11-30" });

  const getDateRangeLabel = () => {
    const today = new Date();
    const opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
    if (period === "daily") return today.toLocaleDateString(undefined, opts);
    if (period === "weekly") {
      const s = new Date(today); s.setDate(today.getDate() - 6);
      return `${s.toLocaleDateString(undefined, opts)} – ${today.toLocaleDateString(undefined, opts)}`;
    }
    if (period === "monthly") {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
    }
    return `${new Date(customDates.start).toLocaleDateString(undefined, opts)} – ${new Date(customDates.end).toLocaleDateString(undefined, opts)}`;
  };

  const { data: reportsData, loading: reportsLoading, refetch } = useReports({
    period, start: customDates.start, end: customDates.end,
  });

  const [localData, setLocalData] = useState(() => ({
    totalSales: "0.00", totalOrders: 0, totalItemsSold: 0, avgOrderValue: "0.00",
    grossSales: "0.00", netSales: "0.00", discounts: "0.00", refunds: "0.00", taxes: "0.00",
    paymentMethods: { cash: "0.00", card: "0.00", mobile: "0.00", credit: "0.00" },
    topProducts: [] as any[], revenue: "0.00", cogs: "0.00",
    grossProfit: "0.00", grossMargin: 0, netProfit: "0.00",
    totalTax: "0.00", taxByCategory: [] as any[], products: [] as any[],
  }));

  React.useEffect(() => {
    if (reportsData) setLocalData(reportsData as any);
  }, [reportsData]);

  // ─── Derived financial figures (computed for accuracy) ─────────────────────
  const derivedFinancials = React.useMemo(() => {
    const revenue = Number(localData.revenue || 0);
    const cogs = Number(localData.cogs || 0);
    const grossProfit = revenue - cogs;
    const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : "0.0";
    const netProfit = grossProfit - Number(localData.taxes || 0) - Number(localData.discounts || 0);
    return { grossProfit, grossMargin, netProfit };
  }, [localData.revenue, localData.cogs, localData.taxes, localData.discounts]);

  const paymentTotal = React.useMemo(() => {
    const pm = localData.paymentMethods || {};
    return ["cash", "card", "mobile", "credit"].reduce((s, k) => s + Number(pm[k] || 0), 0);
  }, [localData.paymentMethods]);

  const paymentData = React.useMemo(() => [
    { name: t("cash"), value: Number(localData.paymentMethods.cash) || 0 },
    { name: t("card"), value: Number(localData.paymentMethods.card) || 0 },
    { name: t("mobile"), value: Number(localData.paymentMethods.mobile) || 0 },
    { name: t("credit"), value: Number(localData.paymentMethods.credit) || 0 },
  ].filter(d => d.value > 0), [localData.paymentMethods]);

  // ─── Excel export ──────────────────────────────────────────────────────────

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const dl = getDateRangeLabel();
    const salesData = [
      { Metric: t("report_period"), Value: dl },
      { Metric: t("total_sales"), Value: fmt(localData.totalSales) },
      { Metric: t("total_orders"), Value: fmtN(localData.totalOrders) },
      { Metric: t("total_items_sold"), Value: fmtN(localData.totalItemsSold) },
      { Metric: t("avg_order_value"), Value: fmt(localData.avgOrderValue) },
      { Metric: t("gross_sales"), Value: fmt(localData.grossSales) },
      { Metric: t("net_sales"), Value: fmt(localData.netSales) },
      { Metric: t("discounts"), Value: fmt(localData.discounts) },
      { Metric: t("refunds"), Value: fmt(localData.refunds) },
      { Metric: t("taxes"), Value: fmt(localData.taxes) },
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData), "1. Sales Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Method: t("cash"), Amount: fmt(localData.paymentMethods.cash) },
      { Method: t("card"), Amount: fmt(localData.paymentMethods.card) },
      { Method: t("mobile"), Amount: fmt(localData.paymentMethods.mobile) },
      { Method: t("credit"), Amount: fmt(localData.paymentMethods.credit) },
    ]), "2. Payments");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      localData.topProducts.map(p => ({ [t("product")]: p.name, [t("units_sold")]: p.sold, [t("revenue")]: fmt(p.revenue) }))
    ), "3. Top Products");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
      { Metric: t("revenue"), Value: fmt(localData.revenue) },
      { Metric: t("cogs"), Value: fmt(localData.cogs) },
      { Metric: t("gross_profit"), Value: fmt(derivedFinancials.grossProfit) },
      { Metric: t("gross_margin_percent"), Value: `${derivedFinancials.grossMargin}%` },
      { Metric: t("net_profit"), Value: fmt(derivedFinancials.netProfit) },
    ]), "4. Financial");
    XLSX.writeFile(wb, `SmartPOS_Report_${period}.xlsx`);
    toast.success("Excel exported");
  };

  // ─── PDF export ────────────────────────────────────────────────────────────

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const lm = 14;
    const dl = getDateRangeLabel();

    // ── Header ──
    doc.setFontSize(18); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("Smart Supermarket", pageWidth / 2, 18, { align: "center" });
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    doc.text("Bole Road, Addis Ababa, Ethiopia  •  +251 911 234 567  •  info@smartsupermarket.et", pageWidth / 2, 24, { align: "center" });
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("Sales & Analytics Report", pageWidth / 2, 33, { align: "center" });
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${dl}`, pageWidth / 2, 39, { align: "center" });
    doc.setDrawColor(34, 197, 94); doc.setLineWidth(0.8);
    doc.line(lm, 43, pageWidth - lm, 43);

    const HEAD_COLOR: [number, number, number] = [34, 197, 94];
    const headStyles = { fillColor: HEAD_COLOR, textColor: [255, 255, 255] as [number, number, number], fontSize: 9, fontStyle: "bold" as const };
    const styles = { fontSize: 9, cellPadding: 3 };

    // ── 1. Sales Summary ──
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("1. Sales Summary", lm, 50);
    autoTable(doc, {
      startY: 53,
      head: [["Metric", "Value"]],
      body: [
        [t("total_sales"), fmt(localData.totalSales)],
        [t("total_orders"), fmtN(localData.totalOrders)],
        [t("total_items_sold"), fmtN(localData.totalItemsSold)],
        [t("avg_order_value"), fmt(localData.avgOrderValue)],
        [t("gross_sales"), fmt(localData.grossSales)],
        [t("net_sales"), fmt(localData.netSales)],
        [t("discounts"), fmt(localData.discounts)],
        [t("refunds"), fmt(localData.refunds)],
        [t("taxes"), fmt(localData.taxes)],
      ],
      theme: "grid", headStyles, styles,
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 50, halign: "right" } },
    });

    // ── 2. Payment Methods ──
    const y1 = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("2. Payment Methods", lm, y1);
    autoTable(doc, {
      startY: y1 + 3,
      head: [["Method", "Amount", "% of Total"]],
      body: [
        [t("cash"), fmt(localData.paymentMethods.cash), paymentTotal ? `${((Number(localData.paymentMethods.cash) / paymentTotal) * 100).toFixed(1)}%` : "-"],
        [t("card"), fmt(localData.paymentMethods.card), paymentTotal ? `${((Number(localData.paymentMethods.card) / paymentTotal) * 100).toFixed(1)}%` : "-"],
        [t("mobile"), fmt(localData.paymentMethods.mobile), paymentTotal ? `${((Number(localData.paymentMethods.mobile) / paymentTotal) * 100).toFixed(1)}%` : "-"],
        [t("credit"), fmt(localData.paymentMethods.credit), paymentTotal ? `${((Number(localData.paymentMethods.credit) / paymentTotal) * 100).toFixed(1)}%` : "-"],
        ["Total", fmt(paymentTotal), "100%"],
      ],
      theme: "grid", headStyles, styles,
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 60, halign: "right" }, 2: { cellWidth: 30, halign: "center" } },
    });

    // ── 3. Financial Summary ──
    const y2 = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
    doc.text("3. Financial Summary", lm, y2);
    autoTable(doc, {
      startY: y2 + 3,
      head: [["Metric", "Value"]],
      body: [
        [t("revenue"), fmt(localData.revenue)],
        [t("cogs"), fmt(localData.cogs)],
        [t("gross_profit"), fmt(derivedFinancials.grossProfit)],
        [t("gross_margin_percent"), `${derivedFinancials.grossMargin}%`],
        [t("net_profit"), fmt(derivedFinancials.netProfit)],
      ],
      theme: "grid", headStyles, styles,
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 50, halign: "right" } },
    });

    // ── 4. Top Products ──
    if (localData.topProducts.length > 0) {
      const y3 = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("4. Top Selling Products", lm, y3);
      autoTable(doc, {
        startY: y3 + 3,
        head: [["#", "Product", "Units Sold", "Revenue"]],
        body: localData.topProducts.map((p, i) => [i + 1, p.name, fmtN(p.sold), fmt(p.revenue)]),
        theme: "grid", headStyles, styles,
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 80 },
          2: { cellWidth: 30, halign: "center" },
          3: { cellWidth: 40, halign: "right" },
        },
      });
    }

    // ── 5. Tax Summary ──
    if (localData.taxByCategory.length > 0) {
      const y4 = (doc as any).lastAutoTable.finalY + 8;
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 30);
      doc.text("5. Tax Summary", lm, y4);
      autoTable(doc, {
        startY: y4 + 3,
        head: [[t("category"), t("tax_amount")]],
        body: [
          ...localData.taxByCategory.map((item: any) => [item.category, fmt(item.tax)]),
          ["Total", fmt(localData.totalTax)],
        ],
        theme: "grid", headStyles, styles,
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 50, halign: "right" } },
      });
    }

    // ── Footer ──
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const ph = doc.internal.pageSize.height;
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3);
      doc.line(lm, ph - 16, pageWidth - lm, ph - 16);
      doc.setFontSize(7); doc.setTextColor(150, 150, 150);
      doc.text("Smart POS • Generated automatically", lm, ph - 10);
      doc.text(`Page ${i} / ${pageCount}`, pageWidth - lm, ph - 10, { align: "right" });
      doc.text(`${dl}`, pageWidth / 2, ph - 10, { align: "center" });
    }

    doc.save(`SmartPOS_Report_${period}_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF exported");
  };

  // ─── UI ───────────────────────────────────────────────────────────────────

  const summaryCards = [
    { title: t("total_sales"), value: fmt(localData.totalSales), Icon: DollarSign, color: "text-emerald-500" },
    { title: t("total_orders"), value: fmtN(localData.totalOrders), Icon: ShoppingBag, color: "text-blue-500" },
    { title: t("total_items_sold"), value: fmtN(localData.totalItemsSold), Icon: Package, color: "text-purple-500" },
    { title: t("gross_profit"), value: fmt(derivedFinancials.grossProfit), Icon: TrendingUp, color: "text-amber-500" },
    { title: t("avg_order_value"), value: fmt(localData.avgOrderValue), Icon: CreditCard, color: "text-rose-500" },
    { title: t("net_profit"), value: fmt(derivedFinancials.netProfit), Icon: Landmark, color: "text-teal-500" },
  ];

  return (
    <RoleLayout allowedRoles={["owner", "manager"]}>
      <div className="space-y-6 p-6">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{t("sales_reports")}</h1>
            <p className="text-muted-foreground text-sm mt-1">{getDateRangeLabel()}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={reportsLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${reportsLoading ? "animate-spin" : ""}`} />
              {reportsLoading ? "Loading..." : t("refresh")}
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel} className="border-green-300 text-green-700 hover:bg-green-50">
              <FileDown className="h-4 w-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF} className="border-blue-300 text-blue-700 hover:bg-blue-50">
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        </div>

        {/* ── Period Selector ── */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold mr-1">{t("report_period")}:</span>
              {(["daily", "weekly", "monthly", "custom"] as const).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period === p ? "bg-primary text-primary-foreground shadow-sm" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                  {t(p)}
                </button>
              ))}
              {period === "custom" && (
                <div className="flex items-center gap-2 ml-2">
                  <input type="date" value={customDates.start} onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })} className="border rounded px-2 py-1 text-sm bg-background" />
                  <span className="text-muted-foreground">–</span>
                  <input type="date" value={customDates.end} onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })} className="border rounded px-2 py-1 text-sm bg-background" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {summaryCards.map(({ title, value, Icon, color }, i) => (
            <Card key={i} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground leading-tight">{title}</p>
                    <p className="text-lg font-bold mt-1 leading-tight">{value}</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Methods Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("payment_methods")}</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={paymentData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [fmt(v as number), t("amount")]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Payment-methods table */}
                  <div className="mt-2 divide-y text-sm">
                    {paymentData.map((pm) => (
                      <div key={pm.name} className="flex justify-between py-1.5">
                        <span className="text-muted-foreground">{pm.name}</span>
                        <span className="font-semibold">{fmt(pm.value)} <span className="font-normal text-muted-foreground text-xs">({paymentTotal ? ((pm.value / paymentTotal) * 100).toFixed(1) : 0}%)</span></span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1.5 font-bold">
                      <span>{t("total")}</span>
                      <span>{fmt(paymentTotal)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">{t("no_payment_methods_yet")}</div>
              )}
            </CardContent>
          </Card>

          {/* Top Products Bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("top_selling_products")}</CardTitle>
            </CardHeader>
            <CardContent>
              {localData.topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={localData.topProducts} margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [fmt(v as number), t("revenue")]} />
                    <Bar dataKey="revenue" name={t("revenue")} fill="#10b981" radius={[4, 4, 0, 0]}>
                      {localData.topProducts.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">{t("no_top_selling_products_yet")}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Financial Summary ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("financial")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              {[
                { label: t("revenue"), value: fmt(localData.revenue) },
                { label: t("cogs"), value: fmt(localData.cogs) },
                { label: t("gross_profit"), value: fmt(derivedFinancials.grossProfit) },
                { label: t("gross_margin_percent"), value: `${derivedFinancials.grossMargin}%` },
                { label: t("net_profit"), value: fmt(derivedFinancials.netProfit) },
              ].map(({ label, value }, i) => (
                <div key={i} className="bg-muted/40 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p className="font-bold mt-1">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Top Products Table ── */}
        {localData.topProducts.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("top_selling_products")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/30 border-b">
                    <tr>
                      <th className="py-2 px-4 text-left font-semibold text-muted-foreground">#</th>
                      <th className="py-2 px-4 text-left font-semibold text-muted-foreground">{t("product")}</th>
                      <th className="py-2 px-4 text-right font-semibold text-muted-foreground">{t("units_sold")}</th>
                      <th className="py-2 px-4 text-right font-semibold text-muted-foreground">{t("revenue")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {localData.topProducts.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                        <td className="py-2 px-4 text-muted-foreground">{i + 1}</td>
                        <td className="py-2 px-4 font-medium">{p.name}</td>
                        <td className="py-2 px-4 text-right">{fmtN(p.sold)}</td>
                        <td className="py-2 px-4 text-right font-semibold">{fmt(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

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
                    <th className="text-left py-2 px-4 font-semibold text-muted-foreground">{t("category")}</th>
                    <th className="text-right py-2 px-4 font-semibold text-muted-foreground">{t("tax_amount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {localData.taxByCategory.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="py-2 px-4">{item.category}</td>
                      <td className="py-2 px-4 text-right font-medium">{fmt(item.tax)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-muted/30 border-t">
                    <td className="py-2 px-4">{t("total")}</td>
                    <td className="py-2 px-4 text-right">{fmt(localData.totalTax)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

      </div>
    </RoleLayout>
  );
};

export default ReportPage;

// src/pages/ReportPage.tsx
import React, { useState, useMemo, useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { RoleLayout } from "@/components/layout/RoleLayout"; // ✅ Added
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
} from "recharts";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import useReports from '@/hooks/useReports';

// Report data is provided by backend; hook `useReports` will fetch and map it

const ReportPage: React.FC = () => {
  const [period, setPeriod] = useState<
    "daily" | "weekly" | "monthly" | "custom"
  >("monthly");
  const [customDates, setCustomDates] = useState({
    start: "2025-11-01",
    end: "2025-11-30",
  });

  const getDateRangeLabel = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
    };

    if (period === "daily") {
      return new Date().toLocaleDateString(undefined, options);
    } else if (period === "weekly") {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return `${start.toLocaleDateString(
        undefined,
        options
      )} – ${today.toLocaleDateString(undefined, options)}`;
    } else if (period === "monthly") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return `${start.toLocaleDateString(
        undefined,
        options
      )} – ${end.toLocaleDateString(undefined, options)}`;
    } else {
      return `${new Date(customDates.start).toLocaleDateString(
        undefined,
        options
      )} – ${new Date(customDates.end).toLocaleDateString(undefined, options)}`;
    }
  };

  const auth = useAuthStore((s) => s.user);
  const { data: reportsData, loading: reportsLoading, error: reportsError, refetch } = useReports({ period, start: customDates.start, end: customDates.end });

  const [localData, setLocalData] = useState(() => ({
    totalSales: '0.00',
    totalOrders: 0,
    totalItemsSold: 0,
    avgOrderValue: '0.00',
    grossSales: '0.00',
    netSales: '0.00',
    discounts: '0.00',
    refunds: '0.00',
    taxes: '0.00',
    paymentMethods: { cash: '0.00', card: '0.00', mobile: '0.00', credit: '0.00' },
    topProducts: [] as any[],
    revenue: '0.00',
    cogs: '0.00',
    grossProfit: '0.00',
    grossMargin: 0,
    netProfit: '0.00',
    totalTax: '0.00',
    taxByCategory: [] as any[],
    products: [] as any[],
  }));

  React.useEffect(() => {
    if (reportsData) setLocalData(reportsData as any);
  }, [reportsData]);

  const paymentTotal = React.useMemo(() => {
    try {
      const pm = localData.paymentMethods || {};
      return ['cash','card','mobile','credit'].reduce((s, k) => s + Number(pm[k] || 0), 0);
    } catch {
      return 0;
    }
  }, [localData.paymentMethods]);

  const hasTopProducts = !!(localData.topProducts && localData.topProducts.length > 0);

  // ===== EXPORTS =====
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const dateLabel = getDateRangeLabel();

    const businessInfo = [
      ["SMART SUPERMARKET"],
      ["Bole Road, Addis Ababa, Ethiopia"],
      ["Phone: +251 911 234 567"],
      ["Email: info@smartsupermarket.et"],
      ["VAT: ET-123456789"],
      [""],
      ["Report Period:", dateLabel],
    ];
    const infoWS = XLSX.utils.aoa_to_sheet(businessInfo);
    XLSX.utils.book_append_sheet(wb, infoWS, "Business Info");

    const salesData = [
      { Metric: "Report Period", Value: dateLabel },
      { Metric: "Total Sales", Value: `$${localData.totalSales}` },
      { Metric: "Total Orders", Value: localData.totalOrders },
      { Metric: "Total Items Sold", Value: localData.totalItemsSold },
      { Metric: "Avg Order Value", Value: `$${localData.avgOrderValue}` },
      { Metric: "Gross Sales", Value: `$${localData.grossSales}` },
      { Metric: "Net Sales", Value: `$${localData.netSales}` },
      { Metric: "Discounts", Value: `$${localData.discounts}` },
      { Metric: "Refunds", Value: `$${localData.refunds}` },
      { Metric: "Taxes", Value: `$${localData.taxes}` },
    ];
    const salesWS = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, salesWS, "1. Sales Summary");

    const paymentsWS = XLSX.utils.json_to_sheet([
      { Method: "Cash", Amount: `$${localData.paymentMethods.cash}` },
      { Method: "Card", Amount: `$${localData.paymentMethods.card}` },
      { Method: "Mobile", Amount: `$${localData.paymentMethods.mobile}` },
      { Method: "Credit", Amount: `$${localData.paymentMethods.credit}` },
    ]);
    XLSX.utils.book_append_sheet(wb, paymentsWS, "1b. Payment Methods");

    const productsWS = XLSX.utils.json_to_sheet(
      localData.topProducts.map((p) => ({
        Product: p.name,
        "Units Sold": p.sold,
        Revenue: `$${p.revenue}`,
      }))
    );
    XLSX.utils.book_append_sheet(wb, productsWS, "2. Top Products");

    const inventoryWS = XLSX.utils.json_to_sheet(
      localData.products.map((p) => ({
        "Product Name": p.name,
        Category: p.category,
        SKU: p.sku,
        "Purchase Price (ETB)": p.purchasePrice,
        "Selling Price (ETB)": p.sellingPrice,
        "Current Quantity": p.quantity,
        "Low Stock Threshold": p.lowStockThreshold,
        "Stock Status": p.quantity <= p.lowStockThreshold ? "LOW STOCK" : "OK",
      }))
    );
    XLSX.utils.book_append_sheet(wb, inventoryWS, "3. Detailed Inventory");

    const financialWS = XLSX.utils.json_to_sheet([
      { Metric: "Revenue", Value: `$${localData.revenue}` },
      { Metric: "COGS", Value: `$${localData.cogs}` },
      { Metric: "Gross Profit", Value: `$${localData.grossProfit}` },
      { Metric: "Gross Margin %", Value: `${localData.grossMargin}%` },
      { Metric: "Net Profit", Value: `$${localData.netProfit}` },
    ]);
    XLSX.utils.book_append_sheet(wb, financialWS, "4. Financial");

    const taxWS = XLSX.utils.json_to_sheet([
      { Metric: "Total Tax Collected", Value: `$${localData.totalTax}` },
    ]);
    const taxCatWS = XLSX.utils.json_to_sheet(
      localData.taxByCategory.map((t) => ({
        Category: t.category,
        Tax: `$${t.tax}`,
      }))
    );
    XLSX.utils.book_append_sheet(wb, taxWS, "7. Tax Summary");
    XLSX.utils.book_append_sheet(wb, taxCatWS, "7b. Tax by Category");

    XLSX.writeFile(wb, `SmartPOS_Report_${period}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateLabel = getDateRangeLabel();
    const pageWidth = doc.internal.pageSize.width;

    const businessInfo = {
      name: "SMART SUPERMARKET",
      address: "Bole Road, Addis Ababa, Ethiopia",
      phone: "+251 911 234 567",
      email: "info@smartsupermarket.et",
      taxId: "VAT: ET-123456789",
      website: "www.smartsupermarket.et",
    };

    const leftMargin = 14;
    const headerY = 20;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(businessInfo.name, pageWidth / 2, headerY, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const detailsY = headerY + 8;
    const lineHeight = 4;

    doc.text(businessInfo.address, pageWidth / 2, detailsY, {
      align: "center",
    });
    doc.text(businessInfo.phone, pageWidth / 2, detailsY + lineHeight, {
      align: "center",
    });
    doc.text(businessInfo.email, pageWidth / 2, detailsY + lineHeight * 2, {
      align: "center",
    });
    doc.text(businessInfo.website, pageWidth / 2, detailsY + lineHeight * 3, {
      align: "center",
    });

    doc.setFont("helvetica", "bold");
    doc.text(businessInfo.taxId, pageWidth / 2, detailsY + lineHeight * 4, {
      align: "center",
    });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SALES REPORT", pageWidth / 2, detailsY + lineHeight * 6, {
      align: "center",
    });

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Period: ${dateLabel}`,
      pageWidth / 2,
      detailsY + lineHeight * 7.5,
      { align: "center" }
    );

    doc.setDrawColor(32, 191, 107);
    doc.setLineWidth(0.5);
    doc.line(
      leftMargin,
      detailsY + lineHeight * 8.5,
      pageWidth - leftMargin,
      detailsY + lineHeight * 8.5
    );

    const contentStartY = detailsY + lineHeight * 9.5;

    autoTable(doc, {
      startY: contentStartY,
      head: [["Metric", "Value"]],
      body: [
        ["Total Sales", `$${localData.totalSales}`],
        ["Total Orders", localData.totalOrders.toString()],
        ["Total Items Sold", localData.totalItemsSold.toString()],
        ["Avg Order Value", `$${localData.avgOrderValue}`],
        ["Gross Sales", `$${localData.grossSales}`],
        ["Net Sales", `$${localData.netSales}`],
        ["Discounts", `$${localData.discounts}`],
        ["Refunds", `$${localData.refunds}`],
        ["Taxes", `$${localData.taxes}`],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [32, 191, 107],
        fontSize: 11,
        textColor: [255, 255, 255],
      },
      styles: {
        fontSize: 10,
        cellPadding: 6,
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: "right" },
      },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Product", "Units Sold", "Revenue"]],
      body: localData.topProducts.map((p) => [
        p.name,
        p.sold.toString(),
        `$${p.revenue}`,
      ]),
      theme: "grid",
      headStyles: {
        fillColor: [32, 191, 107],
        fontSize: 11,
        textColor: [255, 255, 255],
      },
      styles: {
        fontSize: 10,
        cellPadding: 6,
      },
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Category", "Tax Amount"]],
      body: [
        ...localData.taxByCategory.map((t) => [t.category, `$${t.tax}`]),
        ["Total", `$${localData.totalTax}`],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [32, 191, 107],
        fontSize: 11,
        textColor: [255, 255, 255],
      },
      styles: {
        fontSize: 10,
        cellPadding: 6,
      },
      didParseCell: function (data) {
        if (data.row.index === data.table.body.length - 1) {
          doc.setFont("helvetica", "bold");
        }
      },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.height;

      doc.setDrawColor(200, 200, 200);
      doc.line(
        leftMargin,
        pageHeight - 20,
        pageWidth - leftMargin,
        pageHeight - 20
      );

      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        "Smart POS System • Generated automatically",
        leftMargin,
        pageHeight - 15
      );
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth - leftMargin,
        pageHeight - 15,
        { align: "right" }
      );

      doc.text(
        `${businessInfo.phone} • ${businessInfo.email}`,
        pageWidth / 2,
        pageHeight - 15,
        { align: "center" }
      );
    }

    doc.save(`SmartPOS_Report_${period}.pdf`);
  };

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  // ✅ Wrap entire content in RoleLayout (like your Inventory page)
  return (
    <RoleLayout allowedRoles={["owner", "manager"]}>
      {" "}
      {/* Adjust roles as needed */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Sales Reports
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Period: {getDateRangeLabel()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm"
            >
              Export to Excel
            </button>
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition text-sm"
            >
              Export to PDF
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="bg-card p-4 rounded-xl border">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-foreground">
              Report Period:
            </span>

            {(["daily", "weekly", "monthly", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}

            {period === "custom" && (
              <div className="flex flex-wrap items-center gap-2 ml-2">
                <input
                  type="date"
                  value={customDates.start}
                  onChange={(e) =>
                    setCustomDates({ ...customDates, start: e.target.value })
                  }
                  className="border rounded px-2 py-1 text-sm bg-background"
                />
                <span className="text-muted-foreground">to</span>
                <input
                  type="date"
                  value={customDates.end}
                  onChange={(e) =>
                    setCustomDates({ ...customDates, end: e.target.value })
                  }
                  className="border rounded px-2 py-1 text-sm bg-background"
                />
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: "Total Sales", value: `$${localData.totalSales}` },
            { title: "Total Orders", value: localData.totalOrders },
            { title: "Avg Order", value: `$${localData.avgOrderValue}` },
            { title: "Gross Profit", value: `$${localData.grossProfit}` },
          ].map((item, i) => (
            <div key={i} className="bg-card p-4 rounded-xl border">
              <p className="text-muted-foreground text-sm">{item.title}</p>
              <p className="text-lg font-bold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Methods */}
          <div className="bg-card p-4 rounded-xl border">
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              Payment Methods
            </h2>
            {paymentTotal > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Cash', value: parseFloat(localData.paymentMethods.cash) || 0 },
                      { name: 'Card', value: parseFloat(localData.paymentMethods.card) || 0 },
                      { name: 'Mobile', value: parseFloat(localData.paymentMethods.mobile) || 0 },
                      { name: 'Credit', value: parseFloat(localData.paymentMethods.credit) || 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {COLORS.map((color, i) => (
                      <Cell key={`cell-${i}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No payment methods yet
              </div>
            )}
          </div>

          {/* Top Products */}
          <div className="bg-card p-4 rounded-xl border">
            <h2 className="text-lg font-semibold mb-4 text-foreground">
              Top Selling Products
            </h2>
            {hasTopProducts ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={localData.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue ($)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No top selling products yet
              </div>
            )}
          </div>
        </div>

        {/* Tax Table */}
        <div className="bg-card p-4 rounded-xl border">
          <h2 className="text-lg font-semibold mb-4 text-foreground">
            Tax Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-muted-foreground">
                    Category
                  </th>
                  <th className="text-right py-2 text-muted-foreground">
                    Tax Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {localData.taxByCategory.map((item, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 hover:bg-accent/30"
                  >
                    <td className="py-3">{item.category}</td>
                    <td className="py-3 text-right font-medium">${item.tax}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-accent/20">
                  <td className="py-3">Total</td>
                  <td className="py-3 text-right">${localData.totalTax}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleLayout>
  );
};

export default ReportPage;

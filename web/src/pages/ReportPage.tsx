// src/pages/ReportPage.tsx
import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ===== MOCK PRODUCT DATA =====
const getMockProducts = (base: number) => [
  { 
    name: 'Coffee Latte', 
    category: 'Beverages', 
    sku: 'CL-001', 
    purchasePrice: 12.50, 
    sellingPrice: 20.00, 
    quantity: Math.floor(150 * base), 
    lowStockThreshold: 20 
  },
  { 
    name: 'Cheeseburger', 
    category: 'Food', 
    sku: 'CB-001', 
    purchasePrice: 18.00, 
    sellingPrice: 35.00, 
    quantity: Math.floor(120 * base), 
    lowStockThreshold: 15 
  },
  { 
    name: 'Iced Tea', 
    category: 'Beverages', 
    sku: 'IT-001', 
    purchasePrice: 5.00, 
    sellingPrice: 10.00, 
    quantity: Math.floor(200 * base), 
    lowStockThreshold: 25 
  },
  { 
    name: 'French Fries', 
    category: 'Food', 
    sku: 'FF-001', 
    purchasePrice: 8.00, 
    sellingPrice: 15.00, 
    quantity: Math.floor(180 * base), 
    lowStockThreshold: 30 
  },
  { 
    name: 'Milk (1L)', 
    category: 'Dairy', 
    sku: 'MLK-001', 
    purchasePrice: 25.00, 
    sellingPrice: 35.00, 
    quantity: Math.floor(80 * base), 
    lowStockThreshold: 10 
  },
  { 
    name: 'Bread Loaf', 
    category: 'Bakery', 
    sku: 'BRD-001', 
    purchasePrice: 15.00, 
    sellingPrice: 25.00, 
    quantity: Math.floor(60 * base), 
    lowStockThreshold: 8 
  },
  { 
    name: 'Eggs (Dozen)', 
    category: 'Dairy', 
    sku: 'EGG-001', 
    purchasePrice: 40.00, 
    sellingPrice: 60.00, 
    quantity: Math.floor(45 * base), 
    lowStockThreshold: 5 
  },
  { 
    name: 'Tomatoes (kg)', 
    category: 'Produce', 
    sku: 'TMT-001', 
    purchasePrice: 30.00, 
    sellingPrice: 45.00, 
    quantity: Math.floor(70 * base), 
    lowStockThreshold: 12 
  },
];

// ===== HARD-CODED MOCK DATA BY PERIOD =====
const getMockData = (period: string, startDate: string, endDate: string) => {
  // For simplicity, we'll vary totals by period
  const base = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    custom: Math.max(1, Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) || 1)
  }[period];

  return {
    // 1. Sales Reports
    totalSales: (24560.75 * base).toFixed(2),
    totalOrders: Math.floor(328 * base),
    totalItemsSold: Math.floor(892 * base),
    avgOrderValue: 74.88,
    grossSales: (25100.0 * base).toFixed(2),
    netSales: (24560.75 * base).toFixed(2),
    discounts: (539.25 * base).toFixed(2),
    refunds: (120.5 * base).toFixed(2),
    taxes: (2210.47 * base).toFixed(2),
    paymentMethods: {
      cash: (9824.3 * base).toFixed(2),
      card: (11234.2 * base).toFixed(2),
      mobile: (2890.25 * base).toFixed(2),
      credit: (612.0 * base).toFixed(2),
    },

    // 2. Top Products
    topProducts: [
      { name: 'Coffee Latte', sold: Math.floor(120 * base), revenue: (2400 * base).toFixed(2) },
      { name: 'Cheeseburger', sold: Math.floor(98 * base), revenue: (1960 * base).toFixed(2) },
      { name: 'Iced Tea', sold: Math.floor(87 * base), revenue: (870 * base).toFixed(2) },
      { name: 'Fries', sold: Math.floor(76 * base), revenue: (570 * base).toFixed(2) },
    ],

    // 3. Financial
    revenue: (24560.75 * base).toFixed(2),
    cogs: (8500 * base).toFixed(2),
    grossProfit: (16060.75 * base).toFixed(2),
    grossMargin: 65.4,
    netProfit: (12340.25 * base).toFixed(2),

    // 4. Tax
    totalTax: (2210.47 * base).toFixed(2),
    taxByCategory: [
      { category: 'Food', tax: (1450 * base).toFixed(2) },
      { category: 'Beverages', tax: (760.47 * base).toFixed(2) },
    ],

    // 5. Products (for Excel export)
    products: getMockProducts(base),
  };
};

const ReportPage: React.FC = () => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('monthly');
  const [customDates, setCustomDates] = useState({
    start: '2025-11-01',
    end: '2025-11-30'
  });

  // Get formatted date range string for display & export
  const getDateRangeLabel = () => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

    if (period === 'daily') {
      return new Date().toLocaleDateString(undefined, options);
    } else if (period === 'weekly') {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return `${start.toLocaleDateString(undefined, options)} – ${today.toLocaleDateString(undefined, options)}`;
    } else if (period === 'monthly') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return `${start.toLocaleDateString(undefined, options)} – ${end.toLocaleDateString(undefined, options)}`;
    } else {
      return `${new Date(customDates.start).toLocaleDateString(undefined, options)} – ${new Date(customDates.end).toLocaleDateString(undefined, options)}`;
    }
  };

  const data = useMemo(() => {
    const startDate = period === 'custom' ? customDates.start : '';
    const endDate = period === 'custom' ? customDates.end : '';
    return getMockData(period, startDate, endDate);
  }, [period, customDates]);

  // ===== EXPORTS =====
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const dateLabel = getDateRangeLabel();

    // Business Info Sheet
    const businessInfo = [
      ['SMART SUPERMARKET'],
      ['Bole Road, Addis Ababa, Ethiopia'],
      ['Phone: +251 911 234 567'],
      ['Email: info@smartsupermarket.et'],
      ['VAT: ET-123456789'],
      [''],
      ['Report Period:', dateLabel]
    ];
    const infoWS = XLSX.utils.aoa_to_sheet(businessInfo);
    XLSX.utils.book_append_sheet(wb, infoWS, 'Business Info');

    // Sales Summary
    const salesData = [
      { Metric: 'Report Period', Value: dateLabel },
      { Metric: 'Total Sales', Value: `$${data.totalSales}` },
      { Metric: 'Total Orders', Value: data.totalOrders },
      { Metric: 'Total Items Sold', Value: data.totalItemsSold },
      { Metric: 'Avg Order Value', Value: `$${data.avgOrderValue}` },
      { Metric: 'Gross Sales', Value: `$${data.grossSales}` },
      { Metric: 'Net Sales', Value: `$${data.netSales}` },
      { Metric: 'Discounts', Value: `$${data.discounts}` },
      { Metric: 'Refunds', Value: `$${data.refunds}` },
      { Metric: 'Taxes', Value: `$${data.taxes}` },
    ];
    const salesWS = XLSX.utils.json_to_sheet(salesData);
    XLSX.utils.book_append_sheet(wb, salesWS, '1. Sales Summary');

    // Payment Methods
    const paymentsWS = XLSX.utils.json_to_sheet([
      { Method: 'Cash', Amount: `$${data.paymentMethods.cash}` },
      { Method: 'Card', Amount: `$${data.paymentMethods.card}` },
      { Method: 'Mobile', Amount: `$${data.paymentMethods.mobile}` },
      { Method: 'Credit', Amount: `$${data.paymentMethods.credit}` },
    ]);
    XLSX.utils.book_append_sheet(wb, paymentsWS, '1b. Payment Methods');

    // Top Products
    const productsWS = XLSX.utils.json_to_sheet(
      data.topProducts.map(p => ({
        Product: p.name,
        'Units Sold': p.sold,
        Revenue: `$${p.revenue}`
      }))
    );
    XLSX.utils.book_append_sheet(wb, productsWS, '2. Top Products');

    // 🆕 DETAILED INVENTORY SHEET
    const inventoryWS = XLSX.utils.json_to_sheet(
      data.products.map(p => ({
        'Product Name': p.name,
        'Category': p.category,
        'SKU': p.sku,
        'Purchase Price (ETB)': p.purchasePrice,
        'Selling Price (ETB)': p.sellingPrice,
        'Current Quantity': p.quantity,
        'Low Stock Threshold': p.lowStockThreshold,
        'Stock Status': p.quantity <= p.lowStockThreshold ? 'LOW STOCK' : 'OK'
      }))
    );
    XLSX.utils.book_append_sheet(wb, inventoryWS, '3. Detailed Inventory');

    // Financial
    const financialWS = XLSX.utils.json_to_sheet([
      { Metric: 'Revenue', Value: `$${data.revenue}` },
      { Metric: 'COGS', Value: `$${data.cogs}` },
      { Metric: 'Gross Profit', Value: `$${data.grossProfit}` },
      { Metric: 'Gross Margin %', Value: `${data.grossMargin}%` },
      { Metric: 'Net Profit', Value: `$${data.netProfit}` },
    ]);
    XLSX.utils.book_append_sheet(wb, financialWS, '4. Financial');

    // Tax
    const taxWS = XLSX.utils.json_to_sheet([
      { Metric: 'Total Tax Collected', Value: `$${data.totalTax}` },
    ]);
    const taxCatWS = XLSX.utils.json_to_sheet(
      data.taxByCategory.map(t => ({ Category: t.category, Tax: `$${t.tax}` }))
    );
    XLSX.utils.book_append_sheet(wb, taxWS, '7. Tax Summary');
    XLSX.utils.book_append_sheet(wb, taxCatWS, '7b. Tax by Category');

    XLSX.writeFile(wb, `SmartPOS_Report_${period}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateLabel = getDateRangeLabel();
    const pageWidth = doc.internal.pageSize.width;

    // ======================
    // 🏪 BUSINESS HEADER
    // ======================
    
    // Business Information - CUSTOMIZE THESE VALUES
    const businessInfo = {
      name: "SMART SUPERMARKET",
      address: "Bole Road, Addis Ababa, Ethiopia",
      phone: "+251 911 234 567",
      email: "info@smartsupermarket.et",
      taxId: "VAT: ET-123456789",
      website: "www.smartsupermarket.et"
    };

    // Position settings
    const leftMargin = 14;
    const headerY = 20;

    // Business Name
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(businessInfo.name, pageWidth / 2, headerY, { align: 'center' });

    // Business Details (address, phone, etc.)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const detailsY = headerY + 8;
    const lineHeight = 4;
    
    doc.text(businessInfo.address, pageWidth / 2, detailsY, { align: 'center' });
    doc.text(businessInfo.phone, pageWidth / 2, detailsY + lineHeight, { align: 'center' });
    doc.text(businessInfo.email, pageWidth / 2, detailsY + (lineHeight * 2), { align: 'center' });
    doc.text(businessInfo.website, pageWidth / 2, detailsY + (lineHeight * 3), { align: 'center' });
    
    // Tax ID (highlighted)
    doc.setFont('helvetica', 'bold');
    doc.text(businessInfo.taxId, pageWidth / 2, detailsY + (lineHeight * 4), { align: 'center' });

    // Report Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SALES REPORT', pageWidth / 2, detailsY + (lineHeight * 6), { align: 'center' });

    // Date Range
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Period: ${dateLabel}`, pageWidth / 2, detailsY + (lineHeight * 7.5), { align: 'center' });

    // Decorative line
    doc.setDrawColor(32, 191, 107);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, detailsY + (lineHeight * 8.5), pageWidth - leftMargin, detailsY + (lineHeight * 8.5));

    // ======================
    // 📊 REPORT CONTENT
    // ======================
    const contentStartY = detailsY + (lineHeight * 9.5);

    // Sales Summary Table
    autoTable(doc, {
      startY: contentStartY,
      head: [['Metric', 'Value']],
      body: [
        ['Total Sales', `$${data.totalSales}`],
        ['Total Orders', data.totalOrders.toString()],
        ['Total Items Sold', data.totalItemsSold.toString()],
        ['Avg Order Value', `$${data.avgOrderValue}`],
        ['Gross Sales', `$${data.grossSales}`],
        ['Net Sales', `$${data.netSales}`],
        ['Discounts', `$${data.discounts}`],
        ['Refunds', `$${data.refunds}`],
        ['Taxes', `$${data.taxes}`],
      ],
      theme: 'grid',
      headStyles: { 
        fillColor: [32, 191, 107],
        fontSize: 11,
        textColor: [255, 255, 255]
      },
      styles: { 
        fontSize: 10,
        cellPadding: 6
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'right' }
      }
    });

    // Top Products
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Product', 'Units Sold', 'Revenue']],
      body: data.topProducts.map(p => [p.name, p.sold.toString(), `$${p.revenue}`]),
      theme: 'grid',
      headStyles: { 
        fillColor: [32, 191, 107],
        fontSize: 11,
        textColor: [255, 255, 255]
      },
      styles: { 
        fontSize: 10,
        cellPadding: 6
      }
    });

    // Tax Summary
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Category', 'Tax Amount']],
      body: [
        ...data.taxByCategory.map(t => [t.category, `$${t.tax}`]),
        ['Total', `$${data.totalTax}`]
      ],
      theme: 'grid',
      headStyles: { 
        fillColor: [32, 191, 107],
        fontSize: 11,
        textColor: [255, 255, 255]
      },
      styles: { 
        fontSize: 10,
        cellPadding: 6
      },
      didParseCell: function(data) {
        // Bold the Total row
        if (data.row.index === data.table.body.length - 1) {
          doc.setFont('helvetica', 'bold');
        }
      }
    });

    // ======================
    // 📄 FOOTER
    // ======================
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.height;
      
      // Footer line
      doc.setDrawColor(200, 200, 200);
      doc.line(leftMargin, pageHeight - 20, pageWidth - leftMargin, pageHeight - 20);
      
      // Footer text
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Smart POS System • Generated automatically', leftMargin, pageHeight - 15);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - leftMargin, pageHeight - 15, { align: 'right' });
      
      // Business contact info in footer
      doc.text(`${businessInfo.phone} • ${businessInfo.email}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
    }

    doc.save(`SmartPOS_Report_${period}.pdf`);
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Period: {getDateRangeLabel()}</p>
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
      <div className="bg-card p-4 rounded-xl border mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-foreground">Report Period:</span>
          
          {(['daily', 'weekly', 'monthly', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}

          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 ml-2">
              <input
                type="date"
                value={customDates.start}
                onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                className="border rounded px-2 py-1 text-sm bg-background"
              />
              <span className="text-muted-foreground">to</span>
              <input
                type="date"
                value={customDates.end}
                onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                className="border rounded px-2 py-1 text-sm bg-background"
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { title: 'Total Sales', value: `$${data.totalSales}` },
          { title: 'Total Orders', value: data.totalOrders },
          { title: 'Avg Order', value: `$${data.avgOrderValue}` },
          { title: 'Gross Profit', value: `$${data.grossProfit}` },
        ].map((item, i) => (
          <div key={i} className="bg-card p-4 rounded-xl border">
            <p className="text-muted-foreground text-sm">{item.title}</p>
            <p className="text-lg font-bold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Payment Methods */}
        <div className="bg-card p-4 rounded-xl border">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Payment Methods</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Cash', value: parseFloat(data.paymentMethods.cash) },
                  { name: 'Card', value: parseFloat(data.paymentMethods.card) },
                  { name: 'Mobile', value: parseFloat(data.paymentMethods.mobile) },
                  { name: 'Credit', value: parseFloat(data.paymentMethods.credit) },
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
        </div>

        {/* Top Products */}
        <div className="bg-card p-4 rounded-xl border">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Top Selling Products</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topProducts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
              <Legend />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue ($)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tax Table */}
      <div className="bg-card p-4 rounded-xl border">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Tax Summary</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-muted-foreground">Category</th>
                <th className="text-right py-2 text-muted-foreground">Tax Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.taxByCategory.map((item, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-accent/30">
                  <td className="py-3">{item.category}</td>
                  <td className="py-3 text-right font-medium">${item.tax}</td>
                </tr>
              ))}
              <tr className="font-bold bg-accent/20">
                <td className="py-3">Total</td>
                <td className="py-3 text-right">${data.totalTax}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;
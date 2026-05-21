// TypeScript seed - dummy data
import dotenv from "dotenv";
dotenv.config();

const prisma = require("../../src/repositories/prismaClient");
const userRepository = require("../../src/repositories/userRepository");
const martRepository = require("../../src/repositories/martRepository");
const productRepository = require("../../src/repositories/productRepository");
const customerRepository = require("../../src/repositories/customerRepository");
const saleRepository = require("../../src/repositories/saleRepository");
const expenseRepository = require("../../src/repositories/expenseRepository");
const assetRepository = require("../../src/repositories/assetRepository");
const attendanceRepository = require("../../src/repositories/attendanceRepository");
const dailyReportRepository = require("../../src/repositories/dailyReportRepository");
const paymentTypeRepository = require("../../src/repositories/paymentTypeRepository");
const expenseCategoryRepository = require("../../src/repositories/expenseCategoryRepository");

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function createDateDaysAgo(daysAgo, hour = 10, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function seed() {
  try {
    const testMart = await martRepository.findOne({
      martName: "Test Marketplace",
    });
    if (!testMart) {
      console.error("Test Mart not found. Please run seed-users first.");
      process.exit(1);
    }
    const testOwner = await userRepository.findOne({ username: "test_owner" });
    const testCashier = await userRepository.findOne({
      username: "test_cashier",
    });
    const testManager = await userRepository.findOne({
      username: "test_manager",
    });

    if (!testOwner || !testCashier || !testManager) {
      console.error("Test users not found. Please run seed-users first.");
      process.exit(1);
    }

    console.log("Using Mart:", testMart.id);

    (await productRepository.deleteMany?.({ martId: testMart.id })) ||
      (await prisma.product.deleteMany({ where: { martId: testMart.id } }));
    (await customerRepository.deleteMany?.({ martId: testMart.id })) ||
      (await prisma.customer.deleteMany({ where: { martId: testMart.id } }));
    (await saleRepository.deleteMany?.({ martId: testMart.id })) ||
      (await prisma.sale.deleteMany({ where: { martId: testMart.id } }));
    (await expenseRepository.deleteMany?.({ martId: testMart.id })) ||
      (await prisma.expense.deleteMany({ where: { martId: testMart.id } }));
    await prisma.asset.deleteMany({ where: { martId: testMart.id } });
    await prisma.attendance.deleteMany({ where: { martId: testMart.id } });
    await prisma.dailyReport.deleteMany({ where: { martId: testMart.id } });
    await prisma.paymentType.deleteMany({ where: { martId: testMart.id } });
    await prisma.expenseCategory.deleteMany({ where: { martId: testMart.id } });
    console.log("Cleared existing data for Test Mart");

    const productsData = [
      {
        name: "Coca Cola 500ml",
        category: "Drinks",
        unit: "bottle",
        purchasePrice: 20,
        sellingPrice: 30,
        supermarketQuantity: 50,
        barcodes: ["1001"],
      },
      {
        name: "Water 1L",
        category: "Drinks",
        unit: "bottle",
        purchasePrice: 10,
        sellingPrice: 15,
        supermarketQuantity: 100,
        barcodes: ["1002"],
      },
      {
        name: "Crisp Chips",
        category: "Snacks",
        unit: "pack",
        purchasePrice: 15,
        sellingPrice: 25,
        supermarketQuantity: 40,
        barcodes: ["2001"],
      },
      {
        name: "Digestive Biscuits",
        category: "Snacks",
        unit: "pack",
        purchasePrice: 12,
        sellingPrice: 20,
        supermarketQuantity: 30,
        barcodes: ["2002"],
      },
      {
        name: "Long Grain Rice 1kg",
        category: "Groceries",
        unit: "kg",
        purchasePrice: 85,
        sellingPrice: 110,
        supermarketQuantity: 20,
        barcodes: ["3001"],
      },
      {
        name: "Penne Pasta 500g",
        category: "Groceries",
        unit: "pack",
        purchasePrice: 25,
        sellingPrice: 40,
        supermarketQuantity: 25,
        barcodes: ["3002"],
      },
      {
        name: "Detergent 1kg",
        category: "Personal Care",
        unit: "pack",
        purchasePrice: 60,
        sellingPrice: 85,
        supermarketQuantity: 15,
        barcodes: ["4001"],
      },
      {
        name: "Hand Soap 100g",
        category: "Personal Care",
        unit: "pcs",
        purchasePrice: 15,
        sellingPrice: 25,
        supermarketQuantity: 20,
        barcodes: ["4002"],
      },
    ];

    const seededProducts = [];
    for (const p of productsData) {
      const created = await productRepository.create({
        ...p,
        martId: testMart.id,
        createdBy: testOwner.id,
      });
      seededProducts.push(created);
    }
    console.log(`Seeded ${seededProducts.length} products`);

    const customersData = [
      {
        name: "Abebe Kebede",
        phoneNumber: "0911223344",
        city: "Addis Ababa",
        totalCredit: 0,
      },
      {
        name: "Fatuma Mohammed",
        phoneNumber: "0922334455",
        city: "Addis Ababa",
        totalCredit: 500,
        totalUnpaid: 500,
      },
    ];

    const seededCustomers = [];
    for (const c of customersData) {
      const created = await customerRepository.create({
        ...c,
        martId: testMart.id,
        createdBy: testOwner.id,
      });
      seededCustomers.push(created);
    }
    console.log(`Seeded ${seededCustomers.length} customers`);

    const expensesData = [
      {
        category: "rent",
        description: "Monthly Shop Rent",
        amount: 5000,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        category: "electricity",
        description: "Electricity Bill",
        amount: 450,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        category: "cleaning",
        description: "Cleaning Supplies",
        amount: 200,
        date: new Date(),
      },
    ];

    const seededExpenses = [];
    for (const e of expensesData) {
      const created = await expenseRepository.create({
        ...e,
        martId: testMart.id,
        createdBy: testOwner.id,
      });
      seededExpenses.push(created);
    }
    console.log(`Seeded ${seededExpenses.length} expenses`);

    const paymentTypesData = [
      { name: "cash", icon: "Banknote" },
      { name: "cbe_bank", icon: "CreditCard" },
      { name: "telebirr", icon: "Smartphone" },
      { name: "hibret_bank", icon: "WalletCards" },
    ];
    for (const paymentType of paymentTypesData) {
      await paymentTypeRepository.upsert(paymentType.name, testMart.id, {
        icon: paymentType.icon,
      });
    }
    console.log(`Seeded ${paymentTypesData.length} payment types`);

    const expenseCategoriesData = [
      "rent",
      "electricity",
      "cleaning",
      "transport",
      "maintenance",
    ];
    for (const category of expenseCategoriesData) {
      await expenseCategoryRepository.upsert(category, testMart.id);
    }
    console.log(`Seeded ${expenseCategoriesData.length} expense categories`);

    const assetsData = [
      {
        name: "POS Desktop",
        assetId: "AST-001",
        sizeOrType: "All-in-one PC",
        purchaseDate: createDateDaysAgo(160),
        status: "in_use",
        asset_status: "unbroken",
        conditions: "Primary cashier workstation",
        assignedTo: "Front desk",
        purchasePrice: 75000,
        quantity: 1,
        description: "Main billing terminal",
      },
      {
        name: "Barcode Scanner",
        assetId: "AST-002",
        sizeOrType: "Handheld",
        purchaseDate: createDateDaysAgo(120),
        status: "in_use",
        asset_status: "unbroken",
        conditions: "Used for product lookup",
        assignedTo: "Cashier counter",
        purchasePrice: 8500,
        quantity: 2,
        description: "Two scanners for checkout flow",
      },
      {
        name: "Receipt Printer",
        assetId: "AST-003",
        sizeOrType: "Thermal printer",
        purchaseDate: createDateDaysAgo(140),
        status: "in_use",
        asset_status: "unbroken",
        conditions: "Daily printing",
        assignedTo: "Checkout counter",
        purchasePrice: 18000,
        quantity: 1,
        description: "Printer for receipts and reports",
      },
      {
        name: "Storage Shelf",
        assetId: "AST-004",
        sizeOrType: "Metal shelf",
        purchaseDate: createDateDaysAgo(200),
        status: "active",
        asset_status: "unbroken",
        conditions: "Stock storage",
        assignedTo: "Warehouse",
        purchasePrice: 22000,
        quantity: 4,
        description: "Shelving for product storage",
      },
      {
        name: "Handheld Stock Tablet",
        assetId: "AST-005",
        sizeOrType: "Tablet",
        purchaseDate: createDateDaysAgo(90),
        status: "in_use",
        asset_status: "broken",
        conditions: "Screen crack but still usable for inventory checks",
        assignedTo: "Storekeeper",
        purchasePrice: 28000,
        quantity: 1,
        description: "Used for stock verification and counts",
      },
    ];

    const seededAssets = [];
    for (const asset of assetsData) {
      const created = await assetRepository.create({
        ...asset,
        martId: testMart.id,
        createdBy: testOwner.id,
      });
      seededAssets.push(created);
    }
    console.log(`Seeded ${seededAssets.length} assets`);

    const paymentMethods = ["cash", "cbe_bank", "telebirr", "hibret_bank"];
    const salesCount = 45;
    const sales = [];

    for (let i = 0; i < salesCount; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (i % 3));
      date.setHours(
        Math.floor(Math.random() * 8) + 9,
        Math.floor(Math.random() * 60),
      );

      const itemsCount = Math.floor(Math.random() * 4) + 1;
      const items = [];
      let subtotal = 0;

      for (let j = 0; j < itemsCount; j++) {
        const product =
          seededProducts[Math.floor(Math.random() * seededProducts.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        const itemTotal = product.sellingPrice * qty;
        items.push({
          productId: String(product.id),
          name: product.name,
          price: product.sellingPrice,
          quantity: qty,
          total: itemTotal,
        });
        subtotal += itemTotal;
      }

      const taxRate = 0.15;
      const tax = subtotal * taxRate;
      const total = subtotal + tax;

      sales.push({
        martId: testMart.id,
        cashierId: testCashier.id,
        cashierName: testCashier.name,
        receiptId: `REC-${1000 + i}`,
        items,
        subtotal,
        tax,
        taxRate: 15,
        total,
        paymentMethod:
          paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        date,
      });
    }

    const seededSales = [];
    for (const s of sales) {
      const created = await saleRepository.createWithItems(s, s.items);
      seededSales.push(created);
    }
    console.log(`Seeded ${seededSales.length} sales`);

    const reportGroups = new Map();
    for (const sale of seededSales) {
      const key = toDateKey(new Date(sale.date));
      const current = reportGroups.get(key) || {
        totalSales: 0,
        cashReceived: 0,
        bankTransfer: 0,
        discountsGiven: 0,
        date: new Date(sale.date),
      };

      current.totalSales += Number(sale.total || 0);
      if (String(sale.paymentMethod || "").includes("cash")) {
        current.cashReceived += Number(sale.total || 0);
      } else {
        current.bankTransfer += Number(sale.total || 0);
      }
      reportGroups.set(key, current);
    }

    const seededReports = [];
    for (const [dayKey, report] of reportGroups.entries()) {
      const created = await dailyReportRepository.create({
        martId: testMart.id,
        cashierId: testCashier.id,
        cashierName: testCashier.name,
        date: report.date,
        totalSales: Number(report.totalSales.toFixed(2)),
        cashReceived: Number(report.cashReceived.toFixed(2)),
        bankTransfer: Number(report.bankTransfer.toFixed(2)),
        discountsGiven: 0,
        notes: `Seeded daily summary for ${dayKey}`,
      });
      seededReports.push(created);
    }
    console.log(`Seeded ${seededReports.length} daily reports`);

    const attendanceDates = [0, 1, 2, 3, 4, 5];
    const attendanceSeed = [];
    for (const daysAgo of attendanceDates) {
      const employee = daysAgo % 2 === 0 ? testCashier : testManager;
      const clockInHour = 8 + (daysAgo % 2);
      const clockOutHour = 17 + (daysAgo % 2);
      const clockIn = `${String(clockInHour).padStart(2, "0")}:${String(
        10 + daysAgo,
      ).padStart(2, "0")}`;
      const clockOut = `${String(clockOutHour).padStart(2, "0")}:${String(
        15 + daysAgo,
      ).padStart(2, "0")}`;
      const durationMinutes = (clockOutHour - clockInHour) * 60 + 5;

      const created = await attendanceRepository.create({
        martId: testMart.id,
        employeeId: employee.id,
        employeeName: employee.name,
        dateYmd: toDateKey(createDateDaysAgo(daysAgo)),
        clockIn,
        clockOut,
        durationMinutes,
        notes:
          daysAgo === 0 ? "Present day opening shift" : "Regular shift record",
        createdBy: testOwner.id,
      });
      attendanceSeed.push(created);
    }
    console.log(`Seeded ${attendanceSeed.length} attendance records`);

    console.log("\nDummy data seeding completed successfully!");
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

seed();

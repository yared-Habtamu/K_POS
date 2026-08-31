/**
 * Seed: Credit Management & Expense Approval test data
 * Run: npx ts-node prisma/seed/seed-credit-test.ts
 */
import dotenv from "dotenv";
dotenv.config();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const prisma = require("../../src/repositories/prismaClient");

const MART_ID = "9f45b9a6-9f96-4999-9dcc-39dbb7e96852";
const OWNER_ID = "4dd6befe-aa09-4df7-9a30-00bc292535f5";
const MANAGER_ID = "251d1802-84d5-42bd-be27-11864bc27aee";
const CASHIER_ID = "3f141acf-60de-4e27-871b-357c9ba2c9fd";

async function main() {
  console.log("=== Seeding credit & expense approval test data ===\n");

  // ── 1. Fetch customers ────────────────────────────────────────────────────
  const customers = await prisma.customer.findMany({
    where: { martId: MART_ID, isDeleted: false },
  });

  if (customers.length < 2) {
    console.error("Not enough customers found. Run seed-dummy-data first.");
    process.exit(1);
  }

  const [c1, c2, c3] = customers; // Abebe, Fatuma, Chala (or whatever exists)
  console.log(
    `Using customers: ${customers.map((c: any) => c.name).join(", ")}`,
  );

  // ── 2. Fetch a product for sale items ─────────────────────────────────────
  const product = await prisma.product.findFirst({
    where: { martId: MART_ID, isDeleted: false },
  });
  if (!product) {
    console.error("No products found. Run seed-dummy-data first.");
    process.exit(1);
  }

  // ── 3. Create credit sales ────────────────────────────────────────────────
  // Sale 1: Cashier gives credit to c1 (500 ETB credit)
  const sale1 = await prisma.sale.create({
    data: {
      martId: MART_ID,
      cashierId: CASHIER_ID,
      cashierName: "test_cashier",
      customerId: c1.id,
      receiptId: `CREDIT-TEST-001`,
      subtotal: 500,
      tax: 0,
      taxRate: 0,
      total: 500,
      amountPaid: 0,
      creditAmount: 500,
      paymentMethod: "credit",
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
  });
  // Update customer credit
  await prisma.customer.update({
    where: { id: c1.id },
    data: {
      totalCredit: { increment: 500 },
      totalUnpaid: { increment: 500 },
    },
  });
  await prisma.saleItem.create({
    data: {
      saleId: sale1.id,
      productId: product.id,
      name: product.name,
      price: product.sellingPrice,
      quantity: 2,
      total: 500,
    },
  });
  console.log(`✓ Credit sale by CASHIER → ${c1.name}: 500 ETB`);

  // Sale 2: Manager gives credit to c2 (800 ETB credit)
  const sale2 = await prisma.sale.create({
    data: {
      martId: MART_ID,
      cashierId: MANAGER_ID,
      cashierName: "test_manager",
      customerId: c2.id,
      receiptId: `CREDIT-TEST-002`,
      subtotal: 800,
      tax: 0,
      taxRate: 0,
      total: 800,
      amountPaid: 200,
      creditAmount: 600,
      paymentMethod: "credit",
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    },
  });
  await prisma.customer.update({
    where: { id: c2.id },
    data: {
      totalCredit: { increment: 600 },
      totalUnpaid: { increment: 600 },
    },
  });
  await prisma.saleItem.create({
    data: {
      saleId: sale2.id,
      productId: product.id,
      name: product.name,
      price: product.sellingPrice,
      quantity: 3,
      total: 800,
    },
  });
  console.log(`✓ Credit sale by MANAGER → ${c2.name}: 600 ETB credit (200 paid upfront)`);

  // Sale 3: Owner gives credit to c1 (300 ETB credit)
  const sale3 = await prisma.sale.create({
    data: {
      martId: MART_ID,
      cashierId: OWNER_ID,
      cashierName: "test_owner",
      customerId: c1.id,
      receiptId: `CREDIT-TEST-003`,
      subtotal: 300,
      tax: 0,
      taxRate: 0,
      total: 300,
      amountPaid: 0,
      creditAmount: 300,
      paymentMethod: "credit",
      date: new Date(),
    },
  });
  await prisma.customer.update({
    where: { id: c1.id },
    data: {
      totalCredit: { increment: 300 },
      totalUnpaid: { increment: 300 },
    },
  });
  await prisma.saleItem.create({
    data: {
      saleId: sale3.id,
      productId: product.id,
      name: product.name,
      price: product.sellingPrice,
      quantity: 1,
      total: 300,
    },
  });
  console.log(`✓ Credit sale by OWNER → ${c1.name}: 300 ETB`);

  // Also give cashier credit to c3 if exists (so cashier sees multiple customers)
  if (c3) {
    const sale4 = await prisma.sale.create({
      data: {
        martId: MART_ID,
        cashierId: CASHIER_ID,
        cashierName: "test_cashier",
        customerId: c3.id,
        receiptId: `CREDIT-TEST-004`,
        subtotal: 1200,
        tax: 0,
        taxRate: 0,
        total: 1200,
        amountPaid: 0,
        creditAmount: 1200,
        paymentMethod: "credit",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.customer.update({
      where: { id: c3.id },
      data: {
        totalCredit: { increment: 1200 },
        totalUnpaid: { increment: 1200 },
      },
    });
    await prisma.saleItem.create({
      data: {
        saleId: sale4.id,
        productId: product.id,
        name: product.name,
        price: product.sellingPrice,
        quantity: 5,
        total: 1200,
      },
    });
    console.log(`✓ Credit sale by CASHIER → ${c3.name}: 1200 ETB`);
  }

  // ── 4. Credit repayment: Abebe pays 200 ETB to cashier ───────────────────
  await prisma.creditPayment.create({
    data: {
      martId: MART_ID,
      customerId: c1.id,
      collectedBy: CASHIER_ID,
      collectedByName: "test_cashier",
      collectedByRole: "cashier",
      amountPaid: 200,
      paymentMethod: "cash",
      note: "Partial payment - cash at counter",
    },
  });
  await prisma.customer.update({
    where: { id: c1.id },
    data: {
      totalPaid: { increment: 200 },
      totalUnpaid: { decrement: 200 },
    },
  });
  console.log(`✓ Credit repayment: ${c1.name} paid 200 ETB → collected by cashier`);

  // Fatuma pays 300 ETB to manager
  await prisma.creditPayment.create({
    data: {
      martId: MART_ID,
      customerId: c2.id,
      collectedBy: MANAGER_ID,
      collectedByName: "test_manager",
      collectedByRole: "manager",
      amountPaid: 300,
      paymentMethod: "telebirr",
      note: "Telebirr transfer - ref #TLB-9921",
    },
  });
  await prisma.customer.update({
    where: { id: c2.id },
    data: {
      totalPaid: { increment: 300 },
      totalUnpaid: { decrement: 300 },
    },
  });
  console.log(`✓ Credit repayment: ${c2.name} paid 300 ETB → collected by manager`);

  // ── 5. Pending expense action requests (for owner approval test) ──────────
  const pendingExpenses = [
    {
      description: "Printer ink cartridges x4",
      category: "supplies",
      amount: 1600,
      name: "Office supplies restock",
      reason: "Running low on printing supplies for receipts",
      paymentType: "open_cash",
    },
    {
      description: "Delivery fee for restocking run",
      category: "transport",
      amount: 450,
      name: "Restocking transport",
      reason: "Needed to pick up products from warehouse",
      paymentType: "open_cash",
    },
    {
      description: "Security camera maintenance",
      category: "maintenance",
      amount: 2500,
      name: "CCTV service call",
      reason: "Camera 3 stopped recording, technician visit required",
      paymentType: "open_cash",
    },
  ];

  for (const exp of pendingExpenses) {
    await prisma.expenseActionRequest.create({
      data: {
        martId: MART_ID,
        requesterId: MANAGER_ID,
        requesterName: "test_manager",
        requesterRole: "manager",
        action: "create",
        approvalRole: "owner",
        status: "pending",
        payload: {
          category: exp.category,
          description: exp.description,
          amount: exp.amount,
          date: new Date().toISOString(),
          paymentType: exp.paymentType,
          name: exp.name,
          reason: exp.reason,
        },
      },
    });
    console.log(`✓ Pending expense request: "${exp.description}" (${exp.amount} ETB)`);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n=== Seed complete ===");
  console.log("\nWhat to test:");
  console.log("  LOGIN as test_cashier (password123):");
  console.log("    → Customer page: should see ONLY customers they credited (Abebe + Chala)");
  console.log("    → Cards: 'My Credit Given' = 1700, 'My Repayments' = 200");
  console.log("    → Abebe should NOT show since owner also credited him (but cashier still shows)");
  console.log("\n  LOGIN as test_manager (password123):");
  console.log("    → Customer page: sees ALL customers, can filter by staff");
  console.log("    → Fatuma shows manager credit = 600");
  console.log("\n  LOGIN as test_owner (password123):");
  console.log("    → Approvals page: 3 PENDING expense requests to approve/reject");
  console.log("    → Click each row to see full details (description, amount, reason)");
  console.log("    → Reject one with a reason, approve another");
  console.log("    → Customer page: sees all 3 customers, can filter by staff");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

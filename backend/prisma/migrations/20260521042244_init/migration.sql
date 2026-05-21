-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('systemAdmin', 'owner', 'manager', 'cashier', 'storeKeeper', 'other');

-- CreateEnum
CREATE TYPE "MartStatus" AS ENUM ('pending', 'approved', 'disabled', 'suspended', 'rejected');

-- CreateEnum
CREATE TYPE "AssetConditionStatus" AS ENUM ('unbroken', 'broken');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "RequestAction" AS ENUM ('create', 'update', 'delete');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'fixed');

-- CreateEnum
CREATE TYPE "ExpenseCreatorRole" AS ENUM ('owner', 'manager', 'other');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'warning', 'suspended');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "martId" TEXT,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "profilePictureUrl" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'other',
    "salary" DOUBLE PRECISION,
    "openCashBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marts" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "martName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "country" TEXT,
    "region" TEXT,
    "city" TEXT,
    "address" TEXT,
    "receiptHeader" TEXT,
    "receiptMessage" TEXT,
    "shopLogoUrl" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "paymentSystem" TEXT,
    "paymentAccounts" JSONB,
    "customPaymentFields" JSONB,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "globalDiscountType" "DiscountType" NOT NULL DEFAULT 'percentage',
    "globalDiscountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enableDiscountByItems" BOOLEAN NOT NULL DEFAULT false,
    "enableDiscountByAmount" BOOLEAN NOT NULL DEFAULT false,
    "discountMinItems" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountMinAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "MartStatus" NOT NULL DEFAULT 'pending',
    "subscription" JSONB,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "martId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storeQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "supermarketQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lowStockThreshold" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "expiryDate" TIMESTAMP(3),
    "barcodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "createdBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "martId" TEXT NOT NULL,
    "cashierId" TEXT,
    "cashierName" TEXT,
    "receiptId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discount" JSONB,
    "extraCharges" JSONB,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT,
    "price" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "martId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "martId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "totalCredit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalUnpaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "martId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'miscellaneous',
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "createdByRole" "ExpenseCreatorRole" NOT NULL DEFAULT 'other',
    "createdByName" TEXT,
    "paymentType" TEXT,
    "paymentScreenshot" TEXT,
    "productPicture" TEXT,
    "name" TEXT,
    "reason" TEXT,
    "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "martId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "martId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetId" TEXT,
    "image" TEXT,
    "sizeOrType" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "status" TEXT,
    "asset_status" "AssetConditionStatus" NOT NULL DEFAULT 'unbroken',
    "conditions" TEXT,
    "assignedTo" TEXT,
    "purchasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" TEXT NOT NULL,
    "martId" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "dateYmd" TEXT,
    "clockIn" TEXT,
    "clockOut" TEXT,
    "durationMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdBy" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_reports" (
    "id" TEXT NOT NULL,
    "martId" TEXT,
    "cashierId" TEXT,
    "cashierName" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "totalSales" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cashReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bankTransfer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountsGiven" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "martId" TEXT,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'Wallet',
    "martId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_settings" (
    "id" TEXT NOT NULL,
    "defaultFeeEtb" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "billingPeriodDays" INTEGER NOT NULL DEFAULT 30,
    "defaultStorageLimitMb" DOUBLE PRECISION NOT NULL DEFAULT 500,
    "warningDaysBeforeExpiry" INTEGER NOT NULL DEFAULT 5,
    "warningStoragePercent" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "autoSuspendEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_action_requests" (
    "id" TEXT NOT NULL,
    "martId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterName" TEXT,
    "requesterRole" TEXT,
    "assetId" TEXT,
    "productId" TEXT,
    "action" "RequestAction" NOT NULL,
    "payload" JSONB,
    "approvalRole" TEXT DEFAULT 'manager',
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "approverId" TEXT,
    "approverName" TEXT,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_action_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_action_requests" (
    "id" TEXT NOT NULL,
    "martId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterName" TEXT,
    "requesterRole" TEXT,
    "action" TEXT DEFAULT 'create',
    "approvalRole" TEXT DEFAULT 'owner',
    "payload" JSONB NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "approverId" TEXT,
    "approverName" TEXT,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_action_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_add_requests" (
    "id" TEXT NOT NULL,
    "martId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterName" TEXT,
    "payload" JSONB NOT NULL,
    "approvalRole" TEXT DEFAULT 'manager',
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "approverId" TEXT,
    "approverName" TEXT,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_add_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_edit_requests" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "martId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "requesterName" TEXT,
    "changes" JSONB NOT NULL,
    "approvalRole" TEXT DEFAULT 'manager',
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "approverId" TEXT,
    "approverName" TEXT,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_edit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfer_requests" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "martId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "fromLocation" TEXT NOT NULL DEFAULT 'store',
    "toLocation" TEXT NOT NULL DEFAULT 'mart',
    "approvalRole" TEXT DEFAULT 'manager',
    "requesterId" TEXT NOT NULL,
    "requesterName" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "approverId" TEXT,
    "approverName" TEXT,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_martId_idx" ON "users"("martId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_isDeleted_idx" ON "users"("isDeleted");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "marts_ownerId_idx" ON "marts"("ownerId");

-- CreateIndex
CREATE INDEX "marts_martName_idx" ON "marts"("martName");

-- CreateIndex
CREATE INDEX "marts_isDeleted_idx" ON "marts"("isDeleted");

-- CreateIndex
CREATE INDEX "products_martId_idx" ON "products"("martId");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_isDeleted_idx" ON "products"("isDeleted");

-- CreateIndex
CREATE INDEX "products_barcodes_idx" ON "products"("barcodes");

-- CreateIndex
CREATE INDEX "sales_martId_idx" ON "sales"("martId");

-- CreateIndex
CREATE INDEX "sales_date_idx" ON "sales"("date");

-- CreateIndex
CREATE INDEX "sale_items_saleId_idx" ON "sale_items"("saleId");

-- CreateIndex
CREATE INDEX "categories_isDeleted_idx" ON "categories"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_martId_key" ON "categories"("name", "martId");

-- CreateIndex
CREATE INDEX "customers_martId_idx" ON "customers"("martId");

-- CreateIndex
CREATE INDEX "customers_createdBy_idx" ON "customers"("createdBy");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_isDeleted_idx" ON "customers"("isDeleted");

-- CreateIndex
CREATE INDEX "expenses_martId_idx" ON "expenses"("martId");

-- CreateIndex
CREATE INDEX "expenses_createdByRole_idx" ON "expenses"("createdByRole");

-- CreateIndex
CREATE INDEX "expenses_isDeleted_idx" ON "expenses"("isDeleted");

-- CreateIndex
CREATE INDEX "expense_categories_isDeleted_idx" ON "expense_categories"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_martId_key" ON "expense_categories"("name", "martId");

-- CreateIndex
CREATE INDEX "assets_martId_idx" ON "assets"("martId");

-- CreateIndex
CREATE INDEX "assets_name_idx" ON "assets"("name");

-- CreateIndex
CREATE INDEX "assets_assetId_idx" ON "assets"("assetId");

-- CreateIndex
CREATE INDEX "assets_asset_status_idx" ON "assets"("asset_status");

-- CreateIndex
CREATE INDEX "assets_isDeleted_idx" ON "assets"("isDeleted");

-- CreateIndex
CREATE INDEX "attendances_martId_idx" ON "attendances"("martId");

-- CreateIndex
CREATE INDEX "attendances_employeeId_idx" ON "attendances"("employeeId");

-- CreateIndex
CREATE INDEX "attendances_dateYmd_idx" ON "attendances"("dateYmd");

-- CreateIndex
CREATE INDEX "attendances_isDeleted_idx" ON "attendances"("isDeleted");

-- CreateIndex
CREATE INDEX "daily_reports_martId_idx" ON "daily_reports"("martId");

-- CreateIndex
CREATE INDEX "daily_reports_cashierId_idx" ON "daily_reports"("cashierId");

-- CreateIndex
CREATE INDEX "daily_reports_date_idx" ON "daily_reports"("date");

-- CreateIndex
CREATE INDEX "notifications_martId_idx" ON "notifications"("martId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "payment_types_isDeleted_idx" ON "payment_types"("isDeleted");

-- CreateIndex
CREATE UNIQUE INDEX "payment_types_name_martId_key" ON "payment_types"("name", "martId");

-- CreateIndex
CREATE INDEX "asset_action_requests_martId_idx" ON "asset_action_requests"("martId");

-- CreateIndex
CREATE INDEX "asset_action_requests_action_idx" ON "asset_action_requests"("action");

-- CreateIndex
CREATE INDEX "asset_action_requests_approvalRole_idx" ON "asset_action_requests"("approvalRole");

-- CreateIndex
CREATE INDEX "asset_action_requests_status_idx" ON "asset_action_requests"("status");

-- CreateIndex
CREATE INDEX "expense_action_requests_martId_idx" ON "expense_action_requests"("martId");

-- CreateIndex
CREATE INDEX "expense_action_requests_requesterId_idx" ON "expense_action_requests"("requesterId");

-- CreateIndex
CREATE INDEX "expense_action_requests_action_idx" ON "expense_action_requests"("action");

-- CreateIndex
CREATE INDEX "expense_action_requests_approvalRole_idx" ON "expense_action_requests"("approvalRole");

-- CreateIndex
CREATE INDEX "expense_action_requests_status_idx" ON "expense_action_requests"("status");

-- CreateIndex
CREATE INDEX "product_add_requests_martId_idx" ON "product_add_requests"("martId");

-- CreateIndex
CREATE INDEX "product_add_requests_approvalRole_idx" ON "product_add_requests"("approvalRole");

-- CreateIndex
CREATE INDEX "product_edit_requests_productId_idx" ON "product_edit_requests"("productId");

-- CreateIndex
CREATE INDEX "product_edit_requests_martId_idx" ON "product_edit_requests"("martId");

-- CreateIndex
CREATE INDEX "product_edit_requests_approvalRole_idx" ON "product_edit_requests"("approvalRole");

-- CreateIndex
CREATE INDEX "stock_transfer_requests_productId_idx" ON "stock_transfer_requests"("productId");

-- CreateIndex
CREATE INDEX "stock_transfer_requests_martId_idx" ON "stock_transfer_requests"("martId");

-- CreateIndex
CREATE INDEX "stock_transfer_requests_approvalRole_idx" ON "stock_transfer_requests"("approvalRole");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marts" ADD CONSTRAINT "marts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_types" ADD CONSTRAINT "payment_types_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_action_requests" ADD CONSTRAINT "asset_action_requests_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_action_requests" ADD CONSTRAINT "asset_action_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_action_requests" ADD CONSTRAINT "asset_action_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_action_requests" ADD CONSTRAINT "asset_action_requests_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_action_requests" ADD CONSTRAINT "asset_action_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_action_requests" ADD CONSTRAINT "expense_action_requests_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_action_requests" ADD CONSTRAINT "expense_action_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_action_requests" ADD CONSTRAINT "expense_action_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_add_requests" ADD CONSTRAINT "product_add_requests_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_add_requests" ADD CONSTRAINT "product_add_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_add_requests" ADD CONSTRAINT "product_add_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_edit_requests" ADD CONSTRAINT "product_edit_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_edit_requests" ADD CONSTRAINT "product_edit_requests_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_edit_requests" ADD CONSTRAINT "product_edit_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_edit_requests" ADD CONSTRAINT "product_edit_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_requests" ADD CONSTRAINT "stock_transfer_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_requests" ADD CONSTRAINT "stock_transfer_requests_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_requests" ADD CONSTRAINT "stock_transfer_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfer_requests" ADD CONSTRAINT "stock_transfer_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

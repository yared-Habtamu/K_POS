-- CreateEnum
CREATE TYPE "OpenCashDirection" AS ENUM ('allocation', 'return');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('completed', 'cancelled');

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "status" "SaleStatus" NOT NULL DEFAULT 'completed';

-- AlterTable
ALTER TABLE "subscription_settings" ADD COLUMN     "defaultProductLimit" INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE "open_cash_requests" (
    "id" TEXT NOT NULL,
    "martId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "direction" "OpenCashDirection" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "receiptUrl" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "approverId" TEXT,
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "open_cash_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_cancellation_requests" (
    "id" TEXT NOT NULL,
    "martId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "approverId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_cancellation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" TEXT NOT NULL,
    "martId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "open_cash_requests_martId_idx" ON "open_cash_requests"("martId");

-- CreateIndex
CREATE INDEX "open_cash_requests_managerId_idx" ON "open_cash_requests"("managerId");

-- CreateIndex
CREATE INDEX "open_cash_requests_requesterId_idx" ON "open_cash_requests"("requesterId");

-- CreateIndex
CREATE INDEX "open_cash_requests_status_idx" ON "open_cash_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "sale_cancellation_requests_saleId_key" ON "sale_cancellation_requests"("saleId");

-- CreateIndex
CREATE INDEX "sale_cancellation_requests_martId_idx" ON "sale_cancellation_requests"("martId");

-- CreateIndex
CREATE INDEX "sale_cancellation_requests_saleId_idx" ON "sale_cancellation_requests"("saleId");

-- CreateIndex
CREATE INDEX "sale_cancellation_requests_requesterId_idx" ON "sale_cancellation_requests"("requesterId");

-- CreateIndex
CREATE INDEX "sale_cancellation_requests_status_idx" ON "sale_cancellation_requests"("status");

-- CreateIndex
CREATE INDEX "chat_conversations_martId_idx" ON "chat_conversations"("martId");

-- CreateIndex
CREATE INDEX "chat_conversations_managerId_idx" ON "chat_conversations"("managerId");

-- CreateIndex
CREATE INDEX "chat_conversations_cashierId_idx" ON "chat_conversations"("cashierId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_martId_managerId_cashierId_key" ON "chat_conversations"("martId", "managerId", "cashierId");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_idx" ON "chat_messages"("conversationId");

-- CreateIndex
CREATE INDEX "chat_messages_senderId_idx" ON "chat_messages"("senderId");

-- CreateIndex
CREATE INDEX "chat_messages_createdAt_idx" ON "chat_messages"("createdAt");

-- CreateIndex
CREATE INDEX "sales_status_idx" ON "sales"("status");

-- AddForeignKey
ALTER TABLE "open_cash_requests" ADD CONSTRAINT "open_cash_requests_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_cash_requests" ADD CONSTRAINT "open_cash_requests_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_cash_requests" ADD CONSTRAINT "open_cash_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "open_cash_requests" ADD CONSTRAINT "open_cash_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_cancellation_requests" ADD CONSTRAINT "sale_cancellation_requests_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_cancellation_requests" ADD CONSTRAINT "sale_cancellation_requests_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_cancellation_requests" ADD CONSTRAINT "sale_cancellation_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_cancellation_requests" ADD CONSTRAINT "sale_cancellation_requests_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_martId_fkey" FOREIGN KEY ("martId") REFERENCES "marts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversations" ADD CONSTRAINT "chat_conversations_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

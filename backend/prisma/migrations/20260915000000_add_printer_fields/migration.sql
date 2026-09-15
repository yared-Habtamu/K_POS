-- Multi-tenant printer isolation with custom printer names.
--
-- These columns were previously introduced via `prisma db push` on some
-- environments, so every statement is written to be idempotent.

-- Per-mart PrintNode credentials + custom printer labels
-- printerLabels shape: { [printNodeId: number]: string }
ALTER TABLE "marts" ADD COLUMN IF NOT EXISTS "printNodeApiKey" TEXT;
ALTER TABLE "marts" ADD COLUMN IF NOT EXISTS "printerLabels" JSONB;

-- Per-user printer selection
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "printNodeId" INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "printerName" TEXT;

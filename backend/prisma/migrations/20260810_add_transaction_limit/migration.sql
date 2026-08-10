-- AlterTable: Add defaultTransactionLimit, remove storage fields
ALTER TABLE "subscription_settings" ADD COLUMN "defaultTransactionLimit" INTEGER NOT NULL DEFAULT 500;
ALTER TABLE "subscription_settings" DROP COLUMN "defaultStorageLimitMb";
ALTER TABLE "subscription_settings" DROP COLUMN "warningStoragePercent";

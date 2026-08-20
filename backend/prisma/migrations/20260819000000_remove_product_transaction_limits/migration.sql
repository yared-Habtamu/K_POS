-- Remove product and transaction limit columns from subscription_settings
-- These limits are no longer used; subscriptions are managed by date only.
ALTER TABLE "subscription_settings" DROP COLUMN IF EXISTS "defaultProductLimit";
ALTER TABLE "subscription_settings" DROP COLUMN IF EXISTS "defaultTransactionLimit";

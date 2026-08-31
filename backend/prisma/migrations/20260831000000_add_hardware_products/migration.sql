-- Add hardwareProducts JSON column to subscription_settings
ALTER TABLE "subscription_settings" ADD COLUMN "hardwareProducts" JSONB;

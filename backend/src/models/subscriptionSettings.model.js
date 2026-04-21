const mongoose = require("mongoose");

const SubscriptionSettingsSchema = new mongoose.Schema(
  {
    defaultFeeEtb: { type: Number, default: 1000 },
    billingPeriodDays: { type: Number, default: 30 },
    defaultStorageLimitMb: { type: Number, default: 500 },
    warningDaysBeforeExpiry: { type: Number, default: 5 },
    warningStoragePercent: { type: Number, default: 80 },
    autoSuspendEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model(
  "SubscriptionSettings",
  SubscriptionSettingsSchema,
);

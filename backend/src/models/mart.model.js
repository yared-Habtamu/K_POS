const mongoose = require("mongoose");

const MartSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    martName: { type: String, required: true, index: true },
    phone: { type: String },
    email: { type: String },
    country: { type: String },
    region: { type: String },
    city: { type: String },
    address: { type: String },

    receiptHeader: { type: String },
    receiptMessage: { type: String },
    shopLogoUrl: { type: String },

    // payments and currency
    currency: { type: String },
    paymentSystem: { type: String },
    // paymentAccounts: map of payment method key -> account identifier (string)
    paymentAccounts: { type: Map, of: String },

    status: {
      type: String,
      enum: ["pending", "approved", "disabled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Mart", MartSchema);

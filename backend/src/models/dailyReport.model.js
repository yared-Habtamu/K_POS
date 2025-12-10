const mongoose = require("mongoose");

const DailyReportSchema = new mongoose.Schema(
  {
    martId: { type: mongoose.Schema.Types.ObjectId, ref: "Mart", index: true },
    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    cashierName: { type: String },
    date: { type: Date, required: true, index: true },
    totalSales: { type: Number, default: 0 },
    cashReceived: { type: Number, default: 0 },
    bankTransfer: { type: Number, default: 0 },
    discountsGiven: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DailyReport", DailyReportSchema);

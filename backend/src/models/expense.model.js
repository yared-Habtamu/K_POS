const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema(
  {
    martId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mart",
      index: true,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "salary",
        "rent",
        "electricity",
        "water",
        "cleaning",
        "miscellaneous",
      ],
      default: "miscellaneous",
    },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByRole: {
      type: String,
      enum: ["owner", "manager", "other"],
      default: "other",
      index: true,
    },
    createdByName: { type: String },
    paymentType: { type: String },
    paymentScreenshot: { type: String },
    productPicture: { type: String },
    // human-friendly item name (shown in table 'Name' column)
    name: { type: String },
    // short reason / cause for the expense (shown in table 'Reason' column)
    reason: { type: String },
    // multiple supporting screenshots (URLs)
    screenshots: [{ type: String }],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Expense", ExpenseSchema);

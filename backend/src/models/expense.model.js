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
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", ExpenseSchema);

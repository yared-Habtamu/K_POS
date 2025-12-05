const mongoose = require("mongoose");

const AssetSchema = new mongoose.Schema(
  {
    martId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mart",
      index: true,
      required: true,
    },
    name: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, default: 0 },
    description: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Asset", AssetSchema);

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
    assetId: { type: String, index: true },
    image: { type: String },
    sizeOrType: { type: String },
    purchaseDate: { type: Date },
    status: { type: String }, // e.g. "new", "old"
    conditions: { type: String },
    assignedTo: { type: String },
    purchasePrice: { type: Number, default: 0 },
    quantity: { type: Number, required: true, default: 0 },
    description: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Asset", AssetSchema);

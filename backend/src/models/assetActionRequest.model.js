const mongoose = require("mongoose");

const AssetActionRequestSchema = new mongoose.Schema(
  {
    martId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mart",
      required: true,
      index: true,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requesterName: { type: String },
    requesterRole: {
      type: String,
      enum: ["owner", "manager", "systemadmin"],
      default: "owner",
      index: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      default: null,
    },
    action: {
      type: String,
      enum: ["create", "update", "delete"],
      required: true,
      index: true,
    },
    payload: { type: Object, default: {} },
    approvalRole: {
      type: String,
      enum: ["owner", "manager"],
      default: "manager",
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approverName: { type: String },
    reason: { type: String },
    decidedAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AssetActionRequest", AssetActionRequestSchema);

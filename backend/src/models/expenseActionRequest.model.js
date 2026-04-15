const mongoose = require("mongoose");

const ExpenseActionRequestSchema = new mongoose.Schema(
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
      index: true,
    },
    requesterName: { type: String },
    requesterRole: {
      type: String,
      enum: ["manager", "owner", "systemadmin", "other"],
      default: "other",
    },
    action: {
      type: String,
      enum: ["create"],
      default: "create",
      index: true,
    },
    approvalRole: {
      type: String,
      enum: ["owner"],
      default: "owner",
      index: true,
    },
    payload: {
      type: Object,
      required: true,
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

module.exports = mongoose.model(
  "ExpenseActionRequest",
  ExpenseActionRequestSchema,
);

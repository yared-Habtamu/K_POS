const mongoose = require('mongoose');

const ProductEditRequestSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', required: true, index: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requesterName: { type: String },
    changes: { type: Object, required: true }, // e.g., { quantity: 10 }
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: { type: String },
    reason: { type: String },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProductEditRequest', ProductEditRequestSchema);
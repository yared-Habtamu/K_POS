const mongoose = require('mongoose');

const StockTransferRequestSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', required: true, index: true },
    quantity: { type: Number, required: true },
    fromLocation: { type: String, default: 'store' },
    toLocation: { type: String, default: 'mart' },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requesterName: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: { type: String },
    reason: { type: String },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockTransferRequest', StockTransferRequestSchema);

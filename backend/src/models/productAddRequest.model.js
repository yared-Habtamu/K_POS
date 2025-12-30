const mongoose = require('mongoose');

const ProductAddRequestSchema = new mongoose.Schema(
  {
    martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', required: true, index: true },
    requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requesterName: { type: String },
    payload: { type: Object, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approverName: { type: String },
    reason: { type: String },
    decidedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProductAddRequest', ProductAddRequestSchema);

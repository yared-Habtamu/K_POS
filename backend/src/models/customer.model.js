const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', index: true, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  name: { type: String, required: true, index: true },
  phoneNumber: { type: String, required: true },
  city: { type: String, default: '' },
  totalCredit: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  totalUnpaid: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);

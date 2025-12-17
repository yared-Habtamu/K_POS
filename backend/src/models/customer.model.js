const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', index: true, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  name: { type: String, required: true, index: true },
  phoneNumber: { type: String, required: true },
  city: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);

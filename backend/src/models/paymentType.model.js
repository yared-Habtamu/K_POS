const mongoose = require('mongoose');

const paymentTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', required: false },
}, { timestamps: true });

// unique per mart (or globally if martId not provided)
paymentTypeSchema.index({ name: 1, martId: 1 }, { unique: true });

module.exports = mongoose.model('PaymentType', paymentTypeSchema);

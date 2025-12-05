const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
  productId: { type: String },
  name: { type: String },
  price: { type: Number },
  quantity: { type: Number },
  total: { type: Number },
});

const SaleSchema = new mongoose.Schema(
  {
    martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', index: true, required: true },
    cashierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cashierName: { type: String },
    receiptId: { type: String },
    items: { type: [SaleItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discount: { type: Object },
    extraCharges: { type: [Object], default: [] },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: { type: String },
    date: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Sale', SaleSchema);

const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', index: true, required: true },
    name: { type: String, required: true, index: true },
    category: { type: String, default: '' },
    unit: { type: String, default: 'pcs' },
    purchasePrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 },
    // warehouse/store quantity (not directly sellable until transferred)
    storeQuantity: { type: Number, default: 0 },
    // quantity available on the mart / front store
    supermarketQuantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 10 },
    expiryDate: { type: Date },
    // support multiple barcodes per product (array of strings)
    barcodes: { type: [String], index: true, default: [] },
    imageUrl: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Product', ProductSchema);

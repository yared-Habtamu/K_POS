const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', required: false },
  isDeleted: { type: Boolean, default: false, index: true },
}, { timestamps: true });

// ensure unique per mart (or globally if martId not provided)
categorySchema.index({ name: 1, martId: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);

const mongoose = require('mongoose');

const expenseCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', required: false },
}, { timestamps: true });

expenseCategorySchema.index({ name: 1, martId: 1 }, { unique: true });

module.exports = mongoose.model('ExpenseCategory', expenseCategorySchema);

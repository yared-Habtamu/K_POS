const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional specific recipient
    type: { type: String, required: true }, // e.g., 'product_edit_request', 'product_edit_result'
    title: { type: String },
    message: { type: String },
    data: { type: Object },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);
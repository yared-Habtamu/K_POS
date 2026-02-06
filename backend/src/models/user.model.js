const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', index: true, default: null },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, index: true },
    phone: { type: String, index: true },
    passwordHash: { type: String },
    role: { type: String, enum: ['systemAdmin', 'owner', 'manager', 'cashier', 'storeKeeper', 'other'], default: 'other', index: true },
    salary: { type: Number },
    permissions: { type: [String], default: [] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('User', UserSchema);

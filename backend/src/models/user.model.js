const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', index: true, default: null },
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    phone: { type: String, index: true },
    profilePictureUrl: { type: String, default: '' },
    passwordHash: { type: String },
    role: { type: String, enum: ['systemAdmin', 'owner', 'manager', 'cashier', 'storeKeeper', 'other'], default: 'other', index: true },
    salary: { type: Number },
    permissions: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('User', UserSchema);

const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
  {
    martId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mart', index: true, required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    employeeName: { type: String },
    dateYmd: { type: String, index: true }, // YYYY-MM-DD for easy querying
    clockIn: { type: String }, // HH:mm
    clockOut: { type: String },
    durationMinutes: { type: Number, default: 0 },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Attendance', AttendanceSchema);

const express = require('express');
const router = express.Router();

const Attendance = require('../models/attendance.model');
const User = require('../models/user.model');
const { authenticate } = require('../middleware/auth');

// List attendance records (filter by martId, employeeId, dateYmd)
router.get('/', authenticate, async (req, res) => {
  try {
    const { martId, employeeId, dateYmd } = req.query;
    const requester = req.user;
    const filter = {};

    // Debug logging for diagnosing manager view issues
    console.log('[attendance:get] requester=', { id: requester && requester.id, role: requester && requester.role, martId: requester && requester.martId });
    console.log('[attendance:get] query=', { martId, employeeId, dateYmd });

    // determine mart filter
    if (requester.role === 'systemAdmin') {
      if (martId) filter.martId = martId;
    } else {
      filter.martId = requester.martId;
    }

    // allow specific filters
    if (employeeId) filter.employeeId = employeeId;
    if (dateYmd) filter.dateYmd = dateYmd;

    // Determine base filter (do NOT try to exclude by owner/manager using a complex Mongo query due to potential type mismatches)
    const baseFilter = { ...filter };

    let list = await Attendance.find(baseFilter).sort({ createdAt: -1 }).lean();
    console.log('[attendance:get] baseFilter=', baseFilter, 'listCount=', Array.isArray(list) ? list.length : 0);
    if (Array.isArray(list) && list.length > 0) console.log('[attendance:get] sample=', list.slice(0, 5).map(r => ({ id: r._id, employeeId: r.employeeId, employeeName: r.employeeName })));


    // If requester is manager, post-filter the results in JS to exclude owner/manager attendance reliably
    if (String(requester.role || '').toLowerCase() === 'manager') {
      const exclude = await User.find({ martId: filter.martId, role: { $in: [/^owner$/i, /^manager$/i] } }).select('_id name').lean();
      const excludeIds = new Set(exclude.map(u => String(u._id)));
      const excludeNames = new Set(exclude.map(u => (u.name || '').toString()));

      console.log('[attendance:get][manager-filter] excludeCount=', exclude.length, 'excludeIds=', Array.from(excludeIds).slice(0,10), 'excludeNames=', Array.from(excludeNames).slice(0,10));

      const beforeCount = Array.isArray(list) ? list.length : 0;
      const excludedMatches = [];

      list = list.filter(r => {
        // if there is an employeeId, compare as string against excludeIds
        if (r.employeeId) {
          if (excludeIds.has(String(r.employeeId))) {
            excludedMatches.push({ id: r._id, employeeId: r.employeeId, employeeName: r.employeeName, reason: 'idMatch' });
            return false;
          }
          return true;
        }
        // else if employeeId missing, check employeeName
        if (r.employeeName && excludeNames.has(String(r.employeeName))) {
          excludedMatches.push({ id: r._id, employeeId: r.employeeId, employeeName: r.employeeName, reason: 'nameMatch' });
          return false;
        }
        return true;
      });

      const afterCount = list.length;
      console.log('[attendance:get][manager-filter] beforeCount=', beforeCount, 'afterCount=', afterCount, 'excludedMatches=', excludedMatches.slice(0,20));
    }

    // Add human-readable duration field for frontend convenience
    const mapped = list.map(r => {
      const out = { ...r };
      if ((out.duration === undefined || out.duration === '') && out.durationMinutes != null) {
        out.duration = `${out.durationMinutes} min`;
      }
      return out;
    });

    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Robust time parser helper
function parseTimeToMinutes(t) {
  if (!t) return null;
  t = String(t).trim();
  // Accept formats: 'HH:mm' or 'hh:mm AM' / 'hh:mm PM' (case-insensitive)
  // Trim potential AM/PM
  const m = t.match(/^(\d{1,2}):?(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ampm = m[3];
  if (ampm) {
    const up = ampm.toUpperCase();
    if (up === 'AM') {
      if (hh === 12) hh = 0;
    } else if (up === 'PM') {
      if (hh !== 12) hh = hh + 12;
    }
  }
  if (isNaN(hh) || isNaN(mm)) return null;
  return hh * 60 + mm;
}

// Create attendance record
router.post('/', authenticate, async (req, res) => {
  try {
    let { employeeId, employeeName, dateYmd, clockIn, clockOut, notes } = req.body;
    const requester = req.user;

    const martId = requester.role === 'systemAdmin' ? req.body.martId : requester.martId;
    if (!martId) return res.status(400).json({ message: 'martId is required' });

    // validate date (YYYY-MM-DD)
    if (!dateYmd || !/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return res.status(400).json({ message: 'Invalid dateYmd format. Expect YYYY-MM-DD' });

    // Prevent creating future attendance
    try {
      const recDate = new Date(dateYmd);
      const today = new Date();
      const rdDate = new Date(recDate.getFullYear(), recDate.getMonth(), recDate.getDate());
      const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (rdDate > tDate) return res.status(403).json({ message: 'Cannot create attendance for future dates' });
    } catch (e) {}

    // sanitize empty employeeId
    if (employeeId === '') employeeId = undefined;

    // Optional: validate employee belongs to mart
    if (employeeId) {
      const emp = await User.findById(employeeId);
      if (!emp) return res.status(400).json({ message: 'Employee not found' });
      if (emp && String(emp.martId) !== String(martId)) return res.status(400).json({ message: 'Employee does not belong to mart' });
      // ensure name consistent
      if (!employeeName) employeeName = emp.name;
    }

    const rec = new Attendance({ martId, employeeId, employeeName, dateYmd, clockIn, clockOut, notes, createdBy: requester.id });

    // compute durationMinutes if both times provided (handle AM/PM)
    if (clockIn && clockOut) {
      try {
        const a = parseTimeToMinutes(clockIn);
        const b = parseTimeToMinutes(clockOut);
        if (a !== null && b !== null) {
          rec.durationMinutes = Math.max(0, b - a);
          // store normalized times in HH:mm 24-hour format
          const pad = (n) => String(n).padStart(2, '0');
          rec.clockIn = `${pad(Math.floor(a/60))}:${pad(a%60)}`;
          rec.clockOut = `${pad(Math.floor(b/60))}:${pad(b%60)}`;
        }
      } catch (e) {
        console.error('time parse error', e);
      }
    }

    await rec.save();
    const outObj = rec.toObject();
    if ((outObj.duration === undefined || outObj.duration === '') && outObj.durationMinutes != null) {
      outObj.duration = `${outObj.durationMinutes} min`;
    }
    res.status(201).json(outObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update attendance record
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const rec = await Attendance.findById(id);
    if (!rec) return res.status(404).json({ message: 'Record not found' });

    const requester = req.user;
    if (requester.role !== 'systemAdmin' && String(rec.martId) !== String(requester.martId)) return res.status(403).json({ message: 'Insufficient permissions' });

    // Prevent editing future attendance
    if (rec.dateYmd) {
      try {
        const rd = new Date(rec.dateYmd);
        const today = new Date();
        const rdDate = new Date(rd.getFullYear(), rd.getMonth(), rd.getDate());
        const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (rdDate > tDate) return res.status(403).json({ message: 'Future attendance records cannot be edited' });
      } catch (e) {}
    }

    const { clockIn, clockOut, notes } = req.body;
    if (clockIn !== undefined) rec.clockIn = clockIn;
    if (clockOut !== undefined) rec.clockOut = clockOut;
    if (notes !== undefined) rec.notes = notes;

    // Validate and recompute duration and normalize times when possible
    const a = parseTimeToMinutes(rec.clockIn);
    const b = parseTimeToMinutes(rec.clockOut);
    if ((rec.clockIn || rec.clockOut) && (a === null || b === null)) {
      return res.status(400).json({ message: 'Invalid time format. Use HH:mm or hh:mm AM/PM' });
    }
    if (a !== null && b !== null) {
      if (b < a) return res.status(400).json({ message: 'Clock out time must be after clock in time' });
      const pad = (n) => String(n).padStart(2, '0');
      rec.durationMinutes = Math.max(0, b - a);
      rec.clockIn = `${pad(Math.floor(a/60))}:${pad(a%60)}`;
      rec.clockOut = `${pad(Math.floor(b/60))}:${pad(b%60)}`;
    }

    await rec.save();
    const outObj = rec.toObject();
    if ((outObj.duration === undefined || outObj.duration === '') && outObj.durationMinutes != null) {
      outObj.duration = `${outObj.durationMinutes} min`;
    }
    res.json(outObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete attendance
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const rec = await Attendance.findById(id);
    if (!rec) return res.status(404).json({ message: 'Record not found' });

    const requester = req.user;
    if (requester.role !== 'systemAdmin' && String(rec.martId) !== String(requester.martId)) return res.status(403).json({ message: 'Insufficient permissions' });

    // Prevent deleting future records
    if (rec.dateYmd) {
      try {
        const rd = new Date(rec.dateYmd);
        const today = new Date();
        const rdDate = new Date(rd.getFullYear(), rd.getMonth(), rd.getDate());
        const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (rdDate > tDate) return res.status(403).json({ message: 'Future attendance records cannot be deleted' });
      } catch (e) {}
    }

    await Attendance.findByIdAndDelete(id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

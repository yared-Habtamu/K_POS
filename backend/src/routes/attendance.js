const express = require('express');
const router = express.Router();
const attendanceRepository = require('../repositories/attendanceRepository');
const userRepository = require('../repositories/userRepository');
const { authenticate } = require('../middleware/auth');

// List attendance records (filter by martId, employeeId, dateYmd)
router.get('/', authenticate, async (req, res) => {
  try {
    const { martId, employeeId, dateYmd } = req.query;
    const requester = req.user;
    const filter = { isDeleted: false };

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

    let list = await attendanceRepository.findMany(filter, {
      orderBy: { createdAt: "desc" }
    });
    console.log('[attendance:get] baseFilter=', filter, 'listCount=', Array.isArray(list) ? list.length : 0);
    if (Array.isArray(list) && list.length > 0) console.log('[attendance:get] sample=', list.slice(0, 5).map(r => ({ id: r.id, employeeId: r.employeeId, employeeName: r.employeeName })));

    // If requester is manager, post-filter the results in JS to exclude owner/manager attendance reliably
    if (String(requester.role || '').toLowerCase() === 'manager') {
      const exclude = await userRepository.findMany({
        martId: filter.martId,
        role: { in: ["owner", "manager"] },
        isDeleted: false,
      }, {
        select: { id: true, name: true }
      });
      const excludeIds = new Set(exclude.map(u => String(u.id)));
      const excludeNames = new Set(exclude.map(u => (u.name || '').toString()));

      console.log('[attendance:get][manager-filter] excludeCount=', exclude.length, 'excludeIds=', Array.from(excludeIds).slice(0,10), 'excludeNames=', Array.from(excludeNames).slice(0,10));

      const beforeCount = Array.isArray(list) ? list.length : 0;
      const excludedMatches = [];

      list = list.filter(r => {
        if (r.employeeId) {
          if (excludeIds.has(String(r.employeeId))) {
            excludedMatches.push({ id: r.id, employeeId: r.employeeId, employeeName: r.employeeName, reason: 'idMatch' });
            return false;
          }
          return true;
        }
        if (r.employeeName && excludeNames.has(String(r.employeeName))) {
          excludedMatches.push({ id: r.id, employeeId: r.employeeId, employeeName: r.employeeName, reason: 'nameMatch' });
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
    let { employeeId, employeeName, dateYmd, clockIn, clockOut, lunchOut, lunchBack, notes } = req.body;
    const requester = req.user;

    const martId = requester.role === 'systemAdmin' ? req.body.martId : requester.martId;
    if (!martId) return res.status(400).json({ message: 'martId is required' });

    if (!dateYmd || !/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return res.status(400).json({ message: 'Invalid dateYmd format. Expect YYYY-MM-DD' });

    try {
      const recDate = new Date(dateYmd);
      const today = new Date();
      const rdDate = new Date(recDate.getFullYear(), recDate.getMonth(), recDate.getDate());
      const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (rdDate > tDate) return res.status(403).json({ message: 'Cannot create attendance for future dates' });
    } catch (e) {}

    if (employeeId === '') employeeId = undefined;

    if (employeeId) {
      const emp = await userRepository.findById(employeeId);
      if (!emp) return res.status(400).json({ message: 'Employee not found' });
      if (emp && String(emp.martId) !== String(martId)) return res.status(400).json({ message: 'Employee does not belong to mart' });
      if (!employeeName) employeeName = emp.name;
    }

    const pad = (n) => String(n).padStart(2, '0');
    const formatMin = (m) => m != null ? `${pad(Math.floor(m/60))}:${pad(m%60)}` : null;

    const a = clockIn ? parseTimeToMinutes(clockIn) : null;
    const b = clockOut ? parseTimeToMinutes(clockOut) : null;
    const lOutM = lunchOut ? parseTimeToMinutes(lunchOut) : null;
    const lBackM = lunchBack ? parseTimeToMinutes(lunchBack) : null;

    if (clockIn && a === null) return res.status(400).json({ message: 'Invalid clock in time format' });
    if (clockOut && b === null) return res.status(400).json({ message: 'Invalid clock out time format' });
    if (lunchOut && lOutM === null) return res.status(400).json({ message: 'Invalid lunch out time format' });
    if (lunchBack && lBackM === null) return res.status(400).json({ message: 'Invalid lunch back time format' });
    if (lOutM !== null && lBackM !== null && lBackM < lOutM) {
      return res.status(400).json({ message: 'Lunch back time must be after lunch out time' });
    }

    const recData = {
      martId,
      employeeId: employeeId || null,
      employeeName: employeeName || null,
      dateYmd: dateYmd || null,
      clockIn: formatMin(a) || clockIn || null,
      clockOut: formatMin(b) || clockOut || null,
      lunchOut: formatMin(lOutM) || lunchOut || null,
      lunchBack: formatMin(lBackM) || lunchBack || null,
      notes: notes || null,
      createdBy: requester.id,
      durationMinutes: 0,
      isDeleted: false,
    };

    if (a !== null && b !== null) {
      if (b < a) return res.status(400).json({ message: 'Clock out time must be after clock in time' });
      let totalMin = b - a;
      if (lOutM !== null && lBackM !== null && lBackM >= lOutM) {
        totalMin -= (lBackM - lOutM);
      }
      recData.durationMinutes = Math.max(0, totalMin);
    }

    const rec = await attendanceRepository.create(recData);
    const outObj = { ...rec };
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
    const rec = await attendanceRepository.findById(id);
    if (!rec) return res.status(404).json({ message: 'Record not found' });

    const requester = req.user;
    if (requester.role !== 'systemAdmin' && String(rec.martId) !== String(requester.martId)) return res.status(403).json({ message: 'Insufficient permissions' });

    if (rec.dateYmd) {
      try {
        const rd = new Date(rec.dateYmd);
        const today = new Date();
        const rdDate = new Date(rd.getFullYear(), rd.getMonth(), rd.getDate());
        const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (rdDate > tDate) return res.status(403).json({ message: 'Future attendance records cannot be edited' });
      } catch (e) {}
    }

    let { employeeId, employeeName, clockIn, clockOut, lunchOut, lunchBack, notes } = req.body;

    if (employeeId === '') employeeId = undefined;

    const updateData = {};

    if (employeeId !== undefined) {
      if (employeeId) {
        const emp = await userRepository.findById(employeeId);
        if (!emp) return res.status(400).json({ message: 'Employee not found' });
        const martId = requester.role === 'systemAdmin' ? rec.martId : requester.martId;
        if (emp && String(emp.martId) !== String(martId)) {
          return res.status(400).json({ message: 'Employee does not belong to mart' });
        }
        if (!employeeName) employeeName = emp.name;
      }
      updateData.employeeId = employeeId || null;
    }
    if (employeeName !== undefined) updateData.employeeName = employeeName;
    if (clockIn !== undefined) updateData.clockIn = clockIn;
    if (clockOut !== undefined) updateData.clockOut = clockOut;
    if (lunchOut !== undefined) updateData.lunchOut = lunchOut;
    if (lunchBack !== undefined) updateData.lunchBack = lunchBack;
    if (notes !== undefined) updateData.notes = notes;

    const finalClockIn = clockIn !== undefined ? clockIn : rec.clockIn;
    const finalClockOut = clockOut !== undefined ? clockOut : rec.clockOut;
    const finalLunchOut = lunchOut !== undefined ? lunchOut : rec.lunchOut;
    const finalLunchBack = lunchBack !== undefined ? lunchBack : rec.lunchBack;

    const a = finalClockIn ? parseTimeToMinutes(finalClockIn) : null;
    const b = finalClockOut ? parseTimeToMinutes(finalClockOut) : null;
    const lOutM = finalLunchOut ? parseTimeToMinutes(finalLunchOut) : null;
    const lBackM = finalLunchBack ? parseTimeToMinutes(finalLunchBack) : null;

    if (finalClockIn && a === null) {
      return res.status(400).json({ message: 'Invalid clock in time format. Use HH:mm or hh:mm AM/PM' });
    }
    if (finalClockOut && b === null) {
      return res.status(400).json({ message: 'Invalid clock out time format. Use HH:mm or hh:mm AM/PM' });
    }
    if (finalLunchOut && lOutM === null) {
      return res.status(400).json({ message: 'Invalid lunch out time format. Use HH:mm or hh:mm AM/PM' });
    }
    if (finalLunchBack && lBackM === null) {
      return res.status(400).json({ message: 'Invalid lunch back time format. Use HH:mm or hh:mm AM/PM' });
    }
    if (lOutM !== null && lBackM !== null && lBackM < lOutM) {
      return res.status(400).json({ message: 'Lunch back time must be after lunch out time' });
    }

    const pad = (n) => String(n).padStart(2, '0');
    const formatMin = (m) => m != null ? `${pad(Math.floor(m/60))}:${pad(m%60)}` : null;

    if (finalClockIn && a !== null) updateData.clockIn = formatMin(a);
    if (finalClockOut && b !== null) updateData.clockOut = formatMin(b);
    if (finalLunchOut && lOutM !== null) updateData.lunchOut = formatMin(lOutM);
    if (finalLunchBack && lBackM !== null) updateData.lunchBack = formatMin(lBackM);

    if (a !== null && b !== null) {
      if (b < a) return res.status(400).json({ message: 'Clock out time must be after clock in time' });
      let totalMin = b - a;
      if (lOutM !== null && lBackM !== null && lBackM >= lOutM) {
        totalMin -= (lBackM - lOutM);
      }
      updateData.durationMinutes = Math.max(0, totalMin);
    }

    const updated = await attendanceRepository.update(id, updateData);
    const outObj = { ...updated };
    if ((outObj.duration === undefined || outObj.duration === '') && outObj.durationMinutes != null) {
      outObj.duration = `${outObj.durationMinutes} min`;
    }
    res.json(outObj);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete attendance (soft delete)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const rec = await attendanceRepository.findById(id);
    if (!rec) return res.status(404).json({ message: 'Record not found' });

    const requester = req.user;
    if (requester.role !== 'systemAdmin' && String(rec.martId) !== String(requester.martId)) return res.status(403).json({ message: 'Insufficient permissions' });

    if (rec.dateYmd) {
      try {
        const rd = new Date(rec.dateYmd);
        const today = new Date();
        const rdDate = new Date(rd.getFullYear(), rd.getMonth(), rd.getDate());
        const tDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (rdDate > tDate) return res.status(403).json({ message: 'Future attendance records cannot be deleted' });
      } catch (e) {}
    }

    await attendanceRepository.softDelete(id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

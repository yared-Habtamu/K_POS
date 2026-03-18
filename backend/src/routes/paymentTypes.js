const express = require('express');
const router = express.Router();
const PaymentType = require('../models/paymentType.model');
const { authenticate } = require('../middleware/auth');

// List payment types. Optional martId for systemAdmin; others limited to their mart
router.get('/', authenticate, async (req, res) => {
  try {
    const { martId } = req.query;
    const filter = {};
    if (req.user.role === 'systemAdmin') {
      if (martId) filter.martId = martId;
    } else {
      filter.martId = req.user.martId;
      if (martId && String(martId) !== String(req.user.martId)) {
        return res.status(403).json({ message: 'Cannot list payment types for another mart' });
      }
    }

    const list = await PaymentType.find(filter).sort({ name: 1 }).lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create/upsert payment type
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, martId } = req.body;
    if (!name) return res.status(400).json({ message: 'name is required' });

    const targetMartId = req.user.role === 'systemAdmin' ? martId || req.user.martId : req.user.martId;
    if (!targetMartId) return res.status(400).json({ message: 'martId is required' });

    const pt = await PaymentType.findOneAndUpdate(
      { name: name.trim(), martId: targetMartId },
      { name: name.trim(), martId: targetMartId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(pt);
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Payment type already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

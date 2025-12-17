const express = require('express');
const router = express.Router();
const Customer = require('../models/customer.model');
const Mart = require('../models/mart.model');
const { authenticate } = require('../middleware/auth');

// POST /api/customers - create customer (cashier creates their customers)
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, phoneNumber, city, martId } = req.body;
    if (!name || !phoneNumber) return res.status(400).json({ message: 'name and phoneNumber required' });

    const targetMartId = req.user.role === 'systemAdmin' ? (martId || req.user.martId) : req.user.martId;

    if (!targetMartId) {
      return res.status(400).json({ message: 'martId required. Your account is not associated with a mart. Contact your administrator.' });
    }

    // verify mart exists
    const martExists = await Mart.findById(targetMartId).lean();
    if (!martExists) {
      return res.status(404).json({ message: `martId not found: ${targetMartId}` });
    }

    const customer = new Customer({ name, phoneNumber, city: city || '', martId: targetMartId, createdBy: req.user.id || req.user._id });
    await customer.save();
    res.status(201).json(customer);
  } catch (err) {
    console.error('create customer error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/customers - list customers for current cashier (cashier only sees their customers)
router.get('/', authenticate, async (req, res) => {
  try {
    const { martId } = req.query;

    // If user is cashier or other non-admin, ensure their account has martId
    if (req.user.role === 'cashier' && !req.user.martId) {
      return res.status(400).json({ message: 'Your account is not associated with a mart. Contact administrator.' });
    }
    if ((req.user.role === 'owner' || req.user.role === 'manager') && !req.user.martId) {
      return res.status(400).json({ message: 'Your account is not associated with a mart. Contact administrator.' });
    }

    const filter = {};
    if (req.user.role === 'systemAdmin') {
      if (martId) {
        // validate mart exists
        const m = await Mart.findById(martId).lean();
        if (!m) return res.status(404).json({ message: `martId not found: ${martId}` });
        filter.martId = martId;
      }
    } else if (req.user.role === 'cashier') {
      filter.createdBy = req.user.id || req.user._id;
      filter.martId = req.user.martId;
    } else {
      // owner/manager can see all customers in their mart
      filter.martId = req.user.martId;
    }

    const list = await Customer.find(filter).sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error('list customers error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

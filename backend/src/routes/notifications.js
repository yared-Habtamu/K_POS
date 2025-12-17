const express = require('express');
const router = express.Router();
const axios = require('axios');
const Sale = require('../models/sale.model');
const Mart = require('../models/mart.model');
const { authenticate } = require('../middleware/auth');

// POST /api/notifications/sms
// Body: { saleId, phone, name, message? }
router.post('/sms', authenticate, async (req, res) => {
  try {
    const { saleId, phone, name, message } = req.body || {};
    if (!phone) return res.status(400).json({ message: 'phone required' });
    // basic phone validation
    const normalized = String(phone).replace(/[^0-9+]/g, '');
    if (!/^\+?[0-9]{7,15}$/.test(normalized))
      return res.status(400).json({ message: 'invalid phone number' });

    let text = message || '';
    let sale = null;
    if (saleId) {
      sale = await Sale.findById(saleId).lean();
      if (!sale) return res.status(404).json({ message: 'sale not found' });
      // authorization: ensure sale belongs to user's mart unless systemAdmin
      if (req.user.role !== 'systemAdmin' && String(sale.martId) !== String(req.user.martId)) {
        return res.status(403).json({ message: 'Insufficient permissions to send SMS for this sale' });
      }

      // build a compact receipt text
      const mart = await Mart.findById(sale.martId).lean();
      const shopName = mart?.martName || 'Shop';
      const receiptId = sale.receiptId || String(sale._id).slice(-6);
      const items = (sale.items || []).slice(0, 6).map(it => `${it.name || 'Item'} x${it.quantity||0} ${Number(it.total != null ? it.total : (it.quantity||0)*(it.price||0)).toFixed(0)}ETB`).join('; ');
      text = `Receipt ${receiptId} - ${shopName}. Total: ${Number(sale.total||0).toFixed(2)} ETB. Items: ${items}. Thank you!`;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !fromNumber) {
      return res.status(501).json({ message: 'SMS provider not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER' });
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams();
    params.append('To', normalized);
    params.append('From', fromNumber);
    params.append('Body', text);

    const auth = { username: accountSid, password: authToken };
    const resp = await axios.post(url, params.toString(), {
      auth,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return res.json({ success: true, sid: resp.data.sid });
  } catch (err) {
    const respErr = err?.response?.data || err?.message || String(err);
    const status = err?.response?.status || 500;
    console.error('Failed to send SMS', respErr);
    return res.status(status).json({ message: 'Failed to send SMS', error: respErr });
  }
});

module.exports = router;

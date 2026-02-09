const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const StockTransferRequest = require('../models/stockTransferRequest.model');
const Product = require('../models/product.model');
const Notification = require('../models/notification.model');

const router = express.Router();

function isManager(user) {
  return user.role === 'manager' || user.role === 'systemAdmin';
}

// List transfer requests
router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { status, martId, startDate, endDate } = req.query;
    const filter = {};

    if (status) filter.status = status;

    if (user.role === 'systemAdmin') {
      if (martId) filter.martId = martId;
    } else {
      filter.martId = user.martId;
      if (martId && String(martId) !== String(user.martId)) {
        return res.status(403).json({ message: 'Cannot view requests for another mart' });
      }
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const d = new Date(endDate);
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    const list = await StockTransferRequest.find(filter)
      .populate('productId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create transfer request (store -> mart)
router.post('/', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { productId, quantity } = req.body;

    if (!productId || quantity == null) return res.status(400).json({ message: 'productId and quantity are required' });
    if (!['storeKeeper', 'store_keeper', 'owner', 'manager'].includes(user.role) && user.role !== 'systemAdmin') {
      return res.status(403).json({ message: 'Only store keepers, managers or owners can request transfers' });
    }

    // store keepers need explicit permission to request transfers
    if (user.role === 'store_keeper' || user.role === 'storeKeeper') {
      const perms = Array.isArray(user.permissions) ? user.permissions : [];
      if (!perms.includes('transferStock')) {
        return res.status(403).json({ message: 'Insufficient permissions to request stock transfer' });
      }
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (user.role !== 'systemAdmin' && String(product.martId) !== String(user.martId)) {
      return res.status(403).json({ message: 'Cannot transfer product from another mart' });
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ message: 'Quantity must be positive' });

    if (product.storeQuantity != null && product.storeQuantity < qty) {
      return res.status(400).json({ message: 'Not enough stock in store to transfer' });
    }

    const reqDoc = new StockTransferRequest({
      productId,
      martId: product.martId,
      quantity: qty,
      requesterId: user.id,
      requesterName: user.username || user.name,
    });

    await reqDoc.save();

    // notify managers specifically
    const User = require('../models/user.model');
    const managers = await User.find({ martId: product.martId, role: 'manager' }).select('_id username name').lean();
    if (managers && managers.length > 0) {
      const notes = managers.map(m => ({
        martId: product.martId,
        userId: m._id,
        type: 'stock_transfer_request',
        title: 'Stock transfer requested',
        message: `${reqDoc.requesterName || 'User'} requested to move ${qty} units`,
        data: { requestId: reqDoc._id, productId },
      }));
      await Notification.create(notes);
    } else {
      await Notification.create({
        martId: product.martId,
        type: 'stock_transfer_request',
        title: 'Stock transfer requested',
        message: `${reqDoc.requesterName || 'User'} requested to move ${qty} units`,
        data: { requestId: reqDoc._id, productId },
      });
    }

    // debug: log requester and their permissions for auditing
    console.log(`Stock transfer request from user ${user.id} (${user.username || user.name}) permissions:`, user.permissions);

    res.status(202).json({ message: 'Transfer request submitted for approval', requestId: reqDoc._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve transfer
router.put('/:id/approve', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!isManager(user)) return res.status(403).json({ message: 'Only managers or system admins can approve' });

    const reqDoc = await StockTransferRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });
    if (reqDoc.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });
    if (user.role !== 'systemAdmin' && String(reqDoc.martId) !== String(user.martId)) {
      return res.status(403).json({ message: 'Cannot approve request for another mart' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const product = await Product.findById(reqDoc.productId).session(session);
      if (!product) throw new Error('Product not found');
      if (product.storeQuantity < reqDoc.quantity) throw new Error('Insufficient store quantity');

      product.storeQuantity = Math.max(0, Number(product.storeQuantity || 0) - Number(reqDoc.quantity));
      product.supermarketQuantity = Number(product.supermarketQuantity || 0) + Number(reqDoc.quantity);
      product.quantity = product.supermarketQuantity;
      await product.save({ session });

      reqDoc.status = 'approved';
      reqDoc.approverId = user.id;
      reqDoc.approverName = user.username || user.name;
      reqDoc.decidedAt = new Date();
      await reqDoc.save({ session });

      await Notification.create([
        {
          martId: reqDoc.martId,
          userId: reqDoc.requesterId,
          type: 'stock_transfer_result',
          title: 'Stock transfer approved',
          message: `Your stock transfer request was approved`,
          data: { requestId: reqDoc._id, productId: product._id, result: 'approved' },
        },
      ], { session });

      await session.commitTransaction();
      session.endSession();

      res.json({ message: 'Transfer approved', product });
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error(err);
      res.status(500).json({ message: err.message || 'Failed to approve request' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject transfer
router.put('/:id/reject', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};

    if (!isManager(user)) return res.status(403).json({ message: 'Only managers or system admins can reject' });

    const reqDoc = await StockTransferRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });
    if (reqDoc.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });
    if (user.role !== 'systemAdmin' && String(reqDoc.martId) !== String(user.martId)) {
      return res.status(403).json({ message: 'Cannot reject request for another mart' });
    }

    reqDoc.status = 'rejected';
    reqDoc.approverId = user.id;
    reqDoc.approverName = user.username || user.name;
    reqDoc.reason = reason || '';
    reqDoc.decidedAt = new Date();
    await reqDoc.save();

    await Notification.create({
      martId: reqDoc.martId,
      userId: reqDoc.requesterId,
      type: 'stock_transfer_result',
      title: 'Stock transfer rejected',
      message: `Your stock transfer request was rejected. ${reason || ''}`,
      data: { requestId: reqDoc._id, result: 'rejected' },
    });

    res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

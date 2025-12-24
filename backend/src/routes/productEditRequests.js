const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const ProductEditRequest = require('../models/productEditRequest.model');
const Product = require('../models/product.model');
const Notification = require('../models/notification.model');

// List requests (systemAdmin or mart owner can filter by martId)
router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { status, martId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (user.role === 'systemAdmin') {
      if (martId) filter.martId = martId;
    } else {
      // non-admins can only see requests for their mart
      filter.martId = user.martId;
    }

    const list = await ProductEditRequest.find(filter).sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve a request
router.put('/:id/approve', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const reqDoc = await ProductEditRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });
    if (reqDoc.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

    // Only systemAdmin can approve (change if you want mart owner or manager to approve)
    if (user.role !== 'systemAdmin') return res.status(403).json({ message: 'Only system admin can approve requests' });

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Apply changes to product
      const update = reqDoc.changes || {};
      const product = await Product.findOneAndUpdate(
        { _id: reqDoc.productId, martId: reqDoc.martId },
        update,
        { new: true, session }
      );
      if (!product) throw new Error('Product not found for update');

      reqDoc.status = 'approved';
      reqDoc.approverId = user.id;
      reqDoc.approverName = user.username || user.name;
      reqDoc.decidedAt = new Date();
      await reqDoc.save({ session });

      // notify requester
      await Notification.create([
        {
          martId: reqDoc.martId,
          userId: reqDoc.requesterId,
          type: 'product_edit_result',
          title: 'Product edit approved',
          message: `Your requested edit for product ${String(reqDoc.productId)} was approved.`,
          data: { requestId: reqDoc._id, productId: reqDoc.productId, result: 'approved' },
        },
      ], { session });

      await session.commitTransaction();
      session.endSession();

      res.json({ message: 'Request approved', product });
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

// Reject a request
router.put('/:id/reject', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { reason } = req.body || {};
    const reqDoc = await ProductEditRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });
    if (reqDoc.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

    if (user.role !== 'systemAdmin') return res.status(403).json({ message: 'Only system admin can reject requests' });

    reqDoc.status = 'rejected';
    reqDoc.approverId = user.id;
    reqDoc.approverName = user.username || user.name;
    reqDoc.reason = reason || '';
    reqDoc.decidedAt = new Date();
    await reqDoc.save();

    await Notification.create({
      martId: reqDoc.martId,
      userId: reqDoc.requesterId,
      type: 'product_edit_result',
      title: 'Product edit rejected',
      message: `Your requested edit for product ${String(reqDoc.productId)} was rejected. ${reason || ''}`,
      data: { requestId: reqDoc._id, productId: reqDoc.productId, result: 'rejected' },
    });

    res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
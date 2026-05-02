const express = require('express');
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');
const StockTransferRequest = require('../models/stockTransferRequest.model');
const Product = require('../models/product.model');
const { createNotification } = require('../services/notification.service');

const router = express.Router();

function isManager(user) {
  return user.role === 'manager' || user.role === 'systemAdmin';
}

function isStoreKeeper(user) {
  return user.role === 'storeKeeper' || user.role === 'store_keeper';
}

// List transfer requests
router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { status, martId, startDate, endDate, approvalRole } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (approvalRole) filter.approvalRole = approvalRole;

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

    // Role-aware default view for approval queues.
    if (!approvalRole && user.role !== 'systemAdmin') {
      if (isManager(user)) {
        filter.$or = [{ approvalRole: 'manager' }, { approvalRole: { $exists: false } }];
      } else if (isStoreKeeper(user)) {
        filter.approvalRole = 'store_keeper';
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

// Create transfer request (store -> mart, or owner-only mart -> store)
router.post('/', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { productId, quantity, transferType } = req.body;

    if (!productId || quantity == null) return res.status(400).json({ message: 'productId and quantity are required' });
    if (!['storeKeeper', 'store_keeper', 'owner', 'manager'].includes(user.role) && user.role !== 'systemAdmin') {
      return res.status(403).json({ message: 'Only store keepers, managers or owners can request transfers' });
    }

    // Validate transferType strictly to avoid silent misclassification
    if (!transferType || !['mart_to_store', 'store_to_mart'].includes(transferType)) {
      return res.status(400).json({ message: 'transferType is required and must be "mart_to_store" or "store_to_mart"' });
    }
    const normalizedTransferType = transferType;
    const isMartToStore = normalizedTransferType === 'mart_to_store';

    // Debug logging to help diagnose client/server mismatches
    console.log(`Stock transfer request by user ${user.id} transferType=${transferType} normalized=${normalizedTransferType}`);

    if (isMartToStore && user.role !== 'owner' && user.role !== 'systemAdmin') {
      return res.status(403).json({ message: 'Only owners can request mart to store transfers' });
    }

    // store keepers need explicit permission to request transfers
    if (user.role === 'store_keeper' || user.role === 'storeKeeper') {
      const perms = Array.isArray(user.permissions) ? user.permissions : [];
      if (!perms.includes('transferStock')) {
        return res.status(403).json({ message: 'Insufficient permissions to request stock transfer' });
      }
    }

    const productFilter = { _id: productId };
    if (user.role !== 'systemAdmin') productFilter.martId = user.martId;

    const product = await Product.findOne(productFilter);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ message: 'Quantity must be positive' });

    const sourceQty = isMartToStore
      ? Number(product.supermarketQuantity ?? product.quantity ?? 0)
      : Number(product.storeQuantity ?? 0);
    if (sourceQty < qty) {
      return res.status(400).json({
        message: isMartToStore
          ? 'Not enough stock in mart to transfer'
          : 'Not enough stock in store to transfer',
      });
    }

    const fromLocation = isMartToStore ? 'mart' : 'store';
    const toLocation = isMartToStore ? 'store' : 'mart';
    const requiredApprovalRole = isMartToStore ? 'store_keeper' : 'manager';

    const User = require('../models/user.model');
    const approvers = requiredApprovalRole === 'store_keeper'
      ? await User.find({ martId: product.martId, role: { $in: ['storeKeeper', 'store_keeper'] } }).select('_id username name').lean()
      : await User.find({ martId: product.martId, role: { $regex: /^manager$/i } }).select('_id username name').lean();

    if (requiredApprovalRole === 'store_keeper' && (!approvers || approvers.length === 0)) {
      return res.status(400).json({ message: 'No store keeper available to approve this transfer' });
    }

    // If there are no managers, apply the transfer immediately inside a transaction
    if (requiredApprovalRole === 'manager' && (!approvers || approvers.length === 0)) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        // Re-fetch product in session
        const prod = await Product.findOne({ _id: productId, martId: product.martId }).session(session);
        if (!prod) throw new Error('Product not found');

        if (isMartToStore) {
          if (Number(prod.supermarketQuantity ?? prod.quantity ?? 0) < qty) {
            throw new Error('Not enough stock in mart to transfer');
          }
          prod.supermarketQuantity = Math.max(0, Number(prod.supermarketQuantity ?? prod.quantity ?? 0) - qty);
          prod.storeQuantity = Number(prod.storeQuantity || 0) + qty;
        } else {
          if (Number(prod.storeQuantity || 0) < qty) throw new Error('Not enough stock in store to transfer');
          prod.storeQuantity = Math.max(0, Number(prod.storeQuantity || 0) - qty);
          prod.supermarketQuantity = Number(prod.supermarketQuantity ?? prod.quantity ?? 0) + qty;
        }
        prod.quantity = prod.supermarketQuantity;
        await prod.save({ session });

        // create a record of the transfer for audit (status=approved)
        const reqDoc = new StockTransferRequest({
          productId,
          martId: product.martId,
          quantity: qty,
          fromLocation,
          toLocation,
          approvalRole: requiredApprovalRole,
          requesterId: user.id,
          requesterName: user.username || user.name,
          status: 'approved',
          approverId: user.id,
          approverName: user.username || user.name,
          decidedAt: new Date(),
        });
        await reqDoc.save({ session });

        await createNotification({
          martId: product.martId,
          userId: user.id,
          type: 'stock_transfer_result',
          title: 'Stock transfer completed',
          message: `Your stock transfer (${fromLocation} -> ${toLocation}) of ${qty} units for ${prod.name} was completed`,
          metadata: { requestId: reqDoc._id, productId, result: 'approved' },
        }, session);

        await session.commitTransaction();
        session.endSession();

        return res.status(201).json({ message: 'Transfer completed', product: prod });
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error(err);
        return res.status(500).json({ message: err.message || 'Failed to complete transfer' });
      }
    }

    // Otherwise create a pending request and notify managers
    const reqDoc = new StockTransferRequest({
      productId,
      martId: product.martId,
      quantity: qty,
      fromLocation,
      toLocation,
      approvalRole: requiredApprovalRole,
      requesterId: user.id,
      requesterName: user.username || user.name,
    });

    await reqDoc.save();

    if (approvers && approvers.length > 0) {
      for (const m of approvers) {
        await createNotification({
          martId: product.martId,
          userId: m._id,
          type: 'stock_transfer_request',
          title: 'Stock transfer requested',
          message: `${reqDoc.requesterName || 'User'} requested to move ${qty} units (${fromLocation} -> ${toLocation})`,
          metadata: { requestId: reqDoc._id, productId },
        });
      }
    } else {
      await createNotification({
        martId: product.martId,
        type: 'stock_transfer_request',
        title: 'Stock transfer requested',
        message: `${reqDoc.requesterName || 'User'} requested to move ${qty} units (${fromLocation} -> ${toLocation})`,
        metadata: { requestId: reqDoc._id, productId },
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

    const reqDoc = await StockTransferRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });
    if (reqDoc.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

    const requiredApprovalRole = reqDoc.approvalRole === 'store_keeper' ? 'store_keeper' : 'manager';
    const canApprove = user.role === 'systemAdmin'
      || (requiredApprovalRole === 'manager' && isManager(user))
      || (requiredApprovalRole === 'store_keeper' && isStoreKeeper(user));
    if (!canApprove) {
      return res.status(403).json({
        message: requiredApprovalRole === 'store_keeper'
          ? 'Only store keepers or system admins can approve this request'
          : 'Only managers or system admins can approve this request',
      });
    }

    if (user.role !== 'systemAdmin' && String(reqDoc.martId) !== String(user.martId)) {
      return res.status(403).json({ message: 'Cannot approve request for another mart' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const product = await Product.findOne({ _id: reqDoc.productId, martId: reqDoc.martId }).session(session);
      if (!product) throw new Error('Product not found');

      const qty = Number(reqDoc.quantity || 0);
      const fromLocation = reqDoc.fromLocation === 'mart' ? 'mart' : 'store';
      const toLocation = reqDoc.toLocation === 'store' ? 'store' : 'mart';

      if (fromLocation === 'mart' && toLocation === 'store') {
        if (Number(product.supermarketQuantity ?? product.quantity ?? 0) < qty) {
          throw new Error('Insufficient mart quantity');
        }
        product.supermarketQuantity = Math.max(0, Number(product.supermarketQuantity ?? product.quantity ?? 0) - qty);
        product.storeQuantity = Number(product.storeQuantity || 0) + qty;
      } else {
        if (Number(product.storeQuantity || 0) < qty) throw new Error('Insufficient store quantity');
        product.storeQuantity = Math.max(0, Number(product.storeQuantity || 0) - qty);
        product.supermarketQuantity = Number(product.supermarketQuantity ?? product.quantity ?? 0) + qty;
      }

      product.quantity = product.supermarketQuantity;
      await product.save({ session });

      reqDoc.status = 'approved';
      reqDoc.approverId = user.id;
      reqDoc.approverName = user.username || user.name;
      reqDoc.decidedAt = new Date();
      await reqDoc.save({ session });

      await createNotification({
        martId: reqDoc.martId,
        userId: reqDoc.requesterId,
        type: 'stock_transfer_result',
        title: 'Stock transfer approved',
        message: `Your stock transfer request was approved`,
        metadata: { requestId: reqDoc._id, productId: product._id, result: 'approved' },
      }, session);

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

    const reqDoc = await StockTransferRequest.findById(id);
    if (!reqDoc) return res.status(404).json({ message: 'Request not found' });
    if (reqDoc.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

    const requiredApprovalRole = reqDoc.approvalRole === 'store_keeper' ? 'store_keeper' : 'manager';
    const canReject = user.role === 'systemAdmin'
      || (requiredApprovalRole === 'manager' && isManager(user))
      || (requiredApprovalRole === 'store_keeper' && isStoreKeeper(user));
    if (!canReject) {
      return res.status(403).json({
        message: requiredApprovalRole === 'store_keeper'
          ? 'Only store keepers or system admins can reject this request'
          : 'Only managers or system admins can reject this request',
      });
    }

    if (user.role !== 'systemAdmin' && String(reqDoc.martId) !== String(user.martId)) {
      return res.status(403).json({ message: 'Cannot reject request for another mart' });
    }

    reqDoc.status = 'rejected';
    reqDoc.approverId = user.id;
    reqDoc.approverName = user.username || user.name;
    reqDoc.reason = reason || '';
    reqDoc.decidedAt = new Date();
    await reqDoc.save();

    await createNotification({
      martId: reqDoc.martId,
      userId: reqDoc.requesterId,
      type: 'stock_transfer_result',
      title: 'Stock transfer rejected',
      message: `Your stock transfer request was rejected. ${reason || ''}`,
      metadata: { requestId: reqDoc._id, result: 'rejected' },
    });

    res.json({ message: 'Request rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

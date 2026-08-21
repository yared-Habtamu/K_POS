const express = require('express');
const router = express.Router();
const prisma = require('../repositories/prismaClient');
const customerRepository = require('../repositories/customerRepository');
const martRepository = require('../repositories/martRepository');
const { authenticate } = require('../middleware/auth');

// POST /api/customers - create customer (cashier creates their customers)
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, phoneNumber, city, martId, totalCredit, totalPaid, totalUnpaid } = req.body;
    if (!name || !phoneNumber) return res.status(400).json({ message: 'name and phoneNumber required' });

    const targetMartId = req.user.role === 'systemAdmin' ? (martId || req.user.martId) : req.user.martId;

    if (!targetMartId) {
      return res.status(400).json({ message: 'martId required. Your account is not associated with a mart. Contact your administrator.' });
    }

    // verify mart exists
    const martExists = await martRepository.findById(targetMartId);
    if (!martExists) {
      return res.status(404).json({ message: `martId not found: ${targetMartId}` });
    }

    const customer = await customerRepository.create({
      name,
      phoneNumber,
      city: city || '',
      martId: targetMartId,
      createdBy: req.user.id || req.user._id,
      totalCredit: totalCredit || 0,
      totalPaid: totalPaid || 0,
      totalUnpaid: totalUnpaid || (totalCredit || 0) - (totalPaid || 0),
      isDeleted: false,
    });
    res.status(201).json(customer);
  } catch (err) {
    console.error('create customer error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/customers/staff-list - list staff members for cashier credit filter
router.get('/staff-list', authenticate, async (req, res) => {
  try {
    const targetMartId = req.user.role === 'systemAdmin' ? req.query.martId : req.user.martId;
    if (!targetMartId) return res.json([]);

    const staff = await prisma.user.findMany({
      where: {
        martId: targetMartId,
        isDeleted: false,
        role: { not: 'storekeeper' },
      },
      select: { id: true, name: true, username: true, role: true },
      orderBy: { name: 'asc' },
    });

    res.json(staff);
  } catch (err) {
    console.error('get staff list error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/customers - list customers for current mart
router.get('/', authenticate, async (req, res) => {
  try {
    const { martId, cashierId } = req.query;

    // If user is cashier or other non-admin, ensure their account has martId
    if (req.user.role === 'cashier' && !req.user.martId) {
      return res.status(400).json({ message: 'Your account is not associated with a mart. Contact administrator.' });
    }
    if ((req.user.role === 'owner' || req.user.role === 'manager') && !req.user.martId) {
      return res.status(400).json({ message: 'Your account is not associated with a mart. Contact administrator.' });
    }

    const filter = { isDeleted: false };
    if (req.user.role === 'systemAdmin') {
      if (martId) {
        // validate mart exists
        const m = await martRepository.findById(martId);
        if (!m) return res.status(404).json({ message: `martId not found: ${martId}` });
        filter.martId = martId;
      }
    } else {
      // cashier/owner/manager can see all customers in their mart
      filter.martId = req.user.martId;
    }

    const list = await customerRepository.findMany(filter, {
      orderBy: { createdAt: 'desc' }
    });

    // The "my" perspective: for cashier = themselves; for owner/manager = filtered cashierId or themselves
    const myUserId = req.user.id;
    const targetCashierId = cashierId || (req.user.role === 'cashier' ? myUserId : null);
    const customerIds = list.map((c) => c.id);

    // Fetch credit sales for these customers
    const creditSales = customerIds.length
      ? await prisma.sale.findMany({
          where: {
            customerId: { in: customerIds },
            creditAmount: { gt: 0 },
            status: { not: 'cancelled' },
          },
          select: {
            customerId: true,
            cashierId: true,
            cashierName: true,
            creditAmount: true,
          },
        })
      : [];

    // Fetch credit repayments for these customers
    const creditRepayments = customerIds.length
      ? await prisma.creditPayment.findMany({
          where: { customerId: { in: customerIds } },
          select: {
            customerId: true,
            collectedBy: true,
            collectedByName: true,
            collectedByRole: true,
            amountPaid: true,
          },
        })
      : [];

    // Build credit-given maps
    const creditMap = {};
    const totalCashierCreditMap = {};

    for (const cs of creditSales) {
      const cid = cs.customerId;
      const uid = cs.cashierId || 'unknown';
      if (!creditMap[cid]) creditMap[cid] = {};
      if (!creditMap[cid][uid]) {
        creditMap[cid][uid] = {
          cashierId: uid,
          cashierName: cs.cashierName || 'Unknown',
          creditAmount: 0,
        };
      }
      creditMap[cid][uid].creditAmount += Number(cs.creditAmount || 0);

      if (targetCashierId && uid === targetCashierId) {
        totalCashierCreditMap[cid] = (totalCashierCreditMap[cid] || 0) + Number(cs.creditAmount || 0);
      }
    }

    // Build repayment maps
    const repaymentMap = {}; // { customerId: { collectorId: { collectedBy, collectedByName, amountPaid } } }
    const myRepaymentMap = {}; // { customerId: totalRepaidByMe }

    for (const rp of creditRepayments) {
      const cid = rp.customerId;
      const uid = rp.collectedBy || 'unknown';
      if (!repaymentMap[cid]) repaymentMap[cid] = {};
      if (!repaymentMap[cid][uid]) {
        repaymentMap[cid][uid] = {
          collectedBy: uid,
          collectedByName: rp.collectedByName || 'Unknown',
          collectedByRole: rp.collectedByRole || '',
          amountPaid: 0,
        };
      }
      repaymentMap[cid][uid].amountPaid += Number(rp.amountPaid || 0);

      // "my" repayments: if targetCashierId is set use it, else use requesting user
      const perspectiveId = targetCashierId || myUserId;
      if (uid === perspectiveId) {
        myRepaymentMap[cid] = (myRepaymentMap[cid] || 0) + Number(rp.amountPaid || 0);
      }
    }

    const enrichedList = list.map((cust) => {
      const byCashier = Object.values(creditMap[cust.id] || {});
      const repaymentsByCashier = Object.values(repaymentMap[cust.id] || {});

      const cashierCredit = targetCashierId
        ? (totalCashierCreditMap[cust.id] || 0)
        : (creditMap[cust.id]?.[myUserId]?.creditAmount || 0);

      const myRepayments = myRepaymentMap[cust.id] || 0;

      return {
        ...cust,
        cashierCredit,
        creditByCashier: byCashier,
        myRepayments,
        repaymentsByCashier,
      };
    });

    res.json(enrichedList);
  } catch (err) {
    console.error('list customers error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/customers/:id/pay-credit - record customer credit repayment
router.post('/:id/pay-credit', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { amountPaid, paymentMethod, note } = req.body;

    const amountPaidNum = Number(amountPaid);
    if (!Number.isFinite(amountPaidNum) || amountPaidNum <= 0) {
      return res.status(400).json({ message: 'Amount paid must be greater than 0' });
    }

    const customer = await customerRepository.findById(id);
    if (!customer || customer.isDeleted) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (req.user.role !== 'systemAdmin' && String(customer.martId) !== String(req.user.martId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const currentUnpaid = Number(customer.totalUnpaid || 0);
    const currentPaid = Number(customer.totalPaid || 0);

    const newUnpaid = Math.max(0, Math.round((currentUnpaid - amountPaidNum + Number.EPSILON) * 100) / 100);
    const newPaid = Math.round((currentPaid + amountPaidNum + Number.EPSILON) * 100) / 100;

    const [payment, updatedCustomer] = await prisma.$transaction([
      prisma.creditPayment.create({
        data: {
          martId: customer.martId,
          customerId: customer.id,
          collectedBy: req.user.id,
          collectedByName: req.user.name || req.user.username || 'Unknown',
          collectedByRole: req.user.role || 'cashier',
          amountPaid: amountPaidNum,
          paymentMethod: paymentMethod || 'cash',
          note: note || '',
        },
      }),
      prisma.customer.update({
        where: { id: customer.id },
        data: {
          totalPaid: newPaid,
          totalUnpaid: newUnpaid,
        },
      }),
    ]);

    res.status(201).json({
      message: 'Credit payment recorded successfully',
      payment,
      customer: updatedCustomer,
    });
  } catch (err) {
    console.error('pay credit error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/customers/:id/payments - list credit payment history for customer
router.get('/:id/payments', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await customerRepository.findById(id);
    if (!customer || customer.isDeleted) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (req.user.role !== 'systemAdmin' && String(customer.martId) !== String(req.user.martId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const payments = await prisma.creditPayment.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payments);
  } catch (err) {
    console.error('get customer payments error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/customers/:id - update customer info
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phoneNumber, city, totalCredit, totalPaid, totalUnpaid } = req.body;

    const customer = await customerRepository.findById(id);
    if (!customer || customer.isDeleted) return res.status(404).json({ message: 'Customer not found' });

    // Ensure user has access to this customer
    if (req.user.role !== 'systemAdmin' && String(customer.martId) !== String(req.user.martId)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (city !== undefined) updateData.city = city;
    if (totalCredit !== undefined) updateData.totalCredit = totalCredit;
    if (totalPaid !== undefined) updateData.totalPaid = totalPaid;
    
    // Auto-calculate unpaid if not explicitly provided
    if (totalUnpaid !== undefined) {
      updateData.totalUnpaid = totalUnpaid;
    } else if (totalCredit !== undefined || totalPaid !== undefined) {
      const currentCredit = totalCredit !== undefined ? totalCredit : customer.totalCredit;
      const currentPaid = totalPaid !== undefined ? totalPaid : customer.totalPaid;
      updateData.totalUnpaid = currentCredit - currentPaid;
    }

    const updated = await customerRepository.update(id, updateData);
    res.json(updated);
  } catch (err) {
    console.error('update customer error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/customers/:id - remove customer (soft delete)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await customerRepository.findById(id);
    if (!customer || customer.isDeleted) return res.status(404).json({ message: 'Customer not found' });

    if (
      req.user.role !== 'systemAdmin' &&
      String(customer.martId) !== String(req.user.martId)
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await customerRepository.softDelete(id);
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    console.error('delete customer error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Mart = require('../models/mart.model');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: 'Username and password required' });

  // Allow users to sign in using either their username or phone number
  const user = await User.findOne({ $or: [{ username }, { phone: username }] });
  if (!user) {
    console.warn(`Login failed: user not found for '${username}'`);
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash || '');
  if (!valid) {
    console.warn(`Login failed: wrong password for user '${username}' (id=${user._id})`);
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  // Owners may only login once their mart is approved
  if (user.role === 'owner') {
    if (!user.martId) {
      console.warn(`Owner login blocked: no martId for user id=${user._id}`);
      return res.status(403).json({ message: 'Owner account has no mart assigned. Create a mart first or contact an administrator.' });
    }
    const mart = await Mart.findById(user.martId).select('status');
    if (!mart) {
      console.warn(`Owner login blocked: mart not found for martId=${user.martId}`);
      return res.status(403).json({ message: "Owner's mart not found. Contact an administrator." });
    }
    if (mart.status !== 'approved') {
      console.info(`Owner login blocked: mart status=${mart.status} for martId=${user.martId}`);
      return res.status(403).json({ message: 'Your mart registration is pending approval.' });
    }
  }

  const token = jwt.sign({ id: user._id, username: user.username, role: user.role, martId: user.martId, permissions: user.permissions || [] }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, username: user.username, name: user.name, role: user.role, martId: user.martId, permissions: user.permissions || [] } });
});

// Register endpoint (owner creates manager/cashier/storeKeeper)
// Protected: owner or systemAdmin
router.post('/register', authenticate, async (req, res) => {
  const { name, username, password, confirmPassword, role, martId, phone, salary } = req.body;
  if (!name || !username || !password || !confirmPassword || !role) return res.status(400).json({ message: 'Missing required fields' });
  if (password !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });
  if (!['manager','cashier','storeKeeper'].includes(role)) return res.status(400).json({ message: 'Invalid role' });
  // only systemAdmin or owner allowed to register employees
  if (req.user.role !== 'systemAdmin' && req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Insufficient permissions to create users' });
  }

  // owners can only create within their mart
  if (req.user.role === 'owner' && String(req.user.martId) !== String(martId)) {
    return res.status(403).json({ message: 'Owner cannot create user outside their mart' });
  }

  const exists = await User.findOne({ username });
  if (exists) return res.status(409).json({ message: 'Username already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ name, username, passwordHash, role, martId, phone, salary });
  await user.save();
  res.status(201).json({ user: { id: user._id, username: user.username, name: user.name, role: user.role, martId: user.martId } });
});

// List users by martId (owner/manager/systemAdmin)
router.get('/users', authenticate, async (req, res) => {
  try {
    const { martId, role } = req.query;
    const filter = {};
    // system admin can query any mart (or all)
    if (req.user.role === 'systemAdmin') {
      if (martId) filter.martId = martId;
    } else {
      // owner and manager can only list users in their mart
      filter.martId = req.user.martId;
      if (martId && String(martId) !== String(req.user.martId)) return res.status(403).json({ message: 'Cannot list users for another mart' });
    }
    if (role) filter.role = role;
    const users = await User.find(filter).select('-passwordHash -__v').lean();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (protected - requires owner/systemAdmin or manager limited)
router.put('/users/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const update = {};
    const allowed = ['name', 'phone', 'role', 'salary', 'martId', 'username', 'permissions'];
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    if (req.body.password) {
      const hash = await bcrypt.hash(req.body.password, 10);
      update.passwordHash = hash;
    }
    // fetch target user
    const target = await User.findById(id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    // Authorization: systemAdmin can update anyone
    // owner can update users inside their mart
    // manager can update users inside their mart but only permissions limited (discount)
    const requester = req.user;
    if (requester.role !== 'systemAdmin') {
      if (String(requester.martId) !== String(target.martId)) {
        return res.status(403).json({ message: 'Cannot modify users from another mart' });
      }
    }

    // If permissions were provided ensure they are an array of strings
    if (req.body.permissions) {
      if (!Array.isArray(req.body.permissions)) return res.status(400).json({ message: 'permissions must be an array' });

      // Validate by target role: only certain permissions make sense per role
      const targetRole = target.role;
      const allowedPerTarget = (r) => {
        if (r === 'manager') return ['discount', 'addItem'];
        if (r === 'storeKeeper' || r === 'store_keeper') return ['transferStock'];
        if (r === 'cashier') return ['discount'];
        return [];
      };

      const allowedForTarget = allowedPerTarget(targetRole);
      const invalidForTarget = req.body.permissions.filter(p => !allowedForTarget.includes(p));
      if (invalidForTarget.length) return res.status(403).json({ message: 'Some permissions are not valid for target user role' });

      // managers have limited permission scope and cannot modify peers
      if (requester.role === 'manager') {
        // managers may only modify store_keeper or cashier
        if (targetRole === 'manager') return res.status(403).json({ message: 'Manager cannot modify other managers' });

        // allow only manager-scoped permissions to be modified by managers
        const allowedForManager = ['discount', 'transferStock'];
        const invalid = req.body.permissions.filter(p => !allowedForManager.includes(p));
        if (invalid.length) return res.status(403).json({ message: 'Manager cannot change these permissions' });

        // if manager tries to set transferStock ensure target is storeKeeper
        if (req.body.permissions.includes('transferStock')) {
          if (!(target.role === 'storeKeeper' || target.role === 'store_keeper')) {
            return res.status(403).json({ message: 'transferStock can only be assigned to store keeper users' });
          }
        }
      }

      update.permissions = req.body.permissions.map(String);
    }

    // ensure owners cannot change role to systemAdmin and similar protections
    if (update.role && requester.role !== 'systemAdmin') {
      // only system admin can change role to systemAdmin or owner
      if (['systemAdmin','owner'].includes(update.role)) return res.status(403).json({ message: 'Insufficient permissions to set that role' });
    }

    const user = await User.findByIdAndUpdate(id, update, { new: true }).select('-passwordHash -__v');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Emit realtime notification if permissions were changed
    if (update.permissions) {
      try {
        // Log change and notify user in realtime
        console.log(`Permissions updated for user ${user._id}:`, user.permissions);
        const socketHelper = require('../socket');
        // Include actor info so clients can show who changed permissions
        const actor = {
          id: requester._id ? String(requester._id) : null,
          role: requester.role || null,
          name: requester.name || requester.username || null,
        };
        socketHelper.emitToUser(user._id.toString(), 'permissions_updated', { userId: user._id.toString(), permissions: user.permissions || [], actor });

        // create a notification so offline sessions will see this change in notifications
        const Notification = require('../models/notification.model');
        await Notification.create({
          martId: user.martId,
          userId: user._id,
          type: 'permissions_changed',
          title: 'Permissions updated',
          message: `Your permissions were changed by ${actor.role || 'an administrator'}`,
          data: { permissions: user.permissions || [], actor },
        });
      } catch (e) {
        console.error('Failed to emit permissions update', e);
      }
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const target = await User.findById(id);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const requester = req.user;
    if (requester.role !== 'systemAdmin') {
      if (requester.role === 'owner') {
        if (String(requester.martId) !== String(target.martId)) return res.status(403).json({ message: 'Cannot delete user from another mart' });
      } else {
        return res.status(403).json({ message: 'Insufficient permissions to delete user' });
      }
    }

    await User.findByIdAndDelete(id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

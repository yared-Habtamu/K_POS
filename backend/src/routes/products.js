const express = require('express');
const router = express.Router();

const Product = require('../models/product.model');
const { authenticate } = require('../middleware/auth');
const multer = require('multer');
const { uploadBuffer } = require('../utils/cloudinary');

// Use memory storage so we can send buffer directly to Cloudinary
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Create product
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    const user = req.user;
    const {
      name,
      category,
      unit,
      purchasePrice,
      sellingPrice,
      quantity,
      lowStockThreshold,
      expiryDate,
      barcode,
      imageUrl,
      martId,
    } = req.body;

    // If an image file was uploaded, upload it to Cloudinary and use returned URL
    let finalImageUrl = imageUrl || '';
    if (req.file && req.file.buffer) {
      try {
        const uploaded = await uploadBuffer(req.file.buffer, req.file.originalname);
        finalImageUrl = uploaded.secure_url || uploaded.url || finalImageUrl;
      } catch (err) {
        console.error('Cloudinary upload error:', err);
        return res.status(500).json({ message: 'Image upload failed' });
      }
    }

    if (!name) return res.status(400).json({ message: 'Product name is required' });

    // Determine martId: systemAdmin may supply martId, otherwise use requester's mart
    const finalMartId = user.role === 'systemAdmin' ? martId || user.martId : user.martId;
    if (!finalMartId) return res.status(400).json({ message: 'martId is required' });

    const product = new Product({
      martId: finalMartId,
      name,
      category: category || '',
      unit: unit || 'pcs',
      purchasePrice: purchasePrice || 0,
      sellingPrice: sellingPrice || 0,
      quantity: quantity || 0,
      lowStockThreshold: lowStockThreshold || 10,
      expiryDate: expiryDate || null,
      barcode: barcode || '',
      imageUrl: finalImageUrl || '',
      createdBy: user.id,
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// List products (with optional filters)
router.get('/', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { martId, category, name, lowStock } = req.query;
    const filter = {};

    if (user.role === 'systemAdmin') {
      if (martId) filter.martId = martId;
    } else {
      filter.martId = user.martId;
    }

    if (category) filter.category = category;
    if (name) filter.name = new RegExp(name, 'i');
    if (lowStock === 'true') filter.$expr = { $lt: ['$quantity', '$lowStockThreshold'] };

    const list = await Product.find(filter).sort({ name: 1 });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single product
router.get('/:id', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (user.role !== 'systemAdmin' && String(product.martId) !== String(user.martId)) {
      return res.status(403).json({ message: 'Access denied for this product' });
    }

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update product
router.put('/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const update = {};
    const allowed = [
      'name',
      'category',
      'unit',
      'purchasePrice',
      'sellingPrice',
      'quantity',
      'lowStockThreshold',
      'expiryDate',
      'barcode',
      'imageUrl',
    ];
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

    // If an image file was uploaded, upload it to Cloudinary and set imageUrl
    if (req.file && req.file.buffer) {
      try {
        const uploaded = await uploadBuffer(req.file.buffer, req.file.originalname);
        update.imageUrl = uploaded.secure_url || uploaded.url || update.imageUrl;
      } catch (err) {
        console.error('Cloudinary upload error:', err);
        return res.status(500).json({ message: 'Image upload failed' });
      }
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (user.role !== 'systemAdmin' && String(product.martId) !== String(user.martId)) {
      return res.status(403).json({ message: 'Access denied for this product' });
    }

    const updated = await Product.findByIdAndUpdate(id, update, { new: true });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete product
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Only systemAdmin or owner of the mart can delete
    if (user.role !== 'systemAdmin') {
      if (String(user.martId) !== String(product.martId) || user.role !== 'owner') {
        return res.status(403).json({ message: 'Only mart owner or system admin can delete products' });
      }
    }

    await Product.findByIdAndDelete(id);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

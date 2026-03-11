const express = require("express");
const router = express.Router();

const Product = require("../models/product.model");
const ProductEditRequest = require("../models/productEditRequest.model");
const ProductAddRequest = require("../models/productAddRequest.model");
const { createNotification } = require("../services/notification.service");
const { authenticate } = require("../middleware/auth");
const multer = require("multer");
const { uploadBuffer } = require("../utils/cloudinary");

// Use memory storage so we can send buffer directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

async function ensureProductPayloadBarcodes(productPayload) {
  const incomingBarcodes = (Array.isArray(productPayload.barcodes)
    ? productPayload.barcodes
    : [])
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (incomingBarcodes.length > 0) {
    productPayload.barcodes = Array.from(new Set(incomingBarcodes));
    return productPayload.barcodes;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = String(Math.floor(Math.random() * 1e12)).padStart(12, "0");
    const existing = await Product.findOne({
      martId: productPayload.martId,
      $or: [{ barcodes: candidate }, { barcode: candidate }],
    })
      .select("_id")
      .lean();

    if (!existing) {
      productPayload.barcodes = [candidate];
      return productPayload.barcodes;
    }
  }

  throw new Error("Failed to generate a unique barcode");
}

// Create product
router.post("/", authenticate, upload.single("image"), async (req, res) => {
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
      barcodes,
      imageUrl,
      martId,
    } = req.body;

    // If an image file was uploaded, upload it to Cloudinary and use returned URL
    let finalImageUrl = imageUrl || "";
    if (req.file && req.file.buffer) {
      try {
        const uploaded = await uploadBuffer(
          req.file.buffer,
          req.file.originalname,
        );
        finalImageUrl = uploaded.secure_url || uploaded.url || finalImageUrl;
      } catch (err) {
        console.error(
          "Cloudinary upload error:",
          err && err.stack ? err.stack : err,
        );
        // Return a helpful message in dev for debugging
        if (process.env.NODE_ENV !== "production") {
          return res
            .status(500)
            .json({
              message: "Image upload failed",
              error: err && err.message ? err.message : String(err),
            });
        }
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    if (!name)
      return res.status(400).json({ message: "Product name is required" });

    // Determine martId: systemAdmin may supply martId, otherwise use requester's mart
    const finalMartId =
      user.role === "systemAdmin" ? martId || user.martId : user.martId;
    if (!finalMartId) {
      // Provide a clearer error for owners who do not have an assigned mart
      if (user.role === 'owner') {
        return res.status(400).json({ message: 'Owner account has no mart assigned. Create a mart first or contact an administrator.' });
      }
      return res.status(400).json({ message: "martId is required" });
    }

    const requestedQty = Number(quantity || 0);
    const storeQty =
      req.body.storeQuantity !== undefined
        ? Number(req.body.storeQuantity)
        : requestedQty;
    const supermarketQty =
      req.body.supermarketQuantity !== undefined
        ? Number(req.body.supermarketQuantity)
        : user.role === "owner"
          ? 0
          : requestedQty;

    const productPayload = {
      martId: finalMartId,
      name,
      category: category || "",
      unit: unit || "pcs",
      purchasePrice: Number(purchasePrice || 0),
      sellingPrice: Number(sellingPrice || 0),
      // sellable quantity equals supermarket quantity; warehouse quantity stored separately
      quantity: Number(supermarketQty),
      storeQuantity: Math.max(0, Number(storeQty)),
      supermarketQuantity: Math.max(0, Number(supermarketQty)),
      lowStockThreshold: Number(lowStockThreshold || 10),
      expiryDate: expiryDate || null,
      // accept either single `barcode` or array `barcodes`
      barcodes: Array.isArray(barcodes)
        ? barcodes
        : barcode
          ? [String(barcode)]
          : [],
      imageUrl: finalImageUrl || "",
      createdBy: user.id,
    };

    // ensure category exists in database
    if (productPayload.category) {
      const Category = require('../models/category.model');
      try {
        await Category.findOneAndUpdate(
          { name: productPayload.category.trim(), martId: finalMartId },
          { name: productPayload.category.trim(), martId: finalMartId },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (catErr) {
        console.error('category upsert error', catErr);
      }
    }

    // Ensure every created product has at least one barcode and enforce mart-level uniqueness.
    const incomingBarcodes = await ensureProductPayloadBarcodes(productPayload);
    if (incomingBarcodes.length > 0) {
      const existing = await Product.findOne({
        martId: finalMartId,
        $or: [{ barcodes: { $in: incomingBarcodes } }, { barcode: { $in: incomingBarcodes } }],
      })
        .select('_id name barcodes')
        .lean();

      if (existing) {
        return res.status(409).json({
          message: `Barcode already registered for ${existing.name}`,
          product: {
            id: String(existing._id),
            name: existing.name,
            barcodes: existing.barcodes || [],
          },
        });
      }
    }

    // Owners normally require manager approval before product is created.
    if (String(user.role || '').toLowerCase() === 'owner' && String(user.role || '').toLowerCase() !== 'systemadmin') {
      const User = require('../models/user.model');
      // Find managers case-insensitively
      const managers = await User.find({ martId: finalMartId, role: { $regex: /^manager$/i } }).select('_id username name').lean();

      // If there are no managers for this mart, auto-create the product and notify the requester
      if (!managers || managers.length === 0) {
        const product = new Product(productPayload);
        await product.save();

        await createNotification({
          martId: finalMartId,
          userId: user.id,
          type: 'product_add_result',
          title: 'Product created',
          message: `Your product ${productPayload.name} was created`,
          metadata: { productId: product._id, result: 'approved' },
        });

        return res.status(201).json(product);
      }

      // Otherwise, create a pending request and notify managers
      const reqDoc = new ProductAddRequest({
        martId: finalMartId,
        requesterId: user.id,
        requesterName: user.username || user.name,
        payload: productPayload,
      });

      await reqDoc.save();

      if (managers && managers.length > 0) {
        for (const m of managers) {
          await createNotification({
            martId: finalMartId,
            userId: m._id,
            type: 'product_add_request',
            title: 'Product creation requested',
            message: `${reqDoc.requesterName || 'Owner'} requested to add product ${name}`,
            metadata: { requestId: reqDoc._id, name },
          });
        }
      } else {
        await createNotification({
          martId: finalMartId,
          type: 'product_add_request',
          title: 'Product creation requested',
          message: `${reqDoc.requesterName || 'Owner'} requested to add product ${name}`,
          metadata: { requestId: reqDoc._id, name },
        });
      }

      // Return pending payload so callers (mobile) can render a placeholder reliably
      return res.status(202).json({
        message: 'Product submitted for manager approval',
        requestId: reqDoc._id,
        pending: {
          name: productPayload.name,
          category: productPayload.category,
          purchasePriceEtb: Number(productPayload.purchasePrice || 0),
          sellingPriceEtb: Number(productPayload.sellingPrice || 0),
          stockQty: Number(productPayload.quantity || 0),
          martQty: Number(productPayload.storeQuantity || 0),
          imageUrl: productPayload.imageUrl || '',
        },
      });
    }

    const product = new Product(productPayload);

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// List products (with optional filters)
router.get("/", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { martId, category, name, lowStock } = req.query;
    const filter = {};

    if (user.role === "systemAdmin") {
      if (martId) filter.martId = martId;
    } else {
      filter.martId = user.martId;
    }

    if (category) filter.category = category;
    if (name) filter.name = new RegExp(name, "i");
    if (lowStock === "true")
      filter.$expr = { $lt: ["$quantity", "$lowStockThreshold"] };

    // Pagination support: if page and limit provided, return paginated response
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : null;
    const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : null;

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [list, total] = await Promise.all([
        Product.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
        Product.countDocuments(filter),
      ]);
      return res.json({ data: list, total, page, limit });
    }

    // default (backwards-compatible): return full list
    const list = await Product.find(filter).sort({ name: 1 });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single product
router.get("/:id", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (
      user.role !== "systemAdmin" &&
      String(product.martId) !== String(user.martId)
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this product" });
    }

    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update product
router.put("/:id", authenticate, upload.single("image"), async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    console.log('[products:update] entered update handler for user', { id: user.id, role: user.role });
    const update = {};
    const allowed = [
      "name",
      "category",
      "unit",
      "purchasePrice",
      "sellingPrice",
      "quantity",
      "lowStockThreshold",
      "expiryDate",
      "barcode",
      "barcodes",
      "imageUrl",
      "storeQuantity",
      "supermarketQuantity",
    ];
    for (const k of allowed)
      if (req.body[k] !== undefined) update[k] = req.body[k];

    // If an image file was uploaded, upload it to Cloudinary and set imageUrl
    if (req.file && req.file.buffer) {
      try {
        const uploaded = await uploadBuffer(
          req.file.buffer,
          req.file.originalname,
        );
        update.imageUrl =
          uploaded.secure_url || uploaded.url || update.imageUrl;
      } catch (err) {
        console.error("Cloudinary upload error:", err);
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    // Prevent store keepers from directly adjusting stock quantities via product update.
    // Store keepers should create a stock transfer request instead, which managers will approve.
    const roleLc = String(user.role || '').toLowerCase();
    const isStoreKeeper = roleLc === 'storekeeper' || roleLc === 'store_keeper' || (roleLc.includes('store') && roleLc.includes('keeper'));
    const forbiddenFields = ['storeQuantity', 'supermarketQuantity', 'quantity'];
    // Check both the normalized `update` object and raw `req.body` to be robust against multipart/form-data
    const hasForbidden = forbiddenFields.some(f => (update[f] !== undefined) || (req.body && req.body[f] !== undefined));
    console.log('[products:update] user.role=', user.role, 'roleLc=', roleLc, 'isStoreKeeper=', isStoreKeeper, 'updateKeys=', Object.keys(update), 'rawBodyKeys=', req.body ? Object.keys(req.body) : []);
    if (isStoreKeeper && hasForbidden) {
      console.log('[products:update] blocked store keeper update attempt', { user: user.id, role: user.role, attempted: forbiddenFields.reduce((acc,f) => (acc[f] = (update[f] !== undefined ? update[f] : req.body && req.body[f] !== undefined ? req.body[f] : undefined) , acc), {}) });
      return res.status(403).json({ message: 'Store keepers cannot directly change stock quantities. Submit a stock transfer request via /api/stock-transfer-requests' });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (
      user.role !== "systemAdmin" &&
      String(product.martId) !== String(user.martId)
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this product" });
    }

    // make sure updated category exists
    if (update.category) {
      const Category = require('../models/category.model');
      try {
        await Category.findOneAndUpdate(
          { name: update.category.trim(), martId: product.martId },
          { name: update.category.trim(), martId: product.martId },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (catErr) {
        console.error('category upsert error (update)', catErr);
      }
    }

    // Handle barcode updates: support adding/removing barcodes + enforce per-mart uniqueness
    if (update.barcodes !== undefined || update.barcode !== undefined) {
      const newBarcodes = Array.isArray(update.barcodes)
        ? update.barcodes.map((b) => String(b).trim()).filter(Boolean)
        : update.barcode
          ? [String(update.barcode).trim()].filter(Boolean)
          : [];

      if (newBarcodes.length > 0) {
        const dup = await Product.findOne({
          _id: { $ne: product._id },
          martId: product.martId,
          $or: [{ barcodes: { $in: newBarcodes } }, { barcode: { $in: newBarcodes } }],
        })
          .select('_id name')
          .lean();

        if (dup) {
          return res.status(409).json({
            message: `Barcode already registered for ${dup.name}`,
            product: { id: String(dup._id), name: dup.name },
          });
        }
      }

      update.barcodes = newBarcodes;
      delete update.barcode;
    }

    // Owners require manager/systemAdmin approval for any update (case-insensitive check)
    if (String(user.role || '').toLowerCase() === 'owner' && String(user.role || '').toLowerCase() !== 'systemadmin') {
      const changes = { ...update };
      if (Object.keys(changes).length === 0) {
        return res.status(400).json({ message: "No changes supplied" });
      }

      // Business rule: owner edits/adds should adjust warehouse/store stock, not front/mart stock.
      if (
        changes.quantity !== undefined ||
        changes.supermarketQuantity !== undefined
      ) {
        const storeVal =
          changes.storeQuantity !== undefined
            ? Number(changes.storeQuantity)
            : Number(changes.quantity ?? changes.supermarketQuantity ?? 0);
        changes.storeQuantity = Number.isFinite(storeVal) ? storeVal : 0;
        delete changes.quantity;
        delete changes.supermarketQuantity;
      }

      const User = require('../models/user.model');
      const managers = await User.find({ martId: product.martId, role: { $regex: /^manager$/i } }).select('_id username name').lean();

      // If no managers exist for this mart, apply changes immediately and notify requester
      if (!managers || managers.length === 0) {
        const updated = await Product.findByIdAndUpdate(id, changes, { new: true });

        await createNotification({
          martId: product.martId,
          userId: user.id,
          type: 'product_edit_result',
          title: 'Product edit applied',
          message: `Your requested updates for product ${updated.name} were applied`,
          metadata: { productId: updated._id, result: 'approved' },
        });

        return res.json({ message: 'Update applied', product: updated });
      }

      const reqDoc = new ProductEditRequest({
        productId: product._id,
        martId: product.martId,
        requesterId: user.id,
        requesterName: user.username || user.name,
        changes,
      });
      await reqDoc.save();

      if (managers && managers.length > 0) {
        for (const m of managers) {
          await createNotification({
            martId: product.martId,
            userId: m._id,
            type: 'product_edit_request',
            title: 'Product edit requested',
            message: `${reqDoc.requesterName} requested updates for product ${product.name}`,
            metadata: { requestId: reqDoc._id, productId: product._id, requestedChanges: reqDoc.changes },
          });
        }
      } else {
        await createNotification({
          martId: product.martId,
          type: 'product_edit_request',
          title: 'Product edit requested',
          message: `${reqDoc.requesterName} requested updates for product ${product.name}`,
          metadata: { requestId: reqDoc._id, productId: product._id, requestedChanges: reqDoc.changes },
        });
      }

      return res.status(202).json({ message: 'Update submitted for manager approval', requestId: reqDoc._id });
    }

    const updated = await Product.findByIdAndUpdate(id, update, { new: true });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Find product by barcode
router.get("/by-barcode/:code", authenticate, async (req, res) => {
  try {
    const { code } = req.params;
    const user = req.user;
    const filter = { $or: [{ barcodes: code }, { barcode: code }] };
    // ensure mart scoping for non-admin
    if (user.role !== "systemAdmin") filter.martId = user.martId;
    const product = await Product.findOne(filter).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete product
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Only systemAdmin or owner of the mart can delete
    if (user.role !== "systemAdmin") {
      if (
        String(user.martId) !== String(product.martId) ||
        user.role !== "owner"
      ) {
        return res
          .status(403)
          .json({
            message: "Only mart owner or system admin can delete products",
          });
      }
    }

    await Product.findByIdAndDelete(id);
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;

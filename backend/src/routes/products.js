const express = require("express");
const router = express.Router();

const Product = require("../models/product.model");
const ProductEditRequest = require("../models/productEditRequest.model");
const ProductAddRequest = require("../models/productAddRequest.model");
const Notification = require("../models/notification.model");
const { authenticate } = require("../middleware/auth");
const multer = require("multer");
const { uploadBuffer } = require("../utils/cloudinary");

// Use memory storage so we can send buffer directly to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

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
    if (!finalMartId)
      return res.status(400).json({ message: "martId is required" });

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

    // Owners require manager approval before product is created
    if (user.role === "owner" && user.role !== "systemAdmin") {
      const reqDoc = new ProductAddRequest({
        martId: finalMartId,
        requesterId: user.id,
        requesterName: user.username || user.name,
        payload: productPayload,
      });

      await reqDoc.save();

      await Notification.create({
        martId: finalMartId,
        type: "product_add_request",
        title: "Product creation requested",
        message: `${reqDoc.requesterName || "Owner"} requested to add product ${name}`,
        data: { requestId: reqDoc._id, name },
      });

      return res
        .status(202)
        .json({
          message: "Product submitted for manager approval",
          requestId: reqDoc._id,
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

    // Owners require manager/systemAdmin approval for any update
    if (user.role === "owner" && user.role !== "systemAdmin") {
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

      const reqDoc = new ProductEditRequest({
        productId: product._id,
        martId: product.martId,
        requesterId: user.id,
        requesterName: user.username || user.name,
        changes,
      });
      await reqDoc.save();

      await Notification.create({
        martId: product.martId,
        type: "product_edit_request",
        title: "Product edit requested",
        message: `${reqDoc.requesterName} requested updates for product ${product.name}`,
        data: {
          requestId: reqDoc._id,
          productId: product._id,
          requestedChanges: reqDoc.changes,
        },
      });

      return res
        .status(202)
        .json({
          message: "Update submitted for manager approval",
          requestId: reqDoc._id,
        });
    }

    // Handle barcode updates: support adding/removing barcodes
    if (update.barcodes !== undefined || update.barcode !== undefined) {
      // normalize to array
      const newBarcodes = Array.isArray(update.barcodes)
        ? update.barcodes.map(String)
        : update.barcode
          ? [String(update.barcode)]
          : undefined;
      if (newBarcodes !== undefined) {
        update.barcodes = newBarcodes;
      }
      // remove single barcode field if present
      delete update.barcode;
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

// Notifications: list notifications for mart or user
router.get("/notifications", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { martId } = req.query;
    const filter = {};
    if (user.role === "systemAdmin") {
      if (martId) filter.martId = martId;
    } else {
      filter.martId = user.martId;
    }
    // optionally limit to user-specific notifications
    filter.$or = [{ userId: null }, { userId: user.id }];

    const list = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(200);
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

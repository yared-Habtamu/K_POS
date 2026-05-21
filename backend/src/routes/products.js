const express = require("express");
const router = express.Router();

const productRepository = require("../repositories/productRepository");
const {
  productAddRequestRepository,
  productEditRequestRepository,
} = require("../repositories/requestRepositories");
const userRepository = require("../repositories/userRepository");
const categoryRepository = require("../repositories/categoryRepository");
const { createNotification } = require("../services/notification.service");
const { authenticate } = require("../middleware/auth");
const multer = require("multer");
const { uploadBuffer } = require("../utils/cloudinary");

function normalizeExpiryDate(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const str = String(value).trim();
  if (!str || str.toLowerCase() === "null") return null;
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Use memory storage so we can send buffer directly to Cloudinary for media storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

async function ensureProductPayloadBarcodes(productPayload) {
  const incomingBarcodes = (
    Array.isArray(productPayload.barcodes) ? productPayload.barcodes : []
  )
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (incomingBarcodes.length > 0) {
    productPayload.barcodes = Array.from(new Set(incomingBarcodes));
    return productPayload.barcodes;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = String(Math.floor(Math.random() * 1e12)).padStart(
      12,
      "0",
    );
    const existing = await productRepository.findOne({
      martId: productPayload.martId,
      isDeleted: false,
      barcodes: { has: candidate },
    });

    if (!existing) {
      productPayload.barcodes = [candidate];
      return productPayload.barcodes;
    }
  }

  throw new Error("Failed to generate a unique barcode");
}

async function createProductFromRequest(req, res, options = {}) {
  const { initialStockTarget = "default" } = options;
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

  let finalImageUrl = imageUrl || "";
  if (req.file && req.file.buffer) {
    try {
      const uploaded = await uploadBuffer(
        req.file.buffer,
        req.file.originalname,
        `${req.protocol}://${req.get("host")}`,
      );
      finalImageUrl = uploaded.secure_url || uploaded.url || finalImageUrl;
    } catch (err) {
      console.error(
        "Cloudinary upload error:",
        err && err.stack ? err.stack : err,
      );
      if (process.env.NODE_ENV !== "production") {
        return res.status(500).json({
          message: "Image upload failed",
          error: err && err.message ? err.message : String(err),
        });
      }
      return res.status(500).json({ message: "Image upload failed" });
    }
  }

  if (!name) {
    return res.status(400).json({ message: "Product name is required" });
  }

  const finalMartId =
    user.role === "systemAdmin" ? martId || user.martId : user.martId;
  if (!finalMartId) {
    if (user.role === "owner") {
      return res.status(400).json({
        message:
          "Owner account has no mart assigned. Create a mart first or contact an administrator.",
      });
    }
    return res.status(400).json({ message: "martId is required" });
  }

  const requestedQty = Math.max(0, Number(quantity || 0));
  let storeQty =
    req.body.storeQuantity !== undefined
      ? Number(req.body.storeQuantity)
      : requestedQty;
  let supermarketQty =
    req.body.supermarketQuantity !== undefined
      ? Number(req.body.supermarketQuantity)
      : user.role === "owner"
        ? 0
        : requestedQty;

  if (initialStockTarget === "mart") {
    storeQty = 0;
    supermarketQty = requestedQty;
  }

  const productPayload = {
    martId: finalMartId,
    name,
    category: category || "",
    unit: unit || "pcs",
    purchasePrice: Number(purchasePrice || 0),
    sellingPrice: Number(sellingPrice || 0),
    quantity: Math.max(0, Number(supermarketQty)),
    storeQuantity: Math.max(0, Number(storeQty)),
    supermarketQuantity: Math.max(0, Number(supermarketQty)),
    lowStockThreshold: Number(lowStockThreshold || 10),
    expiryDate: normalizeExpiryDate(expiryDate),
    barcodes: (Array.isArray(barcodes)
      ? barcodes
      : barcodes || barcode
        ? [String(barcodes || barcode)]
        : []
    )
      .map((b) => String(b).trim())
      .filter(Boolean),
    imageUrl: finalImageUrl || null,
    createdBy: user.id,
  };

  if ((productPayload.barcodes || []).length > 1) {
    return res.status(400).json({
      message: "Only one barcode is allowed per product",
    });
  }

  if (productPayload.category) {
    try {
      await categoryRepository.upsert(
        productPayload.category.trim(),
        finalMartId,
      );
    } catch (catErr) {
      console.error("category upsert error", catErr);
    }
  }

  const incomingBarcodes = await ensureProductPayloadBarcodes(productPayload);
  if (incomingBarcodes.length > 1) {
    return res.status(400).json({
      message: "Only one barcode is allowed per product",
    });
  }
  if (incomingBarcodes.length > 0) {
    const existing = await productRepository.findOne({
      martId: finalMartId,
      isDeleted: false,
      barcodes: { hasSome: incomingBarcodes },
    });

    if (existing) {
      return res.status(409).json({
        message: `Barcode already registered for ${existing.name}`,
        product: {
          id: existing.id,
          name: existing.name,
          barcodes: existing.barcodes || [],
        },
      });
    }
  }

  // Only systemAdmin bypasses approval. Owners should submit requests
  // for approval when managers/store keepers exist for the mart.
  if (String(user.role || "").toLowerCase() !== "systemadmin") {
    const managers = await userRepository.findMany({
      martId: finalMartId,
      role: { in: ["manager"] },
    });

    const storeKeepers = await userRepository.findMany({
      martId: finalMartId,
      role: { in: ["storeKeeper"] },
    });

    const approvalRole =
      initialStockTarget === "mart" ? "manager" : "store_keeper";
    const primaryApprovers =
      approvalRole === "store_keeper" ? storeKeepers : managers;
    const fallbackApprovers = approvalRole === "store_keeper" ? managers : [];
    const approvers = primaryApprovers?.length
      ? primaryApprovers
      : fallbackApprovers;

    if (!approvers || approvers.length === 0) {
      const product = await productRepository.create(productPayload);

      await createNotification({
        martId: finalMartId,
        userId: user.id,
        type: "product_add_result",
        title: "Product created",
        message: `Your product ${productPayload.name} was created`,
        metadata: { productId: product.id, result: "approved" },
      });

      return res.status(201).json(product);
    }

    const reqDoc = await productAddRequestRepository.create({
      martId: finalMartId,
      requesterId: user.id,
      requesterName: user.username || user.name,
      payload: productPayload,
      approvalRole,
    });

    if (approvers && approvers.length > 0) {
      await Promise.all(
        approvers.map((approver) =>
          createNotification({
            martId: finalMartId,
            userId: approver.id,
            type: "product_add_request",
            title: "Product creation requested",
            message: `${reqDoc.requesterName || "Owner"} requested to add product ${name}`,
            metadata: { requestId: reqDoc.id, name, approvalRole },
          }),
        ),
      );
    } else {
      await createNotification({
        martId: finalMartId,
        type: "product_add_request",
        title: "Product creation requested",
        message: `${reqDoc.requesterName || "Owner"} requested to add product ${name}`,
        metadata: { requestId: reqDoc.id, name, approvalRole },
      });
    }

    return res.status(202).json({
      message:
        approvalRole === "store_keeper"
          ? "Product submitted for store keeper approval"
          : "Product submitted for manager approval",
      requestId: reqDoc.id,
      pending: {
        name: productPayload.name,
        category: productPayload.category,
        purchasePriceEtb: Number(productPayload.purchasePrice || 0),
        sellingPriceEtb: Number(productPayload.sellingPrice || 0),
        stockQty: Number(productPayload.storeQuantity || 0),
        martQty: Number(productPayload.supermarketQuantity || 0),
        imageUrl: productPayload.imageUrl || "",
      },
    });
  }

  const product = await productRepository.create(productPayload);
  return res.status(201).json(product);
}

// Create product
router.post("/", authenticate, upload.single("image"), async (req, res) => {
  try {
    return await createProductFromRequest(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post(
  "/direct-to-mart",
  authenticate,
  upload.single("image"),
  async (req, res) => {
    try {
      return await createProductFromRequest(req, res, {
        initialStockTarget: "mart",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

// List products (with optional filters)
router.get("/", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const { martId, category, name, lowStock } = req.query;
    const filter = { isDeleted: false };

    if (user.role === "systemAdmin") {
      if (martId) filter.martId = martId;
    } else {
      filter.martId = user.martId;
    }

    if (category) filter.category = category;
    if (name) filter.name = { contains: name, mode: "insensitive" };

    // In Prisma, filtering by one field < another field requires a raw query or checking fetched results.
    // However, Prisma currently lacks direct column-to-column comparison in findMany for all drivers.
    // But we can fetch it, then filter in memory if needed, or omit and rely on client.
    // For now, we will handle `lowStock` filtering in JS to ensure cross-database compatibility unless
    // using queryRaw. Since this is a simple list query, we will filter in memory if lowStock is requested.

    // Pagination support
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : null;
    const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : null;

    let list = await productRepository.findMany(filter, {
      orderBy: { name: "asc" },
    });

    if (lowStock === "true") {
      list = list.filter((p) => p.quantity < p.lowStockThreshold);
    }

    if (page && limit) {
      const skip = (page - 1) * limit;
      const paginatedList = list.slice(skip, skip + limit);
      return res.json({ data: paginatedList, total: list.length, page, limit });
    }

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
    const product = await productRepository.findOne({
      id: id,
      isDeleted: false,
    });
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

    if (Object.prototype.hasOwnProperty.call(update, "expiryDate")) {
      update.expiryDate = normalizeExpiryDate(update.expiryDate);
    }

    if (req.file && req.file.buffer) {
      try {
        const uploaded = await uploadBuffer(
          req.file.buffer,
          req.file.originalname,
          `${req.protocol}://${req.get("host")}`,
        );
        update.imageUrl =
          uploaded.secure_url || uploaded.url || update.imageUrl;
      } catch (err) {
        console.error("Cloudinary upload error:", err);
        return res.status(500).json({ message: "Image upload failed" });
      }
    }

    const roleLc = String(user.role || "").toLowerCase();
    const isStoreKeeper =
      roleLc === "storekeeper" ||
      roleLc === "store_keeper" ||
      (roleLc.includes("store") && roleLc.includes("keeper"));
    const forbiddenFields = [
      "storeQuantity",
      "supermarketQuantity",
      "quantity",
    ];
    const hasForbidden = forbiddenFields.some(
      (f) => update[f] !== undefined || (req.body && req.body[f] !== undefined),
    );

    if (isStoreKeeper && hasForbidden) {
      return res.status(403).json({
        message:
          "Store keepers cannot directly change stock quantities. Submit a stock transfer request via /api/stock-transfer-requests",
      });
    }

    const product = await productRepository.findById(id);
    if (!product || product.isDeleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (
      user.role !== "systemAdmin" &&
      String(product.martId) !== String(user.martId)
    ) {
      return res
        .status(403)
        .json({ message: "Access denied for this product" });
    }

    if (update.category) {
      try {
        await categoryRepository.upsert(update.category.trim(), product.martId);
      } catch (catErr) {
        console.error("category upsert error (update)", catErr);
      }
    }

    if (update.barcodes !== undefined || update.barcode !== undefined) {
      const newBarcodes = Array.isArray(update.barcodes)
        ? update.barcodes.map((b) => String(b).trim()).filter(Boolean)
        : update.barcode
          ? [String(update.barcode).trim()].filter(Boolean)
          : [];

      if (newBarcodes.length > 1) {
        return res.status(400).json({
          message: "Only one barcode is allowed per product",
        });
      }

      if (newBarcodes.length > 0) {
        const dup = await productRepository.findOne({
          id: { not: product.id },
          martId: product.martId,
          isDeleted: false,
          barcodes: { hasSome: newBarcodes },
        });

        if (dup) {
          return res.status(409).json({
            message: `Barcode already registered for ${dup.name}`,
            product: { id: String(dup.id), name: dup.name },
          });
        }
      }

      update.barcodes = newBarcodes;
      delete update.barcode;
    }

    if (String(user.role || "").toLowerCase() !== "systemadmin") {
      const changes = { ...update };
      if (Object.keys(changes).length === 0) {
        return res.status(400).json({ message: "No changes supplied" });
      }

      if (changes.storeQuantity !== undefined) {
        const value = Number(changes.storeQuantity);
        changes.storeQuantity = Number.isFinite(value) ? value : 0;
      }
      if (changes.quantity !== undefined) {
        const value = Number(changes.quantity);
        changes.quantity = Number.isFinite(value) ? value : 0;
      }
      if (changes.supermarketQuantity !== undefined) {
        const value = Number(changes.supermarketQuantity);
        changes.supermarketQuantity = Number.isFinite(value) ? value : 0;
      }

      const managers = await userRepository.findMany({
        martId: product.martId,
        role: { in: ["manager"] },
      });

      const storeKeepers = await userRepository.findMany({
        martId: product.martId,
        role: { in: ["storeKeeper"] },
      });

      const managerChanges = { ...changes };
      const storeKeeperChanges = {};

      if (changes.storeQuantity !== undefined) {
        storeKeeperChanges.storeQuantity = changes.storeQuantity;
        delete managerChanges.storeQuantity;
      }

      const requestIds = [];
      const immediateChanges = {};

      const createEditRequestForRole = async (
        approvalRole,
        roleChanges,
        approvers,
      ) => {
        if (!roleChanges || Object.keys(roleChanges).length === 0) return;

        if (!approvers || approvers.length === 0) {
          Object.assign(immediateChanges, roleChanges);
          return;
        }

        const reqDoc = await productEditRequestRepository.create({
          productId: product.id,
          martId: product.martId,
          requesterId: user.id,
          requesterName: user.username || user.name,
          changes: roleChanges,
          approvalRole,
        });
        requestIds.push(String(reqDoc.id));

        await Promise.all(
          approvers.map((approver) =>
            createNotification({
              martId: product.martId,
              userId: approver.id,
              type: "product_edit_request",
              title: "Product edit requested",
              message: `${reqDoc.requesterName} requested updates for product ${product.name}`,
              metadata: {
                requestId: reqDoc.id,
                productId: product.id,
                approvalRole,
                requestedChanges: reqDoc.changes,
              },
            }),
          ),
        );
      };

      await createEditRequestForRole(
        "store_keeper",
        storeKeeperChanges,
        storeKeepers,
      );
      await createEditRequestForRole("manager", managerChanges, managers);

      if (Object.keys(immediateChanges).length > 0) {
        const updated = await productRepository.update(id, immediateChanges);

        await createNotification({
          martId: product.martId,
          userId: user.id,
          type: "product_edit_result",
          title: "Product edit applied",
          message: `Some requested updates for product ${updated.name} were applied immediately`,
          metadata: { productId: updated.id, result: "approved" },
        });
      }

      if (requestIds.length === 0) {
        const updated = await productRepository.findById(id);
        return res.json({ message: "Update applied", product: updated });
      }

      return res.status(202).json({
        message: "Update submitted for approval",
        requestIds,
      });
    }

    const updated = await productRepository.update(id, update);
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
    const filter = {
      barcodes: { has: code },
      isDeleted: false,
    };
    if (user.role !== "systemAdmin") filter.martId = user.martId;

    const product = await productRepository.findOne(filter);
    res.json(product || null);
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

    const filter = { id: id, isDeleted: false };
    if (user.role !== "systemAdmin") {
      filter.martId = user.martId;
    }

    const product = await productRepository.findOne(filter);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (user.role !== "systemAdmin") {
      if (user.role !== "owner") {
        return res
          .status(403)
          .json({ message: "Only owners can delete products" });
      }
    }

    await productRepository.update(product.id, { isDeleted: true });

    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

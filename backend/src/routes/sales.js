const express = require("express");
const router = express.Router();
const Sale = require("../models/sale.model");
const Mart = require("../models/mart.model");
const Product = require("../models/product.model");
const Customer = require("../models/customer.model");
const mongoose = require("mongoose");
const { authenticate } = require("../middleware/auth");
const PDFDocument = require("pdfkit");

const PENDING_RECEIPT_TTL_MS = 24 * 60 * 60 * 1000;
const pendingReceipts = new Map();

function prunePendingReceipts() {
  const now = Date.now();
  for (const [key, entry] of pendingReceipts.entries()) {
    if (!entry || Number(entry.expiresAt) <= now) pendingReceipts.delete(key);
  }
}

function normalizePendingReceipt(payload) {
  if (!payload || typeof payload !== "object") return null;
  const id = String(payload.id || "").trim();
  if (!id) return null;

  const items = Array.isArray(payload.items)
    ? payload.items.map((item) => {
        const qty = Number(item?.quantity) || 0;
        const price = Number(item?.product?.sellingPrice ?? item?.price) || 0;
        const lineTotal = Number(item?.subtotal ?? item?.total) || price * qty;
        return {
          name: String(item?.product?.name || item?.name || "Item"),
          quantity: qty,
          price,
          total: lineTotal,
        };
      })
    : [];

  return {
    id,
    saleId: String(payload.saleId || ""),
    shopName: String(payload.shopName || "Shop"),
    shopAddress: String(payload.shopAddress || "").trim() || undefined,
    shopPhone: String(payload.shopPhone || "").trim() || undefined,
    items,
    subtotal: Number(payload.subtotal) || 0,
    discount: payload.discount != null ? payload.discount : undefined,
    extraCharges: Array.isArray(payload.extraCharges) ? payload.extraCharges : [],
    tax: Number(payload.tax) || 0,
    taxRate: Number(payload.taxRate) || 0,
    total: Number(payload.total) || 0,
    paymentMethod: String(payload.paymentMethod || ""),
    cashierName: String(payload.cashierName || ""),
    date: payload.date || new Date(),
    receiptHeader: String(payload.receiptHeader || "").trim() || undefined,
    receiptSlogan: String(payload.receiptSlogan || "").trim() || undefined,
  };
}

function buildMartAddress(mart) {
  if (!mart || typeof mart !== "object") return "";
  const directAddress = String(mart.address || "").trim();
  if (directAddress) return directAddress;

  return [mart.city, mart.region, mart.country]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatQuantity(value) {
  const qty = Number(value);
  if (!Number.isFinite(qty)) return "0";
  if (Number.isInteger(qty)) return String(qty);
  return qty.toFixed(2).replace(/\.00$/, "");
}

async function buildReceiptViewModel(receiptId) {
  prunePendingReceipts();

  const sale = await Sale.findOne({ receiptId }).sort({ date: -1 }).lean();
  if (!sale) {
    const cached = pendingReceipts.get(receiptId);
    if (cached && Number(cached.expiresAt) > Date.now()) {
      return cached.receipt;
    }
    return null;
  }

  const mart = sale.martId
    ? await Mart.findById(sale.martId)
        .select(
          "martName address city region country phone receiptHeader receiptMessage isDeleted",
        )
        .lean()
    : null;

  if (!mart || mart.isDeleted) {
    return null;
  }

  const items = Array.isArray(sale.items)
    ? sale.items.map((item) => {
        const qty = Number(item?.quantity) || 0;
        const rowTotal = Number(item?.total) || 0;
        const unitPrice = qty > 0 ? rowTotal / qty : Number(item?.price) || 0;
        return {
          name: String(item?.name || "Item"),
          quantity: qty,
          price: unitPrice,
          total: rowTotal,
        };
      })
    : [];

  return {
    id: String(sale.receiptId || sale._id || ""),
    saleId: String(sale._id || ""),
    shopName: String(mart?.martName || "Shop"),
    shopAddress: buildMartAddress(mart),
    shopPhone: String(mart?.phone || "").trim() || undefined,
    items,
    subtotal: Number(sale.subtotal) || 0,
    discount: sale.discount || undefined,
    extraCharges: Array.isArray(sale.extraCharges) ? sale.extraCharges : [],
    tax: Number(sale.tax) || 0,
    taxRate: Number(sale.taxRate) || 0,
    total: Number(sale.total) || 0,
    paymentMethod: String(sale.paymentMethod || ""),
    cashierName: String(sale.cashierName || ""),
    date: sale.date || sale.createdAt || new Date(),
    receiptHeader: String(mart?.receiptHeader || "").trim() || undefined,
    receiptSlogan: String(mart?.receiptMessage || "").trim() || undefined,
  };
}

// Create a sale (record transaction)
router.post("/", authenticate, async (req, res) => {
  try {
    const payload = req.body || {};
    const { martId, receiptId, items, subtotal, extraCharges, paymentMethod } =
      payload;
    const targetMartId =
      req.user.role === "systemAdmin"
        ? martId || req.user.martId
        : req.user.martId;
    if (!targetMartId)
      return res.status(400).json({ message: "martId required" });
    // fetch mart to get taxRate
    const mart = await Mart.findById(targetMartId).lean();
    const martTaxRate = Number(mart?.taxRate);
    const taxRate = Number.isFinite(martTaxRate) ? martTaxRate : 0;
    const martDiscountType =
      mart?.globalDiscountType === "fixed" ? "fixed" : "percentage";
    const martDiscountRateRaw = Number(mart?.globalDiscountRate);
    const martDiscountRate = Number.isFinite(martDiscountRateRaw)
      ? Math.max(0, martDiscountRateRaw)
      : 0;
    const enableDiscountByItems = Boolean(mart?.enableDiscountByItems);
    const enableDiscountByAmount = Boolean(mart?.enableDiscountByAmount);
    const discountMinItemsRaw = Number(mart?.discountMinItems);
    const discountMinItems = Number.isFinite(discountMinItemsRaw)
      ? Math.max(0, discountMinItemsRaw)
      : 0;
    const discountMinAmountRaw = Number(mart?.discountMinAmount);
    const discountMinAmount = Number.isFinite(discountMinAmountRaw)
      ? Math.max(0, discountMinAmountRaw)
      : 0;

    // compute subtotal from items if not provided
    let computedSubtotal = Number(subtotal || 0);
    if ((!computedSubtotal || computedSubtotal === 0) && Array.isArray(items)) {
      computedSubtotal = items.reduce(
        (s, it) => s + (Number(it.total) || 0),
        0,
      );
    }

    const extraSum = Array.isArray(extraCharges)
      ? extraCharges.reduce((s, e) => s + (Number(e.amount) || 0), 0)
      : 0;

    const itemCount = Array.isArray(items)
      ? items.reduce((sum, it) => sum + (Number(it?.quantity) || 0), 0)
      : 0;
    const qualifiesByItems =
      enableDiscountByItems &&
      discountMinItems > 0 &&
      itemCount > discountMinItems;
    const qualifiesByAmount =
      enableDiscountByAmount &&
      discountMinAmount > 0 &&
      computedSubtotal > discountMinAmount;
    const shouldApplyDiscount =
      martDiscountRate > 0 &&
      (enableDiscountByItems || enableDiscountByAmount) &&
      (qualifiesByItems || qualifiesByAmount);

    const rawDiscountAmt = shouldApplyDiscount
      ? martDiscountType === "percentage"
        ? computedSubtotal * (martDiscountRate / 100)
        : martDiscountRate
      : 0;
    const discountAmt =
      Math.round(
        (Math.min(computedSubtotal, Math.max(0, rawDiscountAmt)) +
          Number.EPSILON) *
          100,
      ) / 100;

    const appliedDiscount = shouldApplyDiscount
      ? {
          type: martDiscountType,
          value: martDiscountRate,
          amount: discountAmt,
        }
      : undefined;

    const taxableBase = computedSubtotal - discountAmt + extraSum;
    const taxAmount =
      Math.round((taxableBase * (taxRate / 100) + Number.EPSILON) * 100) / 100;

    const computedTotal =
      Math.round((taxableBase + taxAmount + Number.EPSILON) * 100) / 100;

    // --- Atomic Transactional Sale Execution ---
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // 1. Check for duplicate receiptId within the mart
      if (receiptId) {
        const existingSale = await Sale.findOne({
          martId: targetMartId,
          receiptId,
        }).session(session);
        if (existingSale) {
          throw new Error(`Receipt ${receiptId} already exists for this mart`);
        }
      }

      // 2. Prepare stock updates if items have productIds
      const qtyMap = {};
      if (Array.isArray(items)) {
        items.forEach((it) => {
          if (it && it.productId) {
            const q = Number(it.quantity) || 0;
            if (q > 0) {
              qtyMap[it.productId] = (qtyMap[it.productId] || 0) + q;
            }
          }
        });
      }

      const productIds = Object.keys(qtyMap);

      // 3. Deduct stock atomically and check for insufficiency
      for (const pid of productIds) {
        const qty = qtyMap[pid];
        // Use findOneAndUpdate with a condition to ensure atomicity and prevent race conditions
        const updatedProduct = await Product.findOneAndUpdate(
          {
            _id: pid,
            martId: targetMartId,
            supermarketQuantity: { $gte: qty },
            quantity: { $gte: qty },
          },
          {
            $inc: {
              supermarketQuantity: -qty,
              quantity: -qty,
            },
          },
          { session, new: true },
        );

        if (!updatedProduct) {
          const p = await Product.findById(pid).session(session);
          const name = p ? p.name : pid;
          throw new Error(`Insufficient stock for product: ${name}`);
        }
      }

      // 4. Update customer credit if applicable
      if (String(paymentMethod) === "wallet" && payload.customerId) {
        const cust = await Customer.findById(payload.customerId).session(
          session,
        );
        if (!cust) throw new Error("Customer not found for credit sale");
        if (String(cust.martId) !== String(targetMartId)) {
          throw new Error("Customer does not belong to this mart");
        }
        cust.totalCredit =
          Number(cust.totalCredit || 0) + Number(computedTotal || 0);
        cust.totalUnpaid =
          Number(cust.totalCredit || 0) - Number(cust.totalPaid || 0);
        await cust.save({ session });
      }

      // 5. Save the Sale record
      const sale = new Sale({
        martId: targetMartId,
        cashierId: req.user.id,
        cashierName: req.user.username,
        receiptId,
        items,
        subtotal: computedSubtotal,
        discount: appliedDiscount,
        extraCharges,
        tax: taxAmount,
        taxRate,
        total: computedTotal,
        paymentMethod,
        date: new Date(),
      });

      const savedSale = await sale.save({ session });

      await session.commitTransaction();
      session.endSession();

      if (receiptId) pendingReceipts.delete(String(receiptId));
      return res.status(201).json(savedSale);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("[Sale Error]", err.message);
      return res.status(400).json({ message: err.message || "Sale failed" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Cache a generated receipt preview so QR scans can work before final sale save.
router.post("/receipt-cache", authenticate, async (req, res) => {
  try {
    prunePendingReceipts();
    const normalized = normalizePendingReceipt(req.body?.receipt || req.body);
    if (!normalized) {
      return res.status(400).json({ message: "Valid receipt payload is required" });
    }

    pendingReceipts.set(normalized.id, {
      receipt: normalized,
      expiresAt: Date.now() + PENDING_RECEIPT_TTL_MS,
    });

    return res.status(201).json({ ok: true, receiptId: normalized.id });
  } catch (err) {
    console.error("Failed to cache receipt", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Public receipt lookup by receipt id (for QR scans)
router.get("/receipt/:receiptId", async (req, res) => {
  try {
    const receiptId = String(req.params.receiptId || "").trim();
    if (!receiptId)
      return res.status(400).json({ message: "receiptId is required" });

    const receipt = await buildReceiptViewModel(receiptId);
    if (!receipt)
      return res.status(404).json({ message: "Receipt not found" });

    return res.json(receipt);
  } catch (err) {
    console.error("Receipt lookup failed", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Public HTML receipt page for direct QR opening
router.get("/receipt/:receiptId/view", async (req, res) => {
  try {
    const providerPhone =
      String(
        process.env.RECEIPT_PROVIDER_PHONE ||
          process.env.SUPPORT_PHONE ||
          "+251930201388",
      ).trim() || "+251930201388";

    const receiptId = String(req.params.receiptId || "").trim();
    if (!receiptId) {
      return res
        .status(400)
        .type("text/html")
        .send("<h1>Invalid receipt id</h1>");
    }

    const receipt = await buildReceiptViewModel(receiptId);
    if (!receipt) {
      return res
        .status(404)
        .type("text/html")
        .send("<h1>Receipt not found</h1>");
    }

    const itemRows = receipt.items
      .map(
        (item) => `
          <tr>
            <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(item.name)}</td>
            <td style="text-align:center;">${formatQuantity(item.quantity)}</td>
            <td style="text-align:right;">${Number(item.price).toFixed(2)} ETB</td>
            <td style="text-align:right;">${Number(item.total).toFixed(2)} ETB</td>
          </tr>`,
      )
      .join("");

    const extraChargeRows = (receipt.extraCharges || [])
      .map((charge) => {
        const name = escapeHtml(String(charge?.name || "Charge"));
        const amount = Number(charge?.amount) || 0;
        return `<div class="row"><span>${name}</span><span>+${amount.toFixed(2)} ETB</span></div>`;
      })
      .join("");

    const discountRow = receipt.discount
      ? `<div class="row discount"><span>Discount</span><span>-${Number(receipt.discount.amount || 0).toFixed(2)} ETB</span></div>`
      : "";

    const paymentLabel = escapeHtml(
      String(receipt.paymentMethod || "").replace(/_/g, " ").toUpperCase(),
    );

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="theme-color" content="#ffffff" />
    <title>Receipt ${escapeHtml(receipt.id)}</title>
    <style>
      html, body { color-scheme: light !important; background: #ffffff !important; }
      body { font-family: Arial, sans-serif; margin: 0; padding: 16px; color: #111827 !important; -webkit-font-smoothing: antialiased; }
      .paper { max-width: 390px; margin: 0 auto; background: #fff !important; border: 1px solid #d1d5db; border-radius: 12px; padding: 18px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
      .center { text-align: center; }
      .muted { color: #6b7280; font-size: 12px; }
      .sep { border-top: 1px dashed #9ca3af; margin: 12px 0; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th, td { padding: 6px 2px; border-bottom: 1px solid #f3f4f6; }
      th { text-align: left; font-size: 12px; color: #6b7280; }
      .row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 14px; }
      .discount { color: #047857; }
      .total { font-weight: 700; font-size: 32px; border-top: 1px solid #9ca3af; padding-top: 10px; margin-top: 8px; line-height: 1.1; }
      .meta { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; }
      .section-title { font-weight: 700; font-size: 12px; color: #374151; }
      @media (prefers-color-scheme: dark) {
        html, body, .paper { background: #ffffff !important; color: #111827 !important; }
        .muted, th { color: #6b7280 !important; }
      }
      @media (max-width: 640px) {
        .paper { padding: 14px; max-width: 360px; }
        .meta { flex-direction: column; }
      }
    </style>
  </head>
  <body>
    <div class="paper">
      <div class="center">
        <h2 style="margin: 0;">${escapeHtml(receipt.shopName)}</h2>
        ${receipt.shopAddress ? `<div class="muted">${escapeHtml(receipt.shopAddress)}</div>` : ""}
        ${receipt.shopPhone ? `<div class="muted">${escapeHtml(receipt.shopPhone)}</div>` : ""}
        ${receipt.receiptSlogan ? `<div class="muted" style="margin-top:6px;">${escapeHtml(receipt.receiptSlogan)}</div>` : (receipt.receiptHeader ? `<div class="muted" style="margin-top:6px;">${escapeHtml(receipt.receiptHeader)}</div>` : "")}
      </div>
      <div class="sep"></div>
      <div class="meta">
        <div>
          <div><strong>Receipt:</strong> ${escapeHtml(receipt.id)}</div>
          <div><strong>Cashier:</strong> ${escapeHtml(receipt.cashierName || "N/A")}</div>
        </div>
        <div style="text-align:right;">
          <div>${escapeHtml(new Date(receipt.date).toLocaleDateString())}</div>
          <div>${escapeHtml(new Date(receipt.date).toLocaleTimeString())}</div>
        </div>
      </div>
      <div class="sep"></div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Price</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div class="sep"></div>
      <div class="row"><span>Subtotal</span><span>${Number(receipt.subtotal).toFixed(2)} ETB</span></div>
      ${discountRow}
      ${extraChargeRows}
      <div class="row"><span>VAT (${Number(receipt.taxRate).toFixed(2)}%)</span><span>${Number(receipt.tax).toFixed(2)} ETB</span></div>
      <div class="row total"><span>TOTAL</span><span>${Number(receipt.total).toFixed(2)} ETB</span></div>
      <div class="row"><span>Payment</span><span>${paymentLabel}</span></div>
      <p class="center" style="margin-top:8px; color:#111; font-size:11px; font-weight:700;">Powered by Kiya POS System</p>
      <p class="center" style="margin-top:2px; color:#111; font-size:10px; font-weight:600;">${escapeHtml(providerPhone)}</p>
    </div>
  </body>
</html>`;

    return res.status(200).type("text/html").send(html);
  } catch (err) {
    console.error("Receipt page render failed", err);
    return res.status(500).type("text/html").send("<h1>Server error</h1>");
  }
});

// PDF receipt endpoint (generates a printer-friendly PDF server-side)
router.get("/receipt/:receiptId/pdf", async (req, res) => {
  try {
    const receiptId = String(req.params.receiptId || "").trim();
    if (!receiptId) return res.status(400).json({ message: "receiptId is required" });

    const receipt = await buildReceiptViewModel(receiptId);
    if (!receipt) return res.status(404).json({ message: "Receipt not found" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=receipt-${receiptId}.pdf`,
    );

    // Use 80mm width for thermal receipt printers (convert mm to points: 1mm = 2.8346456693pt)
    const mmToPt = (mm) => mm * 2.8346456693;
    const receiptWidthPt = Math.round(mmToPt(80));
    const doc = new PDFDocument({ size: [receiptWidthPt, 1400], margins: { top: 10, bottom: 10, left: 10, right: 10 } });
    doc.pipe(res);

    const pageW = doc.page.width;
    const left = doc.page.margins.left;
    const right = doc.page.margins.right;
    const contentW = pageW - left - right;

    // Header: big shop name centered
    doc.font("Helvetica-Bold").fontSize(18).text(String(receipt.shopName || ""), left, doc.y, { align: "center", width: contentW });
    if (receipt.shopAddress) doc.font("Helvetica").fontSize(9).text(String(receipt.shopAddress), left, doc.y, { align: "center", width: contentW });
    if (receipt.shopPhone) doc.font("Helvetica").fontSize(9).text(String(receipt.shopPhone), left, doc.y, { align: "center", width: contentW });
    if (receipt.receiptSlogan) doc.font("Helvetica").fontSize(10).text(String(receipt.receiptSlogan), left, doc.y, { align: "center", width: contentW });
    doc.moveDown(0.5);

    // Meta rows (left aligned)
    doc.font("Helvetica").fontSize(9);
    doc.text(`Receipt: ${receipt.id}`, left, doc.y);
    doc.moveDown(0.15);
    doc.text(`Cashier: ${receipt.cashierName || "N/A"}`, left, doc.y);
    doc.moveDown(0.15);
    doc.text(`Date: ${new Date(receipt.date).toLocaleString()}`, left, doc.y);
    doc.moveDown(0.25);

    // Separator
    doc.moveTo(left, doc.y).lineTo(pageW - right, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.4);

    // Items: for each item print name (left), total (right) on same line, then qty x price below name
    const rightColW = Math.floor(contentW * 0.3);
    const leftColW = contentW - rightColW;
    for (const item of receipt.items || []) {
      const name = String(item.name || "");
      const qty = Number(item.quantity || 0);
      const price = Number(item.price || 0).toFixed(2);
      const total = Number(item.total || item.subtotal || (qty * Number(price))).toFixed(2);

      // Name left
      doc.font("Helvetica").fontSize(9).text(name, left, doc.y, { width: leftColW });
      // Total right on same y
      const itemLineY = doc.y - 12; // adjust to previous baseline where name was printed
      doc.text(`${total} ETB`, left + leftColW, itemLineY, { width: rightColW, align: 'right' });
      doc.moveDown(0.4);

      // qty x price line
      doc.fontSize(9).fillColor('#333').text(`${qty} x ${Number(price).toFixed(2)} ETB`, left, doc.y, { width: leftColW });
      doc.moveDown(0.3);
    }

    // Separator
    doc.moveTo(left, doc.y).lineTo(pageW - right, doc.y).strokeColor('#cccccc').stroke();
    doc.moveDown(0.4);

    // Totals (right aligned)
    doc.font("Helvetica").fontSize(9).fillColor('#000');
    if (receipt.subtotal != null) {
      doc.text(`Subtotal: ${Number(receipt.subtotal).toFixed(2)} ETB`, left, doc.y, { width: contentW, align: 'right' });
      doc.moveDown(0.2);
    }
    if (receipt.discount && receipt.discount.amount != null) {
      doc.text(`Discount: -${Number(receipt.discount.amount).toFixed(2)} ETB`, left, doc.y, { width: contentW, align: 'right' });
      doc.moveDown(0.2);
    }
    for (const ch of receipt.extraCharges || []) {
      doc.text(`${ch.name}: +${Number(ch.amount || 0).toFixed(2)} ETB`, left, doc.y, { width: contentW, align: 'right' });
      doc.moveDown(0.2);
    }
    if (receipt.tax != null) {
      doc.text(`Tax: ${Number(receipt.tax).toFixed(2)} ETB`, left, doc.y, { width: contentW, align: 'right' });
      doc.moveDown(0.3);
    }

    // Grand total
    doc.font("Helvetica-Bold").fontSize(14).text(`TOTAL: ${Number(receipt.total || 0).toFixed(2)} ETB`, left, doc.y, { width: contentW, align: 'right' });
    doc.moveDown(0.6);

    // Footer branding
    doc.moveTo(left, doc.y).lineTo(pageW - right, doc.y).strokeColor('#eeeeee').stroke();
    doc.moveDown(0.4);
    doc.font("Helvetica").fontSize(10).fillColor('#000').text('Powered by Kiya POS System', left, doc.y, { align: 'center', width: contentW });
    if (receipt.shopPhone) doc.fontSize(9).text(String(receipt.shopPhone || ''), left, doc.y, { align: 'center', width: contentW });

    doc.end();
  } catch (err) {
    console.error("Failed to generate PDF receipt", err);
    if (!res.headersSent) res.status(500).json({ message: "Server error" });
  }
});

// List sales for a mart and optional date (date in YYYY-MM-DD)
router.get("/", authenticate, async (req, res) => {
  try {
    const { martId, date } = req.query;
    const filter = {};
    if (req.user.role === "systemAdmin") {
      if (martId) filter.martId = martId;
    } else {
      filter.martId = req.user.martId;
      if (martId && String(martId) !== String(req.user.martId))
        return res
          .status(403)
          .json({ message: "Cannot list sales for another mart" });
    }

    if (date) {
      const start = new Date(date + "T00:00:00.000Z");
      const end = new Date(date + "T23:59:59.999Z");
      filter.date = { $gte: start, $lte: end };
    }

    const list = await Sale.find(filter).sort({ date: -1 }).lean();
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

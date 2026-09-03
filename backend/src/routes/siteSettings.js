const express = require("express");
const router = express.Router();
const prisma = require("../repositories/prismaClient");
const { authenticate } = require("../middleware/auth");

const SINGLETON_ID = "global";

// ── GET /api/site-settings/contacts  (public — no auth required) ──────────────
// The landing page footer fetches this without a token.
router.get("/contacts", async (req, res) => {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { id: SINGLETON_ID },
    });
    const contacts = row ? (Array.isArray(row.contacts) ? row.contacts : []) : [];
    res.json(contacts);
  } catch (err) {
    console.error("[site-settings] GET contacts error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── PUT /api/site-settings/contacts  (system_admin only) ─────────────────────
router.put("/contacts", authenticate, async (req, res) => {
  if (req.user.role !== "systemAdmin") {
    return res.status(403).json({ message: "System admin only" });
  }

  const { contacts } = req.body;
  if (!Array.isArray(contacts)) {
    return res.status(400).json({ message: "contacts must be an array" });
  }

  // Validate each item minimally
  for (const item of contacts) {
    if (!item.id || !item.label || !item.icon) {
      return res.status(400).json({
        message: "Each contact must have id, label, and icon fields",
      });
    }
  }

  try {
    const row = await prisma.siteSetting.upsert({
      where: { id: SINGLETON_ID },
      update: { contacts },
      create: { id: SINGLETON_ID, contacts },
    });
    res.json({ contacts: row.contacts });
  } catch (err) {
    console.error("[site-settings] PUT contacts error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

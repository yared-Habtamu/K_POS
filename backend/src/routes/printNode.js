/**
 * PrintNode API Proxy Route (Multi-Tenant)
 *
 * - Each shop (Mart) has its own PrintNode API key stored in the database
 * - Each user has their own printer ID stored in the database
 * - All endpoints require authentication
 * - Backend validates that printer belongs to the user's shop
 */

const express = require("express");
const https = require("https");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const martRepository = require("../repositories/martRepository");
const userRepository = require("../repositories/userRepository");

/**
 * Helper: Make a request to PrintNode API with a given API key
 */
function printNodeRequest(method, apiPath, apiKey, body) {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      return reject(new Error("PrintNode API key not configured for this shop"));
    }

    const auth = Buffer.from(`${apiKey}:`).toString("base64");

    const options = {
      hostname: "api.printnode.com",
      port: 443,
      path: apiPath,
      method: method,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(
              new Error(
                parsed.message || parsed.error || `PrintNode API error: ${res.statusCode}`
              )
            );
          }
        } catch {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`PrintNode API error: ${res.statusCode} ${data}`));
          }
        }
      });
    });

    req.on("error", (err) => {
      reject(new Error(`PrintNode connection failed: ${err.message}`));
    });

    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("PrintNode API timeout"));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Helper: Get the PrintNode API key for a user's shop
 */
async function getMartApiKey(martId) {
  if (!martId) return null;
  const mart = await martRepository.findById(martId, {
    select: { printNodeApiKey: true },
  });
  return mart?.printNodeApiKey || null;
}

/**
 * POST /api/printnode/print
 * Send a print job to PrintNode
 * Uses the authenticated user's mart API key and user's saved printer ID
 */
router.post("/print", authenticate, async (req, res) => {
  try {
    const { printerId, commands, contentType } = req.body;
    const userId = req.user.id;
    const martId = req.user.martId;

    // Get the shop's PrintNode API key
    const apiKey = await getMartApiKey(martId);
    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: "PrintNode API key not configured for this shop. Ask the owner to set it in shop settings.",
      });
    }

    // Use provided printerId, or fall back to user's saved printer
    let resolvedPrinterId = printerId;
    if (!resolvedPrinterId) {
      const user = await userRepository.findById(userId, {
        select: { printNodeId: true },
      });
      resolvedPrinterId = user?.printNodeId;
    }

    if (!resolvedPrinterId) {
      return res.status(400).json({
        success: false,
        error: "No printer selected. Set a printer in your settings.",
      });
    }

    if (!commands || (Array.isArray(commands) && commands.length === 0)) {
      return res.status(400).json({
        success: false,
        error: "Missing or empty commands.",
      });
    }

    // Combine ESC/POS commands into a single string
    const rawString = Array.isArray(commands) ? commands.join("") : commands;

    // Encode as base64 for PrintNode
    const content = Buffer.from(rawString, "latin1").toString("base64");

    // PrintNode print job
    const printJob = {
      printerId: resolvedPrinterId,
      title: "Kiya POS Receipt",
      contentType: contentType || "raw_base64",
      content: content,
      source: "Kiya POS",
    };

    const result = await printNodeRequest("POST", "/printjobs", apiKey, printJob);

    res.json({
      success: true,
      message: "Print job sent to PrintNode",
      jobId: result,
    });
  } catch (err) {
    console.error("[printNode] Print error:", err.message);

    let errorMessage = err.message;
    if (err.message.includes("not configured")) {
      errorMessage = "PrintNode API key not configured for this shop.";
    } else if (err.message.includes("401") || err.message.includes("Unauthorized")) {
      errorMessage = "Invalid PrintNode API key. Ask the owner to check the API key in shop settings.";
    } else if (err.message.includes("404")) {
      errorMessage = "Printer not found. Check the printer in your settings.";
    } else if (err.message.includes("connection failed") || err.message.includes("timeout")) {
      errorMessage = "Cannot reach PrintNode. Check your internet connection.";
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

/**
 * POST /api/printnode/printers
 * List printers available on PrintNode for this shop's API key
 * Merges with custom printer labels stored in the mart
 */
router.post("/printers", authenticate, async (req, res) => {
  try {
    const martId = req.user.martId;
    const apiKey = await getMartApiKey(martId);

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: "PrintNode API key not configured for this shop.",
        printers: [],
      });
    }

    const printers = await printNodeRequest("GET", "/printers", apiKey);

    // Load custom labels for this mart
    let labels = {};
    if (martId) {
      const mart = await martRepository.findById(martId, {
        select: { printerLabels: true },
      });
      if (mart?.printerLabels && typeof mart.printerLabels === "object" && !Array.isArray(mart.printerLabels)) {
        labels = mart.printerLabels;
      }
    }

    // Merge: apply custom labels to printer names
    const merged = Array.isArray(printers)
      ? printers.map((p) => ({
          ...p,
          name: labels[String(p.id)] || p.name,
          originalName: p.name,
          customLabel: labels[String(p.id)] || null,
        }))
      : [];

    res.json({ success: true, printers: merged });
  } catch (err) {
    console.error("[printNode] List printers error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
      printers: [],
    });
  }
});

/**
 * GET /api/printnode/health
 * Check if PrintNode is configured and reachable for this shop
 */
router.get("/health", authenticate, async (req, res) => {
  try {
    const martId = req.user.martId;
    const apiKey = await getMartApiKey(martId);

    if (!apiKey) {
      return res.json({
        configured: false,
        reachable: false,
        error: "PrintNode API key not set for this shop",
      });
    }

    // Try to list printers as a health check
    await printNodeRequest("GET", "/printers", apiKey);
    res.json({
      configured: true,
      reachable: true,
      defaultProvider: "printnode",
    });
  } catch (err) {
    res.json({
      configured: true,
      reachable: false,
      error: err.message,
      defaultProvider: "printnode",
    });
  }
});

/**
 * PUT /api/printnode/printer
 * Save the user's selected printer ID and name to their profile
 */
router.put("/printer", authenticate, async (req, res) => {
  try {
    const { printerId, printerName } = req.body;
    const userId = req.user.id;

    if (!printerId || typeof printerId !== "number") {
      return res.status(400).json({
        success: false,
        error: "printerId must be a number",
      });
    }

    const updateData = { printNodeId: printerId };
    if (printerName !== undefined) {
      updateData.printerName = String(printerName).trim() || null;
    }

    const updated = await userRepository.update(userId, updateData);

    res.json({
      success: true,
      message: "Printer saved",
      printNodeId: updated.printNodeId,
      printerName: updated.printerName,
    });
  } catch (err) {
    console.error("[printNode] Save printer error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/printnode/printer
 * Get the user's saved printer ID and name
 */
router.get("/printer", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userRepository.findById(userId, {
      select: { printNodeId: true, printerName: true },
    });

    res.json({
      success: true,
      printNodeId: user?.printNodeId || null,
      printerName: user?.printerName || null,
    });
  } catch (err) {
    console.error("[printNode] Get printer error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/printnode/mart-printers
 * Get all printer assignments for this mart (owner/manager view)
 * Shows which user is assigned to which printer
 */
router.get("/mart-printers", authenticate, async (req, res) => {
  try {
    const martId = req.user.martId;
    const role = req.user.role;

    // Only owner, manager, systemAdmin can view all assignments
    if (!["owner", "manager", "systemAdmin"].includes(role)) {
      // Regular users can only see their own
      const user = await userRepository.findById(req.user.id, {
        select: { id: true, name: true, username: true, role: true, printNodeId: true, printerName: true },
      });
      return res.json({ success: true, assignments: user ? [user] : [] });
    }

    if (!martId) {
      return res.status(400).json({
        success: false,
        error: "User is not assigned to a shop",
      });
    }

    // Get all users in this mart with their printer info
    const users = await userRepository.findMany(
      { martId, isDeleted: false },
      {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          printNodeId: true,
          printerName: true,
        },
        orderBy: { name: "asc" },
      }
    );

    res.json({ success: true, assignments: users });
  } catch (err) {
    console.error("[printNode] Get mart printers error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * PUT /api/printnode/mart-printers/:userId
 * Owner/manager can update any user's printer assignment and name
 */
router.put("/mart-printers/:userId", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    const targetUserId = req.params.userId;

    // Only owner, manager, systemAdmin can update others
    if (!["owner", "manager", "systemAdmin"].includes(role)) {
      return res.status(403).json({
        success: false,
        error: "Only owner or manager can reassign printers",
      });
    }

    const { printerId, printerName } = req.body;

    if (!printerId || typeof printerId !== "number") {
      return res.status(400).json({
        success: false,
        error: "printerId must be a number",
      });
    }

    const updateData = { printNodeId: printerId };
    if (printerName !== undefined) {
      updateData.printerName = String(printerName).trim() || null;
    }

    const updated = await userRepository.update(targetUserId, updateData);

    res.json({
      success: true,
      message: "Printer assignment updated",
      userId: updated.id,
      printNodeId: updated.printNodeId,
      printerName: updated.printerName,
    });
  } catch (err) {
    console.error("[printNode] Update mart printer error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * PUT /api/printnode/api-key
 * Save or update the shop's PrintNode API key (owner only)
 * Prevents the same API key from being used by multiple shops
 */
router.put("/api-key", authenticate, async (req, res) => {
  try {
    // Only owner or system admin can set API key
    if (req.user.role !== "owner" && req.user.role !== "systemAdmin") {
      return res.status(403).json({
        success: false,
        error: "Only the shop owner can set the PrintNode API key",
      });
    }

    const { apiKey } = req.body;
    const martId = req.user.martId;

    if (!martId) {
      return res.status(400).json({
        success: false,
        error: "User is not assigned to a shop",
      });
    }

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(400).json({
        success: false,
        error: "apiKey must be a string",
      });
    }

    // Validate the API key by testing it against PrintNode
    try {
      await printNodeRequest("GET", "/printers", apiKey);
    } catch (e) {
      return res.status(400).json({
        success: false,
        error: `Invalid PrintNode API key: ${e.message}`,
      });
    }

    // Check if this API key is already used by ANOTHER shop
    const existingMart = await martRepository.findOne(
      { printNodeApiKey: apiKey, isDeleted: false },
      { select: { id: true, martName: true } }
    );
    if (existingMart && existingMart.id !== martId) {
      return res.status(400).json({
        success: false,
        error: `This API key is already used by shop "${existingMart.martName}". Each shop must use its own PrintNode account.`,
      });
    }

    await martRepository.update(martId, {
      printNodeApiKey: apiKey,
    });

    res.json({
      success: true,
      message: "PrintNode API key saved and verified",
    });
  } catch (err) {
    console.error("[printNode] Save API key error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/printnode/printer-labels
 * Get custom printer labels for this mart (shared across all staff)
 */
router.get("/printer-labels", authenticate, async (req, res) => {
  try {
    const martId = req.user.martId;
    if (!martId) {
      return res.json({ success: true, labels: {} });
    }

    const mart = await martRepository.findById(martId, {
      select: { printerLabels: true },
    });

    res.json({
      success: true,
      labels: mart?.printerLabels || {},
    });
  } catch (err) {
    console.error("[printNode] Get printer labels error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/printnode/printer-labels
 * Save a custom label for a specific printer (owner/manager only)
 * Body: { printerId: number, label: string }
 * All staff in the mart will see this label instead of the PrintNode default name
 */
router.put("/printer-labels", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    const martId = req.user.martId;

    if (!["owner", "manager", "systemAdmin"].includes(role)) {
      return res.status(403).json({
        success: false,
        error: "Only owner or manager can rename printers",
      });
    }

    if (!martId) {
      return res.status(400).json({
        success: false,
        error: "User is not assigned to a shop",
      });
    }

    const { printerId, label } = req.body;

    if (!printerId || typeof printerId !== "number") {
      return res.status(400).json({
        success: false,
        error: "printerId must be a number",
      });
    }

    const trimmedLabel = typeof label === "string" ? label.trim() : "";

    // Get current labels
    const mart = await martRepository.findById(martId, {
      select: { printerLabels: true },
    });
    const currentLabels = (mart?.printerLabels && typeof mart.printerLabels === "object" && !Array.isArray(mart.printerLabels))
      ? mart.printerLabels
      : {};

    // Update the label
    const updatedLabels = { ...currentLabels };
    if (trimmedLabel) {
      updatedLabels[String(printerId)] = trimmedLabel;
    } else {
      delete updatedLabels[String(printerId)];
    }

    await martRepository.update(martId, {
      printerLabels: updatedLabels,
    });

    res.json({
      success: true,
      message: "Printer label saved",
      labels: updatedLabels,
    });
  } catch (err) {
    console.error("[printNode] Save printer label error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

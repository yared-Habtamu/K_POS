/**
 * PrintNode API Proxy Route
 *
 * Proxies print requests to PrintNode Cloud API.
 * Keeps the API key secret on the backend.
 *
 * POST /api/printnode/print
 * Body: { printerId: number, commands: string[], contentType?: string }
 *
 * POST /api/printnode/printers
 * Body: none (returns list of printers from PrintNode)
 */

const express = require("express");
const https = require("https");
const router = express.Router();

const PRINTNODE_API_KEY = process.env.PRINTNODE_API_KEY || "";

/**
 * Helper: Make a request to PrintNode API
 */
function printNodeRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    if (!PRINTNODE_API_KEY) {
      return reject(new Error("PRINTNODE_API_KEY not configured"));
    }

    const auth = Buffer.from(`${PRINTNODE_API_KEY}:`).toString("base64");

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
 * POST /api/printnode/print
 * Send a print job to PrintNode
 */
router.post("/print", async (req, res) => {
  try {
    const { printerId, commands, contentType } = req.body;

    if (!printerId) {
      return res.status(400).json({
        success: false,
        error: "Missing printerId. Set the PrintNode printer ID in settings.",
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
      printerId: printerId,
      title: "Kiya POS Receipt",
      contentType: contentType || "raw_base64",
      content: content,
      source: "Kiya POS",
    };

    const result = await printNodeRequest("POST", "/printjobs", printJob);

    res.json({
      success: true,
      message: "Print job sent to PrintNode",
      jobId: result,
    });
  } catch (err) {
    console.error("[printNode] Print error:", err.message);

    // Provide helpful error messages
    let errorMessage = err.message;
    if (err.message.includes("not configured")) {
      errorMessage = "PrintNode API key not configured. Set PRINTNODE_API_KEY in .env";
    } else if (err.message.includes("401") || err.message.includes("Unauthorized")) {
      errorMessage = "Invalid PrintNode API key. Check your PRINTNODE_API_KEY.";
    } else if (err.message.includes("404")) {
      errorMessage = "Printer not found. Check the PrintNode printer ID in settings.";
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
 * List printers available on PrintNode
 */
router.post("/printers", async (req, res) => {
  try {
    const printers = await printNodeRequest("GET", "/printers");
    res.json({ success: true, printers });
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
 * Check if PrintNode is configured and reachable
 */
router.get("/health", async (req, res) => {
  try {
    if (!PRINTNODE_API_KEY) {
      return res.json({
        configured: false,
        reachable: false,
        error: "PRINTNODE_API_KEY not set",
      });
    }

    // Try to list printers as a health check
    await printNodeRequest("GET", "/printers");
    res.json({
      configured: true,
      reachable: true,
      defaultProvider: process.env.DEFAULT_PRINTER_PROVIDER || "local",
    });
  } catch (err) {
    res.json({
      configured: !!PRINTNODE_API_KEY,
      reachable: false,
      error: err.message,
      defaultProvider: process.env.DEFAULT_PRINTER_PROVIDER || "local",
    });
  }
});

module.exports = router;

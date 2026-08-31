/**
 * QZ Tray 2.0.3 request signing endpoint.
 *
 * How QZ Tray 2.0.3 verifies a signature (from Certificate.java source):
 *
 *   String hash = DigestUtils.sha256Hex(data);           // SHA-256 the raw JSON payload
 *   tool.verifyWithKey(getBytesUtf8(hash), decode(sig))  // raw RSA verify
 *
 * Important: the browser-side QZ library already calls _qz.tools.hash(_qz.tools.stringify(signObj));
 * and passes that HEX string to setSignaturePromise(). That means the server receives the
 * already-hashed payload and must sign it directly with raw RSA — not SHA-256 it again.
 *
 * So we must:
 *   1. Treat req.body as the precomputed SHA-256 hex string (already hashed by QZ)
 *   2. UTF-8 encode that hex string → Buffer
 *   3. Raw RSA PKCS#1 v1.5 private-encrypt the buffer (no digest inside RSA)
 *   4. Return base64
 *
 * Node's crypto.privateEncrypt uses PKCS1 v1.5 padding by default, which matches the
 * SimpleRSA library QZ Tray uses on the Java side.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const express = require("express");

const router = express.Router();

const PRIVATE_KEY_PATH = path.join(__dirname, "..", "..", "certs", "private-key.pem");

let PRIVATE_KEY;
try {
  PRIVATE_KEY = fs.readFileSync(PRIVATE_KEY_PATH, "utf8");
  console.log("[qzSign] Private key loaded from", PRIVATE_KEY_PATH);
} catch (err) {
  console.error(
    "[qzSign] ERROR: Could not read private key at", PRIVATE_KEY_PATH,
    "\n  Run: node scripts/generate-qz-cert.js"
  );
}

/**
 * POST /api/qz-sign
 *
 * Body  : the toSign string QZ Tray passes to setSignaturePromise
 *         (already a SHA-256 hex hash of the JSON call object)
 * Reply : base64 raw-RSA signature that QZ Tray 2.0.3 can verify
 */
router.post("/", express.text({ type: "*/*" }), (req, res) => {
  if (!PRIVATE_KEY) {
    return res.status(503).send("Signing key not available");
  }

  const toSign = req.body;

  if (typeof toSign !== "string" || toSign.length === 0) {
    return res.status(400).send("Empty or missing request body");
  }

  try {
    console.log("[qzSign] toSign received:", JSON.stringify(toSign));

    // QZ already hashed the payload on the browser side and passed us the hex digest.
    // The Java verifier will do sha256Hex(rawJson) and compare it to the RSA-decrypted value,
    // so we must NOT hash this value again here. We must sign the provided digest bytes directly.
    const dataToEncrypt = Buffer.from(toSign, "utf8");
    console.log("[qzSign] dataToEncrypt length:", dataToEncrypt.length);

    // Raw RSA PKCS#1 v1.5 private-encrypt the already-hashed hex string
    const signature = crypto.privateEncrypt(
      { key: PRIVATE_KEY, padding: crypto.constants.RSA_PKCS1_PADDING },
      dataToEncrypt
    );

    const sigB64 = signature.toString("base64");
    console.log("[qzSign] signature length:", sigB64.length, "first 40:", sigB64.substring(0, 40));

    res.setHeader("Content-Type", "text/plain");
    res.send(sigB64);
  } catch (err) {
    console.error("[qzSign] Signing error:", err);
    res.status(500).send("Signing failed");
  }
});

module.exports = router;

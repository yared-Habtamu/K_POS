/* QZ Tray bridge integration helper.
   Connects to the QZ Tray desktop app running locally via websocket
   and provides silent printing capabilities (no browser print dialog).

   Prerequisites:
     1. Install QZ Tray desktop app from https://qz.io/download/
     2. QZ Tray must be running (system tray icon visible)
     3. npm package `qz-tray` must be installed (already in package.json)

   The functions fallback to `window.print()` when QZ is not available.

   Signing:
     The backend serves the certificate at GET /certs/digital-certificate.txt
     and signs QZ requests at POST /api/qz-sign.
     The private key never leaves the server.

   IMPORTANT — why we pre-fetch the cert:
     QZ Tray's handshake runs synchronously against whatever the
     setCertificatePromise callback returns. If the callback fires an
     async fetch that hasn't resolved yet when QZ checks, it sees
     "no certificate" and falls back to anonymous mode. We therefore
     fetch the cert text BEFORE calling qz.websocket.connect() so the
     callback can resolve it instantly from memory.
*/

import qz from "qz-tray";

/* ------------------------------------------------------------------ */
/*  QZ Tray untyped API shim                                           */
/* ------------------------------------------------------------------ */

// qz-tray has no official TS types; use a typed wrapper to avoid any/ts-nocheck
interface QzSecurity {
  setCertificatePromise(fn: (resolve: (cert: string) => void, reject: (err: unknown) => void) => void): void;
  setSignatureAlgorithm(algorithm: string): void;
  setSignaturePromise(fn: (toSign: string) => (resolve: (sig: string) => void, reject: (err: unknown) => void) => void): void;
}

interface QzWebsocket {
  isActive(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

interface QzPrinters {
  find(): Promise<string | string[]>;
}

interface QzConfigs {
  create(printer: string | null, options?: Record<string, unknown>): unknown;
}

interface QzInstance {
  security: QzSecurity;
  websocket: QzWebsocket;
  printers: QzPrinters;
  configs: QzConfigs;
  print(cfg: unknown, data: unknown[]): Promise<void>;
}

const qzTyped = qz as unknown as QzInstance;

/* ------------------------------------------------------------------ */
/*  Cert pre-fetch cache                                               */
/* ------------------------------------------------------------------ */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

let cachedCert: string | null = null;
let certFetchPromise: Promise<string> | null = null;

async function fetchCert(): Promise<string> {
  if (cachedCert) return cachedCert;
  if (!certFetchPromise) {
    certFetchPromise = fetch(`${API_BASE}/certs/digital-certificate.txt`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch QZ cert: ${r.status}`);
        return r.text();
      })
      .then((text) => {
        cachedCert = text.trim();
        console.info("[qzBridge] Certificate cached ✓");
        return cachedCert;
      })
      .catch((err: unknown) => {
        certFetchPromise = null;
        throw err;
      });
  }
  return certFetchPromise;
}

// Kick off the fetch immediately on module load
fetchCert().catch((err: unknown) =>
  console.warn("[qzBridge] background cert prefetch failed:", err)
);

/* ------------------------------------------------------------------ */
/*  Security configuration                                             */
/* ------------------------------------------------------------------ */

let securityConfigured = false;

function configureSecurity() {
  if (securityConfigured) return;

  qzTyped.security.setCertificatePromise((resolve, reject) => {
    if (cachedCert) {
      resolve(cachedCert);
    } else {
      fetchCert().then(resolve).catch(reject);
    }
  });

  // QZ Tray defaults to SHA1, but our Java validation checks SHA256 of the signed JSON payload.
  // Without this explicit setting, the signature is rejected and QZ falls back to "UNSIGNED REQUEST".
  qzTyped.security.setSignatureAlgorithm("SHA256");

  qzTyped.security.setSignaturePromise((toSign: string) => {
    return (resolve, reject) => {
      fetch(`${API_BASE}/api/qz-sign`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: toSign,
      })
        .then((r) => {
          if (!r.ok) throw new Error(`QZ sign request failed: ${r.status}`);
          return r.text();
        })
        .then(resolve)
        .catch(reject);
    };
  });

  securityConfigured = true;
  console.info("[qzBridge] Security configured — cert & SHA256 signing via backend");
}

configureSecurity();

// Disconnect any stale connection from a previous page load so the next
// connect() goes through the full cert handshake with fresh security handlers.
try {
  if (qzTyped.websocket.isActive()) {
    qzTyped.websocket.disconnect().catch(() => {
      // ignore disconnect errors on stale connections
    });
  }
} catch {
  // isActive() may throw if QZ Tray was never connected
}

/* ------------------------------------------------------------------ */
/*  Connection                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_CONFIG = {
  retries: 3,
  retryDelay: 800,
};

export async function connect(
  options: { retries?: number; retryDelay?: number } = {}
): Promise<boolean> {
  const cfg = { ...DEFAULT_CONFIG, ...options };

  configureSecurity();

  // Ensure cert is in memory before opening the websocket
  try {
    await fetchCert();
  } catch (err: unknown) {
    console.warn("[qzBridge] cert not available, proceeding anyway:", err);
  }

  try {
    if (qzTyped.websocket.isActive()) return true;
  } catch {
    // not yet connected — continue
  }

  for (let attempt = 0; attempt <= cfg.retries; attempt++) {
    try {
      if (qzTyped.websocket.isActive()) return true;
      await qzTyped.websocket.connect();
      if (qzTyped.websocket.isActive()) {
        console.info("[qzBridge] connected to QZ Tray ✓");
        return true;
      }
    } catch (err: unknown) {
      const msg = String(err instanceof Error ? err.message : err);
      if (msg.includes("Already active")) return true;

      console.warn(
        `[qzBridge] connect attempt ${attempt + 1}/${cfg.retries + 1} failed:`,
        msg
      );

      if (attempt < cfg.retries) {
        await new Promise((r) => setTimeout(r, cfg.retryDelay));
      }
    }
  }

  console.warn("[qzBridge] could not connect to QZ Tray after retries");
  return false;
}

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

export function isAvailable(): boolean {
  try {
    return qzTyped.websocket.isActive();
  } catch {
    return false;
  }
}

export async function listPrinters(): Promise<string[]> {
  const connected = await connect();
  if (!connected) {
    throw new Error(
      "Could not connect to QZ Tray. Make sure QZ Tray is installed and running."
    );
  }
  const result = await qzTyped.printers.find();
  console.info("[qzBridge] printers found:", result);
  if (typeof result === "string") return [result];
  if (Array.isArray(result)) return result;
  return [];
}

/* ------------------------------------------------------------------ */
/*  Print: HTML content                                                */
/* ------------------------------------------------------------------ */

export async function printHtml(
  html: string,
  options: {
    printer?: string;
    margins?: { top?: number; right?: number; bottom?: number; left?: number };
    scaleContent?: boolean;
  } = {}
): Promise<void> {
  const connected = await connect();
  if (connected && qzTyped.websocket.isActive()) {
    const configOpts: Record<string, unknown> = {
      colorType: "color",
      scaleContent: options.scaleContent ?? false,
      rasterize: true,
      margins: options.margins ?? 0,
      units: "mm",
      size: { width: 80 },
    };

    const cfg = qzTyped.configs.create(options.printer ?? null, configOpts);

    const data = [
      {
        type: "pixel",
        format: "html",
        flavor: "plain",
        data: html,
        options: { pageWidth: 80 },
      },
    ];

    return qzTyped.print(cfg, data).catch((e: unknown) => {
      console.error("[qzBridge] printHtml error:", e);
      throw e;
    });
  }

  // Fallback: open a hidden window and call print
  try {
    const w = window.open("", "_blank", "toolbar=0,location=0,menubar=0");
    if (!w) { window.print(); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      try {
        w.print();
        w.close();
      } catch {
        // ignore fallback print errors
      }
    }, 300);
  } catch (err: unknown) {
    console.error("[qzBridge] fallback printHtml failed:", err);
    throw err;
  }
}

/* ------------------------------------------------------------------ */
/*  Print: Raw commands (ESC/POS, ZPL, etc.)                          */
/* ------------------------------------------------------------------ */

export async function printRaw(
  commands: string | string[],
  options: { printer?: string } = {}
): Promise<void> {
  const connected = await connect();
  if (connected && qzTyped.websocket.isActive()) {
    const cfg = qzTyped.configs.create(options.printer ?? null);

    const rawArray = Array.isArray(commands) ? commands : [commands];
    const data = rawArray.map((cmd) => ({
      type: "raw",
      format: "command",
      flavor: "plain",
      data: cmd,
    }));

    return qzTyped.print(cfg, data).catch((e: unknown) => {
      console.error("[qzBridge] printRaw error:", e);
      throw e;
    });
  }
  throw new Error("QZ not available for raw printing");
}

/* ------------------------------------------------------------------ */
/*  Print: Image / Canvas (Crisp 203 DPI raster for thermal printers)  */
/* ------------------------------------------------------------------ */

export async function printImage(
  imageBase64OrUrl: string,
  options: {
    printer?: string;
    width?: number;
    density?: number;
  } = {}
): Promise<void> {
  const connected = await connect();
  if (connected && qzTyped.websocket.isActive()) {
    const rawData = imageBase64OrUrl.includes(",")
      ? imageBase64OrUrl.split(",")[1]
      : imageBase64OrUrl;

    const width = options.width ?? 80;
    const configOpts: Record<string, unknown> = {
      colorType: "grayscale",
      scaleContent: true,
      margins: 0,
      units: "mm",
      size: { width },
      density: options.density ?? 203,
    };

    const cfg = qzTyped.configs.create(options.printer ?? null, configOpts);

    const data = [
      {
        type: "pixel",
        format: "image",
        flavor: "base64",
        data: rawData,
      },
    ];

    return qzTyped.print(cfg, data).catch((e: unknown) => {
      console.error("[qzBridge] printImage error:", e);
      throw e;
    });
  }

  throw new Error("QZ not available for image printing");
}

/* ------------------------------------------------------------------ */
/*  Disconnect (optional cleanup)                                      */
/* ------------------------------------------------------------------ */

export async function disconnect(): Promise<void> {
  try {
    if (qzTyped.websocket.isActive()) {
      await qzTyped.websocket.disconnect();
    }
  } catch {
    // ignore disconnect errors
  }
}

export default {
  connect,
  isAvailable,
  listPrinters,
  printHtml,
  printImage,
  printRaw,
  disconnect,
};

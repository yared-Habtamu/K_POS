/**
 * PrintNode Bridge for Kiya POS
 *
 * Sends print jobs to PrintNode via the backend API.
 * The backend proxies requests to PrintNode Cloud API,
 * keeping the API key secret.
 *
 * Architecture:
 *   Frontend → POST /api/printnode/print → Backend → PrintNode API → PrintNode Client → Printer
 *
 * Usage:
 *   import printNodeBridge from "./printNodeBridge";
 *   await printNodeBridge.printRaw(commands, { printerId: 12345 });
 */

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined) ||
  "";

const ENDPOINT = `${API_BASE}/api/printnode`;

/* ------------------------------------------------------------------ */
/*  Health Check                                                        */
/* ------------------------------------------------------------------ */

/**
 * Check if PrintNode is configured and reachable.
 */
export async function isPrintNodeAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${ENDPOINT}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return false;
    const data = await res.json();
    return data.configured && data.reachable;
  } catch {
    return false;
  }
}

export interface PrintNodeHealth {
  configured: boolean;
  reachable: boolean;
  error?: string;
  defaultProvider?: string;
}

/**
 * Get PrintNode health status.
 */
export async function getPrintNodeHealth(): Promise<PrintNodeHealth> {
  try {
    const res = await fetch(`${ENDPOINT}/health`);
    return await res.json();
  } catch {
    return { configured: false, reachable: false, error: "Cannot reach backend" };
  }
}

/* ------------------------------------------------------------------ */
/*  List Printers                                                       */
/* ------------------------------------------------------------------ */

export interface PrintNodePrinter {
  id: number;
  name: string;
  description?: string;
  status?: string;
  caps?: string[];
}

/**
 * List printers available on PrintNode.
 */
export async function listPrinters(): Promise<PrintNodePrinter[]> {
  try {
    const res = await fetch(`${ENDPOINT}/printers`, { method: "POST" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.printers || [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Auto-detect Printer                                                 */
/* ------------------------------------------------------------------ */

/**
 * Auto-detect the first available printer from PrintNode.
 * Returns the printer ID if found, null otherwise.
 */
export async function autoDetectPrinter(): Promise<number | null> {
  try {
    const printers = await listPrinters();
    if (printers.length > 0) {
      // Return the first printer's ID
      return printers[0].id;
    }
    return null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Print                                                               */
/* ------------------------------------------------------------------ */

/**
 * Print raw ESC/POS commands via PrintNode.
 *
 * @param commands - Array of ESC/POS command strings
 * @param options.printerId - PrintNode printer ID (optional, auto-detects if not set)
 */
export async function printRaw(
  commands: string[],
  options: { printerId?: number } = {}
): Promise<void> {
  let { printerId } = options;

  // If no printer ID provided, try to auto-detect
  if (!printerId) {
    try {
      printerId = await autoDetectPrinter() || undefined;
    } catch {
      // Ignore auto-detect errors
    }
  }

  if (!printerId) {
    throw new Error(
      "No PrintNode printer found. Ensure PrintNode Client is running and a printer is connected."
    );
  }

  const res = await fetch(`${ENDPOINT}/print`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      printerId,
      commands,
      contentType: "raw_base64",
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || `PrintNode error: ${res.status}`);
  }
}

/**
 * Print HTML content via PrintNode.
 * Converts HTML to raw text ESC/POS for thermal printers.
 *
 * @param html - HTML string to print
 * @param options.printerId - PrintNode printer ID (required)
 */
export async function printHtml(
  html: string,
  options: { printerId?: number } = {}
): Promise<void> {
  // Convert HTML to plain text for thermal printer
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Build ESC/POS from text
  const lines = text.split("\n");
  const ESC = "\x1B";
  const GS = "\x1D";
  const commands = [`${ESC}@`];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      commands.push("\n");
      continue;
    }
    if (trimmed.length < 30) {
      commands.push(`${ESC}a\x01`); // Center
      commands.push(trimmed + "\n");
      commands.push(`${ESC}a\x00`); // Left
    } else {
      commands.push(trimmed + "\n");
    }
  }

  commands.push(`${ESC}d\x05`); // Feed 5
  commands.push(`${GS}V\x41\x03`); // Cut

  return printRaw(commands, options);
}

/* ------------------------------------------------------------------ */
/*  Default export                                                      */
/* ------------------------------------------------------------------ */

export default {
  isPrintNodeAvailable,
  getPrintNodeHealth,
  listPrinters,
  printRaw,
  printHtml,
};

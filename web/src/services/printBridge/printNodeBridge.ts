/**
 * PrintNode Bridge for Kiya POS (Multi-Tenant)
 *
 * Sends print jobs to PrintNode via the backend API.
 * The backend proxies requests to PrintNode Cloud API per-shop,
 * keeping each shop's API key secret.
 *
 * Architecture:
 *   Frontend → POST /api/printnode/print → Backend (per-mart API key) → PrintNode API → PrintNode Client → Printer
 *
 * Each user's printer selection is saved in the database (not localStorage).
 */

import { useAuthStore } from "@/stores/authStore";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined) ||
  "";

const ENDPOINT = `${API_BASE}/api/printnode`;

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().user?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/* ------------------------------------------------------------------ */
/*  Health Check                                                        */
/* ------------------------------------------------------------------ */

export async function isPrintNodeAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${ENDPOINT}/health`, {
      method: "GET",
      headers: getAuthHeaders(),
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

export async function getPrintNodeHealth(): Promise<PrintNodeHealth> {
  try {
    const res = await fetch(`${ENDPOINT}/health`, {
      headers: getAuthHeaders(),
    });
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

export async function listPrinters(): Promise<PrintNodePrinter[]> {
  try {
    const res = await fetch(`${ENDPOINT}/printers`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.printers || [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  User Printer (saved in DB per user)                                 */
/* ------------------------------------------------------------------ */

/**
 * Get the current user's saved printer ID and name from the database.
 */
export async function getUserPrinter(): Promise<{ printNodeId: number | null; printerName: string | null }> {
  try {
    const res = await fetch(`${ENDPOINT}/printer`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { printNodeId: null, printerName: null };
    const data = await res.json();
    const id = typeof data.printNodeId === "number" ? data.printNodeId : null;
    const name = typeof data.printerName === "string" ? data.printerName : null;
    return { printNodeId: id, printerName: name };
  } catch {
    return { printNodeId: null, printerName: null };
  }
}

/**
 * Save the current user's printer ID and optional name to the database.
 */
export async function saveUserPrinter(printerId: number, printerName?: string): Promise<boolean> {
  try {
    const res = await fetch(`${ENDPOINT}/printer`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ printerId, printerName }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Mart Printers (owner/manager view)                                  */
/* ------------------------------------------------------------------ */

export interface MartPrinterAssignment {
  id: string;
  name: string;
  username: string;
  role: string;
  printNodeId: number | null;
  printerName: string | null;
}

/**
 * Get all printer assignments for the current mart (owner/manager view).
 */
export async function getMartPrinterAssignments(): Promise<MartPrinterAssignment[]> {
  try {
    const res = await fetch(`${ENDPOINT}/mart-printers`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.assignments || [];
  } catch {
    return [];
  }
}

/**
 * Update a specific user's printer assignment (owner/manager).
 */
export async function updateMartPrinter(
  userId: string,
  printerId: number,
  printerName?: string
): Promise<boolean> {
  try {
    const res = await fetch(`${ENDPOINT}/mart-printers/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ printerId, printerName }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Mart Printer Labels (shared across all staff in a mart)            */
/* ------------------------------------------------------------------ */

/**
 * Get custom printer labels for the current mart.
 * Returns a map like { "75787817": "Front Desk Printer" }
 */
export async function getPrinterLabels(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${ENDPOINT}/printer-labels`, {
      method: "GET",
      headers: getAuthHeaders(),
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.labels && typeof data.labels === "object" ? data.labels : {};
  } catch {
    return {};
  }
}

/**
 * Save a custom label for a specific printer (owner/manager only).
 * This label is visible to ALL staff in the mart.
 */
export async function savePrinterLabel(printerId: number, label: string): Promise<boolean> {
  try {
    const res = await fetch(`${ENDPOINT}/printer-labels`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ printerId, label }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Auto-detect Printer                                                 */
/* ------------------------------------------------------------------ */

export async function autoDetectPrinter(): Promise<number | null> {
  try {
    const printers = await listPrinters();
    if (printers.length > 0) {
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
 * Uses the user's saved printer from DB if no printerId is provided.
 */
export async function printRaw(
  commands: string[],
  options: { printerId?: number } = {}
): Promise<void> {
  let { printerId } = options;

  // If no printer ID provided, try user's saved printer from DB
  if (!printerId) {
    try {
      const saved = await getUserPrinter();
      printerId = saved.printNodeId || undefined;
    } catch {
      // Ignore errors
    }
  }

  // If still no printer ID, try auto-detect
  if (!printerId) {
    try {
      printerId = (await autoDetectPrinter()) || undefined;
    } catch {
      // Ignore errors
    }
  }

  if (!printerId) {
    throw new Error(
      "No PrintNode printer found. Select a printer in your settings."
    );
  }

  const res = await fetch(`${ENDPOINT}/print`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
 */
export async function printHtml(
  html: string,
  options: { printerId?: number } = {}
): Promise<void> {
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
      commands.push(`${ESC}a\x01`);
      commands.push(trimmed + "\n");
      commands.push(`${ESC}a\x00`);
    } else {
      commands.push(trimmed + "\n");
    }
  }

  commands.push(`${ESC}d\x05`);
  commands.push(`${GS}V\x41\x03`);

  return printRaw(commands, options);
}

/* ------------------------------------------------------------------ */
/*  Default export                                                      */
/* ------------------------------------------------------------------ */

export default {
  isPrintNodeAvailable,
  getPrintNodeHealth,
  listPrinters,
  getUserPrinter,
  saveUserPrinter,
  getMartPrinterAssignments,
  updateMartPrinter,
  getPrinterLabels,
  savePrinterLabel,
  printRaw,
  printHtml,
};

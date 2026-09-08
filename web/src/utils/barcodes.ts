import JsBarcode from "jsbarcode";
import printNodeBridge from "@/services/printBridge/printNodeBridge";
import { useSettingsStore } from "@/stores/settingsStore";

/** 40mm x 30mm Phomemo label at 203 DPI */
const LABEL_DPI = 203;
const LABEL_WIDTH_MM = 40;
const LABEL_HEIGHT_MM = 30;
const LABEL_WIDTH_DOTS = Math.round((LABEL_WIDTH_MM / 25.4) * LABEL_DPI);  // ~320
const LABEL_HEIGHT_DOTS = Math.round((LABEL_HEIGHT_MM / 25.4) * LABEL_DPI); // ~240
const LABEL_WIDTH_BYTES = Math.ceil(LABEL_WIDTH_DOTS / 8); // 40

export async function generateUniqueBarcode(
  findExisting: (code: string) => Promise<unknown | null>,
) {
  const candidate = () => `${Date.now()}`.slice(-12);

  for (let index = 0; index < 6; index += 1) {
    const code =
      index === 0
        ? candidate()
        : `${candidate()}${Math.floor(Math.random() * 10)}`.slice(0, 12);
    const existing = await findExisting(code);
    if (!existing) return code;
  }

  return String(Math.floor(Math.random() * 1e12)).padStart(12, "0");
}

/**
 * Generate a barcode data URL sized for 40x30mm Phomemo labels.
 */
export function generateBarcodeDataUrl(barcode: string): string {
  if (!barcode) return "";
  const canvas = document.createElement("canvas");
  try {
    JsBarcode(canvas, barcode, {
      format: "CODE128",
      width: 1.5,
      height: 50,
      displayValue: true,
      fontSize: 10,
      margin: 4,
      background: "#ffffff",
      lineColor: "#000000",
    });
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

/**
 * Convert a canvas to ESC/POS raster bitmap commands (GS v 0).
 * Phomemo labels are 320 dots wide (40mm @ 203 DPI).
 * Bitmap is monochrome: 1=black, 0=white.
 */
function canvasToEscPosBitmap(canvas: HTMLCanvasElement): string[] {
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  // Scale canvas to fit label width
  const scaledCanvas = document.createElement("canvas");
  const targetWidth = LABEL_WIDTH_DOTS;
  const scale = targetWidth / canvas.width;
  const targetHeight = Math.round(canvas.height * scale);
  scaledCanvas.width = targetWidth;
  scaledCanvas.height = targetHeight;
  const sctx = scaledCanvas.getContext("2d");
  if (!sctx) return [];
  sctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  const imageData = sctx.getImageData(0, 0, targetWidth, targetHeight);
  const pixels = imageData.data; // RGBA

  // Convert to monochrome bitmap (1 bit per pixel, MSB first)
  const rows: Uint8Array[] = [];
  for (let y = 0; y < targetHeight; y++) {
    const row = new Uint8Array(LABEL_WIDTH_BYTES);
    for (let x = 0; x < targetWidth; x++) {
      const idx = (y * targetWidth + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      // Threshold: dark pixels → black
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance < 128) {
        const byteIdx = Math.floor(x / 8);
        const bitIdx = 7 - (x % 8);
        row[byteIdx] |= (1 << bitIdx);
      }
    }
    rows.push(row);
  }

  // Build ESC/POS GS v 0 commands
  // Split into chunks (some printers have buffer limits)
  const MAX_DOTS_PER_CMD = 240; // safe height per command
  const commands: string[] = [];
  const ESC = "\x1B";
  const GS = "\x1D";

  for (let startRow = 0; startRow < rows.length; startRow += MAX_DOTS_PER_CMD) {
    const endRow = Math.min(startRow + MAX_DOTS_PER_CMD, rows.length);
    const height = endRow - startRow;

    // GS v 0 m xL xH yL yH d1...dk
    const m = 0; // normal
    const xL = LABEL_WIDTH_BYTES & 0xff;
    const xH = (LABEL_WIDTH_BYTES >> 8) & 0xff;
    const yL = height & 0xff;
    const yH = (height >> 8) & 0xff;

    let cmd = `${GS}v0`;
    cmd += String.fromCharCode(m);
    cmd += String.fromCharCode(xL);
    cmd += String.fromCharCode(xH);
    cmd += String.fromCharCode(yL);
    cmd += String.fromCharCode(yH);

    for (let y = startRow; y < endRow; y++) {
      for (let byteIdx = 0; byteIdx < LABEL_WIDTH_BYTES; byteIdx++) {
        cmd += String.fromCharCode(rows[y][byteIdx]);
      }
    }
    commands.push(cmd);
  }

  return commands;
}

/**
 * Build ESC/POS commands for a single 40x30mm barcode label.
 * Uses GS v 0 for the barcode bitmap + centered text below.
 */
function buildBarcodeLabelEscPos(params: {
  barcodeCanvas: HTMLCanvasElement;
  productName?: string;
  price?: string | number;
  shopName?: string;
}): string[] {
  const { barcodeCanvas, productName, price, shopName } = params;
  const ESC = "\x1B";
  const GS = "\x1D";

  const cmds: string[] = [];

  // Initialize
  cmds.push(`${ESC}@`);

  // Center align
  cmds.push(`${ESC}a\x01`);

  // Print barcode bitmap (scaled to fit label width)
  const bitmapCmds = canvasToEscPosBitmap(barcodeCanvas);
  cmds.push(...bitmapCmds);

  // Small gap between barcode and text
  cmds.push(`${ESC}d\x02`);

  // Shop name (small, centered, bold)
  if (shopName) {
    cmds.push(`${ESC}E\x01`); // Bold on
    cmds.push(`${GS}!\x00`);  // Normal size
    cmds.push(`${shopName}\n`);
    cmds.push(`${ESC}E\x00`); // Bold off
  }

  // Product name (centered, normal)
  if (productName) {
    cmds.push(`${GS}!\x00`); // Normal size
    // Truncate long names to fit 40mm (~20 chars at standard font)
    const maxChars = 20;
    const name = productName.length > maxChars
      ? productName.slice(0, maxChars - 1) + "\u2026"
      : productName;
    cmds.push(`${name}\n`);
  }

  // Price (centered, bold)
  if (price != null) {
    const parsedPrice = typeof price === "number" ? price : Number(String(price).trim());
    if (Number.isFinite(parsedPrice)) {
      cmds.push(`${ESC}E\x01`); // Bold on
      cmds.push(`${GS}!\x10`);  // Double height
      cmds.push(`${parsedPrice.toFixed(2)} ETB\n`);
      cmds.push(`${GS}!\x00`);  // Normal size
      cmds.push(`${ESC}E\x00`); // Bold off
    }
  }

  // Feed and cut
  cmds.push(`${ESC}d\x05`);
  cmds.push(`${GS}V\x41\x03`);

  return cmds;
}

/**
 * Generate a barcode canvas for the given code.
 */
function generateBarcodeCanvas(barcode: string): HTMLCanvasElement | null {
  if (!barcode) return null;
  const canvas = document.createElement("canvas");
  try {
    JsBarcode(canvas, barcode, {
      format: "CODE128",
      width: 1.5,
      height: 50,
      displayValue: true,
      fontSize: 10,
      margin: 4,
      background: "#ffffff",
      lineColor: "#000000",
    });
    return canvas;
  } catch {
    return null;
  }
}

/**
 * Print a barcode label via PrintNode using ESC/POS bitmap commands.
 * This sends the actual barcode image to the printer.
 */
async function printViaPrintNode(params: {
  barcode: string;
  productName?: string;
  price?: string | number;
  shopName?: string;
  quantity: number;
}): Promise<boolean> {
  const { barcode, productName, price, shopName, quantity } = params;

  const canvas = generateBarcodeCanvas(barcode);
  if (!canvas) return false;

  const settings = useSettingsStore.getState();
  const printerId = settings.printNodeId || undefined;

  // Build ESC/POS commands for the label
  const labelCmds = buildBarcodeLabelEscPos({
    barcodeCanvas: canvas,
    productName,
    price,
    shopName,
  });

  // Repeat for quantity
  const allCmds: string[] = [];
  for (let i = 0; i < quantity; i++) {
    allCmds.push(...labelCmds);
  }

  try {
    await printNodeBridge.printRaw(allCmds, { printerId });
    return true;
  } catch (e) {
    console.warn("PrintNode barcode print failed:", e);
    return false;
  }
}

/**
 * Print barcode label(s) via browser print dialog.
 * Uses an iframe with proper 40x30mm CSS for Phomemo transparent labels.
 */
function printViaBrowser(params: {
  barcode: string;
  productName?: string;
  price?: string | number;
  shopName?: string;
  quantity: number;
  dataUrl: string;
}) {
  const { barcode, productName, price, shopName, quantity, dataUrl } = params;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-10000px";
  iframe.style.left = "-10000px";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    return;
  }

  const safeShopName = String(shopName || "").trim();
  const safeProductName = String(productName || "").trim();
  const parsedPrice = typeof price === "number" ? price : Number(String(price || "").trim());
  const showPrice = Number.isFinite(parsedPrice);
  const priceLabel = showPrice ? `${parsedPrice.toFixed(2)} ETB` : "";

  // Build labels HTML repeated `quantity` times
  let labelsHtml = "";
  for (let i = 0; i < quantity; i++) {
    labelsHtml += `
      <div class="label">
        ${safeShopName ? `<div class="shop">${safeShopName}</div>` : ""}
        <img src="${dataUrl}" alt="Barcode" />
        <div class="meta">
          ${safeProductName ? `<div class="product">${safeProductName}</div>` : ""}
          ${showPrice ? `<div class="price">${priceLabel}</div>` : ""}
        </div>
      </div>
    `;
  }

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Barcode Labels</title>
        <style>
          @page {
            size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm;
            margin: 0;
          }
          @media print {
            body { margin: 0; padding: 0; }
            .label {
              page-break-after: always;
              page-break-inside: avoid;
            }
            .label:last-child {
              page-break-after: auto;
            }
          }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            background: transparent;
          }
          .label {
            width: ${LABEL_WIDTH_MM}mm;
            height: ${LABEL_HEIGHT_MM}mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1mm 1.5mm;
            overflow: hidden;
            background: transparent;
          }
          .shop {
            font-size: 6pt;
            font-weight: 700;
            text-align: center;
            line-height: 1.1;
            max-height: 3mm;
            overflow: hidden;
          }
          img {
            max-width: ${LABEL_WIDTH_MM - 4}mm;
            max-height: 16mm;
            display: block;
            margin: 0.5mm auto;
          }
          .meta {
            text-align: center;
            line-height: 1.2;
          }
          .product {
            font-size: 5.5pt;
            font-weight: 600;
            max-height: 4mm;
            overflow: hidden;
            word-break: break-word;
          }
          .price {
            font-size: 7pt;
            font-weight: 700;
            margin-top: 0.3mm;
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
      </body>
    </html>
  `);
  iframeDoc.close();

  // Wait for images to load, then print
  const imgs = iframeDoc.querySelectorAll("img");
  let loaded = 0;
  const total = imgs.length;
  const onAllLoaded = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error("Browser barcode print failed:", e);
      }
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch (_) {}
      }, 2000);
    }, 200);
  };

  if (total === 0) {
    onAllLoaded();
  } else {
    imgs.forEach((img) => {
      if ((img as HTMLImageElement).complete) {
        loaded++;
        if (loaded >= total) onAllLoaded();
      } else {
        img.onload = () => {
          loaded++;
          if (loaded >= total) onAllLoaded();
        };
        img.onerror = () => {
          loaded++;
          if (loaded >= total) onAllLoaded();
        };
      }
    });
  }
}

/**
 * Print barcode label(s). Tries PrintNode first (ESC/POS bitmap), falls back to browser print.
 * Supports batch printing via the `quantity` parameter.
 */
export async function printBarcodeLabel(params: {
  barcode: string;
  productName?: string;
  price?: string | number;
  shopName?: string;
  quantity?: number;
}) {
  const { barcode, productName, price, shopName, quantity = 1 } = params;
  if (!barcode) return;

  // Try PrintNode first (sends actual barcode image via ESC/POS bitmap)
  const printnodeOk = await printViaPrintNode({
    barcode, productName, price, shopName, quantity,
  });
  if (printnodeOk) return;

  // Fallback: browser print with 40x30mm CSS labels
  const dataUrl = generateBarcodeDataUrl(barcode);
  if (!dataUrl) return;

  printViaBrowser({
    barcode, productName, price, shopName, quantity, dataUrl,
  });
}

import JsBarcode from "jsbarcode";
import printNodeBridge from "@/services/printBridge/printNodeBridge";
import { useSettingsStore } from "@/stores/settingsStore";

/** Physical label: 40x30mm. Printable content area: 30x20mm (centered). */
const LABEL_DPI = 203;
const LABEL_WIDTH_MM = 40;
const LABEL_HEIGHT_MM = 30;
const PRINTABLE_WIDTH_MM = 30;
const PRINTABLE_HEIGHT_MM = 20;
const PRINTABLE_WIDTH_DOTS = Math.round((PRINTABLE_WIDTH_MM / 25.4) * LABEL_DPI);  // ~240
const PRINTABLE_HEIGHT_DOTS = Math.round((PRINTABLE_HEIGHT_MM / 25.4) * LABEL_DPI); // ~160
const PRINTABLE_WIDTH_BYTES = Math.ceil(PRINTABLE_WIDTH_DOTS / 8); // 30

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
 * Generate a barcode data URL sized for 30x20mm printable area.
 * Smaller bar width and height to fit inside the content area.
 */
export function generateBarcodeDataUrl(barcode: string): string {
  if (!barcode) return "";
  const canvas = document.createElement("canvas");
  try {
    JsBarcode(canvas, barcode, {
      format: "CODE128",
      width: 1,
      height: 30,
      displayValue: true,
      fontSize: 7,
      textMargin: 1,
      margin: 2,
      background: "transparent",
      lineColor: "#000000",
    });
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

/**
 * Convert a canvas to ESC/POS raster bitmap commands (GS v 0).
 * Scales to fit the 30x20mm printable area (240 dots wide @ 203 DPI).
 */
function canvasToEscPosBitmap(canvas: HTMLCanvasElement): string[] {
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  // Scale canvas to printable width
  const targetWidth = PRINTABLE_WIDTH_DOTS;
  const scale = targetWidth / canvas.width;
  const targetHeight = Math.min(
    Math.round(canvas.height * scale),
    PRINTABLE_HEIGHT_DOTS
  );

  const scaledCanvas = document.createElement("canvas");
  scaledCanvas.width = targetWidth;
  scaledCanvas.height = targetHeight;
  const sctx = scaledCanvas.getContext("2d");
  if (!sctx) return [];
  sctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

  const imageData = sctx.getImageData(0, 0, targetWidth, targetHeight);
  const pixels = imageData.data;

  // Convert to monochrome bitmap
  const rows: Uint8Array[] = [];
  for (let y = 0; y < targetHeight; y++) {
    const row = new Uint8Array(PRINTABLE_WIDTH_BYTES);
    for (let x = 0; x < targetWidth; x++) {
      const idx = (y * targetWidth + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];
      // For transparent background: only dark, opaque pixels → black
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance < 128 && a > 128) {
        const byteIdx = Math.floor(x / 8);
        const bitIdx = 7 - (x % 8);
        row[byteIdx] |= (1 << bitIdx);
      }
    }
    rows.push(row);
  }

  // Build ESC/POS GS v 0 commands
  const MAX_DOTS_PER_CMD = 160;
  const commands: string[] = [];
  const GS = "\x1D";

  for (let startRow = 0; startRow < rows.length; startRow += MAX_DOTS_PER_CMD) {
    const endRow = Math.min(startRow + MAX_DOTS_PER_CMD, rows.length);
    const height = endRow - startRow;

    const xL = PRINTABLE_WIDTH_BYTES & 0xff;
    const xH = (PRINTABLE_WIDTH_BYTES >> 8) & 0xff;
    const yL = height & 0xff;
    const yH = (height >> 8) & 0xff;

    let cmd = `${GS}v0`;
    cmd += String.fromCharCode(0); // m=0 normal
    cmd += String.fromCharCode(xL);
    cmd += String.fromCharCode(xH);
    cmd += String.fromCharCode(yL);
    cmd += String.fromCharCode(yH);

    for (let y = startRow; y < endRow; y++) {
      for (let byteIdx = 0; byteIdx < PRINTABLE_WIDTH_BYTES; byteIdx++) {
        cmd += String.fromCharCode(rows[y][byteIdx]);
      }
    }
    commands.push(cmd);
  }

  return commands;
}

/**
 * Build ESC/POS commands for a single barcode label.
 * Content fits in 30x20mm printable area.
 * Barcode bitmap + shop name + product name + price, all centered and small.
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

  // Print barcode bitmap (scaled to 30mm width)
  const bitmapCmds = canvasToEscPosBitmap(barcodeCanvas);
  cmds.push(...bitmapCmds);

  // Tiny gap
  cmds.push(`${ESC}d\x01`);

  // Shop name (small, centered, bold)
  if (shopName) {
    cmds.push(`${ESC}E\x01`); // Bold on
    cmds.push(`${GS}!\x00`);  // Normal size
    const maxChars = 16;
    const name = shopName.length > maxChars
      ? shopName.slice(0, maxChars - 1) + "\u2026"
      : shopName;
    cmds.push(`${name}\n`);
    cmds.push(`${ESC}E\x00`); // Bold off
  }

  // Product name (centered, normal, tiny)
  if (productName) {
    cmds.push(`${GS}!\x00`); // Normal size
    const maxChars = 18;
    const name = productName.length > maxChars
      ? productName.slice(0, maxChars - 1) + "\u2026"
      : productName;
    cmds.push(`${name}\n`);
  }

  // Price (centered, bold, normal size — not double height)
  if (price != null) {
    const parsedPrice = typeof price === "number" ? price : Number(String(price).trim());
    if (Number.isFinite(parsedPrice)) {
      cmds.push(`${ESC}E\x01`); // Bold on
      cmds.push(`${GS}!\x00`);  // Normal size (small)
      cmds.push(`${parsedPrice.toFixed(2)} ETB\n`);
      cmds.push(`${ESC}E\x00`); // Bold off
    }
  }

  // Feed and cut
  cmds.push(`${ESC}d\x03`);
  cmds.push(`${GS}V\x41\x03`);

  return cmds;
}

/**
 * Generate a barcode canvas for the given code.
 * Small size to fit 30x20mm printable area.
 */
function generateBarcodeCanvas(barcode: string): HTMLCanvasElement | null {
  if (!barcode) return null;
  const canvas = document.createElement("canvas");
  try {
    JsBarcode(canvas, barcode, {
      format: "CODE128",
      width: 1,
      height: 30,
      displayValue: true,
      fontSize: 7,
      textMargin: 1,
      margin: 2,
      background: "transparent",
      lineColor: "#000000",
    });
    return canvas;
  } catch {
    return null;
  }
}

/**
 * Print via PrintNode using ESC/POS bitmap commands.
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

  const labelCmds = buildBarcodeLabelEscPos({
    barcodeCanvas: canvas,
    productName,
    price,
    shopName,
  });

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
 * Print via browser print dialog.
 * 40x30mm physical label, 30x20mm centered content area.
 */
function printViaBrowser(params: {
  barcode: string;
  productName?: string;
  price?: string | number;
  shopName?: string;
  quantity: number;
  dataUrl: string;
}) {
  const { productName, price, shopName, quantity, dataUrl } = params;

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

  // Margins: (40-30)/2 = 5mm horizontal, (30-20)/2 = 5mm vertical
  const marginH = (LABEL_WIDTH_MM - PRINTABLE_WIDTH_MM) / 2;
  const marginV = (LABEL_HEIGHT_MM - PRINTABLE_HEIGHT_MM) / 2;

  let labelsHtml = "";
  for (let i = 0; i < quantity; i++) {
    labelsHtml += `
      <div class="label">
        <div class="content">
          ${safeShopName ? `<div class="shop">${safeShopName}</div>` : ""}
          <img src="${dataUrl}" alt="Barcode" />
          <div class="meta">
            ${safeProductName ? `<div class="product">${safeProductName}</div>` : ""}
            ${showPrice ? `<div class="price">${priceLabel}</div>` : ""}
          </div>
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
            align-items: center;
            justify-content: center;
            background: transparent;
          }
          .content {
            width: ${PRINTABLE_WIDTH_MM}mm;
            height: ${PRINTABLE_HEIGHT_MM}mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 0.5mm;
            overflow: hidden;
          }
          .shop {
            font-size: 4.5pt;
            font-weight: 700;
            text-align: center;
            line-height: 1;
            max-height: 2.5mm;
            overflow: hidden;
          }
          img {
            max-width: ${PRINTABLE_WIDTH_MM - 2}mm;
            max-height: 11mm;
            display: block;
            margin: 0.3mm auto;
          }
          .meta {
            text-align: center;
            line-height: 1.1;
          }
          .product {
            font-size: 4pt;
            font-weight: 600;
            max-height: 3mm;
            overflow: hidden;
            word-break: break-word;
          }
          .price {
            font-size: 5pt;
            font-weight: 700;
            margin-top: 0.2mm;
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
 * Physical label: 40x30mm. Printable content: 30x20mm.
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

  // Try PrintNode first
  const printnodeOk = await printViaPrintNode({
    barcode, productName, price, shopName, quantity,
  });
  if (printnodeOk) return;

  // Fallback: browser print
  const dataUrl = generateBarcodeDataUrl(barcode);
  if (!dataUrl) return;

  printViaBrowser({
    barcode, productName, price, shopName, quantity, dataUrl,
  });
}

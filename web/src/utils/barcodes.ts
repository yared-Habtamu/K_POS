import JsBarcode from "jsbarcode";
import qzBridge from "@/services/printBridge/qzBridge";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";

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
 * Generate a barcode data URL synchronously.
 * Returns empty string on failure.
 */
export function generateBarcodeDataUrl(barcode: string): string {
  if (!barcode) return "";
  const canvas = document.createElement("canvas");
  try {
    JsBarcode(canvas, barcode, {
      format: "CODE128",
      width: 2,
      height: 80,
      displayValue: true,
      fontSize: 14,
      margin: 10,
      background: "#ffffff",
      lineColor: "#111111",
    });
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  }
}

/**
 * Print a barcode label using a hidden iframe (no new tab/window).
 * Falls back to window.open if iframe approach fails.
 */
export function printBarcodeLabel(params: {
  barcode: string;
  productName?: string;
  price?: string | number;
  shopName?: string;
}) {
  const { barcode, productName, price, shopName } = params;
  if (!barcode) return;

  const dataUrl = generateBarcodeDataUrl(barcode);
  if (!dataUrl) return;

  // Create a hidden iframe for printing
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

  iframeDoc.open();
  const safeShopName = String(shopName || "").trim();
  const safeProductName = String(productName || "").trim();
  const parsedPrice =
    typeof price === "number" ? price : Number(String(price || "").trim());
  const showPrice = Number.isFinite(parsedPrice);
  const priceLabel = showPrice ? `${parsedPrice.toFixed(2)} ETB` : "";

  iframeDoc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Barcode</title>
        <style>
          @page { size: auto; margin: 0; }
          @media print {
            body { margin: 0; padding: 0; }
          }
          body {
            margin: 0;
            padding: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            font-family: Arial, sans-serif;
            color: #111111;
            background: #ffffff;
          }
          .label {
            width: 280px;
            text-align: center;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 8px 10px;
            box-sizing: border-box;
          }
          .shop {
            font-size: 12px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 0 auto;
          }
          .meta {
            margin-top: 6px;
            line-height: 1.35;
          }
          .product {
            font-size: 12px;
            font-weight: 600;
            word-break: break-word;
          }
          .price {
            font-size: 13px;
            font-weight: 700;
            margin-top: 2px;
          }
        </style>
      </head>
      <body>
        <div class="label">
          ${safeShopName ? `<div class="shop">${safeShopName}</div>` : ""}
          <img src="${dataUrl}" alt="Barcode" />
          <div class="meta">
            ${safeProductName ? `<div class="product">${safeProductName}</div>` : ""}
            ${showPrice ? `<div class="price">${priceLabel}</div>` : ""}
          </div>
        </div>
      </body>
    </html>
  `);
  iframeDoc.close();

  // Wait for image to load in iframe, then print
  const img = iframeDoc.querySelector("img");
  const doPrint = () => {
    (async () => {
      try {
        // Try using QZ bridge raw printing for direct printer output
        const preferredPrinter = useSettingsStore
          .getState()
          .getPreferredPrinter(useAuthStore.getState().user?.role || null);
        const connected = await qzBridge.connect();
        if (connected) {
          // print the iframe's HTML as simple HTML payload
          const html =
            iframeDoc.documentElement?.outerHTML ||
            iframeDoc.body?.outerHTML ||
            "";
          await qzBridge.printHtml(html, {
            printer: preferredPrinter || undefined,
          });
        } else {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }
      } catch (e) {
        console.error("iframe print failed:", e);
        try {
          iframe.contentWindow?.print();
        } catch (_) {}
      }
      // Clean up after a brief delay
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (e) {}
      }, 1000);
    })();
  };

  if (img?.complete) {
    // Image already loaded (it's a data URL, so usually instant)
    setTimeout(doPrint, 100);
  } else if (img) {
    img.onload = doPrint;
  } else {
    doPrint();
  }
}

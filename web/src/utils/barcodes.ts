import JsBarcode from "jsbarcode";

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

export function printBarcodeLabel(params: {
  barcode: string;
  productName?: string;
  price?: string | number;
  shopName?: string;
}) {
  const { barcode, productName, price, shopName } = params;
  if (!barcode) return;

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
    
    const dataUrl = canvas.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode</title>
          <style>
            @page { size: 50mm 30mm; margin: 0; }
            body { 
              font-family: Arial, sans-serif; 
              text-align: center;
              padding: 2mm;
              margin: 0;
            }
            .label {
              padding: 1mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 26mm;
            }
            .shop-name { font-size: 9pt; font-weight: bold; margin-bottom: 1mm; }
            .item-name { font-size: 7pt; margin: 1mm 0; max-height: 2.4em; overflow: hidden; }
            .price { font-size: 9pt; font-weight: bold; margin-top: 1mm; }
            img.barcode { max-width: 100%; height: auto; display: block; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="shop-name">${shopName || "Kiya POS System"}</div>
            <img class="barcode" src="${dataUrl}" alt="Barcode" />
            <div class="item-name">${productName || "Product"}</div>
            <div class="price">${price || 0} ETB</div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  } catch (e) {
    console.error("Barcode printing failed:", e);
  }
}

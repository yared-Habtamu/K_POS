import type { Receipt } from "@/types";
import { format } from "date-fns";

const ESC = "\x1B";
const GS = "\x1D";

export const COMMANDS = {
  INIT: `${ESC}@`,
  ALIGN_LEFT: `${ESC}a\x00`,
  ALIGN_CENTER: `${ESC}a\x01`,
  ALIGN_RIGHT: `${ESC}a\x02`,
  BOLD_ON: `${ESC}E\x01`,
  BOLD_OFF: `${ESC}E\x00`,
  DOUBLE_SIZE: `${GS}!\x11`,
  DOUBLE_HEIGHT: `${GS}!\x01`,
  NORMAL_SIZE: `${GS}!\x00`,
  FEED_3: `${ESC}d\x03`,
  FEED_5: `${ESC}d\x05`,
  CUT: `${GS}V\x41\x03`,
};

/**
 * Format a 2-column row with left and right aligned text (total width chars)
 */
function formatRow2Col(left: string, right: string, width = 48): string {
  const maxLeft = Math.max(0, width - right.length - 1);
  const safeLeft = left.length > maxLeft ? left.slice(0, maxLeft) : left;
  const spaces = Math.max(1, width - safeLeft.length - right.length);
  return `${safeLeft}${" ".repeat(spaces)}${right}\n`;
}

/**
 * Generate standard ESC/POS raw command array for 80mm thermal printers (48 chars wide)
 */
export function buildReceiptEscPos(
  receipt: Receipt,
  options: { lineWidth?: number; supportPhone?: string } = {}
): string[] {
  const width = options.lineWidth || 48;
  const phone = options.supportPhone || "+251930201388";
  const divider = "-".repeat(width) + "\n";
  const doubleDivider = "=".repeat(width) + "\n";

  const cmds: string[] = [];

  // 1. Initialize printer
  cmds.push(COMMANDS.INIT);

  // 2. Shop Header (Centered, Double-height)
  cmds.push(COMMANDS.ALIGN_CENTER);
  cmds.push(COMMANDS.BOLD_ON);
  cmds.push(COMMANDS.DOUBLE_HEIGHT);
  cmds.push(`${receipt.shopName || "POS RECEIPT"}\n`);
  cmds.push(COMMANDS.NORMAL_SIZE);
  cmds.push(COMMANDS.BOLD_OFF);

  if (receipt.shopAddress) {
    cmds.push(`${receipt.shopAddress}\n`);
  }
  if (receipt.shopPhone) {
    cmds.push(`Tel: ${receipt.shopPhone}\n`);
  }
  if (receipt.receiptSlogan || receipt.receiptHeader) {
    cmds.push(`${receipt.receiptSlogan || receipt.receiptHeader}\n`);
  }

  // 3. Receipt Info (Left/Right meta)
  cmds.push(COMMANDS.ALIGN_LEFT);
  cmds.push(divider);

  cmds.push(
    formatRow2Col(
      `Receipt: ${receipt.id}`,
      format(new Date(receipt.date), "MMM dd, yyyy"),
      width
    )
  );
  cmds.push(
    formatRow2Col(
      `Cashier: ${receipt.cashierName || "Cashier"}`,
      format(new Date(receipt.date), "HH:mm:ss"),
      width
    )
  );
  if (receipt.customerName) {
    cmds.push(`Customer: ${receipt.customerName}\n`);
  }

  cmds.push(divider);

  // 4. Items Table Header
  cmds.push(COMMANDS.BOLD_ON);
  cmds.push(formatRow2Col("ITEM / DETAILS", "TOTAL", width));
  cmds.push(COMMANDS.BOLD_OFF);
  cmds.push(divider);

  // 5. Items
  for (const item of receipt.items || []) {
    const name = item.product?.name || item.name || "Item";
    const qty = item.quantity || 1;
    const price = Number(item.product?.sellingPrice ?? item.price ?? 0).toFixed(2);
    const subtotal = Number(
      item.subtotal || (item.product?.sellingPrice || 0) * qty
    ).toFixed(2);

    // Line 1: Item name & total
    cmds.push(COMMANDS.BOLD_ON);
    cmds.push(formatRow2Col(name, `${subtotal} ETB`, width));
    cmds.push(COMMANDS.BOLD_OFF);

    // Line 2: Qty x Unit Price (indented)
    cmds.push(`  ${qty} x ${price} ETB\n`);
  }

  cmds.push(divider);

  // 6. Totals
  cmds.push(
    formatRow2Col(
      "Subtotal:",
      `${Number(receipt.subtotal).toFixed(2)} ETB`,
      width
    )
  );

  if (receipt.discount) {
    cmds.push(
      formatRow2Col(
        "Discount:",
        `-${Number(receipt.discount.amount).toFixed(2)} ETB`,
        width
      )
    );
  }

  for (const charge of receipt.extraCharges || []) {
    cmds.push(
      formatRow2Col(
        `${charge.name}:`,
        `+${Number(charge.amount).toFixed(2)} ETB`,
        width
      )
    );
  }

  if (receipt.tax) {
    cmds.push(
      formatRow2Col(
        `VAT (${Number(receipt.taxRate || 0).toFixed(1)}%):`,
        `${Number(receipt.tax).toFixed(2)} ETB`,
        width
      )
    );
  }

  cmds.push(doubleDivider);

  // Total (Bold Double Height)
  cmds.push(COMMANDS.BOLD_ON);
  cmds.push(COMMANDS.DOUBLE_HEIGHT);
  cmds.push(
    formatRow2Col("TOTAL:", `${Number(receipt.total).toFixed(2)} ETB`, width)
  );
  cmds.push(COMMANDS.NORMAL_SIZE);
  cmds.push(COMMANDS.BOLD_OFF);

  cmds.push(doubleDivider);

  // Payment Method
  cmds.push(
    formatRow2Col(
      "Payment Method:",
      (receipt.paymentMethod || "CASH").toUpperCase().replace("_", " "),
      width
    )
  );

  if (
    receipt.amountPaid != null &&
    (receipt.paymentMethod === "credit" || receipt.paymentMethod === "wallet")
  ) {
    cmds.push(
      formatRow2Col(
        "Paid Upfront:",
        `${Number(receipt.amountPaid).toFixed(2)} ETB`,
        width
      )
    );
  }

  if (
    receipt.creditAmount != null &&
    receipt.creditAmount > 0 &&
    (receipt.paymentMethod === "credit" || receipt.paymentMethod === "wallet")
  ) {
    cmds.push(COMMANDS.BOLD_ON);
    cmds.push(
      formatRow2Col(
        "Remaining Credit:",
        `${Number(receipt.creditAmount).toFixed(2)} ETB`,
        width
      )
    );
    cmds.push(COMMANDS.BOLD_OFF);
  }

  // 7. Footer
  cmds.push(divider);
  cmds.push(COMMANDS.ALIGN_CENTER);
  cmds.push("Powered by Kiya POS\n");
  cmds.push(`Support: ${phone}\n`);
  cmds.push("Thank you for your business!\n");

  // 8. Feed & Paper Cut
  cmds.push(COMMANDS.FEED_5);
  cmds.push(COMMANDS.CUT);

  return cmds;
}

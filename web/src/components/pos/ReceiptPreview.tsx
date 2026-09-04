import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import type { Receipt } from "@/types";
import { Printer, Download, MessageSquare, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import printNodeBridge from "@/services/printBridge/printNodeBridge";
import { useSettingsStore } from "@/stores/settingsStore";

import { buildReceiptEscPos } from "@/services/printBridge/escpos";

interface ReceiptPreviewProps {
  receipt: Receipt;
  onDone: () => void;
}

const SYSTEM_PROVIDER_PHONE =
  (import.meta.env.VITE_RECEIPT_PROVIDER_PHONE as string | undefined)?.trim() ||
  (import.meta.env.VITE_SUPPORT_PHONE as string | undefined)?.trim() ||
  "+251930201388";

export function ReceiptPreview({ receipt, onDone }: ReceiptPreviewProps) {
  const { t } = useTranslation();
  const currentRole = useAuthStore.getState().user?.role || null;

  const handlePrint = async () => {
    try {
      const settings = useSettingsStore.getState();
      const printNodeId = settings.printNodeId;

      const escposCommands = buildReceiptEscPos(receipt, {
        lineWidth: 48,
        supportPhone: SYSTEM_PROVIDER_PHONE,
      });

      try {
        await printNodeBridge.printRaw(escposCommands, {
          printerId: printNodeId || undefined,
        });
        toast({
          title: "Receipt printed",
          description: "Sent to PrintNode printer",
        });
        return;
      } catch (e: any) {
        console.warn("PrintNode failed:", e);
        toast({
          variant: "destructive",
          title: "Print failed",
          description: e.message || "PrintNode unavailable",
        });
        return;
      }
    } catch (err) {
      console.error("Print receipt failed", err);
      window.print();
    }
  };

  const handleWhatsApp = () => {
    const customerPhone = receipt.customerPhone;
    if (!customerPhone) {
      toast({
        variant: "destructive",
        title: "No phone number",
        description: "Customer has no phone number on file.",
      });
      return;
    }
    const el = document.querySelector(".receipt-preview") as HTMLElement | null;
    const receiptText = el?.innerText || "";
    const encoded = encodeURIComponent(receiptText);
    window.open(`https://wa.me/${customerPhone}?text=${encoded}`, "_blank");
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogTitle className="sr-only">Receipt</DialogTitle>
        <DialogDescription className="sr-only">
          Receipt preview for {receipt.id}
        </DialogDescription>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          <div className="receipt-preview">
            <div className="bg-card p-4 sm:p-6 rounded-lg shadow-md border border-border max-w-[350px] mx-auto font-sans text-sm">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-foreground">
                  {receipt.shopName || "POS RECEIPT"}
                </h2>
                {receipt.shopAddress && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {receipt.shopAddress}
                  </p>
                )}
                {receipt.shopPhone && (
                  <p className="text-xs text-muted-foreground">
                    Tel: {receipt.shopPhone}
                  </p>
                )}
                {(receipt.receiptSlogan || receipt.receiptHeader) && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    {receipt.receiptSlogan || receipt.receiptHeader}
                  </p>
                )}
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>
                  Receipt: <span className="font-mono">{receipt.id}</span>
                </span>
                <span>{format(new Date(receipt.date), "MMM dd, yyyy")}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mb-3">
                <span>
                  Cashier:{" "}
                  <span className="font-medium text-foreground">
                    {receipt.cashierName || "Cashier"}
                  </span>
                </span>
                <span>{format(new Date(receipt.date), "HH:mm:ss")}</span>
              </div>
              {receipt.customerName && (
                <div className="text-xs text-muted-foreground mb-3">
                  Customer:{" "}
                  <span className="font-medium text-foreground">
                    {receipt.customerName}
                  </span>
                </div>
              )}
              <Separator className="my-3" />
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span>Item / Details</span>
                  <span>Total</span>
                </div>
                {(receipt.items || []).map((item, index) => (
                  <div key={item.product?.id || index} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-foreground">
                        {item.product?.name || item.name || "Item"}
                      </span>
                      <span className="font-semibold text-foreground">
                        {Number(
                          item.subtotal ||
                            (item.product?.sellingPrice || 0) * (item.quantity || 1)
                        ).toFixed(2)}{" "}
                        ETB
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.quantity || 1} x{" "}
                      {Number(item.product?.sellingPrice ?? item.price ?? 0).toFixed(2)}{" "}
                      ETB
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium text-foreground">
                    {Number(receipt.subtotal).toFixed(2)} ETB
                  </span>
                </div>
                {receipt.discount && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span className="font-medium">
                      -{Number(receipt.discount.amount).toFixed(2)} ETB
                    </span>
                  </div>
                )}
                {(receipt.extraCharges || []).map((charge) => (
                  <div key={charge.name} className="flex justify-between">
                    <span className="text-muted-foreground">{charge.name}:</span>
                    <span className="font-medium">
                      +{Number(charge.amount).toFixed(2)} ETB
                    </span>
                  </div>
                ))}
                {receipt.tax && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      VAT ({Number(receipt.taxRate || 0).toFixed(1)}%):
                    </span>
                    <span className="font-medium text-foreground">
                      {Number(receipt.tax).toFixed(2)} ETB
                    </span>
                  </div>
                )}
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between text-lg font-bold text-foreground">
                <span>TOTAL:</span>
                <span>{Number(receipt.total).toFixed(2)} ETB</span>
              </div>
              <Separator className="my-3" />
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium text-foreground">
                    {(receipt.paymentMethod || "CASH")
                      .toUpperCase()
                      .replace("_", " ")}
                  </span>
                </div>
                {receipt.amountPaid != null &&
                  (receipt.paymentMethod === "credit" ||
                    receipt.paymentMethod === "wallet") && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Paid Upfront:</span>
                      <span className="font-medium text-foreground">
                        {Number(receipt.amountPaid).toFixed(2)} ETB
                      </span>
                    </div>
                  )}
                {receipt.creditAmount != null &&
                  receipt.creditAmount > 0 &&
                  (receipt.paymentMethod === "credit" ||
                    receipt.paymentMethod === "wallet") && (
                    <div className="flex justify-between font-bold">
                      <span>Remaining Credit:</span>
                      <span className="text-foreground">
                        {Number(receipt.creditAmount).toFixed(2)} ETB
                      </span>
                    </div>
                  )}
              </div>
              <Separator className="my-4" />
              <div className="text-center text-xs text-muted-foreground">
                <p>Powered by Kiya POS</p>
                <p>Support: {SYSTEM_PROVIDER_PHONE}</p>
                <p className="mt-1 font-medium">Thank you for your business!</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-muted/50 px-6 py-4 border-t">
          <DialogFooter className="flex-row gap-3 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleWhatsApp}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                const el = document.querySelector(
                  ".receipt-preview"
                ) as HTMLElement | null;
                if (!el) return;
                const w = window.open("", "_blank", "toolbar=0,location=0,menubar=0");
                if (w) {
                  w.document.write(
                    `<html><head><title>Receipt</title><style>@page{size:auto;margin:0}body{margin:0;padding:10px;font-family:sans-serif;}</style></head><body>${el.outerHTML}</body></html>`
                  );
                  w.document.close();
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              View
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

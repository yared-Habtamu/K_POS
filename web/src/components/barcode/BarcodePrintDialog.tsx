import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { printBarcodeLabel } from "@/utils/barcodes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface BarcodePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barcode: string;
  productName?: string;
  price?: string | number;
  /** Optional pre-generated data URL — if provided, skips internal generation */
  dataUrl?: string;
}

function generateBarcodeDataUrl(barcode: string): string {
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

export function BarcodePrintDialog({
  open,
  onOpenChange,
  barcode,
  productName,
  price,
  dataUrl: externalDataUrl,
}: BarcodePrintDialogProps) {
  const { t } = useTranslation();

  // Generate eagerly — no dependency on `open` state.
  // This avoids problems with nested Radix dialogs swallowing useEffect.
  const [internalDataUrl, setInternalDataUrl] = useState("");
  const lastBarcode = useRef("");

  // Always regenerate when barcode changes, regardless of open state
  useEffect(() => {
    if (barcode && barcode !== lastBarcode.current) {
      lastBarcode.current = barcode;
      setInternalDataUrl(generateBarcodeDataUrl(barcode));
    }
  }, [barcode]);

  // Also generate on mount / when dialog opens if we don't have a URL yet
  useEffect(() => {
    if (open && barcode && !internalDataUrl) {
      setInternalDataUrl(generateBarcodeDataUrl(barcode));
    }
  }, [open, barcode, internalDataUrl]);

  const resolvedDataUrl = externalDataUrl || internalDataUrl;

  const handlePrint = () => {
    printBarcodeLabel({ barcode });
  };

  const handleDownload = () => {
    if (!resolvedDataUrl) return;
    const link = document.createElement("a");
    const safeName = (productName || "product")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    link.download = `${safeName}_${barcode}.png`;
    link.href = resolvedDataUrl;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("barcode_preview") || "Barcode Preview"}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6 bg-accent/5 rounded-xl border border-border/50">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-border scale-110 my-6">
            {resolvedDataUrl ? (
              <img
                src={resolvedDataUrl}
                alt="Barcode Preview"
                className="max-w-full h-auto mx-auto select-none"
              />
            ) : (
              <div className="w-48 h-24 flex items-center justify-center text-destructive text-xs font-medium">
                {t("invalid_barcode") || "Invalid Barcode"}
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="flex sm:justify-between gap-2">
          <Button variant="outline" onClick={handleDownload} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            {t("download") || "Download"}
          </Button>
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="mr-2 h-4 w-4" />
            {t("print") || "Print"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

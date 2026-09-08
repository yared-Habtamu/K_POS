import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Printer, Download, Minus, Plus } from "lucide-react";
import { printBarcodeLabel, generateBarcodeDataUrl } from "@/utils/barcodes";
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
  /** Optional pre-generated data URL */
  dataUrl?: string;
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
  const [quantity, setQuantity] = useState(1);

  const generatedDataUrl = useMemo(
    () => generateBarcodeDataUrl(barcode),
    [barcode],
  );

  const resolvedDataUrl = externalDataUrl || generatedDataUrl;

  const handlePrint = () => {
    printBarcodeLabel({
      barcode,
      productName,
      price,
      shopName: t("kiya_pos_system"),
      quantity,
    });
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

        {/* Quantity selector */}
        <div className="flex items-center justify-center gap-3 py-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t("quantity") || "Quantity"}:
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-10 text-center font-semibold text-lg tabular-nums">
            {quantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setQuantity((q) => Math.min(999, q + 1))}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <DialogFooter className="flex sm:justify-between gap-2">
          <Button variant="outline" onClick={handleDownload} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            {t("download") || "Download"}
          </Button>
          <Button onClick={handlePrint} className="flex-1">
            <Printer className="mr-2 h-4 w-4" />
            {t("print") || "Print"}
            {quantity > 1 && ` (${quantity})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

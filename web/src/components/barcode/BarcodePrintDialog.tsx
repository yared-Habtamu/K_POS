import { useEffect, useState } from "react";
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
}

export function BarcodePrintDialog({
  open,
  onOpenChange,
  barcode,
  productName,
  price,
}: BarcodePrintDialogProps) {
  const { t } = useTranslation();
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!barcode || !open) {
      setDataUrl("");
      return;
    }

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
      setDataUrl(canvas.toDataURL("image/png"));
    } catch (e) {
      console.error("JsBarcode failed:", e);
      setDataUrl("");
    }
  }, [barcode, open]);

  const handlePrint = () => {
    printBarcodeLabel({
      barcode,
    });
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    const safeName = (productName || "product")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    link.download = `${safeName}_${barcode}.png`;
    link.href = dataUrl;
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
            {dataUrl ? (
              <img
                src={dataUrl}
                alt="Barcode Preview"
                className="max-w-full h-auto mx-auto select-none"
              />
            ) : (
              <div className="w-48 h-24 flex items-center justify-center text-destructive text-xs font-medium animate-pulse">
                Generating Barcode...
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

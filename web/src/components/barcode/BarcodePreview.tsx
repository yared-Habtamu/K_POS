import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { generateBarcodeDataUrl } from "@/utils/barcodes";
import { BarcodePrintDialog } from "./BarcodePrintDialog";

interface BarcodePreviewProps {
  barcode: string;
  productName?: string;
  price?: string | number;
}

export function BarcodePreview({ barcode, productName, price }: BarcodePreviewProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Synchronous — instant render, no loading state possible
  const dataUrl = useMemo(() => generateBarcodeDataUrl(barcode), [barcode]);

  if (!barcode) return null;

  return (
    <>
      <div className="mt-4 p-4 border rounded-xl bg-accent/20 flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          {dataUrl ? (
            <img src={dataUrl} alt="Barcode Preview" className="max-w-full h-auto mx-auto" />
          ) : (
            <div className="w-full h-16 flex items-center justify-center text-destructive text-xs">
              {t("invalid_barcode") || "Invalid Barcode"}
            </div>
          )}
        </div>
        
        <Button type="button" size="sm" onClick={() => setIsModalOpen(true)} className="w-full">
          <Eye className="mr-2 h-4 w-4" />
          {t("preview_and_print")}
        </Button>
      </div>

      <BarcodePrintDialog 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        barcode={barcode} 
        productName={productName} 
        price={price}
        dataUrl={dataUrl}
      />
    </>
  );
}

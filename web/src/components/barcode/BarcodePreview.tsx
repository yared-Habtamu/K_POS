import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import JsBarcode from "jsbarcode";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { BarcodePrintDialog } from "./BarcodePrintDialog";

interface BarcodePreviewProps {
  barcode: string;
  productName?: string;
  price?: string | number;
}

export function BarcodePreview({ barcode, productName, price }: BarcodePreviewProps) {
  const { t } = useTranslation();
  const [dataUrl, setDataUrl] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!barcode) {
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
  }, [barcode]);

  if (!barcode) return null;

  return (
    <>
      <div className="mt-4 p-4 border rounded-xl bg-accent/20 flex flex-col items-center gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="text-center font-bold text-[10px] mb-1">{t("kiya_pos_system")}</div>
          {dataUrl ? (
            <img src={dataUrl} alt="Barcode Preview" className="max-w-full h-auto mx-auto" />
          ) : (
            <div className="w-full h-16 flex items-center justify-center text-destructive text-xs">
              Invalid Barcode
            </div>
          )}
          <div className="text-center text-[8px] mt-1 truncate max-w-[150px]">{productName || t("product")}</div>
          <div className="text-center font-bold text-[10px]">{price || 0} ETB</div>
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
      />
    </>
  );
}

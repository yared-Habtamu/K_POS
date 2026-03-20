import { useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // delay a bit to ensure the container is ready
    const timer = setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "barcode-scanner-container",
        {
          fps: 10,
          qrbox: { width: 250, height: 150 }, // typical barcode shape
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
        },
        /* verbose= */ false,
      );

      scanner.render(
        (decodedText) => {
          onScan(decodedText);
          scanner.clear();
          onClose();
        },
        (error) => {
          // ignore common "not found" errors
          if (typeof error === "string" && error.includes("NotFound")) return;
        },
      );

      scannerRef.current = scanner;
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div id="barcode-scanner-container" className="w-full max-w-sm overflow-hidden rounded-lg bg-black" />
      <p className="text-sm text-muted-foreground">
        Align the barcode within the scanner frame to scan automatically.
      </p>
    </div>
  );
}

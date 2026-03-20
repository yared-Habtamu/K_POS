import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Zap, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const { t } = useTranslation();
  const [restartKey, setRestartKey] = useState(0);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = "barcode-scanner-viewport";

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(containerId);
    html5QrCodeRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 25,
              qrbox: (viewWidth, viewHeight) => {
                const width = Math.min(viewWidth * 0.88, 320);
                const height = Math.min(viewHeight * 0.5, 160);
                return { width, height };
              },
              formatsToSupport: [
                Html5QrcodeSupportedFormats.CODE_128,
                Html5QrcodeSupportedFormats.EAN_13,
                Html5QrcodeSupportedFormats.EAN_8,
                Html5QrcodeSupportedFormats.UPC_A,
                Html5QrcodeSupportedFormats.UPC_E,
                Html5QrcodeSupportedFormats.CODE_39,
              ],
            },
            (decodedText) => {
              onScan(decodedText);
              if (html5QrCode.isScanning) {
                html5QrCode.stop().catch(console.error);
              }
              onClose();
            },
            () => {}
          );
          setIsScanning(true);
        } else {
          toast.error(t("no_camera_found", { defaultValue: "No camera found" }));
        }
      } catch (err) {
        console.error("Scanner error:", err);
        toast.error(t("camera_permission_denied", { defaultValue: "Camera permission denied" }));
      }
    };

    startScanner();

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [onScan, onClose, t, restartKey]);

  const stopScanner = async () => {
    const scanner = html5QrCodeRef.current;
    if (scanner && (scanner as any).isScanning) {
      try {
        await scanner.stop();
        scanner.clear();
        setIsScanning(false);
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      }
    }
  };

  const toggleFlash = async () => {
    const scanner = html5QrCodeRef.current;
    if (!scanner || !isScanning) return;
    try {
      const newState = !isFlashOn;
      await (scanner as any).applyVideoConstraints({
        advanced: [{ torch: newState }],
      });
      setIsFlashOn(newState);
    } catch {
      toast.error(t("flash_not_supported", { defaultValue: "Flash not supported on this device" }));
    }
  };

  const handleRestart = async () => {
    await stopScanner();
    toast.info(t("restarting_scanner", { defaultValue: "Restarting camera..." }));
    setRestartKey(prev => prev + 1);
  };

  return (
    <AnimatePresence>
      {/* Full-screen backdrop */}
      <motion.div
        key="scanner-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: "rgba(5, 5, 15, 0.92)", backdropFilter: "blur(16px)" }}
      >
        {/* Scanner Card */}
        <motion.div
          key="scanner-card"
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className="relative w-full max-w-sm rounded-[2rem] overflow-hidden flex flex-col"
          style={{
            background: "rgba(15, 15, 30, 0.85)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05) inset",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            {/* Status pill */}
            <div
              className="flex items-center gap-2.5 px-4 py-2 rounded-full"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <motion.div
                animate={{ opacity: isScanning ? [1, 0.3, 1] : 1 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: isScanning ? "#22c55e" : "#f59e0b", boxShadow: isScanning ? "0 0 8px #22c55e" : "none" }}
              />
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-white/70">
                {isScanning
                  ? t("scanner_active", { defaultValue: "Scanning" })
                  : t("initializing", { defaultValue: "Starting..." })}
              </span>
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onClose(); }}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          {/* Camera viewport */}
          <div className="relative mx-4 rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3", background: "#000" }}>
            {/* Html5Qrcode mounts here */}
            <div id={containerId} className="w-full h-full" />

            {/* Scanning frame overlay (drawn on top of camera feed) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Corner brackets - the scanning guide */}
              <ScanFrame />
              {/* Animated laser line (inside the frame area) */}
              {isScanning && (
                <motion.div
                  animate={{ top: ["18%", "82%", "18%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute"
                  style={{
                    left: "12%",
                    right: "12%",
                    height: "2px",
                    background: "linear-gradient(to right, transparent, #6366f1, #818cf8, #6366f1, transparent)",
                    boxShadow: "0 0 12px 3px rgba(99,102,241,0.7)",
                    borderRadius: 1,
                  }}
                />
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="pt-5 pb-2 text-center px-6">
            <p className="text-[17px] font-bold text-white leading-tight">
              {t("align_barcode_hint", { defaultValue: "Align barcode within the frame" })}
            </p>
            <p className="text-sm text-white/40 mt-1.5 font-medium">
              {t("scanning_automatic_hint", { defaultValue: "Scanning will happen automatically" })}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3 px-5 py-5">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFlash(); }}
              className="flex-1 flex items-center justify-center gap-2.5 h-12 rounded-2xl font-semibold text-sm transition-all duration-200"
              style={{
                background: isFlashOn ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.07)",
                border: `1px solid ${isFlashOn ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.1)"}`,
                color: isFlashOn ? "#f59e0b" : "rgba(255,255,255,0.65)",
              }}
            >
              <Zap className={`w-4 h-4 ${isFlashOn ? "fill-current" : ""}`} />
              {t("flash", { defaultValue: "Flash" })}
            </button>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRestart(); }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.65)",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.14)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Clean corner-bracket scan frame drawn entirely with divs */
function ScanFrame() {
  const bracketSize = 22;
  const thickness = 3;
  const color = "rgba(255,255,255,0.9)";
  const frameW = "76%";
  const frameH = "64%";

  const corner = (pos: "tl" | "tr" | "bl" | "br") => {
    const isTop = pos === "tl" || pos === "tr";
    const isLeft = pos === "tl" || pos === "bl";
    return (
      <div
        key={pos}
        style={{
          position: "absolute",
          ...(isTop ? { top: 0 } : { bottom: 0 }),
          ...(isLeft ? { left: 0 } : { right: 0 }),
          width: bracketSize,
          height: bracketSize,
          borderTop: isTop ? `${thickness}px solid ${color}` : "none",
          borderBottom: !isTop ? `${thickness}px solid ${color}` : "none",
          borderLeft: isLeft ? `${thickness}px solid ${color}` : "none",
          borderRight: !isLeft ? `${thickness}px solid ${color}` : "none",
          borderTopLeftRadius: pos === "tl" ? 6 : 0,
          borderTopRightRadius: pos === "tr" ? 6 : 0,
          borderBottomLeftRadius: pos === "bl" ? 6 : 0,
          borderBottomRightRadius: pos === "br" ? 6 : 0,
        }}
      />
    );
  };

  return (
    <div
      style={{
        position: "absolute",
        width: frameW,
        height: frameH,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
    >
      {corner("tl")}
      {corner("tr")}
      {corner("bl")}
      {corner("br")}
    </div>
  );
}

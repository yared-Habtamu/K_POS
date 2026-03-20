import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Zap, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

// Navy blue matching the app's --primary: 217 60% 30%
const BRAND = {
  navy: "#1e3a8a",
  navyLight: "#2563eb",
  navyGlow: "rgba(37, 99, 235, 0.45)",
};

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const { t } = useTranslation();
  const [restartKey, setRestartKey] = useState(0);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = "bscanner-viewport";

  useEffect(() => {
    // Inject CSS once to hide Html5Qrcode's own frame/border/buttons
    const styleId = "bscanner-hide-native-ui";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        #${containerId} video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
        #${containerId} img { display: none !important; }
        /* Hide the native white scan box and all library UI */
        #${containerId} > div > div:not([id*="video"]) { display: none !important; }
        #${containerId} #qr-shaded-region { display: none !important; }
        #${containerId} #html5-qrcode-button-camera-start,
        #${containerId} #html5-qrcode-button-camera-stop,
        #${containerId} #html5-qrcode-anchor-scan-type-change,
        #${containerId} span,
        #${containerId} select { display: none !important; }
      `;
      document.head.appendChild(style);
    }

    const html5QrCode = new Html5Qrcode(containerId);
    html5QrCodeRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          toast.error(t("no_camera_found", { defaultValue: "No camera found" }));
          return;
        }
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 25,
            // Make qrbox fill nearly the whole view → suppresses the white rectangle overlay
            qrbox: (w, h) => ({ width: Math.round(w * 0.98), height: Math.round(h * 0.98) }),
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
    const s = html5QrCodeRef.current;
    if (s && s.isScanning) {
      try { await s.stop(); s.clear(); setIsScanning(false); }
      catch (err) { console.error(err); }
    }
  };

  const toggleFlash = async () => {
    if (!html5QrCodeRef.current || !isScanning) return;
    try {
      const next = !isFlashOn;
      await (html5QrCodeRef.current as any).applyVideoConstraints({ advanced: [{ torch: next }] });
      setIsFlashOn(next);
    } catch {
      toast.error(t("flash_not_supported", { defaultValue: "Flash not supported on this device" }));
    }
  };

  const handleRestart = async () => {
    await stopScanner();
    toast.info(t("restarting_scanner", { defaultValue: "Restarting camera..." }));
    setRestartKey(k => k + 1);
  };

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="bscanner-bg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: "rgba(8, 15, 40, 0.93)", backdropFilter: "blur(18px)" }}
      >
        {/* Card */}
        <motion.div
          key="bscanner-card"
          initial={{ scale: 0.93, opacity: 0, y: 18 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 18 }}
          transition={{ type: "spring", damping: 24, stiffness: 320 }}
          className="relative w-full max-w-[360px] flex flex-col rounded-3xl overflow-hidden"
          style={{
            background: "rgba(10, 18, 50, 0.88)",
            border: "1px solid rgba(37, 99, 235, 0.25)",
            boxShadow: `0 0 0 1px rgba(255,255,255,0.04) inset, 0 32px 72px rgba(0,0,0,0.6), 0 0 60px ${BRAND.navyGlow}`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div
              className="flex items-center gap-2.5 px-4 py-2 rounded-full"
              style={{
                background: "rgba(37,99,235,0.12)",
                border: "1px solid rgba(37,99,235,0.3)",
              }}
            >
              <motion.div
                animate={isScanning ? { opacity: [1, 0.25, 1], scale: [1, 0.85, 1] } : {}}
                transition={{ duration: 1.4, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: isScanning ? "#22c55e" : "#f59e0b",
                  boxShadow: isScanning ? "0 0 8px rgba(34,197,94,0.8)" : "none",
                }}
              />
              <span
                className="text-[11px] font-black uppercase tracking-[0.14em]"
                style={{ color: isScanning ? "rgba(255,255,255,0.75)" : "rgba(245,158,11,0.9)" }}
              >
                {isScanning
                  ? t("scanner_active", { defaultValue: "Scanning" })
                  : t("initializing", { defaultValue: "Starting..." })}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onClose(); }}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-150"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.55)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.55)"; }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Viewport */}
          <div
            className="relative mx-4 rounded-2xl overflow-hidden"
            style={{ aspectRatio: "4/3", background: "#000814" }}
          >
            {/* Html5Qrcode mounts here, video fills it */}
            <div id={containerId} className="absolute inset-0" />

            {/* Our custom UI drawn on top */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Subtle vignette around edges */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 90% 90% at 50% 50%, transparent 55%, rgba(8,15,40,0.65) 100%)",
                }}
              />

              {/* Corner bracket frame — centered, about 70% of the view */}
              <ScanFrame color={BRAND.navyLight} />

              {/* Animated laser beam */}
              {isScanning && <LaserLine navyLight={BRAND.navyLight} navyGlow={BRAND.navyGlow} />}
            </div>
          </div>

          {/* Instructions */}
          <div className="pt-5 pb-1 text-center px-5">
            <p className="text-base font-bold text-white leading-tight">
              {t("align_barcode_hint", { defaultValue: "Align barcode within the frame" })}
            </p>
            <p className="text-[13px] mt-1 font-medium" style={{ color: "rgba(255,255,255,0.38)" }}>
              {t("scanning_automatic_hint", { defaultValue: "Scanning will happen automatically" })}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 px-5 py-5">
            {/* Flash */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFlash(); }}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95"
              style={{
                background: isFlashOn ? "rgba(250,204,21,0.18)" : "rgba(37,99,235,0.12)",
                border: `1px solid ${isFlashOn ? "rgba(250,204,21,0.55)" : "rgba(37,99,235,0.35)"}`,
                color: isFlashOn ? "#fbbf24" : "rgba(147,197,253,0.9)",
              }}
            >
              <Zap className={`w-4 h-4 ${isFlashOn ? "fill-current" : ""}`} />
              {t("flash", { defaultValue: "Flash" })}
            </button>

            {/* Restart */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRestart(); }}
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-95 flex-shrink-0"
              style={{
                background: "rgba(37,99,235,0.12)",
                border: "1px solid rgba(37,99,235,0.35)",
                color: "rgba(147,197,253,0.9)",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(37,99,235,0.22)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(37,99,235,0.12)"; }}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Corner-bracket frame, centered over the viewport */
function ScanFrame({ color }: { color: string }) {
  const size = 24;      // bracket arm length in px
  const thickness = 3;  // border thickness

  const br = (pos: "tl" | "tr" | "bl" | "br") => {
    const top = pos === "tl" || pos === "tr";
    const left = pos === "tl" || pos === "bl";
    return (
      <div
        key={pos}
        style={{
          position: "absolute",
          ...(top ? { top: 0 } : { bottom: 0 }),
          ...(left ? { left: 0 } : { right: 0 }),
          width: size,
          height: size,
          borderTop:    top  ? `${thickness}px solid ${color}` : "none",
          borderBottom: !top ? `${thickness}px solid ${color}` : "none",
          borderLeft:   left  ? `${thickness}px solid ${color}` : "none",
          borderRight:  !left ? `${thickness}px solid ${color}` : "none",
          borderTopLeftRadius:     pos === "tl" ? 5 : 0,
          borderTopRightRadius:    pos === "tr" ? 5 : 0,
          borderBottomLeftRadius:  pos === "bl" ? 5 : 0,
          borderBottomRightRadius: pos === "br" ? 5 : 0,
        }}
      />
    );
  };

  return (
    // Frame is 72% wide, 58% tall, centered
    <div
      style={{
        position: "absolute",
        width: "72%",
        height: "58%",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        // Soft border on the box itself for extra depth
        boxShadow: `0 0 0 1px rgba(37,99,235,0.15), inset 0 0 0 1px rgba(37,99,235,0.06)`,
        borderRadius: 8,
      }}
    >
      {br("tl")} {br("tr")} {br("bl")} {br("br")}
    </div>
  );
}

/** Realistic scanner laser line with trailing fade */
function LaserLine({ navyLight, navyGlow }: { navyLight: string; navyGlow: string }) {
  return (
    // Constrained to the scan-frame area
    <div
      style={{
        position: "absolute",
        width: "72%",
        height: "58%",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        overflow: "hidden",
        borderRadius: 8,
        pointerEvents: "none",
      }}
    >
      {/* Main beam */}
      <motion.div
        animate={{ top: ["4%", "96%", "4%"] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(to right, transparent 0%, ${navyLight} 20%, #fff 50%, ${navyLight} 80%, transparent 100%)`,
          boxShadow: `0 0 6px 2px ${navyGlow}, 0 0 16px 6px rgba(37,99,235,0.25)`,
        }}
      />

      {/* Trailing glow below the beam (persistence-of-vision effect) */}
      <motion.div
        animate={{ top: ["4%", "96%", "4%"] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: 28,
          marginTop: 2,
          background: `linear-gradient(to bottom, rgba(37,99,235,0.22) 0%, transparent 100%)`,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

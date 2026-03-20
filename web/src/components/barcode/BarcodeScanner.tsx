import { useEffect, useRef, useState, useMemo } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

/** Detect whether the device is likely a phone/tablet (has touch + small screen) */
function isMobileDevice(): boolean {
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 1024;
  return hasTouch && isSmallScreen;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const { t } = useTranslation();
  const [restartKey, setRestartKey] = useState(0);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [noCameraFound, setNoCameraFound] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const containerId = "bscanner-viewport";

  // Animation for the laser line — pure CSS keyframe injected once
  useEffect(() => {
    const styleId = "bscanner-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        /* Hide Html5Qrcode's native UI elements */
        #${containerId} video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
        #${containerId} img { display: none !important; }
        #${containerId} #qr-shaded-region { display: none !important; }
        #${containerId} #html5-qrcode-button-camera-start,
        #${containerId} #html5-qrcode-button-camera-stop,
        #${containerId} #html5-qrcode-anchor-scan-type-change,
        #${containerId} span,
        #${containerId} select { display: none !important; }

        /* Laser line sweep animation — top ↔ bottom */
        @keyframes bscanner-sweep {
          0%   { top: 2%; }
          50%  { top: 94%; }
          100% { top: 2%; }
        }
        .bscanner-laser {
          animation: bscanner-sweep 2s linear infinite;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode(containerId);
    html5QrCodeRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          setNoCameraFound(true);
          toast.error(t("no_camera_found", { defaultValue: "No camera detected. Use an external scanner." }));
          return;
        }

        // Camera selection logic:
        // - Mobile/tablet (touchscreen + small screen) → back camera ("environment")
        // - Laptop with camera → front camera ("user")
        // - Desktop with only one camera → use that camera
        const mobile = isMobileDevice();
        const facingMode = mobile ? "environment" : "user";

        await html5QrCode.start(
          { facingMode },
          {
            fps: 25,
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
        // If facingMode failed (e.g. laptop has no front cam), try any camera
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras.length > 0) {
            await html5QrCode.start(
              cameras[0].id,
              {
                fps: 25,
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
          }
        } catch (fallbackErr) {
          console.error("Fallback camera also failed:", fallbackErr);
          toast.error(t("camera_permission_denied", { defaultValue: "Camera permission denied" }));
        }
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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-lg"
        style={{ animation: "bscanner-fadein 0.2s ease" }}
      >
        {/* Card — theme-aware via CSS vars */}
        <div
          className="relative w-full max-w-lg flex flex-col rounded-3xl overflow-hidden bg-card border border-border shadow-2xl"
          style={{
            animation: "bscanner-slidein 0.25s ease",
            boxShadow: "0 32px 72px hsl(var(--foreground) / 0.15), 0 0 50px hsl(var(--primary) / 0.1)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: isScanning ? "#22c55e" : "hsl(var(--warning, 38 92% 50%))",
                  boxShadow: isScanning ? "0 0 7px rgba(34,197,94,0.7)" : "none",
                  animation: isScanning ? "bscanner-pulse 1.3s ease-in-out infinite" : "none",
                }}
              />
              <span className="text-[11px] font-black uppercase tracking-[0.13em] text-primary/80">
                {noCameraFound
                  ? t("no_camera", { defaultValue: "No Camera" })
                  : isScanning
                    ? t("scanner_active", { defaultValue: "Scanning" })
                    : t("initializing", { defaultValue: "Starting..." })}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onClose(); }}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors border border-border"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Camera viewport */}
          <div
            className="relative mx-4 rounded-2xl overflow-hidden bg-black"
            style={{ aspectRatio: "16/10" }}
          >
            <div id={containerId} className="absolute inset-0" />

            {/* Custom overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Vignette */}
              <div
                className="absolute inset-0"
                style={{ background: "radial-gradient(ellipse 86% 86% at 50% 50%, transparent 48%, rgba(0,0,0,0.4) 100%)" }}
              />

              {/* Corner bracket frame */}
              <div className="absolute" style={{ width: "72%", height: "62%", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
                {/* TL */}
                <div className="absolute top-0 left-0 w-6 h-6" style={{ borderTop: "3px solid hsl(var(--primary))", borderLeft: "3px solid hsl(var(--primary))", borderTopLeftRadius: 6 }} />
                {/* TR */}
                <div className="absolute top-0 right-0 w-6 h-6" style={{ borderTop: "3px solid hsl(var(--primary))", borderRight: "3px solid hsl(var(--primary))", borderTopRightRadius: 6 }} />
                {/* BL */}
                <div className="absolute bottom-0 left-0 w-6 h-6" style={{ borderBottom: "3px solid hsl(var(--primary))", borderLeft: "3px solid hsl(var(--primary))", borderBottomLeftRadius: 6 }} />
                {/* BR */}
                <div className="absolute bottom-0 right-0 w-6 h-6" style={{ borderBottom: "3px solid hsl(var(--primary))", borderRight: "3px solid hsl(var(--primary))", borderBottomRightRadius: 6 }} />
              </div>

              {/* Animated laser line — CSS keyframe animation (guaranteed to work) */}
              {isScanning && (
                <div
                  className="absolute"
                  style={{ width: "72%", height: "62%", top: "50%", left: "50%", transform: "translate(-50%,-50%)", overflow: "hidden", borderRadius: 8, pointerEvents: "none" }}
                >
                  <div
                    className="bscanner-laser"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                    }}
                  >
                    {/* The bright beam */}
                    <div
                      style={{
                        height: 2.5,
                        background: "linear-gradient(to right, transparent 0%, hsl(var(--primary)) 15%, hsl(var(--primary-foreground)) 50%, hsl(var(--primary)) 85%, transparent 100%)",
                        boxShadow: "0 0 8px 3px hsl(var(--primary) / 0.5), 0 0 18px 6px hsl(var(--primary) / 0.18)",
                      }}
                    />
                    {/* Trailing glow */}
                    <div
                      style={{
                        height: 28,
                        background: "linear-gradient(to bottom, hsl(var(--primary) / 0.2) 0%, transparent 100%)",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Desktop: no-camera message */}
              {noCameraFound && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 text-foreground text-center px-6">
                  <p className="text-base font-bold">{t("use_external_scanner", { defaultValue: "No camera detected" })}</p>
                  <p className="text-sm text-muted-foreground mt-2">{t("use_external_scanner_hint", { defaultValue: "Use an external USB barcode scanner or a scan gun to scan barcodes." })}</p>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          {!noCameraFound && (
            <div className="pt-5 pb-1 text-center px-6">
              <p className="text-base font-bold text-foreground">
                {t("align_barcode_hint", { defaultValue: "Align barcode within the frame" })}
              </p>
              <p className="text-sm mt-1.5 text-muted-foreground font-medium">
                {t("scanning_automatic_hint", { defaultValue: "Scanning will happen automatically" })}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-3 px-6 py-5">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFlash(); }}
              className={`flex-1 flex items-center justify-center gap-2 h-12 rounded-xl font-semibold text-sm transition-all active:scale-[0.97] border ${
                isFlashOn
                  ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-600 dark:text-yellow-400"
                  : "bg-primary/10 border-primary/25 text-primary hover:bg-primary/15"
              }`}
            >
              <Zap className={`w-4 h-4 ${isFlashOn ? "fill-current" : ""}`} />
              {t("flash", { defaultValue: "Flash" })}
            </button>

            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRestart(); }}
              className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 hover:bg-primary/20 border border-primary/25 text-primary transition-all active:scale-[0.97] flex-shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Extra injected keyframes (card entrance + pulse) */}
      <style>{`
        @keyframes bscanner-fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bscanner-slidein { from { opacity: 0; transform: scale(0.93) translateY(16px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes bscanner-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.3; transform: scale(0.8); } }
      `}</style>
    </>
  );
}

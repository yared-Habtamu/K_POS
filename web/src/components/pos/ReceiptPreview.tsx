import { useTranslation } from "react-i18next";
import { useState } from "react";
// QR code removed from receipt per user request
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

  const handlePrint = () => {
    try {
      const el = document.querySelector(".receipt-preview") as HTMLElement | null;
      if (!el) return window.print();

      const html = el.outerHTML;
      // Collect page styles but inject a focused print stylesheet for 80mm thermal paper
      const pageStyles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
        .map((n) => n.outerHTML)
        .join("\n");

      const printStyles = `
        <style>
          @page { size: 80mm auto; margin: 2mm; }
          html, body { background: #fff; color: #000; }
          body { margin: 0; padding: 0; font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; }
          .receipt-preview { width: 80mm; box-sizing: border-box; padding: 6px; margin: 0 auto; background: #fff; color: #000; font-size: 10px; line-height: 1.08; }
          .receipt-preview * { box-sizing: border-box; }
          .receipt-preview h2, .receipt-preview h1 { font-size: 14px; margin: 4px 0; }
          .receipt-preview p, .receipt-preview td, .receipt-preview th, .receipt-preview div { font-size: 10px; }
          .receipt-preview .text-xs { font-size: 9px; }
          .receipt-preview .text-sm { font-size: 10px; }
          .receipt-preview .text-lg { font-size: 12px; }
          .receipt-preview .qr, .receipt-preview .barcode-label { display: none !important; }
          .receipt-preview img { max-width: 100%; height: auto; }
          .receipt-preview .separator, .receipt-preview .sep, hr { border: none; border-top: 1px dashed #ccc; margin: 6px 0; }
          /* Ensure content is not clipped when printing */
          html, body, .receipt-preview { height: auto !important; overflow: visible !important; }
          /* Footer branding visibility */
          .receipt-powered-by, .receipt-provider-phone { color: #111 !important; font-size: 10px !important; font-weight: 600 !important; margin: 4px 0; }
          @media print {
            body { -webkit-print-color-adjust: exact; }
            .receipt-preview { box-shadow: none !important; }
          }
        </style>
      `;

      const w = window.open("", "_blank", "toolbar=0,location=0,menubar=0");
      if (!w) return window.print();

      const docHtml = `<!doctype html><html><head><meta charset=\"utf-8\"/><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"/>${pageStyles}${printStyles}</head><body>${html}</body></html>`;
      w.document.open();
      w.document.write(docHtml);
      w.document.close();
      // Wait for content to render before printing
      w.focus();
      setTimeout(() => {
        try {
          w.print();
        } catch (e) {
          console.error("print failed", e);
        }
        // Optionally close window after print
        try {
          w.close();
        } catch (e) {}
      }, 300);
    } catch (err) {
      console.error("Print receipt failed", err);
      window.print();
    }
  };

  const handleDownloadPDF = () => {
    (async () => {
      try {
        const API_BASE =
          (import.meta.env.VITE_API_URL as string | undefined) ||
          (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined) ||
          (window.location?.origin || "");
        const url = `${API_BASE.replace(/\/+$/,'')}/api/sales/receipt/${encodeURIComponent(receipt.id)}/pdf`;
        const token = useAuthStore.getState().user?.token;
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(url, { headers });
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          const detail = `HTTP ${res.status} ${res.statusText}${txt ? `: ${txt}` : ""}`;
          console.error("PDF fetch failed", detail);
          toast({ title: t("failed_download_pdf"), description: detail });
          // fallback: open HTML receipt view so user can print/download manually
          try {
            const API_BASE =
              (import.meta.env.VITE_RECEIPT_PUBLIC_BASE_URL as string | undefined)?.trim() ||
              (import.meta.env.VITE_API_URL as string | undefined) ||
              (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined) ||
              "";
            const viewUrl = `${API_BASE}/api/sales/receipt/${encodeURIComponent(receipt.id)}/view`;
            window.open(viewUrl, "_blank");
          } catch (e) {
            // ignore
          }
          return;
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        // open PDF in new tab — user can print from there or the app can choose to download
        const w = window.open(blobUrl, "_blank");
        if (!w) {
          // fallback: force download
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = `receipt-${receipt.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      } catch (err) {
        console.error("Download PDF error", err);
        toast({ title: t("failed_download_pdf") });
      }
    })();
  };

  const handleEmail = () => {
    // Build a simple email body with receipt summary
    const lines = [] as string[];
    lines.push(`${t("receipt_label")}: ${receipt.id}`);
    lines.push(`${t("shop")}: ${receipt.shopName}`);
    lines.push(`${t("total")}: ${receipt.total.toFixed(2)} ETB`);
    lines.push("");
    lines.push(`${t("items")}:`);
    for (const it of receipt.items) {
      const name = it.product?.name || t("item");
      const qty = it.quantity || 0;
      const subtotal =
        it.subtotal != null
          ? it.subtotal
          : (it.product?.sellingPrice || 0) * qty;
      lines.push(`${name} x${qty} — ${Number(subtotal).toFixed(2)} ETB`);
    }
    const body = encodeURIComponent(lines.join("\n"));
    const subject = encodeURIComponent(
      `${t("receipt_label")} ${receipt.id} ${t("from")} ${receipt.shopName}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // SMS dialog state
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsName, setSmsName] = useState("");
  const [smsPhone, setSmsPhone] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState<string | null>(null);

  const sendSms = async () => {
    if (!smsPhone) {
      setSmsResult(t("phone_required"));
      return;
    }
    const token = useAuthStore.getState().user?.token;
    if (!token) {
      setSmsResult(t("not_authenticated"));
      return;
    }
    setSendingSms(true);
    setSmsResult(null);
    try {
      const payload = {
        saleId: receipt.saleId || receipt.id,
        phone: smsPhone,
        name: smsName,
      };
      const res = await fetch(
        (import.meta.env.VITE_API_URL ||
          import.meta.env.NEXT_PUBLIC_API_URL ||
          "") + "/api/notifications/sms",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        console.error("SMS send failed", res.status, data);
        let detail = data?.message || t("sms_send_failed");
        if (data?.error) {
          try {
            detail += `: ${typeof data.error === "string" ? data.error : JSON.stringify(data.error)}`;
          } catch (e) {
            detail += ": (error details)";
          }
        }
        setSmsResult(detail);
        toast({ title: t("sms_failed"), description: detail });
      } else {
        setSmsResult(t("sms_sent"));
        toast({
          title: t("sms_sent"),
          description: `${t("receipt_sent_to")} ${smsPhone}`,
        });
        // close dialog after a short delay
        setTimeout(() => setSmsOpen(false), 800);
      }
    } catch (err: any) {
      console.error("SMS send exception", err);
      setSmsResult(String(err?.message || err));
    } finally {
      setSendingSms(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="receipt-preview bg-white text-black p-6 rounded-lg max-h-[60vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">{receipt.shopName}</h2>
          {receipt.shopAddress && (
            <p className="text-xs">{receipt.shopAddress}</p>
          )}
          {receipt.shopPhone && <p className="text-xs">{receipt.shopPhone}</p>}
          {receipt.receiptSlogan ? (
            <p className="text-xs mt-2">{receipt.receiptSlogan}</p>
          ) : (
            receipt.receiptHeader && <p className="text-xs mt-2">{receipt.receiptHeader}</p>
          )}
        </div>

        <Separator className="my-3 border-dashed border-gray-400" />

        {/* Receipt info */}
        <div className="flex justify-between text-xs mb-3">
          <div>
            <p>
              {t("receipt_label")}: {receipt.id}
            </p>
            <p>
              {t("cashier")}: {receipt.cashierName}
            </p>
          </div>
          <div className="text-right">
            <p>{format(new Date(receipt.date), "MMM dd, yyyy")}</p>
            <p>{format(new Date(receipt.date), "HH:mm:ss")}</p>
          </div>
        </div>

        <Separator className="my-3 border-dashed border-gray-400" />

        {/* Items */}
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-xs font-bold">
            <span className="flex-1">{t("item")}</span>
            <span className="w-12 text-center">{t("quantity_short")}</span>
            <span className="w-16 text-right">{t("price")}</span>
            <span className="w-20 text-right">{t("total")}</span>
          </div>
          {receipt.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs">
              <span className="flex-1 truncate pr-2">{item.product.name}</span>
              <span className="w-12 text-center">{item.quantity}</span>
              <span className="w-16 text-right">
                {item.product.sellingPrice.toFixed(2)}
              </span>
              <span className="w-20 text-right">
                {item.subtotal.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <Separator className="my-3 border-dashed border-gray-400" />

        {/* Totals */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>{t("subtotal")}:</span>
            <span>{receipt.subtotal.toFixed(2)} ETB</span>
          </div>
          {receipt.discount && (
            <div className="flex justify-between text-green-600">
              <span>{t("discount")}:</span>
              <span>-{receipt.discount.amount.toFixed(2)} ETB</span>
            </div>
          )}
          {(receipt.extraCharges || []).map((charge) => (
            <div key={charge.id} className="flex justify-between">
              <span>{charge.name}:</span>
              <span>+{charge.amount.toFixed(2)} ETB</span>
            </div>
          ))}
          <div className="flex justify-between">
            <span>
              {t("vat")} ({Number(receipt.taxRate ?? 0).toFixed(2)}%):
            </span>
            <span>{receipt.tax.toFixed(2)} ETB</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-400">
            <span>{t("total").toUpperCase()}:</span>
            <span>{receipt.total.toFixed(2)} ETB</span>
          </div>
          <div className="flex justify-between text-xs pt-1">
            <span>{t("payment_method")}:</span>
            <span className="uppercase">
              {receipt.paymentMethod.replace("_", " ")}
            </span>
          </div>
        </div>

        <Separator className="my-4 border-dashed border-gray-400" />

        {/* QR Code */}
        <div className="flex flex-col items-center">
            {/* QR code removed */}
        </div>

        {/* Footer */}
        {/* Footer slogan removed to avoid duplicate; slogan shown at top instead */}
        <p className="receipt-powered-by text-center mt-2">{t("powered_by_smart_pos")}</p>
        <p className="receipt-provider-phone text-center mt-1">{SYSTEM_PROVIDER_PHONE}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
        <Button onClick={handlePrint} className="flex-1">
          <Printer className="mr-2 h-4 w-4" />
          {t("print")}
        </Button>
        <Button
          variant="outline"
          onClick={handleDownloadPDF}
          className="flex-1"
        >
          <Download className="mr-2 h-4 w-4" />
          PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => setSmsOpen(true)}
          className="flex-1"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          SMS
        </Button>
        <Button onClick={onDone} className="flex-1">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {t("done") || "Done"}
        </Button>
      </div>

      {/* SMS Dialog */}
      <Dialog open={smsOpen} onOpenChange={setSmsOpen}>
        <DialogContent>
          <DialogTitle>{t("send_receipt_via_sms")}</DialogTitle>
          <DialogDescription>
            {t("enter_customer_name_and_phone")}
          </DialogDescription>
          <div className="space-y-2 mt-4">
            <div>
              <label className="text-sm">{t("name")}</label>
              <Input
                value={smsName}
                onChange={(e) =>
                  setSmsName((e.target as HTMLInputElement).value)
                }
              />
            </div>
            <div>
              <label className="text-sm">{t("phone")}</label>
              <Input
                value={smsPhone}
                onChange={(e) =>
                  setSmsPhone((e.target as HTMLInputElement).value)
                }
                placeholder={t("phone_example")}
              />
            </div>
            {smsResult && (
              <div className="text-sm text-muted-foreground">{smsResult}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSmsOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={sendSms} disabled={sendingSms}>
              {sendingSms ? t("sending") : t("send_sms")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

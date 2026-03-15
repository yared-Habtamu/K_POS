import { useTranslation } from "react-i18next";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
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
import { Printer, Download, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface ReceiptPreviewProps {
  receipt: Receipt;
  onDone: () => void;
}

export function ReceiptPreview({ receipt, onDone }: ReceiptPreviewProps) {
  const { t } = useTranslation();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // For now reuse print dialog — browsers can print to PDF.
    // A more robust implementation could use html2canvas + jsPDF.
    window.print();
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
          {receipt.receiptHeader && (
            <p className="text-xs mt-2">{receipt.receiptHeader}</p>
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
          <QRCodeSVG
            value={receipt.qrCodeData}
            size={100}
            level="M"
            includeMargin={false}
          />
          <p className="text-xs mt-2 text-gray-500">
            {t("scan_for_digital_receipt")}
          </p>
        </div>

        {/* Footer */}
        {receipt.receiptSlogan && (
          <p className="text-center text-xs mt-4">{receipt.receiptSlogan}</p>
        )}
        <p className="text-center text-xs mt-2 text-gray-500">
          {t("powered_by_smart_pos")}
        </p>
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

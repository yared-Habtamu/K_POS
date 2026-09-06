import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import type { Receipt } from "@/types";
import {
  Printer,
  Download,
  MessageSquare,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import printNodeBridge from "@/services/printBridge/printNodeBridge";
import { useSettingsStore } from "@/stores/settingsStore";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

import { buildReceiptEscPos } from "@/services/printBridge/escpos";

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
  const currentRole = useAuthStore.getState().user?.role || null;

  const [smsDialogOpen, setSmsDialogOpen] = useState(false);
  const [smsPhone, setSmsPhone] = useState("+251");
  const [sendingSms, setSendingSms] = useState(false);

  const handlePrint = async () => {
    try {
      const settings = useSettingsStore.getState();
      const printNodeId = settings.printNodeId;

      const escposCommands = buildReceiptEscPos(receipt, {
        lineWidth: 48,
        supportPhone: SYSTEM_PROVIDER_PHONE,
      });

      try {
        await printNodeBridge.printRaw(escposCommands, {
          printerId: printNodeId || undefined,
        });
        toast({
          title: t("receipt_printed"),
          description: t("sent_to_printnode"),
        });
        return;
      } catch (e: any) {
        console.warn("PrintNode failed:", e);
        toast({
          variant: "destructive",
          title: t("print_failed"),
          description: e.message || t("printnode_unavailable"),
        });
        return;
      }
    } catch (err) {
      console.error("Print receipt failed", err);
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    const el = document.querySelector(".receipt-preview") as HTMLElement | null;
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      let imgW = pageW - margin * 2;
      let imgH = (canvas.height * imgW) / canvas.width;
      if (imgH > pageH - margin * 2) {
        imgH = pageH - margin * 2;
        imgW = (canvas.width * imgH) / canvas.height;
      }
      pdf.addImage(imgData, "PNG", (pageW - imgW) / 2, margin, imgW, imgH);
      pdf.save(`${receipt.id || "receipt"}.pdf`);
      toast({
        title: t("download_pdf"),
        description: `${receipt.id || "receipt"}.pdf`,
      });
    } catch (err) {
      console.error("PDF generation failed", err);
      toast({
        variant: "destructive",
        title: t("pdf_failed"),
        description: err instanceof Error ? err.message : "Could not generate PDF",
      });
    }
  };

  const buildSmsMessage = () => {
    const items = (receipt.items || [])
      .slice(0, 6)
      .map((it) => {
        const name = it.product?.name || it.name || "Item";
        const qty = it.quantity || 1;
        const lineTotal = Number(
          it.subtotal || (it.product?.sellingPrice || 0) * qty
        ).toFixed(0);
        return `${name} x${qty} ${lineTotal}ETB`;
      })
      .join("; ");
    return `Receipt ${receipt.id} - ${receipt.shopName}. Total: ${Number(
      receipt.total
    ).toFixed(2)} ETB. Items: ${items}. Thank you!`;
  };

  const sendSms = async (phone: string) => {
    const normalized = String(phone).replace(/[^0-9+]/g, "");
    if (!/^\+?[0-9]{7,15}$/.test(normalized)) {
      toast({
        variant: "destructive",
        title: t("sms_failed"),
        description: t("invalid_phone"),
      });
      return;
    }
    setSendingSms(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const token = useAuthStore.getState().user?.token;
      const res = await fetch(`${API_BASE}/api/notifications/sms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phone: normalized, message: buildSmsMessage() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to send SMS");
      }
      toast({
        title: t("sms_sent"),
        description: `${t("receipt_sent_to")} ${normalized}`,
      });
      setSmsDialogOpen(false);
    } catch (err) {
      console.error("SMS send failed", err);
      toast({
        variant: "destructive",
        title: t("sms_failed"),
        description: err instanceof Error ? err.message : t("sms_send_failed"),
      });
    } finally {
      setSendingSms(false);
    }
  };

  const normalizePhoneDigits = (phone: string) => {
    let digits = String(phone || "").replace(/\D/g, "");
    if (digits.startsWith("251")) digits = digits.slice(3);
    else if (digits.startsWith("0")) digits = digits.slice(1);
    return digits;
  };

  const handleSms = () => {
    const customerPhone = receipt.customerPhone;
    setSmsPhone(customerPhone ? normalizePhoneDigits(customerPhone) : "");
    setSmsDialogOpen(true);
  };

  const handleSendSms = () => {
    void sendSms("+251" + smsPhone);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onDone()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogTitle className="sr-only">{t("receipt")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("receipt_preview_for")} {receipt.id}
        </DialogDescription>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          <div className="receipt-preview">
            <div className="bg-card p-4 sm:p-6 rounded-lg shadow-md border border-border max-w-[350px] mx-auto font-sans text-sm">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-foreground">
                  {receipt.shopName || t("pos_receipt")}
                </h2>
                {receipt.shopAddress && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {receipt.shopAddress}
                  </p>
                )}
                {receipt.shopPhone && (
                  <p className="text-xs text-muted-foreground">
                    {t("tel")}: {receipt.shopPhone}
                  </p>
                )}
                {(receipt.receiptSlogan || receipt.receiptHeader) && (
                  <p className="text-xs text-muted-foreground italic mt-1">
                    {receipt.receiptSlogan || receipt.receiptHeader}
                  </p>
                )}
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>
                  {t("receipt_label")}: <span className="font-mono">{receipt.id}</span>
                </span>
                <span>{format(new Date(receipt.date), "MMM dd, yyyy")}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mb-3">
                <span>
                  {t("cashier")}:{" "}
                  <span className="font-medium text-foreground">
                    {receipt.cashierName || t("cashier")}
                  </span>
                </span>
                <span>{format(new Date(receipt.date), "HH:mm:ss")}</span>
              </div>
              {receipt.customerName && (
                <div className="text-xs text-muted-foreground mb-3">
                  {t("customer")}:{" "}
                  <span className="font-medium text-foreground">
                    {receipt.customerName}
                  </span>
                </div>
              )}
              <Separator className="my-3" />
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <span>{t("item_details")}</span>
                  <span>{t("total")}</span>
                </div>
                {(receipt.items || []).map((item, index) => (
                  <div key={item.product?.id || index} className="text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-foreground">
                        {item.product?.name || item.name || t("item_fallback")}
                      </span>
                      <span className="font-semibold text-foreground">
                        {Number(
                          item.subtotal ||
                            (item.product?.sellingPrice || 0) * (item.quantity || 1)
                        ).toFixed(2)}{" "}
                        {t("etb")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.quantity || 1} x{" "}
                      {Number(item.product?.sellingPrice ?? item.price ?? 0).toFixed(2)}{" "}
                      {t("etb")}
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-3" />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("subtotal")}</span>
                  <span className="font-medium text-foreground">
                    {Number(receipt.subtotal).toFixed(2)} {t("etb")}
                  </span>
                </div>
                {receipt.discount && (
                  <div className="flex justify-between text-green-600">
                    <span>{t("discount")}</span>
                    <span className="font-medium">
                      -{Number(receipt.discount.amount).toFixed(2)} {t("etb")}
                    </span>
                  </div>
                )}
                {(receipt.extraCharges || []).map((charge) => (
                  <div key={charge.name} className="flex justify-between">
                    <span className="text-muted-foreground">{charge.name}:</span>
                    <span className="font-medium">
                      +{Number(charge.amount).toFixed(2)} {t("etb")}
                    </span>
                  </div>
                ))}
                {receipt.tax && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("vat")} ({Number(receipt.taxRate || 0).toFixed(1)}%):
                    </span>
                    <span className="font-medium text-foreground">
                      {Number(receipt.tax).toFixed(2)} {t("etb")}
                    </span>
                  </div>
                )}
              </div>
              <Separator className="my-3" />
              <div className="flex justify-between text-lg font-bold text-foreground">
                <span>{t("total_label")}</span>
                <span>{Number(receipt.total).toFixed(2)} {t("etb")}</span>
              </div>
              <Separator className="my-3" />
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("payment_method")}</span>
                  <span className="font-medium text-foreground">
                    {(receipt.paymentMethod || t("cash"))
                      .toUpperCase()
                      .replace("_", " ")}
                  </span>
                </div>
                {receipt.amountPaid != null &&
                  (receipt.paymentMethod === "credit" ||
                    receipt.paymentMethod === "wallet") && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("paid_upfront")}</span>
                      <span className="font-medium text-foreground">
                        {Number(receipt.amountPaid).toFixed(2)} {t("etb")}
                      </span>
                    </div>
                  )}
                {receipt.creditAmount != null &&
                  receipt.creditAmount > 0 &&
                  (receipt.paymentMethod === "credit" ||
                    receipt.paymentMethod === "wallet") && (
                    <div className="flex justify-between font-bold">
                      <span>{t("remaining_credit")}</span>
                      <span className="text-foreground">
                        {Number(receipt.creditAmount).toFixed(2)} {t("etb")}
                      </span>
                    </div>
                  )}
              </div>
              <Separator className="my-4" />
              <div className="text-center text-xs text-muted-foreground">
                <p>{t("powered_by")}</p>
                <p>{t("support")}: {SYSTEM_PROVIDER_PHONE}</p>
                <p className="mt-1 font-medium">{t("thank_you")}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-muted/50 px-6 py-4 border-t">
          <DialogFooter className="flex-row gap-3 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4 mr-2" />
              {t("print_btn")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleDownloadPdf}
            >
              <Download className="h-4 w-4 mr-2" />
              {t("pdf")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleSms}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {t("sms")}
            </Button>
            <Button size="sm" className="flex-1" onClick={onDone}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {t("done")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>

      {/* SMS phone number dialog (walk-in / no customer phone) */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle>{t("send_receipt_via_sms")}</DialogTitle>
          <DialogDescription>{t("enter_phone_number")}</DialogDescription>
          <div className="space-y-2">
            <Label htmlFor="sms-phone">{t("phone_number")}</Label>
            <div className="flex gap-2">
              <Input
                value="+251"
                readOnly
                className="w-20 text-center font-semibold bg-muted"
                aria-label="+251"
              />
              <Input
                id="sms-phone"
                value={smsPhone}
                onChange={(e) =>
                  setSmsPhone(e.target.value.replace(/\D/g, ""))
                }
                placeholder="9X XXX XXXX"
                inputMode="tel"
                className="flex-1"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setSmsDialogOpen(false)}
              disabled={sendingSms}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleSendSms} disabled={sendingSms}>
              {sendingSms ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("sending")}
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {t("send")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

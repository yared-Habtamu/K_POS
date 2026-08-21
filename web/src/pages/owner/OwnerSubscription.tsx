import { formatLocalizedDate } from "@/utils/ethiopian-calendar";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  Building2,
  Upload,
  Calendar,
  Sparkles,
  ShieldCheck,
  Zap,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  History,
  XCircle,
  Eye,
  RefreshCw,
} from "lucide-react";

type SubscriptionPackage = {
  months: number;
  name: string;
  durationDays: number;
  price: number;
  defaultPrice?: number;
  discountLabel?: string;
};

type PaymentMethod = {
  id: string;
  method: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  active?: boolean;
};

type SubscriptionData = {
  martId: string;
  martName: string;
  status: string;
  subscriptionStatus: string;
  daysLeft: number | null;
  isTrial?: boolean;
  packageName?: string;
  packageMonths?: number | null;
  feeEtb: number;
  billingPeriodDays: number;
  startDate?: string;
  endDate?: string;
  exceeded: boolean;
};

type SubscriptionPaymentRecord = {
  id: string;
  martId: string;
  martName?: string;
  userId: string;
  userName?: string;
  packageName: string;
  packageMonths: number;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentReference?: string;
  receiptUrl: string;
  status: "pending" | "approved" | "rejected";
  approverId?: string;
  approverName?: string;
  reason?: string;
  decidedAt?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  createdAt: string;
};

export default function OwnerSubscriptionPage() {
  const { t } = useTranslation();
  const auth = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const API_BASE = import.meta.env.VITE_API_URL || "";

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${auth?.token}`,
      "Content-Type": "application/json",
    }),
    [auth?.token],
  );

  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState<SubscriptionData | null>(null);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [payments, setPayments] = useState<SubscriptionPaymentRecord[]>([]);

  // Payment flow modal state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // View Receipt Modal
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusRes, methodsRes, paymentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/subscriptions/my-status`, { headers }),
        fetch(`${API_BASE}/api/subscriptions/payment-methods`, { headers }),
        fetch(`${API_BASE}/api/subscriptions/my-payments`, { headers }),
      ]);

      if (statusRes.ok) {
        const data = await statusRes.json();
        setSubData(data.subscription || null);
        if (Array.isArray(data.packages)) {
          setPackages(data.packages);
        }
      }

      if (methodsRes.ok) {
        const data = await methodsRes.json();
        setPaymentMethods(Array.isArray(data) ? data : []);
      }

      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to load subscription data", err);
      toast({
        title: t("error_loading_subscription"),
        description: t("error_loading_sub_desc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.token) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ title: t("copied_to_clipboard"), description: text });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSelectPackage = (pkg: SubscriptionPackage) => {
    setSelectedPackage(pkg);
    if (paymentMethods.length > 0) {
      setSelectedMethod(paymentMethods[0]);
    }
    setReceiptFile(null);
    setReceiptPreview(null);
    setPaymentReference("");
    setIsPaymentOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: t("invalid_file_type"),
        description: t("invalid_file_type_desc"),
        variant: "destructive",
      });
      return;
    }

    setReceiptFile(file);
    const url = URL.createObjectURL(file);
    setReceiptPreview(url);
  };

  const handleSubmitPayment = async () => {
    if (!selectedPackage) {
      toast({ title: t("please_select_package"), variant: "destructive" });
      return;
    }

    if (!selectedMethod) {
      toast({ title: t("please_select_method"), variant: "destructive" });
      return;
    }

    if (!receiptFile) {
      toast({
        title: t("receipt_required"),
        description: t("receipt_required_desc"),
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("packageMonths", String(selectedPackage.months));
      formData.append("paymentMethod", selectedMethod.method || selectedMethod.bankName);
      if (paymentReference) {
        formData.append("paymentReference", paymentReference);
      }
      formData.append("receipt", receiptFile);

      const res = await fetch(`${API_BASE}/api/subscriptions/pay`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth?.token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Submission failed with status ${res.status}`);
      }

      toast({
        title: t("receipt_submitted"),
        description: t("receipt_submitted_desc"),
      });

      setIsPaymentOpen(false);
      await loadData();
    } catch (err: any) {
      console.error("Payment submission error", err);
      toast({
        title: t("submission_failed"),
        description: err.message || t("submission_failed_desc"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pending and Rejected payment alerts
  const latestPayment = payments[0] || null;
  const hasPendingPayment = latestPayment?.status === "pending";
  const lastPaymentRejected = latestPayment?.status === "rejected";

  const isTrial = Boolean(subData?.isTrial);
  const isSuspended = subData?.subscriptionStatus === "suspended" || subData?.status === "suspended";
  const isWarning = subData?.subscriptionStatus === "warning";
  const daysLeft = subData?.daysLeft ?? 0;

  return (
    <RoleLayout allowedRoles={["owner"]}>
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("subscription_billing")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("subscription_billing_desc")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="self-start sm:self-auto gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            {t("refresh_status")}
          </Button>
        </div>

        {/* Dynamic Alerts */}
        {hasPendingPayment && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3.5">
            <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-amber-500">{t("payment_under_review")}</h4>
              <p className="text-sm text-foreground/80 mt-0.5">
                {t("payment_under_review_desc")} <strong>{latestPayment.packageName}</strong> ({latestPayment.amount} {t("etb")}).
                {" "}{t("payment_review_note")}
              </p>
            </div>
          </div>
        )}

        {lastPaymentRejected && !hasPendingPayment && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-3.5">
            <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-destructive">{t("previous_payment_rejected")}</h4>
              <p className="text-sm text-foreground/80 mt-0.5">
                {t("reason_label")}: <span className="font-medium text-destructive">{latestPayment.reason || "Invalid receipt"}</span>.
                {" "}{t("resubmit_prompt")}
              </p>
            </div>
          </div>
        )}

        {isSuspended && !hasPendingPayment && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/15 p-5 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-base font-bold text-destructive">
                {isTrial ? t("trial_expired") : t("subscription_expired")}
              </h4>
              <p className="text-sm text-foreground/90 mt-1">
                {t("expired_restriction_msg")}
              </p>
            </div>
          </div>
        )}

        {/* Current Plan Overview Card */}
        <Card className="border shadow-sm overflow-hidden bg-card/60 backdrop-blur-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-blue-500 to-indigo-600" />
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-xl flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-primary" />
                {t("current_subscription_status")}
              </CardTitle>
              {isTrial ? (
                <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 px-3 py-1 text-xs">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t("seven_day_free_trial")}
                </Badge>
              ) : isSuspended ? (
                <Badge variant="destructive" className="gap-1.5 px-3 py-1 text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t("expired_suspended")}
                </Badge>
              ) : isWarning ? (
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 border border-amber-500/30 gap-1.5 px-3 py-1 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {t("expiring_soon")} ({daysLeft} {t("days")})
                </Badge>
              ) : (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-3 py-1 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t("active_subscription")}
                </Badge>
              )}
            </div>
            <CardDescription>
              {t("current_status_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("active_package")}</p>
                <p className="text-lg font-bold mt-1.5 text-foreground">
                  {subData?.packageName || (isTrial ? t("seven_day_free_trial") : t("standard_plan"))}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("days_remaining")}</p>
                <p className={`text-lg font-bold mt-1.5 ${daysLeft <= 3 ? "text-destructive" : daysLeft <= 7 ? "text-amber-500" : "text-emerald-500"}`}>
                  {typeof daysLeft === "number" ? (daysLeft > 0 ? `${daysLeft} ${t("days")}` : `0 ${t("days")} (${t("expired_label")})`) : "N/A"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("start_date")}</p>
                <p className="text-base font-semibold mt-1.5 text-foreground">
                  {subData?.startDate ? formatLocalizedDate(subData.startDate) : "N/A"}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/50">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("expiration_date")}</p>
                <p className="text-base font-semibold mt-1.5 text-foreground">
                  {subData?.endDate ? formatLocalizedDate(subData.endDate) : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Packages Selection Grid */}
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("available_packages")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("available_packages_desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {packages.map((pkg) => {
              const isPopular = pkg.months === 6;
              const isBestValue = pkg.months === 12;

              return (
                <div
                  key={pkg.months}
                  className={`relative rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                    isBestValue
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : isPopular
                      ? "border-blue-500/60 bg-blue-500/5 shadow-md shadow-blue-500/10"
                      : "border-border/80 bg-card hover:border-border"
                  }`}
                >
                  {isBestValue && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full shadow-sm">
                      {t("best_value")}
                    </span>
                  )}
                  {isPopular && !isBestValue && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full shadow-sm">
                      {t("most_popular")}
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-foreground">{pkg.name}</h3>
                      {pkg.discountLabel && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-semibold text-primary">
                          {pkg.discountLabel}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 mb-5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-foreground">{pkg.price.toLocaleString()}</span>
                        <span className="text-xs font-semibold text-muted-foreground">{t("etb")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        ~{Math.round(pkg.price / pkg.months).toLocaleString()} {t("etb")} {t("per_month")}
                      </p>
                    </div>

                    <ul className="space-y-2 text-xs text-muted-foreground mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{pkg.durationDays} {t("days_full_access")}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{t("unlimited_pos_terminals")}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{t("inventory_barcode")}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{t("realtime_reports")}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{t("cloud_backups")}</span>
                      </li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => handleSelectPackage(pkg)}
                    className={`w-full font-semibold ${isBestValue ? "shadow-glow" : ""}`}
                    variant={isBestValue || isPopular ? "default" : "outline"}
                  >
                    {t("select_and_pay")}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription & Payment History Table */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  {t("payment_history")}
                </CardTitle>
                <CardDescription>
                  {t("payment_history_desc")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("submission_date")}</TableHead>
                    <TableHead>{t("package")}</TableHead>
                    <TableHead>{t("amount")}</TableHead>
                    <TableHead>{t("method")}</TableHead>
                    <TableHead>{t("receipt")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("reviewed_by")}</TableHead>
                    <TableHead>{t("notes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {formatLocalizedDate(p.createdAt, { withTime: true })}
                      </TableCell>
                      <TableCell className="font-semibold text-sm">{p.packageName}</TableCell>
                      <TableCell className="font-bold text-sm">{p.amount.toLocaleString()} {p.currency}</TableCell>
                      <TableCell className="text-xs">{p.paymentMethod}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewReceiptUrl(p.receiptUrl)}
                          className="h-8 gap-1.5 text-xs text-primary hover:text-primary"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {t("view")}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {p.status === "approved" ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            {t("approved")}
                          </Badge>
                        ) : p.status === "rejected" ? (
                          <Badge variant="destructive" className="gap-1 text-[11px]">
                            <XCircle className="w-3 h-3" />
                            {t("rejected")}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-500/20 text-amber-600 border border-amber-500/30 gap-1 text-[11px]">
                            <Clock className="w-3 h-3" />
                            {t("pending_review")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.approverName || (p.status === "pending" ? t("awaiting_review") : "-")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {p.reason || p.paymentReference || "-"}
                      </TableCell>
                    </TableRow>
                  ))}

                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                        {t("no_payments_found")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Payment & Receipt Upload Modal */}
        <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CreditCard className="w-5 h-5 text-primary" />
                {t("subscription_payment")}: {selectedPackage?.name}
              </DialogTitle>
              <DialogDescription>
                {t("transfer_instructions")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* Package Summary Box */}
              <div className="rounded-xl border bg-muted/30 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("selected_package")}</p>
                  <p className="text-lg font-bold text-foreground">{selectedPackage?.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedPackage?.durationDays} {t("days_access")}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("total_amount")}</p>
                  <p className="text-2xl font-extrabold text-primary">{selectedPackage?.price.toLocaleString()} {t("etb")}</p>
                </div>
              </div>

              {/* Step 1: Choose Bank / Account */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">{t("select_payment_destination")}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {paymentMethods.map((method) => {
                    const isSelected = selectedMethod?.id === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethod(method)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border/70 hover:border-border bg-card"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-foreground truncate">{method.method}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1 truncate">{method.bankName}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Bank Details Box */}
                {selectedMethod && (
                  <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">{t("account_holder")}:</span>
                      <span className="text-sm font-bold text-foreground">{selectedMethod.accountName}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">{t("account_number")}:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold text-primary">{selectedMethod.accountNumber}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(selectedMethod.accountNumber, "accNum")}
                          className="h-7 px-2 text-xs"
                        >
                          {copiedKey === "accNum" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>

                    {selectedMethod.instructions && (
                      <p className="text-xs text-muted-foreground pt-1 border-t border-primary/20">
                        <strong>{t("note_label")}:</strong> {selectedMethod.instructions}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Step 2: Upload Receipt */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">{t("upload_payment_proof")} *</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-muted/20 transition-all relative">
                  <input
                    type="file"
                    id="receipt-upload-input"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {receiptPreview ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="max-h-48 rounded-lg object-contain border shadow-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {t("click_drag_change")} ({receiptFile?.name})
                      </p>
                    </div>
                  ) : (
                    <div className="py-4 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-medium text-foreground">{t("click_drag_receipt")}</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("supports_formats")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Reference / Notes */}
              <div className="space-y-2">
                <Label htmlFor="payment-ref" className="text-xs font-semibold">
                  {t("transaction_reference")}
                </Label>
                <Input
                  id="payment-ref"
                  placeholder={t("transaction_ref_placeholder")}
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsPaymentOpen(false)} disabled={isSubmitting}>
                {t("cancel")}
              </Button>
              <Button onClick={handleSubmitPayment} disabled={isSubmitting || !receiptFile} className="gap-2">
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t("submitting")}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {t("submit_for_approval")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Full Receipt Lightbox Modal */}
        <Dialog open={Boolean(viewReceiptUrl)} onOpenChange={(open) => !open && setViewReceiptUrl(null)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {t("payment_receipt_image")}
              </DialogTitle>
            </DialogHeader>
            {viewReceiptUrl && (
              <div className="flex justify-center p-2">
                <img
                  src={viewReceiptUrl}
                  alt="Full receipt"
                  className="max-h-[70vh] rounded-lg object-contain border shadow-sm"
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewReceiptUrl(null)}>
                {t("close")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleLayout>
  );
}

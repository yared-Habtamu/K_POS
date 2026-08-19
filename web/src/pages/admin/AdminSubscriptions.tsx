import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  XCircle,
  Clock,
  CreditCard,
  Building2,
  Settings,
  RefreshCw,
  Eye,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  FileText,
  ShieldCheck,
  History,
  Store,
  Layers,
} from "lucide-react";

type SubscriptionSettings = {
  defaultFeeEtb: number;
  billingPeriodDays: number;
  defaultProductLimit: number;
  defaultTransactionLimit: number;
  warningDaysBeforeExpiry: number;
  autoSuspendEnabled: boolean;
  trialPeriodDays: number;
  packagePrices: Record<string, number>;
  paymentMethods: PlatformPaymentMethod[];
};

type PlatformPaymentMethod = {
  id: string;
  method: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  instructions: string;
  active: boolean;
};

type MartSubscriptionRow = {
  martId: string;
  martName: string;
  status: string;
  subscriptionStatus: string;
  billingPeriodDays?: number;
  daysLeft: number | null;
  productCount?: number;
  productLimit?: number;
  transactionCount?: number;
  transactionLimit?: number;
  feeEtb: number;
  startDate?: string;
  endDate?: string;
  isTrial?: boolean;
  packageName?: string;
  exceeded: boolean;
};

type SubscriptionPaymentRecord = {
  id: string;
  martId: string;
  martName?: string;
  userId: string;
  userName?: string;
  userPhone?: string;
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

type PlanForm = {
  feeEtb: string;
  billingPeriodDays: string;
  productLimit: string;
  transactionLimit: string;
  subscriptionEndDate: string;
  unsuspend: boolean;
};

const defaultSettings: SubscriptionSettings = {
  defaultFeeEtb: 1000,
  billingPeriodDays: 30,
  defaultProductLimit: 100,
  defaultTransactionLimit: 500,
  warningDaysBeforeExpiry: 5,
  autoSuspendEnabled: true,
  trialPeriodDays: 7,
  packagePrices: {
    "1": 1000,
    "3": 2700,
    "6": 5000,
    "9": 7200,
    "12": 9000,
  },
  paymentMethods: [],
};

function toInputDate(dateValue?: string) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function statusVariant(s: string) {
  if (s === "active" || s === "approved") return "default" as const;
  if (s === "suspended" || s === "rejected") return "destructive" as const;
  if (s === "warning") return "secondary" as const;
  return "outline" as const;
}

export default function AdminSubscriptionsPage() {
  const { t } = useTranslation();
  const auth = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${auth?.token}`, "Content-Type": "application/json" }),
    [auth?.token],
  );
  const API_BASE = import.meta.env.VITE_API_URL || "";

  const [activeTab, setActiveTab] = useState("approvals");
  const [settings, setSettings] = useState<SubscriptionSettings>(defaultSettings);
  const [marts, setMarts] = useState<MartSubscriptionRow[]>([]);
  const [payments, setPayments] = useState<SubscriptionPaymentRecord[]>([]);
  const [planForms, setPlanForms] = useState<Record<string, PlanForm>>({});

  const [loading, setLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMart, setSavingMart] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);

  // Approval / Rejection state
  const [selectedPayment, setSelectedPayment] = useState<SubscriptionPaymentRecord | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processingDecision, setProcessingDecision] = useState(false);

  // View Receipt Modal
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);

  // Mart details modal
  const [selectedMartId, setSelectedMartId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingMartId, setEditingMartId] = useState<string | null>(null);

  // Platform Payment Method Form State
  const [isAddPaymentMethodOpen, setIsAddPaymentMethodOpen] = useState(false);
  const [newMethodName, setNewMethodName] = useState("");
  const [newBankName, setNewBankName] = useState("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newInstructions, setNewInstructions] = useState("");

  const pendingPayments = useMemo(
    () => payments.filter((p) => p.status === "pending"),
    [payments],
  );

  const selectedMart = useMemo(
    () => marts.find((r) => r.martId === selectedMartId) || null,
    [marts, selectedMartId],
  );

  const editingForm = editingMartId ? planForms[editingMartId] : undefined;

  const loadAll = async () => {
    try {
      setLoading(true);
      const [settingsRes, martsRes, paymentsRes] = await Promise.all([
        fetch(`${API_BASE}/api/subscriptions/settings`, { headers }),
        fetch(`${API_BASE}/api/subscriptions/marts`, { headers }),
        fetch(`${API_BASE}/api/subscriptions/payments`, { headers }),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings({
          defaultFeeEtb: Number(data.defaultFeeEtb || 1000),
          billingPeriodDays: Number(data.billingPeriodDays || 30),
          defaultProductLimit: Number(data.defaultProductLimit || 100),
          defaultTransactionLimit: Number(data.defaultTransactionLimit || 500),
          warningDaysBeforeExpiry: Number(data.warningDaysBeforeExpiry || 5),
          autoSuspendEnabled: Boolean(data.autoSuspendEnabled),
          trialPeriodDays: Number(data.trialPeriodDays || 7),
          packagePrices: data.packagePrices || defaultSettings.packagePrices,
          paymentMethods: Array.isArray(data.paymentMethods) ? data.paymentMethods : [],
        });
      }

      if (martsRes.ok) {
        const rows = (await martsRes.json()) as MartSubscriptionRow[];
        setMarts(Array.isArray(rows) ? rows : []);

        const nextForms: Record<string, PlanForm> = {};
        (Array.isArray(rows) ? rows : []).forEach((row) => {
          nextForms[row.martId] = {
            feeEtb: String(Math.round(Number(row.feeEtb || 0))),
            billingPeriodDays: String(
              Math.round(Number(row.billingPeriodDays || 30)),
            ),
            productLimit: String(Math.round(Number(row.productLimit || 100))),
            transactionLimit: String(Math.round(Number(row.transactionLimit || 500))),
            subscriptionEndDate: toInputDate(row.endDate),
            unsuspend: false,
          };
        });
        setPlanForms(nextForms);
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(Array.isArray(paymentsData.data) ? paymentsData.data : []);
      }
    } catch (err) {
      console.error("Failed to load subscription data", err);
      toast({
        title: t("load_failed_sub"),
        description: t("load_failed_sub_desc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.token) {
      loadAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  const onSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const res = await fetch(`${API_BASE}/api/subscriptions/settings`, {
        method: "PUT",
        headers,
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      toast({
        title: t("settings_saved"),
        description: t("settings_saved_desc"),
      });
      await loadAll();
    } catch (err) {
      console.error(err);
      toast({
        title: t("settings_save_failed"),
        description: t("settings_save_failed_desc"),
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApprovePayment = async () => {
    if (!selectedPayment) return;
    try {
      setProcessingDecision(true);
      const res = await fetch(`${API_BASE}/api/subscriptions/payments/${selectedPayment.id}/approve`, {
        method: "PUT",
        headers,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to approve payment");
      }

      toast({
        title: t("payment_approved"),
        description: `${t("subscription_activated_for")} ${selectedPayment.martName || "the mart"} (${selectedPayment.packageName}).`,
      });

      setIsApproveOpen(false);
      setSelectedPayment(null);
      await loadAll();
    } catch (err: any) {
      console.error(err);
      toast({
        title: t("approval_failed"),
        description: err.message || t("approval_failed_desc"),
        variant: "destructive",
      });
    } finally {
      setProcessingDecision(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedPayment) return;
    try {
      setProcessingDecision(true);
      const res = await fetch(`${API_BASE}/api/subscriptions/payments/${selectedPayment.id}/reject`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ reason: rejectReason.trim() || "Invalid receipt image or payment details" }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to reject payment");
      }

      toast({
        title: t("payment_rejected"),
        description: t("owner_notified"),
      });

      setIsRejectOpen(false);
      setSelectedPayment(null);
      setRejectReason("");
      await loadAll();
    } catch (err: any) {
      console.error(err);
      toast({
        title: t("rejection_failed"),
        description: err.message || t("rejection_failed_desc"),
        variant: "destructive",
      });
    } finally {
      setProcessingDecision(false);
    }
  };

  const handleAddPaymentMethod = async () => {
    if (!newMethodName || !newBankName || !newAccountName || !newAccountNumber) {
      toast({
        title: t("missing_fields"),
        description: t("missing_fields_desc"),
        variant: "destructive",
      });
      return;
    }

    const newMethod: PlatformPaymentMethod = {
      id: "pm-" + Date.now(),
      method: newMethodName.trim(),
      bankName: newBankName.trim(),
      accountName: newAccountName.trim(),
      accountNumber: newAccountNumber.trim(),
      instructions: newInstructions.trim(),
      active: true,
    };

    const updatedMethods = [...(settings.paymentMethods || []), newMethod];
    const updatedSettings = { ...settings, paymentMethods: updatedMethods };
    setSettings(updatedSettings);

    try {
      await fetch(`${API_BASE}/api/subscriptions/settings`, {
        method: "PUT",
        headers,
        body: JSON.stringify(updatedSettings),
      });

      toast({ title: t("payment_method_added") });
      setIsAddPaymentMethodOpen(false);
      setNewMethodName("");
      setNewBankName("");
      setNewAccountName("");
      setNewAccountNumber("");
      setNewInstructions("");
    } catch (e) {
      toast({ title: t("payment_method_failed"), variant: "destructive" });
    }
  };

  const handleTogglePaymentMethod = async (id: string, active: boolean) => {
    const updated = (settings.paymentMethods || []).map((m) => (m.id === id ? { ...m, active } : m));
    const updatedSettings = { ...settings, paymentMethods: updated };
    setSettings(updatedSettings);
    await fetch(`${API_BASE}/api/subscriptions/settings`, {
      method: "PUT",
      headers,
      body: JSON.stringify(updatedSettings),
    });
  };

  const handleDeletePaymentMethod = async (id: string) => {
    const updated = (settings.paymentMethods || []).filter((m) => m.id !== id);
    const updatedSettings = { ...settings, paymentMethods: updated };
    setSettings(updatedSettings);
    await fetch(`${API_BASE}/api/subscriptions/settings`, {
      method: "PUT",
      headers,
      body: JSON.stringify(updatedSettings),
    });
    toast({ title: t("payment_method_removed") });
  };

  const onRunCheckAll = async () => {
    try {
      setCheckingAll(true);
      const res = await fetch(`${API_BASE}/api/subscriptions/check-all`, {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error(`Check failed (${res.status})`);
      toast({
        title: t("check_complete"),
        description: t("check_complete_desc"),
      });
      await loadAll();
    } catch (err) {
      console.error(err);
      toast({
        title: t("check_failed"),
        description: t("check_failed_desc"),
        variant: "destructive",
      });
    } finally {
      setCheckingAll(false);
    }
  };

  const onSaveMartPlan = async (martId: string) => {
    try {
      setSavingMart(martId);
      const form = planForms[martId];
      if (!form) return;

      const payload: Record<string, unknown> = {
        feeEtb: Number(form.feeEtb || 0),
        billingPeriodDays: Number(form.billingPeriodDays || 30),
        productLimit: Number(form.productLimit || 100),
        transactionLimit: Number(form.transactionLimit || 500),
      };

      if (form.subscriptionEndDate) {
        payload.subscriptionEndDate = new Date(form.subscriptionEndDate).toISOString();
      }

      const res = await fetch(`${API_BASE}/api/subscriptions/marts/${martId}/plan`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status})`);

      await loadAll();
      toast({
        title: t("plan_updated"),
        description: t("plan_updated_desc"),
      });
    } catch (err) {
      console.error(err);
      toast({
        title: t("update_failed"),
        description: t("update_failed_desc"),
        variant: "destructive",
      });
    } finally {
      setSavingMart(null);
    }
  };

  const updatePlanForm = (martId: string, patch: Partial<PlanForm>) => {
    setPlanForms((prev) => ({
      ...prev,
      [martId]: {
        ...(prev[martId] || {
          feeEtb: "0",
          billingPeriodDays: "30",
          productLimit: "100",
          transactionLimit: "500",
          subscriptionEndDate: "",
          unsuspend: false,
        }),
        ...patch,
      },
    }));
  };

  return (
    <RoleLayout allowedRoles={["system_admin"]}>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("subscription_management")}</h1>
            <p className="text-muted-foreground mt-1">
              {t("subscription_management_desc")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAll}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              {t("refresh")}
            </Button>
            <Button
              size="sm"
              onClick={onRunCheckAll}
              disabled={checkingAll || loading}
            >
              {checkingAll ? t("running") : t("run_global_check")}
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 p-1 bg-muted/60">
            <TabsTrigger value="approvals" className="gap-2 relative">
              <Clock className="w-4 h-4" />
              <span>{t("approvals")}</span>
              {pendingPayments.length > 0 && (
                <Badge className="ml-1.5 bg-amber-500 hover:bg-amber-600 text-white px-1.5 py-0 text-[10px] font-bold">
                  {pendingPayments.length}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="payments" className="gap-2">
              <History className="w-4 h-4" />
              <span>{t("all_payment_history")}</span>
            </TabsTrigger>

            <TabsTrigger value="marts" className="gap-2">
              <Store className="w-4 h-4" />
              <span>{t("mart_subscriptions")}</span>
            </TabsTrigger>

            <TabsTrigger value="packages" className="gap-2">
              <Layers className="w-4 h-4" />
              <span>{t("package_pricing")}</span>
            </TabsTrigger>

            <TabsTrigger value="accounts" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span>{t("platform_accounts")}</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PENDING APPROVALS QUEUE */}
          <TabsContent value="approvals" className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-500" />
                      {t("pending_approvals")} ({pendingPayments.length})
                    </CardTitle>
                    <CardDescription>
                      {t("pending_approvals_desc")}
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
                        <TableHead>{t("mart_name")}</TableHead>
                        <TableHead>{t("owner_details")}</TableHead>
                        <TableHead>{t("package")}</TableHead>
                        <TableHead>{t("amount")}</TableHead>
                        <TableHead>{t("method")}</TableHead>
                        <TableHead>{t("receipt")}</TableHead>
                        <TableHead className="text-right">{t("action")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingPayments.map((p) => (
                        <TableRow key={p.id} className="hover:bg-muted/40">
                          <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell className="font-bold text-sm">{p.martName || t("unknown_mart")}</TableCell>
                          <TableCell className="text-xs">
                            <p className="font-medium text-foreground">{p.userName}</p>
                            {p.userPhone && <p className="text-muted-foreground">{p.userPhone}</p>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-semibold text-xs">
                              {p.packageName}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-sm text-primary">
                            {p.amount.toLocaleString()} {p.currency}
                          </TableCell>
                          <TableCell className="text-xs">{p.paymentMethod}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewReceiptUrl(p.receiptUrl)}
                              className="h-8 gap-1.5 text-xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {t("view_receipt")}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedPayment(p);
                                  setRejectReason("");
                                  setIsRejectOpen(true);
                                }}
                              >
                                {t("reject")}
                              </Button>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => {
                                  setSelectedPayment(p);
                                  setIsApproveOpen(true);
                                }}
                              >
                                {t("approve")}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      {pendingPayments.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                            <p className="text-base font-semibold text-foreground">{t("no_pending_approvals")}</p>
                            <p className="text-xs text-muted-foreground mt-1">{t("all_payments_processed")}</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: COMPLETE PAYMENT AUDIT HISTORY */}
          <TabsContent value="payments" className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  {t("all_payment_submissions")}
                </CardTitle>
                <CardDescription>
                  {t("all_payment_desc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("date")}</TableHead>
                        <TableHead>{t("mart")}</TableHead>
                        <TableHead>{t("package")}</TableHead>
                        <TableHead>{t("amount")}</TableHead>
                        <TableHead>{t("method")}</TableHead>
                        <TableHead>{t("status")}</TableHead>
                        <TableHead>{t("receipt")}</TableHead>
                        <TableHead>{t("notes")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-semibold text-sm">{p.martName || p.martId}</TableCell>
                          <TableCell className="text-xs font-medium">{p.packageName}</TableCell>
                          <TableCell className="font-bold text-sm">{p.amount.toLocaleString()} {p.currency}</TableCell>
                          <TableCell className="text-xs">{p.paymentMethod}</TableCell>
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
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewReceiptUrl(p.receiptUrl)}
                              className="h-8 gap-1 text-xs text-primary"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {t("view")}
                            </Button>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {p.status === "approved" && (
                              <span>{t("approved_by")} {p.approverName} {t("on")} {p.decidedAt ? new Date(p.decidedAt).toLocaleDateString() : ""}</span>
                            )}
                            {p.status === "rejected" && (
                              <span className="text-destructive">{t("rejected")}: {p.reason || t("no_reason")}</span>
                            )}
                            {p.status === "pending" && <span>{t("awaiting_admin_review")}</span>}
                          </TableCell>
                        </TableRow>
                      ))}

                      {payments.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                            {t("no_payment_records")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: MART SUBSCRIPTION STATUS */}
          <TabsContent value="marts" className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Store className="w-5 h-5 text-primary" />
                  {t("mart_subscription_statuses")}
                </CardTitle>
                <CardDescription>
                  {t("mart_status_desc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("mart")}</TableHead>
                        <TableHead>{t("mart_status")}</TableHead>
                        <TableHead>{t("subscription")}</TableHead>
                        <TableHead>{t("plan_trial")}</TableHead>
                        <TableHead>{t("products_col")}</TableHead>
                        <TableHead>{t("transactions_col")}</TableHead>
                        <TableHead>{t("days_left")}</TableHead>
                        <TableHead>{t("action")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marts.map((row) => (
                        <TableRow
                          key={row.martId}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedMartId(row.martId);
                            setIsDetailsOpen(true);
                          }}
                        >
                          <TableCell className="font-bold text-sm">{row.martName}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(row.subscriptionStatus)}>{row.subscriptionStatus}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.isTrial ? (
                              <Badge className="bg-blue-600 text-white text-[10px]">{t("seven_day_free_trial")}</Badge>
                            ) : (
                              row.packageName || t("paid_plan")
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {typeof row.productCount === "number" ? `${row.productCount}/${row.productLimit || "\u221E"}` : "N/A"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {typeof row.transactionCount === "number" ? `${row.transactionCount}/${row.transactionLimit || "\u221E"}` : "N/A"}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">
                            {typeof row.daysLeft === "number" ? (
                              <span className={row.daysLeft <= 0 ? "text-destructive" : row.daysLeft <= 5 ? "text-amber-500" : "text-emerald-500"}>
                                {row.daysLeft} {t("days")}
                              </span>
                            ) : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingMartId(row.martId);
                              }}
                            >
                              {t("edit_plan")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {marts.length === 0 && !loading && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                            {t("no_marts_found")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: PACKAGE PRICING & TRIAL CONFIG */}
          <TabsContent value="packages" className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  {t("packages_trial_config")}
                </CardTitle>
                <CardDescription>
                  {t("packages_trial_desc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="space-y-2 p-4 rounded-xl border bg-muted/20">
                    <Label className="font-semibold text-sm">{t("trial_duration_label")}</Label>
                    <Input
                      type="number"
                      value={settings.trialPeriodDays}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          trialPeriodDays: Number(e.target.value || 7),
                        }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">{t("trial_duration_desc")}</p>
                  </div>

                  <div className="space-y-2 p-4 rounded-xl border bg-muted/20">
                    <Label className="font-semibold text-sm">{t("one_month_price")}</Label>
                    <Input
                      type="number"
                      value={settings.packagePrices["1"] ?? 1000}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          packagePrices: { ...prev.packagePrices, "1": Number(e.target.value || 0) },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2 p-4 rounded-xl border bg-muted/20">
                    <Label className="font-semibold text-sm">{t("three_months_price")}</Label>
                    <Input
                      type="number"
                      value={settings.packagePrices["3"] ?? 2700}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          packagePrices: { ...prev.packagePrices, "3": Number(e.target.value || 0) },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2 p-4 rounded-xl border bg-muted/20">
                    <Label className="font-semibold text-sm">{t("six_months_price")}</Label>
                    <Input
                      type="number"
                      value={settings.packagePrices["6"] ?? 5000}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          packagePrices: { ...prev.packagePrices, "6": Number(e.target.value || 0) },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2 p-4 rounded-xl border bg-muted/20">
                    <Label className="font-semibold text-sm">{t("nine_months_price")}</Label>
                    <Input
                      type="number"
                      value={settings.packagePrices["9"] ?? 7200}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          packagePrices: { ...prev.packagePrices, "9": Number(e.target.value || 0) },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2 p-4 rounded-xl border bg-muted/20">
                    <Label className="font-semibold text-sm">{t("twelve_months_price")}</Label>
                    <Input
                      type="number"
                      value={settings.packagePrices["12"] ?? 9000}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          packagePrices: { ...prev.packagePrices, "12": Number(e.target.value || 0) },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2 border-t">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t("expiry_warning_days")}</Label>
                    <Input
                      type="number"
                      value={settings.warningDaysBeforeExpiry}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          warningDaysBeforeExpiry: Number(e.target.value || 5),
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">{t("auto_suspend_expired")}</Label>
                    <div className="flex items-center h-10 gap-3">
                      <Switch
                        checked={settings.autoSuspendEnabled}
                        onCheckedChange={(checked) =>
                          setSettings((prev) => ({
                            ...prev,
                            autoSuspendEnabled: checked,
                          }))
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {settings.autoSuspendEnabled ? t("auto_suspend_enabled") : t("disabled")}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <Button onClick={onSaveSettings} disabled={savingSettings} className="gap-2">
                    {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {t("save_pricing")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 5: PLATFORM PAYMENT ACCOUNTS */}
          <TabsContent value="accounts" className="space-y-4">
            <Card className="border shadow-sm">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-primary" />
                      {t("platform_payment_accounts")}
                    </CardTitle>
                    <CardDescription>
                      {t("platform_accounts_desc")}
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsAddPaymentMethodOpen(true)} className="gap-2 self-start sm:self-auto">
                    <Plus className="w-4 h-4" />
                    {t("add_payment_method")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(settings.paymentMethods || []).map((method) => (
                    <div key={method.id} className="p-4 rounded-xl border bg-card flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-base text-foreground">{method.method}</h4>
                          <Switch
                            checked={method.active !== false}
                            onCheckedChange={(checked) => handleTogglePaymentMethod(method.id, checked)}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{method.bankName}</p>

                        <div className="mt-3 p-2.5 rounded-lg bg-muted/40 text-xs space-y-1">
                          <p>
                            <span className="text-muted-foreground">{t("account_holder")}:</span>{" "}
                            <span className="font-semibold">{method.accountName}</span>
                          </p>
                          <p>
                            <span className="text-muted-foreground">{t("account_number")}:</span>{" "}
                            <span className="font-mono font-bold text-primary">{method.accountNumber}</span>
                          </p>
                        </div>

                        {method.instructions && (
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            "{method.instructions}"
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePaymentMethod(method.id)}
                          className="text-destructive hover:text-destructive h-8 px-2 gap-1 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {t("delete")}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {(settings.paymentMethods || []).length === 0 && (
                    <div className="col-span-3 text-center py-8 text-muted-foreground text-sm">
                      {t("no_platform_accounts")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal: Approve Payment */}
        <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                {t("confirm_approval")}
              </DialogTitle>
              <DialogDescription>
                {t("confirm_approval_desc")}
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && (
              <div className="space-y-3 py-2 text-sm">
                <div className="p-3 rounded-lg bg-muted/40 space-y-1.5">
                  <p><strong>{t("mart")}:</strong> {selectedPayment.martName}</p>
                  <p><strong>{t("package")}:</strong> {selectedPayment.packageName} ({selectedPayment.packageMonths} {t("days")})</p>
                  <p><strong>{t("amount")}:</strong> {selectedPayment.amount.toLocaleString()} {selectedPayment.currency}</p>
                  <p><strong>{t("method")}:</strong> {selectedPayment.paymentMethod}</p>
                  {selectedPayment.paymentReference && (
                    <p><strong>{t("transaction_reference")}:</strong> {selectedPayment.paymentReference}</p>
                  )}
                </div>

                <div className="text-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setViewReceiptUrl(selectedPayment.receiptUrl)}
                    className="gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    {t("inspect_receipt")}
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApproveOpen(false)} disabled={processingDecision}>
                {t("cancel")}
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={handleApprovePayment}
                disabled={processingDecision}
              >
                {processingDecision ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {t("confirm_activate")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Reject Payment */}
        <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                {t("reject_receipt")}
              </DialogTitle>
              <DialogDescription>
                {t("reject_receipt_desc")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Label className="text-sm font-semibold">{t("rejection_reason")} *</Label>
              <Textarea
                placeholder={t("rejection_placeholder")}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectOpen(false)} disabled={processingDecision}>
                {t("cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectPayment}
                disabled={processingDecision || !rejectReason.trim()}
                className="gap-2"
              >
                {processingDecision ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {t("reject_receipt_btn")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Add Payment Method */}
        <Dialog open={isAddPaymentMethodOpen} onOpenChange={setIsAddPaymentMethodOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                {t("add_platform_account")}
              </DialogTitle>
              <DialogDescription>
                {t("add_platform_desc")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t("method_label")} *</Label>
                <Input
                  placeholder={t("method_placeholder")}
                  value={newMethodName}
                  onChange={(e) => setNewMethodName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t("bank_provider")} *</Label>
                <Input
                  placeholder={t("bank_placeholder")}
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t("account_holder_name")} *</Label>
                <Input
                  placeholder={t("account_holder_placeholder")}
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t("account_number_phone")} *</Label>
                <Input
                  placeholder={t("account_number_placeholder")}
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{t("deposit_instructions")}</Label>
                <Input
                  placeholder={t("deposit_instructions_placeholder")}
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddPaymentMethodOpen(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={handleAddPaymentMethod}>
                {t("save_payment_account")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: View Receipt Lightbox */}
        <Dialog open={Boolean(viewReceiptUrl)} onOpenChange={(open) => !open && setViewReceiptUrl(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {t("submitted_receipt")}
              </DialogTitle>
            </DialogHeader>
            {viewReceiptUrl && (
              <div className="flex justify-center p-2">
                <img
                  src={viewReceiptUrl}
                  alt="Payment Receipt"
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

        {/* Modal: Mart Details */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedMart?.martName || t("mart_details")}</DialogTitle>
              <DialogDescription>{t("mart_details_desc")}</DialogDescription>
            </DialogHeader>
            {selectedMart && (
              <div className="space-y-2 text-sm">
                <div>{t("mart_status")}: <span className="font-medium">{selectedMart.status}</span></div>
                <div>{t("subscription")}: <span className="font-medium">{selectedMart.subscriptionStatus}</span></div>
                <div>{t("package")}: <span className="font-medium">{selectedMart.packageName || (selectedMart.isTrial ? t("seven_day_free_trial") : t("standard_plan"))}</span></div>
                <div>{t("fee_etb")}: <span className="font-medium">{selectedMart.feeEtb} {t("etb")}</span></div>
                <div>{t("billing_days")}: <span className="font-medium">{selectedMart.billingPeriodDays || 30}</span></div>
                <div>{t("products_col")}: <span className="font-medium">{selectedMart.productCount ?? "N/A"} / {selectedMart.productLimit ?? "\u221E"}</span></div>
                <div>{t("transactions_col")}: <span className="font-medium">{selectedMart.transactionCount ?? "N/A"} / {selectedMart.transactionLimit ?? "\u221E"}</span></div>
                <div>{t("days_left")}: <span className="font-medium">{selectedMart.daysLeft ?? "N/A"}</span></div>
                <div>{t("start_date")}: <span className="font-medium">{selectedMart.startDate ? new Date(selectedMart.startDate).toLocaleDateString() : "N/A"}</span></div>
                <div>{t("expiration_date")}: <span className="font-medium">{selectedMart.endDate ? new Date(selectedMart.endDate).toLocaleDateString() : "N/A"}</span></div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>{t("close")}</Button>
              {selectedMart && (
                <Button
                  onClick={() => {
                    setIsDetailsOpen(false);
                    setEditingMartId(selectedMart.martId);
                  }}
                >
                  {t("edit_plan")}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Edit Mart Plan */}
        <Dialog open={Boolean(editingMartId)} onOpenChange={(open) => !open && setEditingMartId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("update_mart_plan")}</DialogTitle>
              <DialogDescription>{t("update_mart_plan_desc")}</DialogDescription>
            </DialogHeader>

            {editingMartId && editingForm && (
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label>{t("fee_etb")}</Label>
                  <Input
                    type="number"
                    value={editingForm.feeEtb}
                    onChange={(e) => updatePlanForm(editingMartId, { feeEtb: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("billing_days")}</Label>
                  <Input
                    type="number"
                    value={editingForm.billingPeriodDays}
                    onChange={(e) => updatePlanForm(editingMartId, { billingPeriodDays: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("product_limit")}</Label>
                  <Input
                    type="number"
                    value={editingForm.productLimit}
                    onChange={(e) => updatePlanForm(editingMartId, { productLimit: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("transaction_limit")}</Label>
                  <Input
                    type="number"
                    value={editingForm.transactionLimit}
                    onChange={(e) => updatePlanForm(editingMartId, { transactionLimit: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("subscription_end_date")}</Label>
                  <Input
                    type="date"
                    value={editingForm.subscriptionEndDate}
                    onChange={(e) => updatePlanForm(editingMartId, { subscriptionEndDate: e.target.value })}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMartId(null)}>{t("cancel")}</Button>
              <Button
                onClick={async () => {
                  if (!editingMartId) return;
                  await onSaveMartPlan(editingMartId);
                  setEditingMartId(null);
                }}
                disabled={Boolean(editingMartId && savingMart === editingMartId)}
              >
                {editingMartId && savingMart === editingMartId ? t("saving") : t("save_changes")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleLayout>
  );
}

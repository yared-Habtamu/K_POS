import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Wallet,
  ArrowUpFromLine,
  Camera,
  Loader2,
  RotateCw,
  Check,
  X,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { OpenCashTransactions } from "@/components/open-cash/OpenCashTransactions";
import type { OpenCashRequestDTO } from "@/types";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function ManagerOpenCashPage() {
  const { t } = useTranslation();
  const auth = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const token = auth?.token;
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const [requests, setRequests] = useState<OpenCashRequestDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Return form
  const [amount, setAmount] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pendingDecision, setPendingDecision] = useState<{
    id: string;
    action: "approve" | "reject";
    itemLabel: string;
  } | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.append("status", statusFilter);
      const res = await fetch(
        `${API_BASE}/api/open-cash-requests/transactions?${qs.toString()}`,
        { headers: { Authorization: token ? `Bearer ${token}` : "" } },
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed with ${res.status}`);
      }
      const json = await res.json();
      setRequests(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      console.error("Failed to load open cash requests", err);
      toast.error(
        t("failed_to_load_requests", {
          defaultValue: "Failed to load open cash requests",
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshOpenCash = async () => {
    try {
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const me = await res.json();
      const current = useAuthStore.getState().user;
      if (!current) return;
      setUser({
        ...current,
        openCashBalance: Number(me.openCashBalance || 0),
      });
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    refreshOpenCash();
    const id = window.setInterval(refreshOpenCash, 20_000);
    window.addEventListener("focus", refreshOpenCash);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", refreshOpenCash);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE]);

  const submitReturn = async () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.warning(
        t("invalid_amount", { defaultValue: "Enter a valid amount." }),
      );
      return;
    }
    if (!receiptFile) {
      toast.warning(
        t("receipt_required", { defaultValue: "Receipt image is required." }),
      );
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("direction", "return");
      fd.append("amount", String(parsedAmount));
      fd.append("receipt", receiptFile);

      const res = await fetch(`${API_BASE}/api/open-cash-requests`, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
        body: fd,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed with ${res.status}`);
      }

      toast.success(
        t("submitted_for_approval", {
          defaultValue:
            "Submitted for approval. Balance will update once approved.",
        }),
      );
      setAmount("");
      setReceiptFile(null);
      setReceiptPreview(null);
      await fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(
        t("failed_to_submit_request", {
          defaultValue: "Failed to submit open cash request",
        }) +
          (message ? `: ${message}` : ""),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const decideRequest = async (
    id: string,
    action: "approve" | "reject",
    reason?: string,
  ) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/open-cash-requests/${id}/${action}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify(reason ? { reason } : {}),
        },
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed with ${res.status}`);
      }

      toast.success(
        action === "approve"
          ? t("request_approved_success", {
              defaultValue: "Request approved",
            })
          : t("request_rejected_success", {
              defaultValue: "Request rejected",
            }),
      );
      await fetchRequests();
      await refreshOpenCash();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(
        t("action_failed", { defaultValue: "Action failed" }) +
          (message ? `: ${message}` : ""),
      );
    }
  };

  const confirmDecision = async () => {
    if (!pendingDecision) return;
    const { id, action } = pendingDecision;
    setPendingDecision(null);
    await decideRequest(id, action);
  };

  const pendingAllocations = requests.filter(
    (r) =>
      r.direction === "allocation" &&
      r.status === "pending" &&
      String(r.managerId) === String(auth?.id),
  );
  const myPendingReturns = requests.filter(
    (r) =>
      r.direction === "return" &&
      r.status === "pending" &&
      String(r.requesterId) === String(auth?.id),
  );

  return (
    <RoleLayout allowedRoles={["manager"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {t("open_cash", { defaultValue: "Open Cash" })}
            </h1>
            <p className="text-muted-foreground">
              {t("balance_changes_after_approval", {
                defaultValue: "Balance changes only after approval.",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => void fetchRequests()}
              disabled={loading}
              aria-label="Refresh open cash requests"
              title="Refresh open cash requests"
            >
              <RotateCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/60 bg-gradient-to-br from-background via-background to-muted/40">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("open_cash_balance", {
                      defaultValue: "Open Cash Balance",
                    })}
                  </p>
                  <p className="text-2xl font-bold">
                    {Number(auth?.openCashBalance || 0).toLocaleString()} ETB
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="return-amount">
                  {t("amount", { defaultValue: "Amount" })} (ETB)
                </Label>
                <Input
                  id="return-amount"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="return-receipt">
                  {t("receipt_image", { defaultValue: "Receipt Image" })} *
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="return-receipt"
                    type="file"
                    accept="image/*"
                    onChange={(e: any) => {
                      const f = e.target.files?.[0] || null;
                      setReceiptFile(f);
                      setReceiptPreview(f ? URL.createObjectURL(f) : null);
                    }}
                  />
                  <input
                    id="return-receipt-camera"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e: any) => {
                      const f = e.target.files?.[0] || null;
                      setReceiptFile(f);
                      setReceiptPreview(f ? URL.createObjectURL(f) : null);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      document.getElementById("return-receipt-camera")?.click()
                    }
                    aria-label={t("take_photo", "Take photo")}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("return_form_description", {
                    defaultValue:
                      "Return open cash to the owner. The owner must approve the receipt before the balance changes.",
                  })}
                </p>
                {receiptPreview ? (
                  <img
                    src={receiptPreview}
                    className="h-24 w-auto object-cover rounded-md border"
                    alt={t("receipt_image", { defaultValue: "Receipt" })}
                  />
                ) : null}
              </div>

              <Button
                type="button"
                className="h-11 w-full"
                onClick={() => void submitReturn()}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("submitting", { defaultValue: "Submitting..." })}
                  </>
                ) : (
                  <>
                    <ArrowUpFromLine className="mr-2 h-4 w-4" />
                    {t("return_cash", { defaultValue: "Return Cash" })}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                {t("allocations_awaiting_approval", {
                  defaultValue: "Allocations Awaiting Approval",
                })}
                <Badge variant="secondary">{pendingAllocations.length}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("manager_approves_allocations", {
                  defaultValue: "Receiving manager approves allocations.",
                })}
              </p>
            </CardHeader>
            <CardContent>
              {pendingAllocations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("no_pending_requests", {
                    defaultValue: "No pending requests.",
                  })}
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingAllocations.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {Number(r.amount || 0).toLocaleString()} ETB
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.requesterName || r.requesterId} ·{" "}
                          {new Date(r.createdAt).toLocaleString()}
                        </p>
                        {r.receiptUrl ? (
                          <a
                            href={r.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline"
                          >
                            {t("view_receipt", { defaultValue: "View" })}{" "}
                            {t("receipt_image", {
                              defaultValue: "Receipt Image",
                            })}
                          </a>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPendingDecision({
                              id: r.id,
                              action: "reject",
                              itemLabel: `${r.amount} ETB`,
                            })
                          }
                        >
                          <X className="mr-1 h-4 w-4" />
                          {t("reject", { defaultValue: "Reject" })}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() =>
                            setPendingDecision({
                              id: r.id,
                              action: "approve",
                              itemLabel: `${r.amount} ETB`,
                            })
                          }
                        >
                          <Check className="mr-1 h-4 w-4" />
                          {t("approve", { defaultValue: "Approve" })}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="h-5 w-5" />
              {t("my_pending_returns", {
                defaultValue: "My Pending Returns",
              })}
              <Badge variant="secondary">{myPendingReturns.length}</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("returns_awaiting_approval", {
                defaultValue: "Awaiting owner approval",
              })}
            </p>
          </CardHeader>
          <CardContent>
            {myPendingReturns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("no_pending_requests", {
                  defaultValue: "No pending requests.",
                })}
              </p>
            ) : (
              <div className="space-y-3">
                {myPendingReturns.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {Number(r.amount || 0).toLocaleString()} ETB
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {new Date(r.createdAt).toLocaleString()}
                      </p>
                      {r.receiptUrl ? (
                        <a
                          href={r.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary underline"
                        >
                          {t("view_receipt", { defaultValue: "View" })}{" "}
                          {t("receipt_image", {
                            defaultValue: "Receipt Image",
                          })}
                        </a>
                      ) : null}
                    </div>
                    <Badge variant="secondary">
                      {t("pending", { defaultValue: "Pending" })}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              {t("transaction_report", { defaultValue: "Transaction Report" })}
            </CardTitle>
            <div className="w-44">
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t("status", { defaultValue: "Status" })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t("all", { defaultValue: "All" })}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t("pending", { defaultValue: "Pending" })}
                  </SelectItem>
                  <SelectItem value="approved">
                    {t("approved", { defaultValue: "Approved" })}
                  </SelectItem>
                  <SelectItem value="rejected">
                    {t("rejected", { defaultValue: "Rejected" })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <OpenCashTransactions requests={requests} />
          </CardContent>
        </Card>

        <AlertDialog
          open={Boolean(pendingDecision)}
          onOpenChange={(open) => !open && setPendingDecision(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingDecision?.action === "approve"
                  ? t("approve_request", {
                      defaultValue: "Are you sure you want to approve this request?",
                    })
                  : t("reject_request", {
                      defaultValue: "Are you sure you want to reject this request?",
                    })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDecision
                  ? `${pendingDecision.action === "approve" ? t("approve", { defaultValue: "Approving" }) : t("reject", { defaultValue: "Rejecting" })} ${pendingDecision.itemLabel} — ${t("balance_changes_after_approval", { defaultValue: "Balance changes only after approval." })}`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t("cancel", { defaultValue: "Cancel" })}
              </AlertDialogCancel>
              <AlertDialogAction
                className={
                  pendingDecision?.action === "reject"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : undefined
                }
                onClick={() => {
                  void confirmDecision();
                }}
              >
                {pendingDecision?.action === "approve"
                  ? t("confirm_approve", { defaultValue: "Yes, approve" })
                  : t("confirm_reject", { defaultValue: "Yes, reject" })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleLayout>
  );
}

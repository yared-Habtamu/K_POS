import { formatLocalizedDate } from "@/utils/ethiopian-calendar";
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
  Plus,
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

interface ManagerOption {
  id: string;
  name: string;
  openCashBalance: number;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function OwnerOpenCashPage() {
  const { t } = useTranslation();
  const auth = useAuthStore((s) => s.user);
  const token = auth?.token;
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const [requests, setRequests] = useState<OpenCashRequestDTO[]>([]);
  const [allRequests, setAllRequests] = useState<OpenCashRequestDTO[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Allocation form
  const [managerId, setManagerId] = useState("");
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

  const fetchManagers = async () => {
    try {
      const martId = auth?.martId;
      if (!martId) return;
      const res = await fetch(
        `${API_BASE}/api/employees?martId=${martId}`,
        { headers: { Authorization: token ? `Bearer ${token}` : "" } },
      );
      if (!res.ok) return;
      const list = await res.json();
      if (!Array.isArray(list)) return;
      setManagers(
        list
          .filter((u: any) => u?.role === "manager")
          .map((u: any) => ({
            id: String(u._id || u.id || ""),
            name: String(u.name || u.username || "Unnamed"),
            openCashBalance: Number(u.openCashBalance || 0),
          }))
          .filter((m: any) => m.id),
      );
    } catch (err) {
      console.error("Load managers error", err);
    }
  };

  // Full (unfiltered) request list — used to compute per-manager aggregates
  const fetchAllRequests = async () => {
    try {
      const res = await fetch(
        `${API_BASE}/api/open-cash-requests/transactions`,
        { headers: { Authorization: token ? `Bearer ${token}` : "" } },
      );
      if (!res.ok) return;
      const json = await res.json();
      setAllRequests(Array.isArray(json.data) ? json.data : []);
    } catch {
      // ignore — summary just stays empty
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    fetchManagers();
    fetchAllRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-manager open cash summary:
  //   Allocated = Σ approved allocations, Returned = Σ approved returns,
  //   Left = current balance, Spent = Allocated − Returned − Left
  const managerSummaries = managers.map((m) => {
    const approved = allRequests.filter(
      (r) => String(r.managerId) === m.id && r.status === "approved",
    );
    const allocated = approved
      .filter((r) => r.direction === "allocation")
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const returned = approved
      .filter((r) => r.direction === "return")
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    const left = Number(m.openCashBalance || 0);
    const spent = Math.max(allocated - returned - left, 0);
    return { ...m, allocated, returned, spent, left };
  });

  const selectedManager = managers.find((m) => m.id === managerId);

  const submitAllocation = async () => {
    if (!managerId) {
      toast.warning(
        t("select_manager_placeholder", {
          defaultValue: "Select a manager",
        }),
      );
      return;
    }
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
      fd.append("direction", "allocation");
      fd.append("managerId", managerId);
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
      setManagerId("");
      setAmount("");
      setReceiptFile(null);
      setReceiptPreview(null);
      await Promise.all([fetchRequests(), fetchAllRequests()]);
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
      await Promise.all([fetchRequests(), fetchAllRequests()]);
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

  const pendingReturns = requests.filter(
    (r) => r.direction === "return" && r.status === "pending",
  );
  const myPendingAllocations = requests.filter(
    (r) =>
      r.direction === "allocation" &&
      r.status === "pending" &&
      String(r.requesterId) === String(auth?.id),
  );

  return (
    <RoleLayout allowedRoles={["owner"]}>
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

        {/* Per-manager open cash summary: allocated / spent / left */}
        {managerSummaries.length > 0 && (
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="h-4 w-4 text-primary" />
                {t("manager_open_cash_summary", {
                  defaultValue: "Manager Open Cash Summary",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-left border-b border-border/60">
                      <th className="py-2 pr-3 font-medium">
                        {t("manager", { defaultValue: "Manager" })}
                      </th>
                      <th className="py-2 px-3 font-medium text-right">
                        {t("allocated", { defaultValue: "Allocated" })}
                      </th>
                      <th className="py-2 px-3 font-medium text-right">
                        {t("spent", { defaultValue: "Spent" })}
                      </th>
                      <th className="py-2 px-3 font-medium text-right">
                        {t("returned", { defaultValue: "Returned" })}
                      </th>
                      <th className="py-2 pl-3 font-medium text-right">
                        {t("left", { defaultValue: "Left" })}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {managerSummaries.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="py-2 pr-3 font-medium">{m.name}</td>
                        <td className="py-2 px-3 text-right tabular-nums">
                          {m.allocated.toLocaleString()} ETB
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-destructive">
                          {m.spent.toLocaleString()} ETB
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                          {m.returned.toLocaleString()} ETB
                        </td>
                        <td className="py-2 pl-3 text-right font-semibold tabular-nums text-emerald-600">
                          {m.left.toLocaleString()} ETB
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/60 bg-gradient-to-br from-background via-background to-muted/40">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>
                    {t("allocate_cash_to_manager", {
                      defaultValue: "Allocate Cash to Manager",
                    })}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t("allocation_form_description", {
                      defaultValue:
                        "Allocate open cash to a manager. The receiving manager must approve the receipt before the balance changes.",
                    })}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  {t("receiving_manager", {
                    defaultValue: "Receiving Manager",
                  })}
                </Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger className="h-11">
                    <SelectValue
                      placeholder={t("select_manager_placeholder", {
                        defaultValue: "Select a manager",
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} —{" "}
                        {Number(m.openCashBalance || 0).toLocaleString()} ETB
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedManager ? (
                  <p className="text-xs text-muted-foreground">
                    {t("current_balance", {
                      defaultValue: "Current balance",
                    })}
                    :{" "}
                    {Number(
                      selectedManager.openCashBalance || 0,
                    ).toLocaleString()}{" "}
                    ETB
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="allocate-amount">
                  {t("amount", { defaultValue: "Amount" })} (ETB)
                </Label>
                <Input
                  id="allocate-amount"
                  type="number"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="allocate-receipt">
                  {t("receipt_image", { defaultValue: "Receipt Image" })} *
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="allocate-receipt"
                    type="file"
                    accept="image/*"
                    onChange={(e: any) => {
                      const f = e.target.files?.[0] || null;
                      setReceiptFile(f);
                      setReceiptPreview(f ? URL.createObjectURL(f) : null);
                    }}
                  />
                  <input
                    id="allocate-receipt-camera"
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
                      document.getElementById("allocate-receipt-camera")?.click()
                    }
                    aria-label={t("take_photo", "Take photo")}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("upload_receipt_help", {
                    defaultValue:
                      "Attach a photo of the receipt to document this transaction.",
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
                onClick={() => void submitAllocation()}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("submitting", { defaultValue: "Submitting..." })}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("allocate_cash", { defaultValue: "Allocate Cash" })}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                {t("returns_awaiting_approval", {
                  defaultValue: "Returns Awaiting Approval",
                })}
                <Badge variant="secondary">{pendingReturns.length}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("owner_approves_returns", {
                  defaultValue: "Owner approves returns.",
                })}
              </p>
            </CardHeader>
            <CardContent>
              {pendingReturns.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("no_pending_requests", {
                    defaultValue: "No pending requests.",
                  })}
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingReturns.map((r) => (
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
                          {formatLocalizedDate(r.createdAt, { withTime: true })}
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
              <Banknote className="h-5 w-5" />
              {t("my_pending_allocations", {
                defaultValue: "My Pending Allocations",
              })}
              <Badge variant="secondary">{myPendingAllocations.length}</Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("allocations_awaiting_approval", {
                defaultValue: "Awaiting manager approval",
              })}
            </p>
          </CardHeader>
          <CardContent>
            {myPendingAllocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("no_pending_requests", {
                  defaultValue: "No pending requests.",
                })}
              </p>
            ) : (
              <div className="space-y-3">
                {myPendingAllocations.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        {Number(r.amount || 0).toLocaleString()} ETB
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.managerName || r.managerId || ""} ·{" "}
                        {formatLocalizedDate(r.createdAt, { withTime: true })}
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

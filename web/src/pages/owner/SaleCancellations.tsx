import { formatLocalizedDate } from "@/utils/ethiopian-calendar";
import { useCallback, useEffect, useState } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Ban,
  Check,
  ChevronsUpDown,
  Loader2,
  RotateCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { SaleCancellationRequestDTO } from "@/types";

interface SaleCancellationItem extends SaleCancellationRequestDTO {
  sale?: { id: string; receiptId: string | null; total: number; date: string };
  requester?: { id: string; name: string };
  approver?: { id: string; name: string };
}

interface SaleOption {
  id: string;
  receiptId: string | null;
  total: number;
  date: string;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function SaleCancellationsPage() {
  const { t } = useTranslation();
  const auth = useAuthStore((s) => s.user);
  const role = auth?.role;
  const token = auth?.token;
  const martId = auth?.martId;
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const isOwner = role === "owner";
  const canRequest = role === "cashier" || role === "manager";
  const canDirectCancel = isOwner;

  const [requests, setRequests] = useState<SaleCancellationItem[]>([]);
  const [sales, setSales] = useState<SaleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Request form
  const [saleId, setSaleId] = useState("");
  const [saleOpen, setSaleOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Owner direct cancellation form
  const [directSaleId, setDirectSaleId] = useState("");
  const [directSaleOpen, setDirectSaleOpen] = useState(false);
  const [directReason, setDirectReason] = useState("");
  const [directSubmitting, setDirectSubmitting] = useState(false);

  const [pendingDecision, setPendingDecision] = useState<{
    id: string;
    action: "approve" | "reject";
    itemLabel: string;
  } | null>(null);

  const [pendingCancel, setPendingCancel] = useState<{
    saleId: string;
    receiptId: string;
  } | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.append("status", statusFilter);
      const res = await fetch(
        `${API_BASE}/api/sale-cancellation-requests?${qs.toString()}`,
        { headers: { Authorization: token ? `Bearer ${token}` : "" } },
      );
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed with ${res.status}`);
      }
      const json = await res.json();
      setRequests(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      console.error("Failed to load sale cancellation requests", err);
      toast.error(
        t("load_failed", {
          defaultValue: "Failed to load cancellation requests",
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [API_BASE, token, statusFilter, t]);

  const fetchSales = useCallback(async () => {
    if (!martId) return;
    try {
      const res = await fetch(`${API_BASE}/api/sales?martId=${martId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (!res.ok) return;
      const list = await res.json();
      if (!Array.isArray(list)) return;
      const alreadyRequested = new Set(
        requests.filter((r) => r.status === "pending").map((r) => r.saleId),
      );
      const userId = auth?.id ? String(auth.id) : "";
      setSales(
        list
          .filter(
            (s: any) =>
              !alreadyRequested.has(s.id) &&
              String(s.cashierId || "") === userId,
          )
          .map((s: any) => ({
            id: s.id,
            receiptId: s.receiptId || null,
            total: Number(s.total || 0),
            date: s.date,
          })),
      );
    } catch (err) {
      console.error("Load sales error", err);
    }
  }, [API_BASE, martId, token, requests, auth?.id]);

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    if (canRequest || canDirectCancel) {
      fetchSales();
    }
  }, [canRequest, canDirectCancel, fetchSales, requests.length]);

  const submitRequest = async () => {
    if (!saleId) {
      toast.warning(
        t("select_sale_placeholder", { defaultValue: "Select a receipt" }),
      );
      return;
    }
    if (reason.trim().length < 3) {
      toast.warning(
        t("enter_reason", { defaultValue: "Enter reason" }) +
          " (min 3 characters)",
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/sale-cancellation-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ saleId, reason: reason.trim() }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed with ${res.status}`);
      }

      toast.success(
        t("request_submitted", {
          defaultValue:
            "Cancellation request submitted. Awaiting owner approval.",
        }),
      );
      setSaleId("");
      setReason("");
      await fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(
        t("request_failed", {
          defaultValue: "Failed to submit cancellation request",
        }) +
          (message ? `: ${message}` : ""),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const decideRequest = async (id: string, action: "approve" | "reject") => {
    try {
      const res = await fetch(
        `${API_BASE}/api/sale-cancellation-requests/${id}/${action}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({}),
        },
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed with ${res.status}`);
      }

      toast.success(
        action === "approve"
          ? t("request_approved_success", { defaultValue: "Request approved" })
          : t("request_rejected_success", {
              defaultValue: "Request rejected",
            }),
      );
      await fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(
        t("action_failed", { defaultValue: "Action failed" }) +
          (message ? `: ${message}` : ""),
      );
    }
  };

  const directCancelSale = async () => {
    if (!pendingCancel) return;
    const { saleId: targetId } = pendingCancel;
    setPendingCancel(null);
    setDirectSubmitting(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/sale-cancellation-requests/direct`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({ saleId: targetId, reason: directReason.trim() }),
        },
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed with ${res.status}`);
      }

      toast.success(
        t("sale_cancelled_success", {
          defaultValue: "Sale cancelled successfully. Stock restored.",
        }),
      );
      setDirectSaleId("");
      setDirectReason("");
      await Promise.all([fetchRequests(), fetchSales()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(
        t("cancel_failed", { defaultValue: "Failed to cancel sale" }) +
          (message ? `: ${message}` : ""),
      );
    } finally {
      setDirectSubmitting(false);
    }
  };

  const confirmDecision = async () => {
    if (!pendingDecision) return;
    const { id, action } = pendingDecision;
    setPendingDecision(null);
    await decideRequest(id, action);
  };

  const statusBadge = (status: string) => {
    if (status === "approved") {
      return <Badge variant="secondary">{t("approved", "Approved")}</Badge>;
    }
    if (status === "rejected") {
      return <Badge variant="destructive">{t("rejected", "Rejected")}</Badge>;
    }
    return <Badge variant="secondary">{t("pending", "Pending")}</Badge>;
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");

  return (
    <RoleLayout allowedRoles={["owner", "manager", "cashier"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {t("sale_cancellation", { defaultValue: "Sale Cancellation" })}
            </h1>
            <p className="text-muted-foreground">
              {isOwner
                ? t("owner_approves_cancellations", {
                    defaultValue:
                      "Approve or reject whole-receipt cancellations. Approval restores stock and excludes the sale from reports.",
                  })
                : t("request_cancellation_help", {
                    defaultValue:
                      "Request cancellation of a completed receipt. The owner must approve it.",
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
              aria-label="Refresh cancellation requests"
              title="Refresh cancellation requests"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {isOwner ? (
          <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                {t("cancellation_requests", {
                  defaultValue: "Cancellation Requests",
                })}
                <Badge variant="secondary">{pendingRequests.length}</Badge>
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
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("no_requests_found", { defaultValue: "No requests found." })}
                </p>
              ) : (
                <div className="space-y-3">
                  {requests.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">
                          {r.sale?.receiptId || r.sale?.id || r.saleId}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t("sale_total", { defaultValue: "Sale Total" })}:{" "}
                          {Number(r.sale?.total || 0).toLocaleString()} ETB ·{" "}
                          {r.sale?.date
                            ? formatLocalizedDate(r.sale.date, { withTime: true })
                            : ""}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {t("requester", { defaultValue: "Requester" })}:{" "}
                          {r.requester?.name || r.requesterName || r.requesterId}{" "}
                          · {t("reason", { defaultValue: "Reason" })}: {r.reason}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatLocalizedDate(r.createdAt, { withTime: true })}
                        </p>
                        {r.status !== "pending" && (
                          <p className="text-xs text-muted-foreground truncate">
                            {t("approver", { defaultValue: "Approver" })}:{" "}
                            {r.approver?.name || r.approverName || r.approverId}
                            {r.decidedAt
                              ? ` · ${formatLocalizedDate(r.decidedAt, { withTime: true })}`
                              : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {statusBadge(r.status)}
                        {r.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setPendingDecision({
                                  id: r.id,
                                  action: "reject",
                                  itemLabel:
                                    r.sale?.receiptId || r.sale?.id || r.saleId,
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
                                  itemLabel:
                                    r.sale?.receiptId || r.sale?.id || r.saleId,
                                })
                              }
                            >
                              <Check className="mr-1 h-4 w-4" />
                              {t("approve", { defaultValue: "Approve" })}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-gradient-to-br from-background via-background to-muted/40 self-start">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                {t("direct_cancellation", {
                  defaultValue: "Cancel My Sale",
                })}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("direct_cancellation_help", {
                  defaultValue:
                    "Cancel a completed sale you made yourself - no approval needed. Stock is restored and the sale is excluded from reports.",
                })}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  {t("sale_receipt_id", { defaultValue: "Receipt ID" })}
                </Label>
                <Popover open={directSaleOpen} onOpenChange={setDirectSaleOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={directSaleOpen}
                      className="h-11 w-full justify-between font-normal"
                    >
                      {sales.find((s) => s.id === directSaleId)?.receiptId ||
                        sales.find((s) => s.id === directSaleId)?.id ||
                        t("select_sale_placeholder", {
                          defaultValue: "Select a receipt",
                        })}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput
                        placeholder={t("search_receipt_id", {
                          defaultValue: "Search receipt ID...",
                        })}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {sales.length === 0
                            ? t("no_your_sales_to_cancel", {
                                defaultValue:
                                  "No completed receipts from your sales available to cancel.",
                              })
                            : t("no_match_receipt", {
                                defaultValue: "No matching receipt found.",
                              })}
                        </CommandEmpty>
                        <CommandGroup>
                          {sales.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={`${s.receiptId || s.id}`}
                              onSelect={(currentValue) => {
                                const match = sales.find(
                                  (x) =>
                                    `${x.receiptId || x.id}`.toLowerCase() ===
                                    currentValue.toLowerCase(),
                                );
                                setDirectSaleId(match ? match.id : "");
                                setDirectSaleOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  directSaleId === s.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {s.receiptId || s.id} —{" "}
                              {Number(s.total || 0).toLocaleString()} ETB —{" "}
                              {formatLocalizedDate(s.date)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direct-cancellation-reason">
                  {t("cancellation_reason", {
                    defaultValue: "Cancellation Reason",
                  })}{" "}
                  *
                </Label>
                <Input
                  id="direct-cancellation-reason"
                  value={directReason}
                  onChange={(e) => setDirectReason(e.target.value)}
                  placeholder={t("enter_reason", {
                    defaultValue: "Enter reason",
                  })}
                  className="h-11"
                />
              </div>

              <Button
                type="button"
                className="h-11 w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={directSubmitting}
                onClick={() => {
                  if (!directSaleId) {
                    toast.warning(
                      t("select_sale_placeholder", {
                        defaultValue: "Select a receipt",
                      }),
                    );
                    return;
                  }
                  if (directReason.trim().length < 3) {
                    toast.warning(
                      t("enter_reason", { defaultValue: "Enter reason" }) +
                        " (min 3 characters)",
                    );
                    return;
                  }
                  const match = sales.find((s) => s.id === directSaleId);
                  setPendingCancel({
                    saleId: directSaleId,
                    receiptId: match?.receiptId || match?.id || directSaleId,
                  });
                }}
              >
                {directSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("cancelling", { defaultValue: "Cancelling..." })}
                  </>
                ) : (
                  <>
                    <Ban className="mr-2 h-4 w-4" />
                    {t("cancel_sale_directly", {
                      defaultValue: "Cancel Sale Directly",
                    })}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/60 bg-gradient-to-br from-background via-background to-muted/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="h-5 w-5" />
                  {t("request_cancellation", {
                    defaultValue: "Request Cancellation",
                  })}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("choose_sale_to_cancel", {
                    defaultValue:
                      "Choose the completed receipt you want to cancel.",
                  })}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>
                    {t("sale_receipt_id", { defaultValue: "Receipt ID" })}
                  </Label>
                  <Popover open={saleOpen} onOpenChange={setSaleOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={saleOpen}
                        className="h-11 w-full justify-between font-normal"
                      >
                        {sales.find((s) => s.id === saleId)?.receiptId ||
                          sales.find((s) => s.id === saleId)?.id ||
                          t("select_sale_placeholder", {
                            defaultValue: "Select a receipt",
                          })}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0"
                      align="start"
                    >
                      <Command>
                        <CommandInput
                          placeholder={t("search_receipt_id", {
                            defaultValue: "Search receipt ID...",
                          })}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {sales.length === 0
                              ? t("no_your_sales_to_cancel", {
                                  defaultValue:
                                    "No completed receipts from your sales available to cancel.",
                                })
                              : t("no_match_receipt", {
                                  defaultValue:
                                    "No matching receipt found.",
                                })}
                          </CommandEmpty>
                          <CommandGroup>
                            {sales.map((s) => (
                              <CommandItem
                                key={s.id}
                                value={`${s.receiptId || s.id}`}
                                onSelect={(currentValue) => {
                                  const match = sales.find(
                                    (x) =>
                                      `${x.receiptId || x.id}`.toLowerCase() ===
                                      currentValue.toLowerCase(),
                                  );
                                  setSaleId(match ? match.id : "");
                                  setSaleOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    saleId === s.id
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                {s.receiptId || s.id} —{" "}
                                {Number(s.total || 0).toLocaleString()} ETB —{" "}
                                {formatLocalizedDate(s.date)}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cancellation-reason">
                    {t("cancellation_reason", {
                      defaultValue: "Cancellation Reason",
                    })}{" "}
                    *
                  </Label>
                  <Input
                    id="cancellation-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("enter_reason", {
                      defaultValue: "Enter reason",
                    })}
                    className="h-11"
                  />
                </div>

                <Button
                  type="button"
                  className="h-11 w-full"
                  onClick={() => void submitRequest()}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("submitting", { defaultValue: "Submitting..." })}
                    </>
                  ) : (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      {t("submit_request", { defaultValue: "Submit Request" })}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="h-5 w-5" />
                  {t("my_requests", { defaultValue: "My Requests" })}
                  <Badge variant="secondary">{pendingRequests.length}</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("awaiting_approval", {
                    defaultValue: "Awaiting approval",
                  })}
                </p>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("no_requests_found", {
                      defaultValue: "No requests found.",
                    })}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {requests.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium">
                            {r.sale?.receiptId || r.sale?.id || r.saleId}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {t("sale_total", { defaultValue: "Sale Total" })}:{" "}
                            {Number(r.sale?.total || 0).toLocaleString()} ETB ·{" "}
                            {formatLocalizedDate(r.createdAt, { withTime: true })}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {t("reason", { defaultValue: "Reason" })}: {r.reason}
                          </p>
                          {r.status === "rejected" && r.approverName ? (
                            <p className="text-xs text-muted-foreground truncate">
                              {t("approver", { defaultValue: "Approver" })}:{" "}
                              {r.approverName}
                            </p>
                          ) : null}
                        </div>
                        {statusBadge(r.status)}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <AlertDialog
          open={Boolean(pendingDecision)}
          onOpenChange={(open) => !open && setPendingDecision(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingDecision?.action === "approve"
                  ? t("approve_cancellation_confirm", {
                      defaultValue:
                        "Are you sure you want to approve this sale cancellation? Stock will be restored and the sale will be excluded from reports.",
                    })
                  : t("reject_cancellation_confirm", {
                      defaultValue:
                        "Are you sure you want to reject this sale cancellation?",
                    })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDecision
                  ? `${pendingDecision.action === "approve" ? t("approve", { defaultValue: "Approving" }) : t("reject", { defaultValue: "Rejecting" })} ${pendingDecision.itemLabel}`
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

        <AlertDialog
          open={Boolean(pendingCancel)}
          onOpenChange={(open) => !open && setPendingCancel(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("cancel_sale_confirm", {
                  defaultValue:
                    "Are you sure you want to cancel this sale? This cannot be undone. Stock will be restored and the sale will be excluded from reports.",
                })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingCancel
                  ? `${
                      t("cancel_sale", { defaultValue: "Cancel sale" })
                    } ${pendingCancel.receiptId}`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t("cancel", { defaultValue: "Cancel" })}
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  void directCancelSale();
                }}
              >
                {t("confirm_cancel_sale", {
                  defaultValue: "Yes, cancel sale",
                })}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleLayout>
  );
}

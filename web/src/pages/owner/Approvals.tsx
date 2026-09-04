import { formatLocalizedDate } from "@/utils/ethiopian-calendar";
import { getImageUrl, handleImageError } from "@/utils/imageUrl";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  RotateCw,
  ArrowRight,
  GitMerge,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  User,
  Calendar,
  DollarSign,
  FileText,
  Tag,
  CreditCard,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/use-toast";
import type { AssetActionRequest, ExpenseActionRequest } from "@/types";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : formatLocalizedDate(d, { withTime: true });
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const label =
    status === "approved"
      ? t("approved")
      : status === "rejected"
        ? t("rejected")
        : t("pending_status", "Pending");
  return (
    <Badge
      variant={
        status === "approved"
          ? "default"
          : status === "rejected"
            ? "destructive"
            : "secondary"
      }
      className="capitalize"
    >
      {label}
    </Badge>
  );
}

function ImageThumb({ src, alt }: { src?: string | null; alt: string }) {
  const [open, setOpen] = useState(false);
  if (!src) return <span className="text-xs text-muted-foreground">—</span>;
  const resolvedUrl = getImageUrl(src);
  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="block"
        title="Click to enlarge"
      >
        <img
          src={resolvedUrl}
          alt={alt}
          className="h-12 w-12 rounded-md object-cover border border-border hover:opacity-80 transition-opacity cursor-zoom-in"
          onError={handleImageError}
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{alt}</DialogTitle>
          </DialogHeader>
          <img
            src={resolvedUrl}
            alt={alt}
            className="w-full rounded-lg object-contain max-h-[70vh]"
            onError={handleImageError}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Expense Detail Panel (shown when row is expanded) ────────────────────────

function ExpenseDetailPanel({ r }: { r: ExpenseActionRequest }) {
  const { t } = useTranslation();
  const p = r.payload || {};
  const screenshots: string[] = Array.isArray(p.screenshots) ? p.screenshots : [];

  return (
    <div className="px-4 pb-5 pt-3 bg-muted/30 border-t border-border/40 space-y-4">
      {/* Meta grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
            <User className="h-3 w-3" /> {t("requested_by")}
          </p>
          <p className="font-medium">{r.requesterName || "—"}</p>
          {r.requesterRole && (
            <Badge variant="outline" className="text-[10px] mt-0.5 capitalize">
              {r.requesterRole}
            </Badge>
          )}
        </div>

        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
            <Calendar className="h-3 w-3" /> {t("requested_at")}
          </p>
          <p className="font-medium">{formatDate(r.createdAt)}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
            <Tag className="h-3 w-3" /> {t("category")}
          </p>
          <p className="font-medium capitalize">{p.category || "—"}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
            <DollarSign className="h-3 w-3" /> {t("amount")}
          </p>
          <p className="font-bold text-base">{Number(p.amount || 0).toLocaleString()} ETB</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
            <Calendar className="h-3 w-3" /> {t("expense_date")}
          </p>
          <p className="font-medium">{p.date ? formatDate(p.date) : "—"}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
            <CreditCard className="h-3 w-3" /> {t("payment_type")}
          </p>
          <p className="font-medium capitalize">{p.paymentType ? t(p.paymentType, p.paymentType) : t("open_cash")}</p>
        </div>

        {p.name && (
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
              <Tag className="h-3 w-3" /> {t("item_name")}
            </p>
            <p className="font-medium">{p.name}</p>
          </div>
        )}

        {r.status !== "pending" && (
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
              <User className="h-3 w-3" /> {t("decided_by")}
            </p>
            <p className="font-medium">{r.approverName || "—"}</p>
          </div>
        )}

        {r.decidedAt && (
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
              <Calendar className="h-3 w-3" /> {t("decided_at")}
            </p>
            <p className="font-medium">{formatDate(r.decidedAt)}</p>
          </div>
        )}
      </div>

      {/* Description & Reason */}
      <div className="space-y-2">
        {p.description && (
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
              <FileText className="h-3 w-3" /> {t("description")}
            </p>
            <p className="text-sm bg-background rounded-md border border-border px-3 py-2">
              {p.description}
            </p>
          </div>
        )}
        {p.reason && (
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
              <FileText className="h-3 w-3" /> {t("reason_note")}
            </p>
            <p className="text-sm bg-background rounded-md border border-border px-3 py-2">
              {p.reason}
            </p>
          </div>
        )}
        {r.reason && r.status === "rejected" && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">{t("rejection_reason")}</p>
            <p className="text-sm bg-destructive/10 rounded-md border border-destructive/20 px-3 py-2 text-destructive">
              {r.reason}
            </p>
          </div>
        )}
      </div>

      {/* Images */}
      {(p.productPicture || p.paymentScreenshot || screenshots.length > 0) && (
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
            <ImageIcon className="h-3 w-3" /> {t("attachments")}
          </p>
          <div className="flex flex-wrap gap-3">
            {p.productPicture && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">{t("product_picture")}</p>
                <ImageThumb src={p.productPicture} alt={t("product_picture")} />
              </div>
            )}
            {p.paymentScreenshot && (
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">{t("payment_receipt")}</p>
                <ImageThumb src={p.paymentScreenshot} alt={t("payment_receipt")} />
              </div>
            )}
            {screenshots.map((s: string, i: number) => (
              <div key={i} className="space-y-1">
                <p className="text-[10px] text-muted-foreground">{t("screenshot")} {i + 1}</p>
                <ImageThumb src={s} alt={`${t("screenshot")} ${i + 1}`} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function OwnerApprovals() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const token = useAuthStore.getState().user?.token;
  const [assetRequests, setAssetRequests] = useState<AssetActionRequest[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<ExpenseActionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  // Approve confirm
  const [pendingApprove, setPendingApprove] = useState<{
    target: "asset" | "expense";
    id: string;
    itemLabel: string;
  } | null>(null);

  // Reject with reason
  const [pendingReject, setPendingReject] = useState<{
    target: "asset" | "expense";
    id: string;
    itemLabel: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.append("status", statusFilter);

      const [assetRes, expenseRes] = await Promise.all([
        fetch(`${API_BASE}/api/asset-action-requests?${qs.toString()}`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }),
        fetch(`${API_BASE}/api/expense-action-requests?${qs.toString()}`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }),
      ]);

      if (!assetRes.ok) {
        const e = await assetRes.json().catch(() => ({}));
        throw new Error(e.message || `Failed with ${assetRes.status}`);
      }
      if (!expenseRes.ok) {
        const e = await expenseRes.json().catch(() => ({}));
        throw new Error(e.message || `Failed with ${expenseRes.status}`);
      }

      const [assetJson, expenseJson] = await Promise.all([assetRes.json(), expenseRes.json()]);
      setAssetRequests(Array.isArray(assetJson) ? assetJson : []);
      setExpenseRequests(Array.isArray(expenseJson) ? expenseJson : []);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to load requests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    target: "asset" | "expense",
    id: string,
    action: "approve" | "reject",
    reason?: string
  ) => {
    try {
      const endpoint =
        target === "asset"
          ? `${API_BASE}/api/asset-action-requests/${id}/${action}`
          : `${API_BASE}/api/expense-action-requests/${id}/${action}`;

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(action === "reject" ? { reason } : {}),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || `Failed with ${res.status}`);
      }
      toast({ title: `${target === "asset" ? "Asset" : "Expense"} request ${action}d` });
      await fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Action failed", description: message, variant: "destructive" });
    }
  };

  useEffect(() => {
    void fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const toggleExpense = (id: string) =>
    setExpandedExpenseId((prev) => (prev === id ? null : id));

  // Pending count badge for filter buttons
  const pendingExpense = expenseRequests.filter((r) => r.status === "pending").length;
  const pendingAsset = assetRequests.filter((r) => r.status === "pending").length;

  return (
    <RoleLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("pending_requests") || "Approvals"}</h1>
            <p className="text-muted-foreground">
              {t("approvals_subtitle") || "Review and act on pending asset and expense requests."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            <Button
              variant="outline"
              size="icon"
              onClick={() => void fetchRequests()}
              disabled={loading}
              aria-label={t("refresh") || "Refresh approvals"}
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Staff Workflow History shortcut */}
        <Card
          className="cursor-pointer border-primary/30 hover:border-primary/60 hover:bg-accent/40 transition-all group"
          onClick={() => navigate("/owner/approval-history")}
          role="button"
          aria-label={t("staff_workflow_history") || "View store workflow history"}
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/owner/approval-history")}
        >
          <CardContent className="flex items-center justify-between py-4 px-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <GitMerge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-base">{t("staff_workflow_history") || "Staff Workflow History"}</p>
                <p className="text-sm text-muted-foreground">
                  {t("staff_workflow_history_desc") || "View all stock transfer, product add & edit approval flows between Storekeepers and Managers"}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardContent>
        </Card>

        {/* Status filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">{t("filter_label", "Filter")}:</span>
          {(["pending", "all", "approved", "rejected"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              className="capitalize"
            >
              {s === "pending"
                ? t("pending_status", "Pending")
                : s === "all"
                  ? t("all_filter", "All")
                  : s === "approved"
                    ? t("approved", "Approved")
                    : t("rejected", "Rejected")}
              {s === "pending" && pendingExpense + pendingAsset > 0 && statusFilter !== "pending" && (
                <span className="ml-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5">
                  {pendingExpense + pendingAsset}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* ── Asset Requests ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("asset_requests", "Asset Requests")}
              <Badge variant="secondary">{assetRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {assetRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 pb-6">{t("no_asset_requests_found", "No asset requests found.")}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("requested_at", "Requested At")}</TableHead>
                      <TableHead>{t("action", "Action")}</TableHead>
                      <TableHead>{t("asset", "Asset")}</TableHead>
                      <TableHead>{t("requested_by", "Requested By")}</TableHead>
                      <TableHead>{t("status", "Status")}</TableHead>
                      <TableHead>{t("decided_at", "Decided At")}</TableHead>
                      <TableHead>{t("reason", "Reason")}</TableHead>
                      <TableHead className="text-right">{t("actions", "Actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assetRequests.map((r) => {
                      const id = String(r._id || r.id || "");
                      const itemLabel = r.payload?.name || r.payload?.assetId || "asset request";
                      return (
                        <TableRow key={id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(r.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{r.action}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{itemLabel}</TableCell>
                          <TableCell>{r.requesterName || "Manager"}</TableCell>
                          <TableCell><StatusBadge status={r.status} /></TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(r.decidedAt)}
                          </TableCell>
                          <TableCell className="text-xs max-w-[160px] truncate">{r.reason || "-"}</TableCell>
                          <TableCell className="text-right">
                            {r.status === "pending" && (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive border-destructive/40 hover:bg-destructive/10"
                                  onClick={() => {
                                    setRejectReason("");
                                    setPendingReject({ target: "asset", id, itemLabel });
                                  }}
                                >
                                  {t("reject", "Reject")}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => setPendingApprove({ target: "asset", id, itemLabel })}
                                >
                                  {t("approve", "Approve")}
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Expense Requests ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t("expense_requests", "Expense Requests")}
              <Badge variant="secondary">{expenseRequests.length}</Badge>
              {statusFilter === "pending" && expenseRequests.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal ml-1">
                  — {t("click_row_details", "click a row to see full details")}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {expenseRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground px-6 pb-6">{t("no_expense_requests_found", "No expense requests found.")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="px-4 py-3 text-left font-medium whitespace-nowrap">{t("requested_at", "Requested At")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("category", "Category")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("item_description", "Item / Description")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("amount", "Amount")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("payment_type", "Payment Type")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("product_pic", "Product Pic")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("receipt", "Receipt")}</th>
                      <th className="px-4 py-3 text-left font-medium whitespace-nowrap">{t("requested_by", "Requested By")}</th>
                      <th className="px-4 py-3 text-left font-medium">{t("status", "Status")}</th>
                      <th className="px-4 py-3 text-left font-medium whitespace-nowrap">{t("decided_at", "Decided At")}</th>
                      <th className="px-4 py-3 text-right font-medium">{t("actions", "Actions")}</th>
                      <th className="px-4 py-3 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {expenseRequests.map((r) => {
                      const id = String(r._id || r.id || "");
                      const p = r.payload || {};
                      const itemLabel = p.description || p.name || "expense request";
                      const isExpanded = expandedExpenseId === id;

                      return (
                        <>
                          <tr
                            key={id}
                            className={`border-b border-border/50 cursor-pointer hover:bg-accent/40 transition-colors ${isExpanded ? "bg-accent/20" : ""}`}
                            onClick={() => toggleExpense(id)}
                          >
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(r.createdAt)}
                            </td>
                            <td className="px-4 py-3 capitalize">
                              <Badge variant="outline" className="capitalize text-xs">
                                {p.category || "—"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 max-w-[200px]">
                              {p.name && (
                                <p className="font-semibold text-xs truncate">{p.name}</p>
                              )}
                              <p className="text-sm truncate">{p.description || "—"}</p>
                            </td>
                            <td className="px-4 py-3 font-bold whitespace-nowrap">
                              {Number(p.amount || 0).toLocaleString()} ETB
                            </td>
                            <td className="px-4 py-3 text-xs capitalize text-muted-foreground">
                              {p.paymentType ? t(p.paymentType, p.paymentType) : t("open_cash")}
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <ImageThumb src={p.productPicture} alt={t("product_picture", "Product picture")} />
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <ImageThumb
                                src={
                                  p.paymentScreenshot ||
                                  (Array.isArray(p.screenshots) && p.screenshots[0]) ||
                                  null
                                }
                                alt={t("payment_receipt", "Payment receipt")}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{r.requesterName || "Manager"}</p>
                              {r.requesterRole && (
                                <p className="text-[10px] text-muted-foreground capitalize">{r.requesterRole}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={r.status} />
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(r.decidedAt)}
                            </td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              {r.status === "pending" && (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive border-destructive/40 hover:bg-destructive/10"
                                    onClick={() => {
                                      setRejectReason("");
                                      setPendingReject({ target: "expense", id, itemLabel });
                                    }}
                                  >
                                    {t("reject", "Reject")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => setPendingApprove({ target: "expense", id, itemLabel })}
                                  >
                                    {t("approve", "Approve")}
                                  </Button>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {isExpanded
                                ? <ChevronUp className="h-4 w-4" />
                                : <ChevronDown className="h-4 w-4" />}
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr key={`${id}-detail`}>
                              <td colSpan={12} className="p-0">
                                <ExpenseDetailPanel r={r} />
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Approve confirm dialog ── */}
        <AlertDialog
          open={Boolean(pendingApprove)}
          onOpenChange={(open) => !open && setPendingApprove(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("approve_request_question", "Approve this request?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingApprove
                  ? `Approving "${pendingApprove.itemLabel}" will create the expense and deduct from the manager's open cash balance.`
                  : "This will approve the request immediately."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel", "Cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!pendingApprove) return;
                  const { target, id } = pendingApprove;
                  setPendingApprove(null);
                  await actOn(target, id, "approve");
                }}
              >
                {t("yes_approve", "Yes, approve")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Reject with reason dialog ── */}
        <Dialog
          open={Boolean(pendingReject)}
          onOpenChange={(open) => !open && setPendingReject(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("reject_request_question", "Reject this request?")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Rejecting <span className="font-medium text-foreground">"{pendingReject?.itemLabel}"</span>.
                Provide an optional reason for the manager.
              </p>
              <div className="space-y-2">
                <Label htmlFor="reject-reason">{t("reject_reason_optional", "Reason (optional)")}</Label>
                <Textarea
                  id="reject-reason"
                  placeholder={t("reject_reason_placeholder", "e.g. Insufficient documentation, exceeds budget...")}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPendingReject(null)}>
                {t("cancel", "Cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!pendingReject) return;
                  const { target, id } = pendingReject;
                  setPendingReject(null);
                  await actOn(target, id, "reject", rejectReason || undefined);
                }}
              >
                {t("yes_reject", "Yes, reject")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleLayout>
  );
}

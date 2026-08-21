import { formatLocalizedDate } from "@/utils/ethiopian-calendar";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCw, ArrowRight, GitMerge } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function OwnerApprovals() {
  // Subscribe to language changes so date formatting (Ethiopian vs Gregorian)
  // re-renders immediately when the user switches language.
  useTranslation();
  const navigate = useNavigate();
  const token = useAuthStore.getState().user?.token;
  const [assetRequests, setAssetRequests] = useState<AssetActionRequest[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<ExpenseActionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("all");
  const [pendingDecision, setPendingDecision] = useState<{
    target: "asset" | "expense";
    id: string;
    action: "approve" | "reject";
    itemLabel: string;
  } | null>(null);

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
        const errJson = await assetRes.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed with ${assetRes.status}`);
      }
      if (!expenseRes.ok) {
        const errJson = await expenseRes.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed with ${expenseRes.status}`);
      }

      const [assetJson, expenseJson] = await Promise.all([
        assetRes.json(),
        expenseRes.json(),
      ]);
      setAssetRequests(Array.isArray(assetJson) ? assetJson : []);
      setExpenseRequests(Array.isArray(expenseJson) ? expenseJson : []);
    } catch (err) {
      console.error("Failed to load owner asset approvals", err);
      toast({
        title: "Failed to load approvals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const actOnExpenseRequest = async (
    id: string,
    action: "approve" | "reject",
    reason?: string,
  ) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/expense-action-requests/${id}/${action}`,
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
      toast({ title: `Expense request ${action}d` });
      await fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Action failed", description: message, variant: "destructive" });
    }
  };

  const actOnAssetRequest = async (
    id: string,
    action: "approve" | "reject",
    reason?: string,
  ) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/asset-action-requests/${id}/${action}`,
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
      toast({ title: `Asset request ${action}d` });
      await fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Action failed", description: message, variant: "destructive" });
    }
  };

  const confirmDecision = async () => {
    if (!pendingDecision) return;
    const { target, id, action } = pendingDecision;
    setPendingDecision(null);
    if (target === "asset") await actOnAssetRequest(id, action);
    else await actOnExpenseRequest(id, action);
  };

  useEffect(() => {
    void fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const statusBadge = (status: string) => (
    <Badge
      variant={
        status === "approved"
          ? "default"
          : status === "rejected"
            ? "destructive"
            : "secondary"
      }
    >
      {status}
    </Badge>
  );

  const formatDate = (value?: Date | string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "-" : formatLocalizedDate(d, { withTime: true });
  };

  return (
    <RoleLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Approvals</h1>
            <p className="text-muted-foreground">
              Review and act on pending asset and expense requests.
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
              aria-label="Refresh approvals"
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Store Workflow History shortcut */}
        <Card
          className="cursor-pointer border-primary/30 hover:border-primary/60 hover:bg-accent/40 transition-all group"
          onClick={() => navigate("/owner/approval-history")}
          role="button"
          aria-label="View store workflow history"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && navigate("/owner/approval-history")}
        >
          <CardContent className="flex items-center justify-between py-5 px-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <GitMerge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-base">Staff Workflow History</p>
                <p className="text-sm text-muted-foreground">
                  View all stock transfer, product add &amp; edit approval flows between Storekeepers and Managers
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </CardContent>
        </Card>

        {/* Status filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Filter:</span>
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              className="capitalize"
            >
              {s}
            </Button>
          ))}
        </div>

        {/* Asset Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Asset Requests
              <Badge variant="secondary">{assetRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assetRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No asset requests found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Decided At</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetRequests.map((r) => {
                    const id = String(r._id || r.id || "");
                    const itemLabel =
                      r.payload?.name || r.payload?.assetId || "asset request";
                    return (
                      <TableRow key={id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(r.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.action}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{itemLabel}</TableCell>
                        <TableCell>{r.requesterName || "Manager"}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(r.decidedAt)}
                        </TableCell>
                        <TableCell className="text-xs">{r.reason || "-"}</TableCell>
                        <TableCell className="text-right space-x-1">
                          {r.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPendingDecision({
                                    target: "asset",
                                    id,
                                    action: "reject",
                                    itemLabel,
                                  })
                                }
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  setPendingDecision({
                                    target: "asset",
                                    id,
                                    action: "approve",
                                    itemLabel,
                                  })
                                }
                              >
                                Approve
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Expense Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Expense Requests
              <Badge variant="secondary">{expenseRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expense requests found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Decided At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseRequests.map((r) => {
                    const id = String(r._id || r.id || "");
                    const itemLabel =
                      r.payload?.description || r.payload?.name || "expense request";
                    return (
                      <TableRow key={id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(r.createdAt)}
                        </TableCell>
                        <TableCell>{r.payload?.category || "-"}</TableCell>
                        <TableCell className="font-medium">
                          {r.payload?.description || "-"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {Number(r.payload?.amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>{r.requesterName || "Manager"}</TableCell>
                        <TableCell>{statusBadge(r.status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(r.decidedAt)}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          {r.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPendingDecision({
                                    target: "expense",
                                    id,
                                    action: "reject",
                                    itemLabel,
                                  })
                                }
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  setPendingDecision({
                                    target: "expense",
                                    id,
                                    action: "approve",
                                    itemLabel,
                                  })
                                }
                              >
                                Approve
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
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
                  ? "Approve this request?"
                  : "Reject this request?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDecision
                  ? `${pendingDecision.action === "approve" ? "Approving" : "Rejecting"} "${pendingDecision.itemLabel}" will update this request immediately.`
                  : "This action will update the request immediately."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={
                  pendingDecision?.action === "reject"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : undefined
                }
                onClick={() => void confirmDecision()}
              >
                {pendingDecision?.action === "approve" ? "Yes, approve" : "Yes, reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleLayout>
  );
}

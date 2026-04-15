import { useEffect, useState } from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCw } from "lucide-react";
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
  const token = useAuthStore.getState().user?.token;
  const [assetRequests, setAssetRequests] = useState<AssetActionRequest[]>([]);
  const [expenseRequests, setExpenseRequests] = useState<
    ExpenseActionRequest[]
  >([]);
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

      toast({
        title: `${action === "approve" ? "Approved" : "Rejected"} successfully`,
      });
      await fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Action failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const actOnRequest = async (
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

      toast({
        title: `${action === "approve" ? "Approved" : "Rejected"} successfully`,
      });
      await fetchRequests();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast({
        title: "Action failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const confirmDecision = async () => {
    if (!pendingDecision) return;
    const { id, action, target } = pendingDecision;
    setPendingDecision(null);
    if (target === "asset") {
      await actOnRequest(id, action);
      return;
    }
    await actOnExpenseRequest(id, action);
  };

  useEffect(() => {
    void fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <RoleLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Approval</h1>
            <p className="text-muted-foreground">
              Track your asset action requests and their approval status.
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
              title="Refresh approvals"
            >
              <RotateCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2 max-w-xs">
              <label className="text-sm font-medium">Status</label>
              <select
                className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as
                      | "pending"
                      | "approved"
                      | "rejected"
                      | "all",
                  )
                }
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Asset Requests
              <Badge variant="secondary">{assetRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assetRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No requests found.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Decided At</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetRequests.map((r) => {
                    const approvalRole = r.approvalRole || "manager";
                    const canOwnerAct =
                      r.status === "pending" && approvalRole === "owner";
                    const itemLabel =
                      r.payload?.name || r.payload?.assetId || "asset request";

                    return (
                      <TableRow key={r._id || r.id}>
                        <TableCell>
                          {r.createdAt
                            ? new Date(String(r.createdAt)).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.action}</Badge>
                        </TableCell>
                        <TableCell>
                          {r.payload?.name ||
                            r.payload?.assetId ||
                            "Asset request"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === "approved"
                                ? "default"
                                : r.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.decidedAt
                            ? new Date(String(r.decidedAt)).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell>{r.reason || "-"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          {canOwnerAct && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPendingDecision({
                                    target: "asset",
                                    id: String(r._id || r.id),
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
                                    id: String(r._id || r.id),
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Expense Requests
              <Badge variant="secondary">{expenseRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenseRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No expense requests found.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Decided At</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseRequests.map((r) => {
                    const canOwnerAct = r.status === "pending";
                    const itemLabel =
                      r.payload?.description ||
                      r.payload?.name ||
                      "expense request";

                    return (
                      <TableRow key={r._id || r.id}>
                        <TableCell>
                          {r.createdAt
                            ? new Date(String(r.createdAt)).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell>{r.payload?.category || "-"}</TableCell>
                        <TableCell>{r.payload?.description || "-"}</TableCell>
                        <TableCell>
                          {Number(r.payload?.amount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === "approved"
                                ? "default"
                                : r.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.decidedAt
                            ? new Date(String(r.decidedAt)).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell>{r.reason || "-"}</TableCell>
                        <TableCell className="text-right space-x-2">
                          {canOwnerAct && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPendingDecision({
                                    target: "expense",
                                    id: String(r._id || r.id),
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
                                    id: String(r._id || r.id),
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
                  ? "Are you sure you want to approve this request?"
                  : "Are you sure you want to reject this request?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDecision
                  ? `${pendingDecision.action === "approve" ? "Approving" : "Rejecting"} ${pendingDecision.itemLabel} will update this request immediately.`
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
                onClick={() => {
                  void confirmDecision();
                }}
              >
                {pendingDecision?.action === "approve"
                  ? "Yes, approve"
                  : "Yes, reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleLayout>
  );
}

import { useEffect, useState } from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import type {
  ProductAddRequest,
  ProductEditRequest,
  StockTransferRequest,
} from "@/types";
import { Loader2, Check, X, RotateCw } from "lucide-react";

type ApprovalDecision = {
  type: "add" | "transfer" | "edit";
  id: string;
  action: "approve" | "reject";
  itemLabel: string;
};

export default function Approvals() {
  const token = useAuthStore.getState().user?.token;
  const [addRequests, setAddRequests] = useState<ProductAddRequest[]>([]);
  const [editRequests, setEditRequests] = useState<ProductEditRequest[]>([]);
  const [transferRequests, setTransferRequests] = useState<
    StockTransferRequest[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("pending");
  const [typeFilter, setTypeFilter] = useState({
    add: true,
    edit: true,
    transfer: true,
  });
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [pendingDecision, setPendingDecision] =
    useState<ApprovalDecision | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const fetchAll = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.append("status", statusFilter);
      if (startDate) qs.append("startDate", startDate);
      if (endDate) qs.append("endDate", endDate);

      const requests: Promise<Response | null>[] = [
        typeFilter.add
          ? fetch(`${API_BASE}/api/product-add-requests?${qs.toString()}`, {
              headers: { Authorization: token ? `Bearer ${token}` : "" },
            })
          : Promise.resolve(null),
        typeFilter.edit
          ? fetch(`${API_BASE}/api/product-edit-requests?${qs.toString()}`, {
              headers: { Authorization: token ? `Bearer ${token}` : "" },
            })
          : Promise.resolve(null),
        typeFilter.transfer
          ? fetch(`${API_BASE}/api/stock-transfer-requests?${qs.toString()}`, {
              headers: { Authorization: token ? `Bearer ${token}` : "" },
            })
          : Promise.resolve(null),
      ];

      const [addRes, editRes, transferRes] = await Promise.all(requests);

      const addJson = addRes ? (addRes.ok ? await addRes.json() : []) : [];
      const editJson = editRes ? (editRes.ok ? await editRes.json() : []) : [];
      const transferJson = transferRes
        ? transferRes.ok
          ? await transferRes.json()
          : []
        : [];

      setAddRequests(Array.isArray(addJson) ? addJson : []);
      setEditRequests(Array.isArray(editJson) ? editJson : []);
      setTransferRequests(Array.isArray(transferJson) ? transferJson : []);
    } catch (err) {
      console.error("Failed to load approvals", err);
      toast({ title: "Failed to load approvals", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    statusFilter,
    startDate,
    endDate,
    typeFilter.add,
    typeFilter.edit,
    typeFilter.transfer,
  ]);

  const actOnRequest = async (
    type: "add" | "transfer" | "edit",
    id: string,
    action: "approve" | "reject",
    reason?: string,
  ) => {
    const path =
      type === "add"
        ? `${API_BASE}/api/product-add-requests/${id}/${action}`
        : type === "edit"
          ? `${API_BASE}/api/product-edit-requests/${id}/${action}`
          : `${API_BASE}/api/stock-transfer-requests/${id}/${action}`;

    try {
      const res = await fetch(path, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(reason ? { reason } : {}),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed with ${res.status}`);
      }

      toast({
        title: `${action === "approve" ? "Approved" : "Rejected"} successfully`,
      });
      await fetchAll();
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err?.message,
        variant: "destructive",
      });
    }
  };

  const confirmDecision = async () => {
    if (!pendingDecision) return;
    const { type, id, action } = pendingDecision;
    setPendingDecision(null);
    await actOnRequest(type, id, action);
  };

  return (
    <RoleLayout allowedRoles={["manager"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Approvals</h1>
            <p className="text-muted-foreground">
              Review product creations and stock transfers
            </p>
          </div>
          <div className="flex items-center gap-2">
            {loading && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => void fetchAll()}
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
          <CardContent className="grid gap-4 md:grid-cols-4 md:items-end">
            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Types</Label>
              <div className="flex flex-wrap gap-3 text-sm">
                {(["add", "edit", "transfer"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={typeFilter[k]}
                      onChange={(e) =>
                        setTypeFilter((cur) => ({
                          ...cur,
                          [k]: e.target.checked,
                        }))
                      }
                    />
                    {k === "add"
                      ? "Product Add"
                      : k === "edit"
                        ? "Product Edit"
                        : "Stock Transfer"}
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Product Add Requests
              <Badge variant="secondary">{addRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {addRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No requests found for this filter.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Store Qty</TableHead>
                    <TableHead>Front Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addRequests.map((r) => {
                    const payload = r.payload || {};
                    const statusBadge = (
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
                    );
                    return (
                      <TableRow key={r._id || r.id}>
                        <TableCell>
                          {r.decidedAt ? (
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                r.decidedAt as any,
                              ).toLocaleDateString()}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {payload.name || "Unnamed"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {payload.category || ""}
                          </div>
                        </TableCell>
                        <TableCell>{r.requesterName || "Owner"}</TableCell>
                        <TableCell>
                          {payload.storeQuantity ?? payload.quantity ?? 0}
                        </TableCell>
                        <TableCell>
                          {payload.supermarketQuantity ?? 0}
                        </TableCell>
                        <TableCell className="space-x-2 flex items-center">
                          {statusBadge}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {r.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPendingDecision({
                                    type: "add",
                                    id: String(r._id || r.id),
                                    action: "reject",
                                    itemLabel:
                                      payload.name || "product add request",
                                  })
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  setPendingDecision({
                                    type: "add",
                                    id: String(r._id || r.id),
                                    action: "approve",
                                    itemLabel:
                                      payload.name || "product add request",
                                  })
                                }
                              >
                                <Check className="h-4 w-4" />
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
              Product Edit Requests
              <Badge variant="secondary">{editRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending edits.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editRequests.map((r) => {
                    const qty =
                      r.changes?.quantity ??
                      r.changes?.supermarketQuantity ??
                      r.changes?.storeQuantity ??
                      "-";
                    const statusBadge = (
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
                    );
                    return (
                      <TableRow key={r._id || r.id}>
                        <TableCell>
                          {r.decidedAt ? (
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                r.decidedAt as any,
                              ).toLocaleDateString()}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {(r as any).productId?.name || r.productId}
                        </TableCell>
                        <TableCell>{r.requesterName || "Owner"}</TableCell>
                        <TableCell>{qty}</TableCell>
                        <TableCell className="space-x-2 flex items-center">
                          {statusBadge}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {r.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPendingDecision({
                                    type: "edit",
                                    id: String(r._id || r.id),
                                    action: "reject",
                                    itemLabel: String(
                                      (r as any).productId?.name ||
                                        r.productId ||
                                        "product edit request",
                                    ),
                                  })
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  setPendingDecision({
                                    type: "edit",
                                    id: String(r._id || r.id),
                                    action: "approve",
                                    itemLabel: String(
                                      (r as any).productId?.name ||
                                        r.productId ||
                                        "product edit request",
                                    ),
                                  })
                                }
                              >
                                <Check className="h-4 w-4" />
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
              Stock Transfer Requests
              <Badge variant="secondary">{transferRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transferRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No requests found for this filter.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferRequests.map((r) => {
                    const statusBadge = (
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
                    );
                    return (
                      <TableRow key={r._id || r.id}>
                        <TableCell>
                          {r.decidedAt ? (
                            <span className="text-xs text-muted-foreground">
                              {new Date(
                                r.decidedAt as any,
                              ).toLocaleDateString()}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {(r as any).productId?.name || r.productId}
                        </TableCell>
                        <TableCell>{r.quantity}</TableCell>
                        <TableCell>
                          {r.requesterName || "Store Keeper"}
                        </TableCell>
                        <TableCell className="space-x-2 flex items-center">
                          {statusBadge}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {r.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPendingDecision({
                                    type: "transfer",
                                    id: String(r._id || r.id),
                                    action: "reject",
                                    itemLabel: String(
                                      (r as any).productId?.name ||
                                        r.productId ||
                                        "stock transfer request",
                                    ),
                                  })
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  setPendingDecision({
                                    type: "transfer",
                                    id: String(r._id || r.id),
                                    action: "approve",
                                    itemLabel: String(
                                      (r as any).productId?.name ||
                                        r.productId ||
                                        "stock transfer request",
                                    ),
                                  })
                                }
                              >
                                <Check className="h-4 w-4" />
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

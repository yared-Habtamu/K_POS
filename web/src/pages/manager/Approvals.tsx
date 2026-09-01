import { formatLocalizedDate } from "@/utils/ethiopian-calendar";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EthiopianDatePicker from "@/components/ui/ethiopian-date-picker";
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
  AssetActionRequest,
  ProductAddRequest,
  ProductEditRequest,
  StockTransferRequest,
} from "@/types";
import { Loader2, Check, X, RotateCw, ImageIcon, History } from "lucide-react";

type ApprovalDecision = {
  type: "add" | "transfer" | "edit" | "asset";
  id: string;
  action: "approve" | "reject";
  itemLabel: string;
};

export default function Approvals() {
  // Subscribe to language changes so date formatting (Ethiopian vs Gregorian)
  // re-renders immediately when the user switches language.
  useTranslation();
  const navigate = useNavigate();
  const token = useAuthStore.getState().user?.token;
  const [addRequests, setAddRequests] = useState<ProductAddRequest[]>([]);
  const [editRequests, setEditRequests] = useState<ProductEditRequest[]>([]);
  const [transferRequests, setTransferRequests] = useState<
    StockTransferRequest[]
  >([]);
  const [assetRequests, setAssetRequests] = useState<AssetActionRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("pending");
  const [typeFilter, setTypeFilter] = useState({
    add: true,
    edit: true,
    transfer: true,
    asset: true,
  });
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [pendingDecision, setPendingDecision] =
    useState<ApprovalDecision | null>(null);
  const [isDeciding, setIsDeciding] = useState(false);

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const formatRequestDate = (value?: string | Date | null) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return formatLocalizedDate(parsed);
  };

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
        typeFilter.asset
          ? fetch(`${API_BASE}/api/asset-action-requests?${qs.toString()}`, {
              headers: { Authorization: token ? `Bearer ${token}` : "" },
            })
          : Promise.resolve(null),
      ];

      const [addRes, editRes, transferRes, assetRes] =
        await Promise.all(requests);

      const addJson = addRes ? (addRes.ok ? await addRes.json() : []) : [];
      const editJson = editRes ? (editRes.ok ? await editRes.json() : []) : [];
      const transferJson = transferRes
        ? transferRes.ok
          ? await transferRes.json()
          : []
        : [];
      const assetJson = assetRes
        ? assetRes.ok
          ? await assetRes.json()
          : []
        : [];

      setAddRequests(Array.isArray(addJson) ? addJson : []);
      setEditRequests(Array.isArray(editJson) ? editJson : []);
      setTransferRequests(Array.isArray(transferJson) ? transferJson : []);
      setAssetRequests(Array.isArray(assetJson) ? assetJson : []);
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
    typeFilter.asset,
  ]);

  const actOnRequest = async (
    type: "add" | "transfer" | "edit" | "asset",
    id: string,
    action: "approve" | "reject",
    reason?: string,
  ) => {
    const path =
      type === "add"
        ? `${API_BASE}/api/product-add-requests/${id}/${action}`
        : type === "edit"
          ? `${API_BASE}/api/product-edit-requests/${id}/${action}`
          : type === "transfer"
            ? `${API_BASE}/api/stock-transfer-requests/${id}/${action}`
            : `${API_BASE}/api/asset-action-requests/${id}/${action}`;

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
    if (!pendingDecision || isDeciding) return;
    const { type, id, action } = pendingDecision;
    setIsDeciding(true);
    try {
      await actOnRequest(type, id, action);
    } finally {
      setIsDeciding(false);
      setPendingDecision(null);
    }
  };

  return (
    <RoleLayout allowedRoles={["manager"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Approvals</h1>
            <p className="text-muted-foreground">
              Review product, stock transfer, and asset action requests
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
            <Button
              variant="outline"
              onClick={() => navigate("/manager/approval-history")}
              aria-label="Approval history"
              title="Approval history"
            >
              <History className="mr-2 h-4 w-4" />
              Approval History
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
              <EthiopianDatePicker
                value={startDate}
                onChange={(ymd) => setStartDate(ymd)}
                placeholder="From"
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <EthiopianDatePicker
                value={endDate}
                onChange={(ymd) => setEndDate(ymd)}
                placeholder="To"
              />
            </div>
            <div className="space-y-2">
              <Label>Types</Label>
              <div className="flex flex-wrap gap-3 text-sm">
                {(["add", "edit", "transfer", "asset"] as const).map((k) => (
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
                        : k === "transfer"
                          ? "Stock Transfer"
                          : "Asset Action"}
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
                    <TableHead className="w-12">Image</TableHead>
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
                    const imageUrl = String(
                      (payload as any)?.imageUrl ||
                        (payload as any)?.pictureUrl ||
                        "",
                    );
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
                          <span className="text-xs text-muted-foreground">
                            {formatRequestDate(r.createdAt || r.decidedAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ProductThumb url={imageUrl} />
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
                    <TableHead className="w-12">Image</TableHead>
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
                          <span className="text-xs text-muted-foreground">
                            {formatRequestDate(r.createdAt || r.decidedAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ProductThumb url={(r as any).product?.imageUrl} />
                        </TableCell>
                        <TableCell>
                          {(r as any).product?.name || r.productId}
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
                                      (r as any).product?.name ||
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
                                      (r as any).product?.name ||
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
                    <TableHead className="w-12">Image</TableHead>
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
                          <span className="text-xs text-muted-foreground">
                            {formatRequestDate(r.createdAt || r.decidedAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <ProductThumb url={(r as any).product?.imageUrl} />
                        </TableCell>
                        <TableCell>
                          {(r as any).product?.name || r.productId}
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
                                      (r as any).product?.name ||
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
                                      (r as any).product?.name ||
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Asset Action Requests
              <Badge variant="secondary">{assetRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assetRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No requests found for this filter.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assetRequests.map((r) => {
                    const approvalRole = r.approvalRole || "manager";
                    const canManagerAct =
                      r.status === "pending" && approvalRole === "manager";
                    const assetLabel =
                      r.payload?.name ||
                      r.payload?.assetId ||
                      (r.action === "create"
                        ? "Asset create request"
                        : r.action === "update"
                          ? "Asset update request"
                          : "Asset delete request");
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
                          <span className="text-xs text-muted-foreground">
                            {formatRequestDate(r.createdAt || r.decidedAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{r.action}</Badge>
                        </TableCell>
                        <TableCell>{assetLabel}</TableCell>
                        <TableCell>{r.requesterName || "Owner"}</TableCell>
                        <TableCell className="space-x-2 flex items-center">
                          {statusBadge}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {canManagerAct && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setPendingDecision({
                                    type: "asset",
                                    id: String(r._id || r.id),
                                    action: "reject",
                                    itemLabel: assetLabel,
                                  })
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() =>
                                  setPendingDecision({
                                    type: "asset",
                                    id: String(r._id || r.id),
                                    action: "approve",
                                    itemLabel: assetLabel,
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
                disabled={isDeciding}
                className={
                  pendingDecision?.action === "reject"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : undefined
                }
                onClick={(e) => {
                  e.preventDefault();
                  void confirmDecision();
                }}
              >
                {isDeciding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
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

function ProductThumb({ url }: { url?: string }) {
  if (!url) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img src={url} alt="" className="h-10 w-10 rounded-lg object-cover" />
  );
}

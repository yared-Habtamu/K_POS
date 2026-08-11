import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useAuthStore } from "@/stores/authStore";
import { useProductStore } from "@/stores/productStore";
import { toast } from "@/hooks/use-toast";
import type {
  ProductAddRequest,
  ProductEditRequest,
  StockTransferRequest,
} from "@/types";
import { Check, ClipboardList, History, ImageIcon, Loader2, RotateCw, X } from "lucide-react";

type ApprovalDecision = {
  type: "add" | "edit" | "transfer";
  id: string;
  action: "approve" | "reject";
  itemLabel: string;
};

export default function StoreKeeperApprovals() {
  const navigate = useNavigate();
  const token = useAuthStore.getState().user?.token;
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const products = useProductStore((s) => s.products);

  const [addRequests, setAddRequests] = useState<ProductAddRequest[]>([]);
  const [editRequests, setEditRequests] = useState<ProductEditRequest[]>([]);
  const [transferRequests, setTransferRequests] = useState<
    StockTransferRequest[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("pending");
  const [pendingDecision, setPendingDecision] =
    useState<ApprovalDecision | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.append("status", statusFilter);

      const [addRes, editRes, transferRes] = await Promise.all([
        fetch(`${API_BASE}/api/product-add-requests?${qs.toString()}`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }),
        fetch(`${API_BASE}/api/product-edit-requests?${qs.toString()}`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        }),
        fetch(
          `${API_BASE}/api/stock-transfer-requests?${qs.toString()}&approvalRole=store_keeper`,
          {
            headers: { Authorization: token ? `Bearer ${token}` : "" },
          },
        ),
      ]);

      const addData = addRes.ok ? await addRes.json() : [];
      const editData = editRes.ok ? await editRes.json() : [];
      const transferData = transferRes.ok ? await transferRes.json() : [];

      setAddRequests(Array.isArray(addData) ? addData : []);
      setEditRequests(Array.isArray(editData) ? editData : []);
      setTransferRequests(Array.isArray(transferData) ? transferData : []);
    } catch (err) {
      console.error("Failed to load store keeper approvals", err);
      toast({ title: "Failed to load approvals", variant: "destructive" });
      setAddRequests([]);
      setEditRequests([]);
      setTransferRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const actOnRequest = async (
    type: "add" | "edit" | "transfer",
    id: string,
    action: "approve" | "reject",
  ) => {
    try {
      const basePath =
        type === "edit"
          ? "product-edit-requests"
          : type === "transfer"
            ? "stock-transfer-requests"
            : "product-add-requests";
      const res = await fetch(`${API_BASE}/api/${basePath}/${id}/${action}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed with ${res.status}`);
      }

      toast({
        title: action === "approve" ? "Request approved" : "Request rejected",
      });
      await fetchRequests();
      // Notify open pages (e.g. manager product table) to reload and show a
      // result toast when a stock transfer request is approved/rejected.
      if (type === "transfer") {
        window.dispatchEvent(
          new CustomEvent("stock-transfer-updated", {
            detail: { status: action },
          }),
        );
      }
    } catch (err: unknown) {
      const description =
        err instanceof Error ? err.message : "Please try again";
      toast({
        title: "Action failed",
        description,
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

  const pendingCount = useMemo(() => {
    const addPending = addRequests.filter(
      (request) => request.status === "pending",
    ).length;
    const editPending = editRequests.filter(
      (request) => request.status === "pending",
    ).length;
    const transferPending = transferRequests.filter(
      (request) => request.status === "pending",
    ).length;
    return addPending + editPending + transferPending;
  }, [addRequests, editRequests, transferRequests]);

  return (
    <RoleLayout allowedRoles={["store_keeper"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Approvals</h1>
            <p className="text-muted-foreground">
              Review owner product add requests for stock additions.
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
            <Button
              variant="outline"
              onClick={() => navigate("/store-keeper/approval-history")}
              aria-label="Approval history"
              title="Approval history"
            >
              <History className="mr-2 h-4 w-4" />
              Approval History
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="grid gap-4 md:grid-cols-3 md:items-end">
            <div className="space-y-2">
              <Label>Status</Label>
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
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All</option>
              </select>
            </div>

            <div className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">Pending: {pendingCount}</Badge>
              <span>These requests are assigned to Store Keeper approval.</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Stock Transfer Requests
              <Badge variant="secondary">{transferRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Image</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferRequests.length > 0 ? (
                    transferRequests.map((request) => {
                      const id = String(request._id || request.id || "");
                      const isPending = request.status === "pending";
                      let productLabel = "-";
                      // if (
                      //   typeof request.productId === "object" &&
                      //   request.productId !== null &&
                      //   "name" in request.productId
                      // ) {
                      //   productLabel = String(request.productId.name || "-");
                      // } else {
                      //   const pid = String(
                      //     request.productId || request.product || "",
                      //   );
                      //   const found = products.find(
                      //     (p) => p.id === pid || (p as any)._id === pid,
                      //   );
                      //   productLabel = found?.name || pid || "-";
                      // }
                      // ...existing code...
                      if (
                        typeof request.productId === "object" &&
                        request.productId !== null &&
                        "name" in request.productId
                      ) {
                        productLabel = String(request.productId.name || "-");
                      } else {
                        // normalize pid without referencing non-existent `request.product`
                        const pid =
                          typeof request.productId === "object" &&
                          request.productId !== null
                            ? String(
                                (request.productId as any).id ??
                                  (request.productId as any)._id ??
                                  "",
                              )
                            : String(request.productId ?? "");
                        const found = products.find(
                          (p) => p.id === pid || (p as any)._id === pid,
                        );
                        productLabel = found?.name || pid || "-";
                      }
                      let imageUrl = String(
                        (request as any).product?.imageUrl || "",
                      );
                      if (!imageUrl) {
                        const pid =
                          typeof request.productId === "object" &&
                          request.productId !== null
                            ? String(
                                (request.productId as any).id ??
                                  (request.productId as any)._id ??
                                  "",
                              )
                            : String(request.productId ?? "");
                        const found = products.find(
                          (p) => p.id === pid || (p as any)._id === pid,
                        );
                        imageUrl = found?.pictureUrl || "";
                      }
                      const fromLabel =
                        request.fromLocation === "mart" ? "Mart" : "Store";
                      const toLabel =
                        request.toLocation === "store" ? "Store" : "Mart";

                      return (
                        <TableRow key={id}>
                          <TableCell>
                            <ProductThumb url={imageUrl} />
                          </TableCell>
                          <TableCell className="font-medium">
                            {productLabel}
                          </TableCell>
                          <TableCell>{`${fromLabel} -> ${toLabel}`}</TableCell>
                          <TableCell className="text-right">
                            {Number(request.quantity || 0)}
                          </TableCell>
                          <TableCell>
                            {request.requesterName || "Owner"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                request.status === "approved"
                                  ? "default"
                                  : request.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isPending ? (
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setPendingDecision({
                                      type: "transfer",
                                      id,
                                      action: "reject",
                                      itemLabel: "this transfer request",
                                    })
                                  }
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setPendingDecision({
                                      type: "transfer",
                                      id,
                                      action: "approve",
                                      itemLabel: "this transfer request",
                                    })
                                  }
                                >
                                  <Check className="mr-1 h-4 w-4" />
                                  Approve
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {request.approverName
                                  ? `By ${request.approverName}`
                                  : "Processed"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No stock transfer requests found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Product Add Requests
              <Badge variant="secondary">{addRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Image</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead className="text-right">Stock Qty</TableHead>
                    <TableHead className="text-right">Mart Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {addRequests.length > 0 ? (
                    addRequests.map((request) => {
                      const id = String(request._id || request.id || "");
                      const payload = request.payload || {};
                      const imageUrl = String(
                        (payload as any)?.imageUrl ||
                          (payload as any)?.pictureUrl ||
                          "",
                      );
                      const stockQty = Number(payload.storeQuantity || 0);
                      const martQty = Number(
                        payload.supermarketQuantity || payload.quantity || 0,
                      );
                      const isPending = request.status === "pending";

                      return (
                        <TableRow key={id}>
                          <TableCell>
                            <ProductThumb url={imageUrl} />
                          </TableCell>
                          <TableCell className="font-medium">
                            {payload.name || "-"}
                          </TableCell>
                          <TableCell>
                            {request.requesterName || "Owner"}
                          </TableCell>
                          <TableCell className="text-right">
                            {stockQty}
                          </TableCell>
                          <TableCell className="text-right">
                            {martQty}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                request.status === "approved"
                                  ? "default"
                                  : request.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isPending ? (
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setPendingDecision({
                                      type: "add",
                                      id,
                                      action: "reject",
                                      itemLabel: String(
                                        payload.name || "product",
                                      ),
                                    })
                                  }
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setPendingDecision({
                                      type: "add",
                                      id,
                                      action: "approve",
                                      itemLabel: String(
                                        payload.name || "product",
                                      ),
                                    })
                                  }
                                >
                                  <Check className="mr-1 h-4 w-4" />
                                  Approve
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {request.approverName
                                  ? `By ${request.approverName}`
                                  : "Processed"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No product add requests found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Product Edit Requests
              <Badge variant="secondary">{editRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Image</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Changed Fields</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editRequests.length > 0 ? (
                    editRequests.map((request) => {
                      const id = String(request._id || request.id || "");
                      const isPending = request.status === "pending";
                      const changes = request.changes || {};
                      const changedKeys = Object.keys(changes);
                      const rawProductId = request.productId;
                      let productName = "-";
                      if (
                        typeof rawProductId === "object" &&
                        rawProductId !== null &&
                        "name" in rawProductId
                      ) {
                        productName = String(
                          (rawProductId as { name?: string }).name || "-",
                        );
                      } else {
                        const pid = String(rawProductId || "");
                        const found = products.find(
                          (p) => p.id === pid || (p as any)._id === pid,
                        );
                        productName = found?.name || pid || "-";
                      }
                      let imageUrl = String(
                        (request as any).product?.imageUrl || "",
                      );
                      if (!imageUrl) {
                        const pid =
                          typeof rawProductId === "object" &&
                          rawProductId !== null
                            ? String(
                                (rawProductId as any).id ??
                                  (rawProductId as any)._id ??
                                  "",
                              )
                            : String(rawProductId || "");
                        const found = products.find(
                          (p) => p.id === pid || (p as any)._id === pid,
                        );
                        imageUrl = found?.pictureUrl || "";
                      }

                      return (
                        <TableRow key={id}>
                          <TableCell>
                            <ProductThumb url={imageUrl} />
                          </TableCell>
                          <TableCell className="font-medium">
                            {productName}
                          </TableCell>
                          <TableCell>
                            {request.requesterName || "Owner"}
                          </TableCell>
                          <TableCell>
                            {changedKeys.length > 0
                              ? changedKeys.join(", ")
                              : "No field details"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                request.status === "approved"
                                  ? "default"
                                  : request.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isPending ? (
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setPendingDecision({
                                      type: "edit",
                                      id,
                                      action: "reject",
                                      itemLabel: "this edit request",
                                    })
                                  }
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Reject
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setPendingDecision({
                                      type: "edit",
                                      id,
                                      action: "approve",
                                      itemLabel: "this edit request",
                                    })
                                  }
                                >
                                  <Check className="mr-1 h-4 w-4" />
                                  Approve
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {request.approverName
                                  ? `By ${request.approverName}`
                                  : "Processed"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No product edit requests found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
                  ? "Approve request"
                  : "Reject request"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDecision?.action === "approve"
                  ? `Approve ${pendingDecision?.itemLabel || "this request"}?`
                  : `Reject ${pendingDecision?.itemLabel || "this request"}?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void confirmDecision()}>
                Confirm
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

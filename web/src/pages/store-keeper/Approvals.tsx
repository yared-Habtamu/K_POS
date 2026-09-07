import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getImageUrl, handleImageError } from "@/utils/imageUrl";
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
  const { t } = useTranslation();
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
  const [isDeciding, setIsDeciding] = useState(false);

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
      toast({ title: t("failed_to_load_approvals"), variant: "destructive" });
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
        title:
          action === "approve"
            ? t("request_approved_success")
            : t("request_rejected_success"),
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
        err instanceof Error ? err.message : t("please_try_again");
      toast({
        title: t("action_failed"),
        description,
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
            <h1 className="text-2xl font-bold">{t("pending_requests") || "Approvals"}</h1>
            <p className="text-muted-foreground">
              {t("storekeeper_approvals_subtitle") ||
                "Review owner product add requests for stock additions."}
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
              aria-label={t("refresh") || "Refresh"}
              title={t("refresh") || "Refresh"}
            >
              <RotateCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/store-keeper/approval-history")}
              aria-label={t("request_history") || "Approval History"}
              title={t("request_history") || "Approval History"}
            >
              <History className="mr-2 h-4 w-4" />
              {t("request_history") || "Approval History"}
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="grid gap-4 md:grid-cols-3 md:items-end">
            <div className="space-y-2">
              <Label>{t("status")}</Label>
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
                <option value="pending">{t("pending") || "Pending"}</option>
                <option value="approved">{t("approved") || "Approved"}</option>
                <option value="rejected">{t("rejected") || "Rejected"}</option>
                <option value="all">{t("all") || "All"}</option>
              </select>
            </div>

            <div className="md:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">{t("pending") || "Pending"}: {pendingCount}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {t("stock_transfer_requests")}
              <Badge variant="secondary">{transferRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">{t("image")}</TableHead>
                    <TableHead>{t("product")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{t("price")}</TableHead>
                    <TableHead>{t("direction")}</TableHead>
                    <TableHead className="text-right">{t("quantity")}</TableHead>
                    <TableHead>{t("requester")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferRequests.length > 0 ? (
                    transferRequests.map((request) => {
                      const id = String(request._id || request.id || "");
                      const isPending = request.status === "pending";
                      let productLabel = "-";
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
                      if (
                        typeof request.productId === "object" &&
                        request.productId !== null &&
                        "name" in request.productId
                      ) {
                        productLabel = String(request.productId.name || "-");
                      } else {
                        productLabel = found?.name || pid || "-";
                      }
                      let imageUrl = String(
                        (request as any).product?.imageUrl || "",
                      );
                      if (!imageUrl) {
                        imageUrl = found?.pictureUrl || "";
                      }
                      const category =
                        (request as any).product?.category ||
                        found?.category ||
                        "-";
                      const priceVal =
                        (request as any).product?.sellingPrice ??
                        found?.sellingPrice;
                      const price =
                        priceVal != null
                          ? `${Number(priceVal).toLocaleString()} ETB`
                          : "-";

                      const fromLabel =
                        request.fromLocation === "mart" ? t("mart") : t("store");
                      const toLabel =
                        request.toLocation === "store" ? t("store") : t("mart");

                      return (
                        <TableRow key={id}>
                          <TableCell>
                            <ProductThumb url={imageUrl} />
                          </TableCell>
                          <TableCell className="font-medium">
                            {productLabel}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {category}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-xs whitespace-nowrap">
                            {price}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-medium">
                              {`${fromLabel} → ${toLabel}`}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {Number(request.quantity || 0)}
                          </TableCell>
                          <TableCell>
                            {request.requesterName || t("owner")}
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
                              {request.status === "approved"
                                ? t("approved")
                                : request.status === "rejected"
                                  ? t("rejected")
                                  : t("pending")}
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
                                      itemLabel: t("this_transfer_request"),
                                    })
                                  }
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  {t("reject")}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setPendingDecision({
                                      type: "transfer",
                                      id,
                                      action: "approve",
                                      itemLabel: t("this_transfer_request"),
                                    })
                                  }
                                >
                                  <Check className="mr-1 h-4 w-4" />
                                  {t("approve")}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {request.approverName
                                  ? t("by_approver", {
                                      name: request.approverName,
                                    })
                                  : t("processed")}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-6 text-center text-muted-foreground"
                      >
                        {t("no_stock_transfer_requests")}
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
              {t("product_add_requests")}
              <Badge variant="secondary">{addRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">{t("image")}</TableHead>
                    <TableHead>{t("product")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{t("price")}</TableHead>
                    <TableHead>{t("requester")}</TableHead>
                    <TableHead className="text-right">{t("store_qty")}</TableHead>
                    <TableHead className="text-right">{t("mart_qty")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
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
                      const category = payload.category || "-";
                      const priceVal = payload.sellingPrice;
                      const price =
                        priceVal != null
                          ? `${Number(priceVal).toLocaleString()} ETB`
                          : "-";
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
                            <Badge variant="outline" className="capitalize text-xs">
                              {category}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-xs whitespace-nowrap">
                            {price}
                          </TableCell>
                          <TableCell>
                            {request.requesterName || t("owner")}
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
                              {request.status === "approved"
                                ? t("approved")
                                : request.status === "rejected"
                                  ? t("rejected")
                                  : t("pending")}
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
                                        payload.name || t("product"),
                                      ),
                                    })
                                  }
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  {t("reject")}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setPendingDecision({
                                      type: "add",
                                      id,
                                      action: "approve",
                                      itemLabel: String(
                                        payload.name || t("product"),
                                      ),
                                    })
                                  }
                                >
                                  <Check className="mr-1 h-4 w-4" />
                                  {t("approve")}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {request.approverName
                                  ? t("by_approver", {
                                      name: request.approverName,
                                    })
                                  : t("processed")}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-6 text-center text-muted-foreground"
                      >
                        {t("no_product_add_requests")}
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
              {t("product_edit_requests")}
              <Badge variant="secondary">{editRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">{t("image")}</TableHead>
                    <TableHead>{t("product")}</TableHead>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{t("price")}</TableHead>
                    <TableHead>{t("requester")}</TableHead>
                    <TableHead>{t("changed_fields")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="text-right">{t("actions")}</TableHead>
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
                        productName = found?.name || pid || "-";
                      }
                      let imageUrl = String(
                        (request as any).product?.imageUrl || "",
                      );
                      if (!imageUrl) {
                        imageUrl = found?.pictureUrl || "";
                      }
                      const category =
                        request.changes?.category ||
                        (request as any).product?.category ||
                        found?.category ||
                        "-";
                      const priceVal =
                        request.changes?.sellingPrice ??
                        (request as any).product?.sellingPrice ??
                        found?.sellingPrice;
                      const price =
                        priceVal != null
                          ? `${Number(priceVal).toLocaleString()} ETB`
                          : "-";

                      return (
                        <TableRow key={id}>
                          <TableCell>
                            <ProductThumb url={imageUrl} />
                          </TableCell>
                          <TableCell className="font-medium">
                            {productName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {category}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-xs whitespace-nowrap">
                            {price}
                          </TableCell>
                          <TableCell>
                            {request.requesterName || t("owner")}
                          </TableCell>
                          <TableCell>
                            {changedKeys.length > 0
                              ? changedKeys.join(", ")
                              : t("no_field_details")}
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
                              {request.status === "approved"
                                ? t("approved")
                                : request.status === "rejected"
                                  ? t("rejected")
                                  : t("pending")}
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
                                      itemLabel: t("this_edit_request"),
                                    })
                                  }
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  {t("reject")}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setPendingDecision({
                                      type: "edit",
                                      id,
                                      action: "approve",
                                      itemLabel: t("this_edit_request"),
                                    })
                                  }
                                >
                                  <Check className="mr-1 h-4 w-4" />
                                  {t("approve")}
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {request.approverName
                                  ? t("by_approver", {
                                      name: request.approverName,
                                    })
                                  : t("processed")}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-6 text-center text-muted-foreground"
                      >
                        {t("no_product_edit_requests")}
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
                  ? t("approve_request_title")
                  : t("reject_request_title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDecision?.action === "approve"
                  ? t("approve_item_question", {
                      item: pendingDecision?.itemLabel || t("this_request"),
                    })
                  : t("reject_item_question", {
                      item: pendingDecision?.itemLabel || t("this_request"),
                    })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeciding}
                onClick={(e) => {
                  e.preventDefault();
                  void confirmDecision();
                }}
              >
                {isDeciding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {t("confirm")}
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
    <img
      src={getImageUrl(url)}
      alt=""
      className="h-10 w-10 rounded-lg object-cover"
      onError={handleImageError}
    />
  );
}

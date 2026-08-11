import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/stores/authStore";
import type {
  ProductAddRequest,
  ProductEditRequest,
  StockTransferRequest,
} from "@/types";
import { ClipboardList, ImageIcon, Loader2, RotateCw } from "lucide-react";

type StatusFilter = "all" | "approved" | "pending" | "rejected";
type RequestTypeFilter = "all" | "transfer" | "add" | "edit";

interface HistoryRow {
  key: string;
  kind: "transfer" | "add" | "edit";
  date?: Date | string;
  productName: string;
  imageUrl?: string;
  details: string;
  requesterName?: string;
  approverName?: string;
  status: "pending" | "approved" | "rejected";
  requesterId?: string;
  approverId?: string;
  approvalRole?: "manager" | "store_keeper" | null;
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

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

export default function ApprovalHistoryPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const token = user?.token;
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const [transfers, setTransfers] = useState<StockTransferRequest[]>([]);
  const [adds, setAdds] = useState<ProductAddRequest[]>([]);
  const [edits, setEdits] = useState<ProductEditRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<RequestTypeFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.append("status", statusFilter);
      if (startDate) qs.append("startDate", startDate);
      if (endDate) qs.append("endDate", endDate);
      qs.append("scope", "all");

      const paths = ["stock-transfer-requests", "product-add-requests", "product-edit-requests"];
      const headers = { Authorization: token ? `Bearer ${token}` : "" };
      const results = await Promise.all(
        paths.map((p) =>
          fetch(`${API_BASE}/api/${p}?${qs.toString()}`, { headers }),
        ),
      );
      const json = await Promise.all(
        results.map((r) => (r.ok ? r.json() : [])),
      );
      setTransfers(Array.isArray(json[0]) ? json[0] : []);
      setAdds(Array.isArray(json[1]) ? json[1] : []);
      setEdits(Array.isArray(json[2]) ? json[2] : []);
    } catch (err) {
      console.error("Failed to load approval history", err);
      setTransfers([]);
      setAdds([]);
      setEdits([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate, API_BASE, token]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // user OR approved/rejected by the user. Strict personal scoping — with
  const rows = useMemo<HistoryRow[]>(() => {
    const meId = user?.id;
    if (!meId) return [];
    const involved = (requesterId?: string, approverId?: string) =>
      String(requesterId) === String(meId) ||
      String(approverId) === String(meId);
      
    const out: HistoryRow[] = [];

    if (typeFilter === "all" || typeFilter === "transfer") {
      for (const r of transfers) {
        const id = String(r._id || r.id || "");
        const product = (r as any).product;
        const name =
          product?.name ||
          (typeof r.productId === "object" && r.productId !== null
            ? String((r.productId as { name?: string }).name || "-")
            : "-");
        const fromLabel = r.fromLocation === "mart" ? "Mart" : "Store";
        const toLabel = r.toLocation === "store" ? "Store" : "Mart";
        out.push({
          key: `transfer-${id}`,
          kind: "transfer",
          date: r.createdAt || r.decidedAt,
          productName: name,
          imageUrl: String(product?.imageUrl || ""),
          details: `${fromLabel} -> ${toLabel} · ${Number(r.quantity || 0)}`,
          requesterName: r.requesterName,
          approverName: r.approverName,
          status: r.status,
          requesterId: r.requesterId,
          approverId: r.approverId,
          approvalRole: r.approvalRole ?? null,
        });
      }
    }

    if (typeFilter === "all" || typeFilter === "add") {
      for (const r of adds) {
        const payload = r.payload || {};
        const id = String(r._id || r.id || "");
        const storeQty = Number(payload.storeQuantity || 0);
        const martQty = Number(
          payload.supermarketQuantity || payload.quantity || 0,
        );
        out.push({
          key: `add-${id}`,
          kind: "add",
          date: r.createdAt || r.decidedAt,
          productName: String(payload.name || "-"),
          imageUrl: String(
            (payload as any)?.imageUrl || (payload as any)?.pictureUrl || "",
          ),
          details: `Store: ${storeQty} · Mart: ${martQty}`,
          requesterName: r.requesterName,
          approverName: r.approverName,
          status: r.status,
          requesterId: r.requesterId,
          approverId: r.approverId,
          approvalRole: r.approvalRole ?? null,
        });
      }
    }

    if (typeFilter === "all" || typeFilter === "edit") {
      for (const r of edits) {
        const id = String(r._id || r.id || "");
        const rawProductId = r.productId;
        const name =
          typeof rawProductId === "object" && rawProductId !== null
            ? String((rawProductId as { name?: string }).name || "-")
            : String(rawProductId || "-");
        const changedKeys = Object.keys(r.changes || {});
        out.push({
          key: `edit-${id}`,
          kind: "edit",
          date: r.createdAt || r.decidedAt,
          productName: name,
          imageUrl: String((r as any).product?.imageUrl || ""),
          details:
            changedKeys.length > 0 ? changedKeys.join(", ") : "-",
          requesterName: r.requesterName,
          approverName: r.approverName,
          status: r.status,
          requesterId: r.requesterId,
          approverId: r.approverId,
          approvalRole: r.approvalRole ?? null,
        });
      }
    }

    return out
      .filter((r) => involved(r.requesterId, r.approverId))
      .sort((a, b) => {
        const ta = new Date(a.date || 0).getTime();
        const tb = new Date(b.date || 0).getTime();
        return tb - ta;
      });
  }, [transfers, adds, edits, typeFilter, user?.id]);

  const kindBadge = (kind: HistoryRow["kind"]) => {
    const label =
      kind === "transfer"
        ? t("stock_transfer")
        : kind === "add"
          ? t("product_add")
          : t("product_edit");
    return <Badge variant="outline">{label}</Badge>;
  };

  return (
    <RoleLayout allowedRoles={["manager", "store_keeper"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("approval_history")}</h1>
            <p className="text-muted-foreground">{t("involved_hint")}</p>
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
              aria-label="Refresh approval history"
              title="Refresh approval history"
            >
              <RotateCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        <Card className="p-6">
          <CardContent className="grid gap-6 md:grid-cols-4">
            <div className="space-y-2">
              <Label>{t("request_type")}</Label>
              <select
                className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as RequestTypeFilter)
                }
              >
                <option value="all">{t("all")}</option>
                <option value="transfer">{t("stock_transfer")}</option>
                <option value="add">{t("product_add")}</option>
                <option value="edit">{t("product_edit")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>{t("type")}</Label>
              <select
                className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
              >
                <option value="all">{t("all")}</option>
                <option value="approved">{t("approved")}</option>
                <option value="pending">{t("pending")}</option>
                <option value="rejected">{t("rejected")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>{t("from")}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="From date"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("to")}</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="To date"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {t("approval_history")}
              <Badge variant="secondary">{rows.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("no_transfers_found")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("date")}</TableHead>
                      <TableHead>{t("type")}</TableHead>
                      <TableHead className="w-12">{t("image")}</TableHead>
                      <TableHead>{t("product")}</TableHead>
                      <TableHead>{t("details")}</TableHead>
                      <TableHead>{t("requester")}</TableHead>
                      <TableHead>{t("approver")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.key}>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(r.date)}
                          </span>
                        </TableCell>
                        <TableCell>{kindBadge(r.kind)}</TableCell>
                        <TableCell>
                          <ProductThumb url={r.imageUrl} />
                        </TableCell>
                        <TableCell className="font-medium">
                          {r.productName}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {r.details}
                          </span>
                        </TableCell>
                        <TableCell>{r.requesterName || "-"}</TableCell>
                        <TableCell>{r.approverName || "-"}</TableCell>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}

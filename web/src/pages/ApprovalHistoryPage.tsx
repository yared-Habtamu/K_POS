import { formatLocalizedDate } from "@/utils/ethiopian-calendar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EthiopianDatePicker from "@/components/ui/ethiopian-date-picker";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import type {
  ProductAddRequest,
  ProductEditRequest,
  StockTransferRequest,
} from "@/types";
import {
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ImageIcon,
  Loader2,
  RotateCw,
  User,
  ArrowLeft,
  Calendar,
  ArrowRight,
  Tag,
  Boxes,
  DollarSign,
} from "lucide-react";

type StatusFilter = "all" | "approved" | "pending" | "rejected";
type RequestTypeFilter = "all" | "transfer" | "add" | "edit";

// ─── Rich row types ────────────────────────────────────────────────────────────

interface BaseRow {
  key: string;
  kind: "transfer" | "add" | "edit";
  date?: Date | string;
  decidedAt?: Date | string;
  productName: string;
  imageUrl?: string;
  category?: string;
  price?: string;
  requesterName?: string;
  approverId?: string;
  approverName?: string;
  approvalRole?: "manager" | "store_keeper" | null;
  status: "pending" | "approved" | "rejected";
  requesterId?: string;
  reason?: string;
}

interface TransferRow extends BaseRow {
  kind: "transfer";
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
}

interface AddRow extends BaseRow {
  kind: "add";
  payload: Record<string, any>;
}

interface EditRow extends BaseRow {
  kind: "edit";
  changes: Record<string, any>;
  // snapshot of product before change — populated from API if available
  originalProduct?: Record<string, any>;
}

type HistoryRow = TransferRow | AddRow | EditRow;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return formatLocalizedDate(parsed, { withTime: true });
}

function formatCurrency(value?: number | string | null) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const PRICE_FIELDS = ["sellingPrice", "purchasePrice"] as const;
const QTY_FIELDS = ["quantity", "storeQuantity", "supermarketQuantity", "lowStockThreshold"] as const;
const IMAGE_FIELDS = ["imageUrl", "pictureUrl"] as const;

function fieldLabel(key: string): string {
  const MAP: Record<string, string> = {
    sellingPrice: "Selling Price",
    purchasePrice: "Purchase Price",
    quantity: "Sale Quantity",
    storeQuantity: "Store Qty",
    supermarketQuantity: "Front Qty",
    lowStockThreshold: "Low-Stock Threshold",
    name: "Name",
    category: "Category",
    unit: "Unit",
    expiryDate: "Expiry Date",
    barcodes: "Barcodes",
  };
  return MAP[key] ?? key.replace(/([A-Z])/g, " $1").trim();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProductThumb({ url, large }: { url?: string; large?: boolean }) {
  const cls = large
    ? "h-20 w-20 rounded-xl object-cover shrink-0"
    : "h-10 w-10 rounded-lg object-cover shrink-0";
  const placeholder = large ? "h-16 w-16" : "h-5 w-5";
  const wrap = large
    ? "flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted"
    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted";

  if (!url)
    return (
      <div className={wrap}>
        <ImageIcon className={`${placeholder} text-muted-foreground`} />
      </div>
    );
  return <img src={url} alt="" className={cls} />;
}

function StatusBadge({ status }: { status: string }) {
  return (
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
}

function KindBadge({ kind }: { kind: HistoryRow["kind"] }) {
  const labels: Record<HistoryRow["kind"], string> = {
    transfer: "Stock Transfer",
    add: "Product Add",
    edit: "Product Edit",
  };
  const colors: Record<HistoryRow["kind"], string> = {
    transfer: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    add: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    edit: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[kind]}`}
    >
      {labels[kind]}
    </span>
  );
}

// Diff line: shows previous → current with colour coding
function DiffLine({
  label,
  prev,
  next,
  isCurrency,
}: {
  label: string;
  prev: React.ReactNode;
  next: React.ReactNode;
  isCurrency?: boolean;
}) {
  const fmt = (v: React.ReactNode) =>
    isCurrency && typeof v === "number" ? formatCurrency(v) : String(v ?? "-");
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm py-1 border-b border-border/40 last:border-0">
      <div>
        <span className="text-xs text-muted-foreground block">{label} — before</span>
        <span className="font-medium text-foreground">{fmt(prev)}</span>
      </div>
      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
      <div>
        <span className="text-xs text-muted-foreground block">{label} — after</span>
        <span className="font-semibold text-primary">{fmt(next)}</span>
      </div>
    </div>
  );
}

// Image diff line: renders mini thumbnails for before/after image changes
function ImageDiffLine({ label, prevUrl, nextUrl }: { label: string; prevUrl?: string; nextUrl?: string }) {
  const thumb = (url?: string, caption?: string) => (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground block">{caption}</span>
      {url ? (
        <img src={url} alt={caption} className="h-14 w-14 rounded-lg object-cover border border-border" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted border border-border">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
  return (
    <div className="flex items-center gap-3 py-1 border-b border-border/40 last:border-0">
      <span className="text-xs font-medium text-muted-foreground w-24 shrink-0">{label}</span>
      {thumb(prevUrl, "Before")}
      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
      {thumb(nextUrl, "After")}
    </div>
  );
}

// Detail panel rendered below the row
function DetailPanel({ row }: { row: HistoryRow }) {
  return (
    <div className="px-4 pb-5 pt-2 bg-muted/30 border-t border-border/40">
      <div className="flex gap-6 flex-wrap">
        {/* Product image */}
        <ProductThumb url={row.imageUrl} large />

        <div className="flex-1 min-w-0 space-y-4">
          {/* Meta: requester / approver / dates / role */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Requested by
              </p>
              <p className="font-medium">{row.requesterName || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Approved/Rejected by
              </p>
              <p className="font-medium">{row.approverName || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Requested at
              </p>
              <p className="font-medium">{formatDate(row.date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Decided at
              </p>
              <p className="font-medium">{formatDate(row.decidedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" /> Category
              </p>
              <Badge variant="outline" className="capitalize text-xs">
                {row.category || "-"}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Price
              </p>
              <p className="font-semibold text-xs">{row.price || "-"}</p>
            </div>
            {row.approvalRole && (
              <div>
                <p className="text-xs text-muted-foreground">Approval role</p>
                <Badge variant="secondary" className="capitalize text-xs">
                  {row.approvalRole === "store_keeper" ? "Storekeeper" : "Manager"}
                </Badge>
              </div>
            )}
            {row.reason && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Reason / Note</p>
                <p className="font-medium">{row.reason}</p>
              </div>
            )}
          </div>

          {/* ── Transfer-specific ── */}
          {row.kind === "transfer" && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Boxes className="h-3 w-3" /> Transfer Details
              </p>
              <div className="flex items-center gap-3 text-sm">
                <Badge variant="outline">
                  {row.fromLocation === "mart" ? "Mart (Front)" : "Store (Warehouse)"}
                </Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">
                  {row.toLocation === "store" ? "Store (Warehouse)" : "Mart (Front)"}
                </Badge>
                <span className="font-semibold">× {row.quantity}</span>
              </div>
            </div>
          )}

          {/* ── Product Add payload ── */}
          {row.kind === "add" && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" /> New Product Fields
              </p>
              {/* Image preview for add requests */}
              {(row.payload.imageUrl || row.payload.pictureUrl) && (
                <div className="mb-2">
                  <span className="text-xs text-muted-foreground block mb-1">Product Image</span>
                  <img
                    src={row.payload.imageUrl || row.payload.pictureUrl}
                    alt="product"
                    className="h-14 w-14 rounded-lg object-cover border border-border"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                {Object.entries(row.payload)
                  .filter(([k]) => !IMAGE_FIELDS.includes(k as any) && row.payload[k] != null && String(row.payload[k]) !== "")
                  .map(([k, v]) => (
                    <div key={k}>
                      <span className="text-xs text-muted-foreground">{fieldLabel(k)}</span>
                      <p className="font-medium">
                        {PRICE_FIELDS.includes(k as any)
                          ? formatCurrency(Number(v))
                          : Array.isArray(v)
                            ? v.join(", ")
                            : String(v)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── Product Edit changes ── */}
          {row.kind === "edit" && Object.keys(row.changes).length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" /> Changed Fields
              </p>
              <div className="space-y-0">
                {Object.entries(row.changes).map(([k, next]) => {
                  const prev = row.originalProduct?.[k];
                  const isImageField = IMAGE_FIELDS.includes(k as any);
                  const isPriceField = PRICE_FIELDS.includes(k as any);
                  const isQtyField = QTY_FIELDS.includes(k as any);

                  if (isImageField) {
                    return (
                      <ImageDiffLine
                        key={k}
                        label={fieldLabel(k)}
                        prevUrl={prev ? String(prev) : undefined}
                        nextUrl={next ? String(next) : undefined}
                      />
                    );
                  }

                  return (
                    <DiffLine
                      key={k}
                      label={fieldLabel(k)}
                      prev={prev ?? "—"}
                      next={Array.isArray(next) ? next.join(", ") : next}
                      isCurrency={isPriceField || isQtyField}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

function HistoryTableRow({
  row,
  expanded,
  onToggle,
}: {
  row: HistoryRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={`border-b border-border/50 cursor-pointer hover:bg-accent/40 transition-colors ${expanded ? "bg-accent/20" : ""}`}
        onClick={onToggle}
      >
        {/* Date */}
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(row.date)}
        </td>
        {/* Type */}
        <td className="px-4 py-3">
          <KindBadge kind={row.kind} />
        </td>
        {/* Image */}
        <td className="px-4 py-3 w-14">
          <ProductThumb url={row.imageUrl} />
        </td>
        {/* Product */}
        <td className="px-4 py-3 font-medium max-w-[160px]">
          <span className="truncate block">{row.productName}</span>
        </td>
        {/* Category */}
        <td className="px-4 py-3">
          <Badge variant="outline" className="capitalize text-xs">
            {row.category || "-"}
          </Badge>
        </td>
        {/* Price */}
        <td className="px-4 py-3 font-semibold text-xs whitespace-nowrap">
          {row.price || "-"}
        </td>
        {/* Summary */}
        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px]">
          {row.kind === "transfer" && (
            <span className="flex items-center gap-1">
              <span>{row.fromLocation === "mart" ? "Mart" : "Store"}</span>
              <ArrowRight className="h-3 w-3" />
              <span>{row.toLocation === "store" ? "Store" : "Mart"}</span>
              <span className="font-semibold text-foreground ml-1">× {row.quantity}</span>
            </span>
          )}
          {row.kind === "add" && (
            <span>
              Store: {row.payload?.storeQuantity ?? 0} / Front: {row.payload?.supermarketQuantity ?? 0}
            </span>
          )}
          {row.kind === "edit" && (
            <span className="truncate block">
              {Object.keys(row.changes).map(fieldLabel).join(", ")}
            </span>
          )}
        </td>
        {/* Requester */}
        <td className="px-4 py-3 text-sm">{row.requesterName || "-"}</td>
        {/* Approver */}
        <td className="px-4 py-3 text-sm">{row.approverName || "-"}</td>
        {/* Status */}
        <td className="px-4 py-3">
          <StatusBadge status={row.status} />
        </td>
        {/* Expand toggle */}
        <td className="px-4 py-3 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={11} className="p-0">
            <DetailPanel row={row} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApprovalHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "all") qs.append("status", statusFilter);
      if (startDate) qs.append("startDate", startDate);
      if (endDate) qs.append("endDate", endDate);
      qs.append("scope", "all");

      const paths = [
        "stock-transfer-requests",
        "product-add-requests",
        "product-edit-requests",
      ];
      const headers = { Authorization: token ? `Bearer ${token}` : "" };
      const results = await Promise.all(
        paths.map((p) =>
          fetch(`${API_BASE}/api/${p}?${qs.toString()}`, { headers }),
        ),
      );
      const json = await Promise.all(results.map((r) => (r.ok ? r.json() : [])));
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

  const rows = useMemo<HistoryRow[]>(() => {
    const meId = user?.id;
    if (!meId) return [];
    const isOwnerOrAdmin =
      user?.role === "owner" || user?.role === "systemAdmin";
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
        const category = product?.category || "-";
        const price =
          product?.sellingPrice != null
            ? `${formatCurrency(product.sellingPrice)} ETB`
            : "-";
        out.push({
          key: `transfer-${id}`,
          kind: "transfer",
          date: r.createdAt,
          decidedAt: r.decidedAt,
          productName: name,
          imageUrl: String(product?.imageUrl || ""),
          category,
          price,
          quantity: Number(r.quantity || 0),
          fromLocation: r.fromLocation,
          toLocation: r.toLocation,
          requesterName: r.requesterName,
          approverName: r.approverName,
          status: r.status,
          requesterId: r.requesterId,
          approverId: r.approverId,
          approvalRole: r.approvalRole ?? null,
          reason: (r as any).reason,
        } satisfies TransferRow);
      }
    }

    if (typeFilter === "all" || typeFilter === "add") {
      for (const r of adds) {
        const id = String(r._id || r.id || "");
        const payload = (r.payload || {}) as Record<string, any>;
        const category = payload.category || "-";
        const price =
          payload.sellingPrice != null
            ? `${formatCurrency(payload.sellingPrice)} ETB`
            : "-";
        out.push({
          key: `add-${id}`,
          kind: "add",
          date: r.createdAt,
          decidedAt: r.decidedAt,
          productName: String(payload.name || "-"),
          imageUrl: String(payload?.imageUrl || payload?.pictureUrl || ""),
          category,
          price,
          payload,
          requesterName: r.requesterName,
          approverName: r.approverName,
          status: r.status,
          requesterId: r.requesterId,
          approverId: r.approverId,
          approvalRole: r.approvalRole ?? null,
          reason: (r as any).reason,
        } satisfies AddRow);
      }
    }

    if (typeFilter === "all" || typeFilter === "edit") {
      for (const r of edits) {
        const id = String(r._id || r.id || "");
        const rawProductId = r.productId;
        const productObj = (r as any).product as Record<string, any> | undefined;
        const name =
          productObj?.name ||
          (typeof rawProductId === "object" && rawProductId !== null
            ? String((rawProductId as { name?: string }).name || "-")
            : String(rawProductId || "-"));
        const category = r.changes?.category || productObj?.category || "-";
        const priceVal = r.changes?.sellingPrice ?? productObj?.sellingPrice;
        const price =
          priceVal != null ? `${formatCurrency(priceVal)} ETB` : "-";
        out.push({
          key: `edit-${id}`,
          kind: "edit",
          date: r.createdAt,
          decidedAt: r.decidedAt,
          productName: name,
          imageUrl: String(productObj?.imageUrl || ""),
          category,
          price,
          changes: (r.changes || {}) as Record<string, any>,
          // The backend returns the joined product — use it as the "original" snapshot
          originalProduct: productObj,
          requesterName: r.requesterName,
          approverName: r.approverName,
          status: r.status,
          requesterId: r.requesterId,
          approverId: r.approverId,
          approvalRole: r.approvalRole ?? null,
          reason: (r as any).reason,
        } satisfies EditRow);
      }
    }

    return out
      .filter((r) => isOwnerOrAdmin || involved(r.requesterId, r.approverId))
      .sort((a, b) => {
        const ta = new Date(a.date || 0).getTime();
        const tb = new Date(b.date || 0).getTime();
        return tb - ta;
      });
  }, [transfers, adds, edits, typeFilter, user?.id, user?.role]);

  const toggleExpand = (key: string) =>
    setExpandedKey((prev) => (prev === key ? null : key));

  return (
    <RoleLayout allowedRoles={["owner", "manager", "store_keeper"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Button
              variant="outline"
              size="icon"
              className="mt-1 shrink-0"
              onClick={() =>
                navigate(
                  user?.role === "manager"
                    ? "/manager/approvals"
                    : user?.role === "store_keeper"
                      ? "/store-keeper/approvals"
                      : "/owner/approvals",
                )
              }
              aria-label={t("back")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{t("approval_history")}</h1>
              <p className="text-muted-foreground">
                Full audit trail of stock transfers and product requests. Click any row to see complete details.
              </p>
            </div>
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
            >
              <RotateCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <CardContent className="grid gap-6 md:grid-cols-4 p-0">
            <div className="space-y-2">
              <Label>{t("request_type")}</Label>
              <select
                className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as RequestTypeFilter)}
              >
                <option value="all">{t("all")}</option>
                <option value="transfer">Stock Transfer</option>
                <option value="add">Product Add</option>
                <option value="edit">Product Edit</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <select
                className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              >
                <option value="all">{t("all")}</option>
                <option value="approved">{t("approved")}</option>
                <option value="pending">{t("pending")}</option>
                <option value="rejected">{t("rejected")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>{t("from")}</Label>
              <EthiopianDatePicker
                value={startDate}
                onChange={(ymd) => setStartDate(ymd)}
                placeholder={t("from")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("to")}</Label>
              <EthiopianDatePicker
                value={endDate}
                onChange={(ymd) => setEndDate(ymd)}
                placeholder={t("to")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {t("approval_history")}
              <Badge variant="secondary">{rows.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No records found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Type</th>
                      <th className="px-4 py-3 w-14" />
                      <th className="px-4 py-3 text-left font-medium">Product</th>
                      <th className="px-4 py-3 text-left font-medium">Category</th>
                      <th className="px-4 py-3 text-left font-medium">Price</th>
                      <th className="px-4 py-3 text-left font-medium">Summary</th>
                      <th className="px-4 py-3 text-left font-medium">Requested by</th>
                      <th className="px-4 py-3 text-left font-medium">Approved by</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <HistoryTableRow
                        key={r.key}
                        row={r}
                        expanded={expandedKey === r.key}
                        onToggle={() => toggleExpand(r.key)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}

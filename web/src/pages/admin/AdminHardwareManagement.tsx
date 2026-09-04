import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { getImageUrl, handleImageError } from "@/utils/imageUrl";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import {
  Boxes,
  Printer,
  QrCode,
  Edit2,
  Save,
  Plus,
  Trash2,
  Loader2,
  ShoppingBag,
  RefreshCw,
  Package,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

type HardwareProduct = {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  active: boolean;
  imageUrl?: string;
};

// Local editing state — unitPrice is a string so the admin can clear the field
type EditableProduct = {
  id: string;
  name: string;
  description: string;
  unitPrice: string;
  active: boolean;
  imageUrl?: string;
};

type SubscriptionPaymentRecord = {
  id: string;
  martName?: string;
  userName?: string;
  userPhone?: string;
  packageName: string;
  amount: number;
  paymentMethod: string;
  paymentReference?: string;
  receiptUrl: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  createdAt: string;
};

export default function AdminHardwareManagement() {
  const { t } = useTranslation();
  const auth = useAuthStore((s) => s.user);
  const API_BASE = import.meta.env.VITE_API_URL || "";

  const [products, setProducts] = useState<EditableProduct[]>([]);
  const [payments, setPayments] = useState<SubscriptionPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filter state for hardware orders table
  const [hardwareFilter, setHardwareFilter] = useState<"all" | "scanner" | "printer" | "both">("all");

  // Dialog States for Full CRUD
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<EditableProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<EditableProduct | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);

  // New product form
  const [newForm, setNewForm] = useState({
    name: "",
    description: "",
    unitPrice: "",
    active: true,
    imageUrl: "",
  });

  const headers = React.useMemo(
    () => ({
      Authorization: `Bearer ${auth?.token}`,
      "Content-Type": "application/json",
    }),
    [auth?.token]
  );

  const handleImageFileUpload = async (file: File): Promise<string> => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`${API_BASE}/api/subscriptions/upload-hardware-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth?.token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Image upload failed");
      }
      const data = await res.json();
      toast({ title: "Image Uploaded", description: "Picture attached successfully." });
      return data.imageUrl || "";
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message || "Failed to upload image", variant: "destructive" });
      return "";
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, payRes] = await Promise.all([
        fetch(`${API_BASE}/api/subscriptions/hardware-products`),
        fetch(`${API_BASE}/api/subscriptions/payments`, { headers }),
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        const list = Array.isArray(prodData) ? prodData : [];
        setProducts(
          list.map((p: HardwareProduct) => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            unitPrice: String(p.unitPrice ?? ""),
            active: p.active !== false,
            imageUrl: p.imageUrl || "",
          }))
        );
      }

      if (payRes.ok) {
        const payData = await payRes.json();
        const list = Array.isArray(payData)
          ? payData
          : Array.isArray(payData?.data)
            ? payData.data
            : [];
        setPayments(list);
      }
    } catch (err) {
      console.error("Failed to load admin hardware data", err);
      toast({
        title: "Error Loading Data",
        description: "Could not fetch hardware products or orders.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth?.token]);

  const toApiProducts = (list: EditableProduct[]): HardwareProduct[] =>
    list.map((p) => ({
      id: p.id,
      name: p.name.trim(),
      description: p.description.trim(),
      unitPrice: p.unitPrice === "" || p.unitPrice == null ? 0 : Math.max(0, Number(p.unitPrice) || 0),
      active: Boolean(p.active),
      imageUrl: p.imageUrl ? p.imageUrl.trim() : undefined,
    }));

  const persistProducts = async (list: EditableProduct[]) => {
    const res = await fetch(`${API_BASE}/api/subscriptions/hardware-products`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ products: toApiProducts(list) }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Failed to save hardware products.");
    }
    return res.json();
  };

  const handlePriceChange = (id: string, value: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, unitPrice: value } : p))
    );
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    const next = products.map((p) => (p.id === id ? { ...p, active } : p));
    setProducts(next);
    try {
      await persistProducts(next);
      toast({
        title: active ? "Product Activated" : "Product Disabled",
        description: `Status updated successfully.`,
      });
    } catch (err: any) {
      fetchData();
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveCatalog = async () => {
    try {
      setIsSaving(true);
      await persistProducts(products);
      toast({
        title: "Hardware Catalog Saved",
        description: "Unit prices and settings updated successfully.",
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Save Failed",
        description: err.message || "Could not update hardware products.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Create Product ──
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim()) {
      toast({ title: "Name required", description: "Please enter product name.", variant: "destructive" });
      return;
    }
    const slugId = newForm.name.toLowerCase().replace(/[^a-z0-9]/g, "_") || `hw_${Date.now()}`;
    const newProduct: EditableProduct = {
      id: slugId,
      name: newForm.name.trim(),
      description: newForm.description.trim(),
      unitPrice: newForm.unitPrice || "0",
      active: newForm.active,
      imageUrl: newForm.imageUrl ? newForm.imageUrl.trim() : undefined,
    };

    const nextList = [...products, newProduct];
    setProducts(nextList);
    setIsAddOpen(false);
    setNewForm({ name: "", description: "", unitPrice: "", active: true, imageUrl: "" });

    try {
      await persistProducts(nextList);
      toast({
        title: "Product Added",
        description: `${newProduct.name} added to sold hardware catalog.`,
      });
    } catch (err: any) {
      fetchData();
      toast({
        title: "Failed to Add Product",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // ── Edit Product ──
  const openEditDialog = (product: EditableProduct) => {
    setEditingProduct({ ...product });
    setIsEditOpen(true);
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name.trim()) return;

    const nextList = products.map((p) => (p.id === editingProduct.id ? editingProduct : p));
    setProducts(nextList);
    setIsEditOpen(false);

    try {
      await persistProducts(nextList);
      toast({
        title: "Product Updated",
        description: `${editingProduct.name} updated successfully.`,
      });
    } catch (err: any) {
      fetchData();
      toast({
        title: "Failed to Update Product",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setEditingProduct(null);
    }
  };

  // ── Delete Product ──
  const openDeleteDialog = (product: EditableProduct) => {
    setDeletingProduct(product);
    setIsDeleteOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;
    const nextList = products.filter((p) => p.id !== deletingProduct.id);
    setProducts(nextList);
    setIsDeleteOpen(false);

    try {
      await persistProducts(nextList);
      toast({
        title: "Product Deleted",
        description: `${deletingProduct.name} removed from hardware catalog.`,
        variant: "destructive",
      });
    } catch (err: any) {
      fetchData();
      toast({
        title: "Failed to Delete Product",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setDeletingProduct(null);
    }
  };

  const renderIcon = (id: string) => {
    if (id.includes("scanner")) return <QrCode className="w-5 h-5" />;
    if (id.includes("printer")) return <Printer className="w-5 h-5" />;
    return <Package className="w-5 h-5" />;
  };

  const getProductDisplayName = (p: EditableProduct) => {
    const key = p.name.toLowerCase().trim();
    if (key.includes("scanner")) return t("barcode_scanner_name", p.name);
    if (key.includes("printer")) return t("thermal_printer_name", p.name);
    if (key.includes("drawer")) return t("cash_drawer_name", p.name);
    if (key.includes("terminal") || key.includes("pos")) return t("pos_terminal_name", p.name);
    return t(p.id, p.name);
  };

  const formatPackageName = (name?: string) => {
    if (!name) return "";
    const lower = name.toLowerCase().trim();
    if (lower.includes("free")) return t("seven_days_free", name);
    if (lower.includes("12 month") || lower.includes("12 months") || lower.includes("1 year")) return t("twelve_months", name);
    if (lower.includes("6 month") || lower.includes("6 months")) return t("six_months", name);
    if (lower.includes("3 month") || lower.includes("3 months")) return t("three_months", name);
    if (lower.includes("1 month")) return t("one_month", name);
    return t(name, name);
  };

  // Filter payments based on hardware selection
  const filteredPayments = React.useMemo(() => {
    if (hardwareFilter === "all") return payments;
    
    return payments.filter((payment) => {
      const reference = payment.paymentReference || "";
      const hasScanner = reference.toLowerCase().includes("scanner");
      const hasPrinter = reference.toLowerCase().includes("printer");
      
      if (hardwareFilter === "scanner") return hasScanner && !hasPrinter;
      if (hardwareFilter === "printer") return hasPrinter && !hasScanner;
      if (hardwareFilter === "both") return hasScanner && hasPrinter;
      
      return true;
    });
  }, [payments, hardwareFilter]);

  return (
    <RoleLayout allowedRoles={["system_admin"]}>
      <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("sold_hardware_title")}</h1>
            <p className="text-muted-foreground">
              {t("sold_hardware_subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> {t("add_hardware_product")}
            </Button>
            <Button onClick={fetchData} variant="outline" size="icon" title={t("refresh") || "Refresh"}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Catalog CRUD Settings Card */}
        <Card className="shadow-sm border-border/60 bg-card text-card-foreground">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Boxes className="w-5 h-5 text-primary" /> {t("sold_hardware_catalog")} ({products.length})
              </CardTitle>
              <CardDescription>
                {t("hardware_catalog_description")}
              </CardDescription>
            </div>
            <Button
              onClick={handleSaveCatalog}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2 self-start sm:self-auto"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {isSaving ? t("saving") : t("save_catalog_pricing")}
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" /> {t("loading") || "Loading hardware products..."}
              </div>
            ) : products.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-3">
                <p>{t("no_hardware_orders") || "No hardware products found in catalog."}</p>
                <Button variant="outline" onClick={() => setIsAddOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> {t("add_hardware_product")}
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <Card key={product.id} className="border-border/60 bg-card dark:bg-card/70 border shadow-sm relative flex flex-col justify-between rounded-xl hover:border-primary/40 transition-colors">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={getImageUrl(product.imageUrl)}
                              alt={product.name}
                              className="w-12 h-12 rounded-xl object-cover border border-border/70 shrink-0 bg-muted"
                              onError={handleImageError}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                              {renderIcon(product.id)}
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-base text-foreground leading-snug">{getProductDisplayName(product)}</h3>
                            <Badge variant={product.active ? "default" : "secondary"} className="mt-0.5 text-[10px] font-semibold">
                              {product.active ? t("active_status") : t("inactive_status")}
                            </Badge>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                            onClick={() => openEditDialog(product)}
                            title={t("edit") || "Edit details"}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openDeleteDialog(product)}
                            title={t("delete") || "Delete product"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground min-h-[32px] line-clamp-2">
                        {(!product.description || product.description.trim() === "" || product.description.trim().toLowerCase() === "no description provided.")
                          ? t("no_description_provided")
                          : product.description}
                      </p>

                      <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t("unit_price_etb")}</Label>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Input
                              type="number"
                              value={product.unitPrice}
                              onChange={(e) => handlePriceChange(product.id, e.target.value)}
                              placeholder="0"
                              className="w-28 text-right font-bold text-primary dark:text-primary h-8 text-xs bg-background border-border/80"
                            />
                            <span className="text-xs font-semibold text-muted-foreground">ETB</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <Label htmlFor={`active-${product.id}`} className="text-[11px] text-muted-foreground font-medium">{t("status")}</Label>
                          <Switch
                            id={`active-${product.id}`}
                            checked={product.active}
                            onCheckedChange={(val) => handleToggleActive(product.id, val)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sold Hardware Orders Overview */}
        <Card className="shadow-sm border-border/60 bg-card text-card-foreground">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" /> {t("hardware_orders_title")}
                </CardTitle>
                <CardDescription>
                  {t("hardware_orders_subtitle")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">{t("filter_by_status") || "Filter by:"}</Label>
                <Select value={hardwareFilter} onValueChange={(val: any) => setHardwareFilter(val)}>
                  <SelectTrigger className="w-[160px] h-9 bg-background border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all") || "All Orders"}</SelectItem>
                    <SelectItem value="scanner">{t("scanner_only") || "Scanner Only"}</SelectItem>
                    <SelectItem value="printer">{t("printer_only") || "Printer Only"}</SelectItem>
                    <SelectItem value="both">{t("scanner_and_printer") || "Scanner & Printer"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold">{t("mart_name") || "Mart Name"}</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">{t("user_or_phone") || "User / Phone"}</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">{t("subscription_package") || "Subscription Package"}</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">{t("hardware_addons_title") || "Hardware Add-ons"}</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">{t("total_amount")}</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">{t("status")}</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">{t("receipt") || "Receipt"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {hardwareFilter === "all" 
                        ? t("no_hardware_orders")
                        : `No orders found with ${hardwareFilter === "both" ? "both scanner & printer" : hardwareFilter + " only"}.`}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((p) => (
                    <TableRow key={p.id} className="border-border/60 hover:bg-muted/50 dark:hover:bg-muted/20">
                      <TableCell className="font-semibold text-foreground">{p.martName || "N/A"}</TableCell>
                      <TableCell>
                        <p className="text-xs font-medium text-foreground">{p.userName || "N/A"}</p>
                        <p className="text-[11px] text-muted-foreground">{p.userPhone || ""}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-muted/60 dark:bg-muted/30 border-border/60 text-foreground text-xs font-medium">
                          {formatPackageName(p.packageName)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground px-2 py-1 rounded border border-primary/25 font-semibold">
                          {p.paymentReference?.includes(" | Add-ons:")
                            ? p.paymentReference.split(" | Add-ons:")[1].trim()
                            : (t("standard_license_only") || "Standard License Only")}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {p.amount?.toLocaleString()} ETB
                      </TableCell>
                      <TableCell>
                        {p.status === "approved" ? (
                          <Badge className="bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 text-[11px] font-semibold capitalize">
                            {t("approved")}
                          </Badge>
                        ) : p.status === "rejected" ? (
                          <Badge variant="destructive" className="text-[11px] font-semibold capitalize">
                            {t("rejected")}
                          </Badge>
                        ) : p.status === "suspended" ? (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[11px] font-semibold capitalize">
                            {t("suspended")}
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 text-[11px] font-semibold capitalize">
                            {t("pending_status")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.receiptUrl ? (
                          <a
                            href={getImageUrl(p.receiptUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline font-medium hover:text-primary/80"
                          >
                            {t("view_receipt") || "View Receipt"}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("none") || "None"}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ── CREATE PRODUCT DIALOG ── */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("add_hardware_product")}</DialogTitle>
              <DialogDescription>{t("hardware_catalog_description")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddProduct} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>{t("hardware_product_name")}</Label>
                <Input
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="e.g. POS Touchscreen Terminal"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("hardware_description")}</Label>
                <Input
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  placeholder="e.g. Dual-screen Android POS terminal with built-in printer"
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("unit_price_etb")}</Label>
                <Input
                  type="number"
                  value={newForm.unitPrice}
                  onChange={(e) => setNewForm({ ...newForm, unitPrice: e.target.value })}
                  placeholder="25000"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("product_photo") || "Product Photo"} ({t("optional") || "Optional"})</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await handleImageFileUpload(file);
                      if (url) setNewForm((prev) => ({ ...prev, imageUrl: url }));
                    }
                  }}
                  className="text-xs"
                />
                <Input
                  value={newForm.imageUrl}
                  onChange={(e) => setNewForm({ ...newForm, imageUrl: e.target.value })}
                  placeholder="or paste Image URL (https://...)"
                  className="text-xs mt-1"
                />
                {newForm.imageUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img
                      src={getImageUrl(newForm.imageUrl)}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-border bg-muted"
                      onError={handleImageError}
                    />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t("image_attached") || "Image attached"}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="add-active">{t("available_for_sale") || "Available for Sale"}</Label>
                <Switch
                  id="add-active"
                  checked={newForm.active}
                  onCheckedChange={(val) => setNewForm({ ...newForm, active: val })}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>{t("cancel")}</Button>
                <Button type="submit" className="bg-primary text-primary-foreground">{t("add_hardware_product")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── EDIT PRODUCT DIALOG ── */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("edit_hardware_product")}</DialogTitle>
              <DialogDescription>{t("save_changes")}</DialogDescription>
            </DialogHeader>
            {editingProduct && (
              <form onSubmit={handleUpdateProduct} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>{t("hardware_product_name")}</Label>
                  <Input
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{t("hardware_description")}</Label>
                  <Input
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{t("unit_price_etb")}</Label>
                  <Input
                    type="number"
                    value={editingProduct.unitPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unitPrice: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{t("product_photo") || "Product Photo"} ({t("optional") || "Optional"})</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = await handleImageFileUpload(file);
                        if (url && editingProduct) setEditingProduct((prev) => (prev ? { ...prev, imageUrl: url } : prev));
                      }
                    }}
                    className="text-xs"
                  />
                  <Input
                    value={editingProduct.imageUrl || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                    placeholder="or paste Image URL (https://...)"
                    className="text-xs mt-1"
                  />
                  {editingProduct.imageUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <img
                        src={getImageUrl(editingProduct.imageUrl)}
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-cover border border-border bg-muted"
                        onError={handleImageError}
                      />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t("image_attached") || "Image attached"}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="edit-active">{t("available_for_sale") || "Available for Sale"}</Label>
                  <Switch
                    id="edit-active"
                    checked={editingProduct.active}
                    onCheckedChange={(val) => setEditingProduct({ ...editingProduct, active: val })}
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>{t("cancel")}</Button>
                  <Button type="submit" className="bg-primary text-primary-foreground">{t("save_changes")}</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ── DELETE CONFIRMATION DIALOG ── */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive">{t("delete")}</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong className="text-foreground">{deletingProduct?.name}</strong> from the catalog? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>{t("cancel")}</Button>
              <Button type="button" variant="destructive" onClick={handleDeleteProduct}>{t("delete")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleLayout>
  );
}


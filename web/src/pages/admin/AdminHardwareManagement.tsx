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
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export default function AdminHardwareManagement() {
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
            <h1 className="text-3xl font-bold tracking-tight">Sold Hardware Products Management</h1>
            <p className="text-muted-foreground">
              Manage hardware add-ons (Scanners, Printers, POS Equipment), set unit prices, and view customer orders.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> Add Hardware Product
            </Button>
            <Button onClick={fetchData} variant="outline" size="icon" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Catalog CRUD Settings Card */}
        <Card className="shadow-sm border-border/60 bg-card text-card-foreground">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Boxes className="w-5 h-5 text-primary" /> Sold Hardware Catalog ({products.length})
              </CardTitle>
              <CardDescription>
                Hardware add-ons and unit prices defined here will automatically appear during supermarket subscription checkout.
              </CardDescription>
            </div>
            <Button
              onClick={handleSaveCatalog}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2 self-start sm:self-auto"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Catalog Pricing
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" /> Loading hardware products...
              </div>
            ) : products.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-3">
                <p>No hardware products found in catalog.</p>
                <Button variant="outline" onClick={() => setIsAddOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Add Your First Product
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
                            <h3 className="font-bold text-base text-foreground leading-snug">{product.name}</h3>
                            <Badge variant={product.active ? "default" : "secondary"} className="mt-0.5 text-[10px] font-semibold">
                              {product.active ? "Active" : "Disabled"}
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
                            title="Edit details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => openDeleteDialog(product)}
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground min-h-[32px] line-clamp-2">
                        {product.description || "No description provided."}
                      </p>

                      <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Unit Price (ETB)</Label>
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
                          <Label htmlFor={`active-${product.id}`} className="text-[11px] text-muted-foreground font-medium">Status</Label>
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
                  <ShoppingBag className="w-5 h-5 text-primary" /> Sold Hardware Orders &amp; Subscription Payments
                </CardTitle>
                <CardDescription>
                  Subscriptions containing hardware add-ons submitted by supermarkets.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Filter by:</Label>
                <Select value={hardwareFilter} onValueChange={(val: any) => setHardwareFilter(val)}>
                  <SelectTrigger className="w-[160px] h-9 bg-background border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="scanner">Scanner Only</SelectItem>
                    <SelectItem value="printer">Printer Only</SelectItem>
                    <SelectItem value="both">Scanner & Printer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-semibold">Mart Name</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">User / Phone</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Subscription Package</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Hardware Add-ons</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Total Amount</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                  <TableHead className="text-muted-foreground font-semibold">Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {hardwareFilter === "all" 
                        ? "No subscription & hardware orders recorded yet."
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
                        <Badge variant="outline" className="bg-muted/60 dark:bg-muted/30 border-border/60 text-foreground text-xs font-medium">{p.packageName}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-foreground px-2 py-1 rounded border border-primary/25 font-semibold">
                          {p.paymentReference?.includes(" | Add-ons:")
                            ? p.paymentReference.split(" | Add-ons:")[1].trim()
                            : "Standard License Only"}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {p.amount?.toLocaleString()} ETB
                      </TableCell>
                      <TableCell>
                        {p.status === "approved" ? (
                          <Badge className="bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 dark:border-emerald-500/40 text-[11px] font-semibold capitalize">
                            {p.status}
                          </Badge>
                        ) : p.status === "rejected" ? (
                          <Badge variant="destructive" className="text-[11px] font-semibold capitalize">
                            {p.status}
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500/15 dark:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 dark:border-amber-500/40 text-[11px] font-semibold capitalize">
                            {p.status}
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
                            View Receipt
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
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
              <DialogTitle>Add New Hardware Product</DialogTitle>
              <DialogDescription>Create a new sold hardware item to offer during supermarket registration.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddProduct} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Product Name</Label>
                <Input
                  value={newForm.name}
                  onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                  placeholder="e.g. POS Touchscreen Terminal"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={newForm.description}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                  placeholder="e.g. Dual-screen Android POS terminal with built-in printer"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Unit Price (ETB)</Label>
                <Input
                  type="number"
                  value={newForm.unitPrice}
                  onChange={(e) => setNewForm({ ...newForm, unitPrice: e.target.value })}
                  placeholder="25000"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Product Photo / Picture (Optional)</Label>
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
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Image attached</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Label htmlFor="add-active">Available for Sale</Label>
                <Switch
                  id="add-active"
                  checked={newForm.active}
                  onCheckedChange={(val) => setNewForm({ ...newForm, active: val })}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-primary-foreground">Add Product</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── EDIT PRODUCT DIALOG ── */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Hardware Product</DialogTitle>
              <DialogDescription>Update hardware details, name, or unit price.</DialogDescription>
            </DialogHeader>
            {editingProduct && (
              <form onSubmit={handleUpdateProduct} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Product Name</Label>
                  <Input
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Input
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Unit Price (ETB)</Label>
                  <Input
                    type="number"
                    value={editingProduct.unitPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unitPrice: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Product Photo / Picture (Optional)</Label>
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
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Image attached</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="edit-active">Available for Sale</Label>
                  <Switch
                    id="edit-active"
                    checked={editingProduct.active}
                    onCheckedChange={(val) => setEditingProduct({ ...editingProduct, active: val })}
                  />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary text-primary-foreground">Update Product</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ── DELETE CONFIRMATION DIALOG ── */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Hardware Product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong className="text-foreground">{deletingProduct?.name}</strong> from the catalog? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={handleDeleteProduct}>Delete Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleLayout>
  );
}


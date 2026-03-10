import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { useProductStore } from "@/stores/productStore";
import type { ProductUnit } from "@/types";
import {
  Barcode,
  Loader2,
  Image as ImageIcon,
  Trash2,
  RotateCw,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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

const units: ProductUnit[] = ["pcs", "kg", "g", "l", "ml", "box"];
import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

export default function ProductAdd() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { categories } = useProductStore();
  const fetchProducts = useProductStore((s) => s.fetchProducts);
  // Determine where to return after add based on current user role
  const role = useAuthStore((s) => s.user?.role) || "owner";
  const productsRoute =
    role === "manager" ? "/manager/products" : "/owner/products";
  // Permissions
  const user = useAuthStore((s) => s.user);
  const canSetPurchase =
    user?.role === "owner" || (user?.permissions || []).includes("addItem");

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "pcs" as ProductUnit,
    purchasePrice: "",
    sellingPrice: "",
    quantity: "",
    lowStockThreshold: "10",
    expiryDate: "",
    barcodes: [] as string[], // store as array
    barcodeInput: "",
  });

  const [barcodeConflictOpen, setBarcodeConflictOpen] = useState(false);
  const [barcodeConflict, setBarcodeConflict] = useState<null | {
    code: string;
    productId: string;
    productName: string;
    storeQuantity?: number;
  }>(null);
  const [barcodeConflictProduct, setBarcodeConflictProduct] = useState<
    any | null
  >(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_URL || "";
  const token = useAuthStore.getState().user?.token;

  const findProductByBarcode = async (code: string) => {
    const trimmed = (code || "").trim();
    if (!trimmed) return null;
    try {
      const res = await axios.get(
        `${API_BASE}/api/products/by-barcode/${encodeURIComponent(trimmed)}`,
        {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        },
      );
      return res?.data || null;
    } catch (e: any) {
      if (e?.response?.status === 404) return null;
      throw e;
    }
  };

  const generateUniqueBarcode = async () => {
    const candidate = () => `${Date.now()}`.slice(-12);
    for (let i = 0; i < 6; i++) {
      const code =
        i === 0
          ? candidate()
          : `${candidate()}${Math.floor(Math.random() * 9)}`.slice(0, 12);
      const existing = await findProductByBarcode(code);
      if (!existing) return code;
    }
    // fallback: 12-digit random
    return String(Math.floor(Math.random() * 1e12)).padStart(12, "0");
  };

  const resetForm = () => {
    setForm({
      name: "",
      category: "",
      unit: "pcs",
      purchasePrice: "",
      sellingPrice: "",
      quantity: "",
      lowStockThreshold: "10",
      expiryDate: "",
      barcodes: [],
      barcodeInput: "",
    });
    setImageFile(null);
    setImagePreview(null);
    setEditingProductId(null);
    setBarcodeConflict(null);
    setBarcodeConflictProduct(null);
  };

  const onFileChange = useCallback((file?: File) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onFileChange(f);
  };

  const openFilePicker = (capture?: boolean) => {
    const input = fileRef.current;
    if (!input) return;
    if (capture) input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");
    input.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) onFileChange(f);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("category", form.category || "");
    formData.append("unit", form.unit);
    if (canSetPurchase) {
      formData.append(
        "purchasePrice",
        String(parseFloat(form.purchasePrice || "0")),
      );
    } else {
      // Manager without permission: send 0 as purchase price (owner controls actual purchase price)
      formData.append("purchasePrice", "0");
    }
    formData.append(
      "sellingPrice",
      String(parseFloat(form.sellingPrice || "0")),
    );
    formData.append("quantity", String(parseInt(form.quantity || "0")));
    formData.append(
      "lowStockThreshold",
      String(parseInt(form.lowStockThreshold || "10")),
    );
    if (form.expiryDate) formData.append("expiryDate", form.expiryDate);
    // barcodes: send as repeated form fields; prefer explicit array from UI
    const barcodesArr = Array.isArray(form.barcodes)
      ? form.barcodes.filter(Boolean)
      : [];
    if (barcodesArr.length === 0) {
      try {
        barcodesArr.push(await generateUniqueBarcode());
      } catch (e) {
        console.error("generate unique barcode failed", e);
        barcodesArr.push(`${Date.now()}`.slice(-12));
      }
    }
    for (const b of barcodesArr) formData.append("barcodes", b);
    if (imageFile) formData.append("image", imageFile, imageFile.name);

    try {
      const url = editingProductId
        ? `${API_BASE}/api/products/${encodeURIComponent(editingProductId)}`
        : `${API_BASE}/api/products`;

      const res = editingProductId
        ? await axios.put(url, formData, {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          })
        : await axios.post(url, formData, {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          });

      if (res && (res.status === 200 || res.status === 201)) {
        toast({
          title: editingProductId ? t("product_updated") : t("product_added"),
        });
        resetForm();
        try {
          await fetchProducts?.();
        } catch (err) {
          console.error("Failed to refresh products", err);
        }
        navigate(productsRoute);
      } else if (res && res.status === 202) {
        toast({
          title: t("sent_for_manager_approval"),
          description: editingProductId
            ? t("changes_apply_after_approval")
            : t("product_appear_after_approval"),
        });
        resetForm();
        navigate(productsRoute);
      } else {
        console.warn("Unexpected response creating product", res);
        toast({ title: t("failed_add_product") });
      }
    } catch (err: unknown) {
      console.error("Create product error", err);
      // Derive response/message safely
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as any;
      const status = e?.response?.status as number | undefined;
      const backendMessage =
        e?.response?.data?.message || e?.message || "An error occurred";

      if (status === 400) {
        // Validation / bad request: show user-friendly guidance
        const friendly =
          backendMessage ||
          "Please check the product fields (name, category, quantity) and try again.";
        toast({
          title: t("invalid_product_data"),
          description: String(friendly),
          variant: "destructive",
        });
      } else {
        // Other errors
        const desc = backendMessage || t("failed_add_product");
        toast({
          title: t("failed_add_product"),
          description: String(desc),
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateBarcode = () => {
    void (async () => {
      try {
        const b = await generateUniqueBarcode();
        const existing = Array.isArray(form.barcodes)
          ? form.barcodes.slice()
          : [];
        setForm({ ...form, barcodes: [...existing, b], barcodeInput: "" });
      } catch (e) {
        console.error("generate barcode failed", e);
        toast({ title: t("failed_generate_barcode"), variant: "destructive" });
      }
    })();
  };

  const refreshProductsNow = async () => {
    setIsRefreshing(true);
    try {
      await fetchProducts?.();
    } catch (err) {
      console.error("Failed to refresh products", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    // Product creation allowed for owners and managers.
    <RoleLayout allowedRoles={["owner", "manager"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("add_product")}</h1>
            <p className="text-muted-foreground">
              {t("product_add_description") || t("add_new_product_to_shop")}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void refreshProductsNow()}
            disabled={isRefreshing}
            aria-label={t("refresh_products")}
            title={t("refresh_products")}
          >
            <RotateCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Hidden file input used for both choose and capture */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />

              {/* Image picker */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="flex items-center gap-4 p-4 border border-dashed rounded-md bg-muted/20"
              >
                <div className="flex-shrink-0">
                  <Avatar>
                    {imagePreview ? (
                      <AvatarImage
                        src={imagePreview}
                        alt={form.name || "product"}
                      />
                    ) : (
                      <AvatarFallback>
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>

                <div className="flex-1">
                  <p className="font-medium">{t("product_image")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("drag_drop_or_take_photo")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => openFilePicker(false)}
                      variant="outline"
                    >
                      {t("choose_image")}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => openFilePicker(true)}
                      variant="outline"
                    >
                      {t("take_photo")}
                    </Button>
                    {imagePreview && (
                      <Button
                        type="button"
                        onClick={removeImage}
                        variant="ghost"
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> {t("remove")}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("product_name")} *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">{t("category")} *</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("select_category")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">{t("unit")} *</Label>
                  <Select
                    value={form.unit}
                    onValueChange={(v) =>
                      setForm({ ...form, unit: v as ProductUnit })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">{t("quantity")} *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">
                    {t("purchase_price")} (ETB){canSetPurchase ? " *" : ""}
                  </Label>
                  {canSetPurchase ? (
                    <Input
                      id="purchasePrice"
                      type="number"
                      step="0.01"
                      value={form.purchasePrice}
                      onChange={(e) =>
                        setForm({ ...form, purchasePrice: e.target.value })
                      }
                      required
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {t("owner_only")}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">
                    {t("selling_price")} (ETB) *
                  </Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    value={form.sellingPrice}
                    onChange={(e) =>
                      setForm({ ...form, sellingPrice: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lowStock">{t("low_stock_threshold")}</Label>
                  <Input
                    id="lowStock"
                    type="number"
                    value={form.lowStockThreshold}
                    onChange={(e) =>
                      setForm({ ...form, lowStockThreshold: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">{t("expiry_date")}</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) =>
                      setForm({ ...form, expiryDate: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="barcodeInput">{t("barcodes")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="barcodeInput"
                      value={form.barcodeInput}
                      onChange={(e) =>
                        setForm({ ...form, barcodeInput: e.target.value })
                      }
                      placeholder={t("enter_barcode_to_add")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        void (async () => {
                          const val = (form.barcodeInput || "").trim();
                          if (!val) return;
                          try {
                            const found = await findProductByBarcode(val);
                            if (found) {
                              setBarcodeConflict({
                                code: val,
                                productId: String(found._id || found.id),
                                productName: String(found.name || t("product")),
                                storeQuantity: Number(found.storeQuantity || 0),
                              });
                              setBarcodeConflictProduct(found);
                              setBarcodeConflictOpen(true);
                              return;
                            }
                            const existing = Array.isArray(form.barcodes)
                              ? form.barcodes.slice()
                              : [];
                            setForm({
                              ...form,
                              barcodes: [...existing, val],
                              barcodeInput: "",
                            });
                          } catch (e: any) {
                            console.error("barcode lookup failed", e);
                            toast({
                              title: t("failed_check_barcode"),
                              description: e?.message || t("server_error"),
                              variant: "destructive",
                            });
                          }
                        })();
                      }}
                    >
                      {t("add")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateBarcode}
                    >
                      <Barcode className="mr-2 h-4 w-4" />
                      {t("generate")}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {(Array.isArray(form.barcodes) ? form.barcodes : []).map(
                      (b, idx) => (
                        <div
                          key={b + "-" + idx}
                          className="inline-flex items-center gap-2 px-2 py-1 rounded border"
                        >
                          <span className="font-mono text-sm">{b}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-destructive p-1"
                            onClick={() => {
                              const arr = (form.barcodes || []).slice();
                              arr.splice(idx, 1);
                              setForm({ ...form, barcodes: arr });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ),
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {t("previously_registered_barcodes_hint")}
                  </div>
                </div>

                <AlertDialog
                  open={barcodeConflictOpen}
                  onOpenChange={setBarcodeConflictOpen}
                >
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("barcode_already_registered")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {barcodeConflict
                          ? `${t("barcode_registered_for")} ${barcodeConflict.productName}. ${t("increase_quantity_instead")}`
                          : t("barcode_already_registered_increase_instead")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          void (async () => {
                            if (!barcodeConflict) return;
                            try {
                              // Load existing product info into the form so user can update quantity and save.
                              const p =
                                barcodeConflictProduct &&
                                String(
                                  barcodeConflictProduct._id ||
                                    barcodeConflictProduct.id,
                                ) === String(barcodeConflict.productId)
                                  ? barcodeConflictProduct
                                  : await axios
                                      .get(
                                        `${API_BASE}/api/products/${encodeURIComponent(
                                          barcodeConflict.productId,
                                        )}`,
                                        {
                                          headers: {
                                            Authorization: token
                                              ? `Bearer ${token}`
                                              : "",
                                          },
                                        },
                                      )
                                      .then((r) => r.data);

                              setEditingProductId(
                                String(
                                  p?._id || p?.id || barcodeConflict.productId,
                                ),
                              );
                              setForm({
                                name: String(p?.name || ""),
                                category: String(p?.category || ""),
                                unit: (p?.unit as ProductUnit) || "pcs",
                                purchasePrice: String(p?.purchasePrice ?? 0),
                                sellingPrice: String(p?.sellingPrice ?? 0),
                                quantity: String(
                                  p?.storeQuantity ??
                                    p?.quantity ??
                                    p?.supermarketQuantity ??
                                    0,
                                ),
                                lowStockThreshold: String(
                                  p?.lowStockThreshold ?? 10,
                                ),
                                expiryDate: p?.expiryDate
                                  ? new Date(p.expiryDate)
                                      .toISOString()
                                      .split("T")[0]
                                  : "",
                                barcodes: Array.isArray(p?.barcodes)
                                  ? p.barcodes.map(String)
                                  : p?.barcode
                                    ? [String(p.barcode)]
                                    : [],
                                barcodeInput: "",
                              });
                              setImageFile(null);
                              setImagePreview(
                                p?.imageUrl || p?.pictureUrl || ""
                                  ? String(p?.imageUrl || p?.pictureUrl)
                                  : null,
                              );

                              toast({
                                title: t("product_loaded"),
                                description: t("update_quantity_and_save"),
                              });

                              setBarcodeConflictOpen(false);
                            } catch (e: any) {
                              console.error("increase quantity failed", e);
                              const msg =
                                e?.response?.data?.message ||
                                e?.message ||
                                t("server_error");
                              toast({
                                title: t("failed_load_product"),
                                description: String(msg),
                                variant: "destructive",
                              });
                            }
                          })();
                        }}
                      >
                        {t("increase_quantity")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(productsRoute)}
                >
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("saving")}
                    </>
                  ) : (
                    t("save")
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}

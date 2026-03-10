import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import type { Product } from "@/types";
import JsBarcode from "jsbarcode";
import {
  Barcode,
  Search,
  Printer,
  RefreshCw,
  Package,
  Image as ImageIcon,
  QrCode,
} from "lucide-react";

export default function BarcodeManagement() {
  const { t } = useTranslation();
  const token = useAuthStore.getState().user?.token;
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const barcodeRef = useRef<SVGSVGElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const abort = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/products`, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
          signal: abort.signal,
        });
        if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
        const data = await res.json();
        const normalized = Array.isArray(data)
          ? data.map((p: any) => ({
              ...p,
              id: p.id || p._id,
              pictureUrl:
                p.pictureUrl || p.imageUrl || p.secure_url || p.url || "",
            }))
          : [];
        setProducts(normalized);
      } catch (err: any) {
        if (err.name !== "AbortError")
          setError(err.message || t("failed_to_load_products"));
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => abort.abort();
  }, [token]);

  const getProductByBarcode = (code: string) =>
    products.find(
      (p) =>
        (p.barcodes || []).includes(code) ||
        p.barcode === code ||
        (p.barcode || "").includes(code),
    );

  const updateProduct = async (id: string, updates: Partial<any>) => {
    const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const res = await fetch(`${API_BASE}/api/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`Update failed ${res.status}`);
    const updated = await res.json();
    const norm = {
      ...updated,
      pictureUrl:
        updated.pictureUrl ||
        updated.imageUrl ||
        updated.secure_url ||
        updated.url ||
        "",
    };
    setProducts((cur) => cur.map((p) => (p.id === id ? { ...p, ...norm } : p)));
    return norm;
  };

  const filteredProducts = products.filter(
    (p) =>
      (p.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode || "").includes(search),
  );

  useEffect(() => {
    const code =
      (selectedProduct?.barcodes && selectedProduct.barcodes[0]) ||
      selectedProduct?.barcode;
    if (code && barcodeRef.current) {
      JsBarcode(barcodeRef.current, code, {
        format: "CODE128",
        width: 2,
        height: 80,
        displayValue: true,
        fontSize: 14,
        margin: 10,
      });
    }
  }, [selectedProduct]);

  const generateBarcode = async (product: Product) => {
    const newBarcode = `${Date.now()}`.slice(-12);
    await updateProduct(product.id, { barcode: newBarcode });
    setSelectedProduct({ ...product, barcode: newBarcode });
    toast({
      title: t("barcode_generated"),
      description: `${t("new_barcode")}: ${newBarcode}`,
    });
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !selectedProduct) return;

    const barcodeHtml = barcodeRef.current?.outerHTML || "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode - ${selectedProduct.name}</title>
          <style>
            @page { size: 50mm 30mm; margin: 2mm; }
            body { 
              font-family: Arial, sans-serif; 
              text-align: center;
              padding: 4mm;
            }
            .label {
              border: 1px dashed #ccc;
              padding: 2mm;
            }
            .shop-name { font-size: 10pt; font-weight: bold; margin-bottom: 2mm; }
            .item-name { font-size: 8pt; margin: 2mm 0; }
            .price { font-size: 10pt; font-weight: bold; }
            svg { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="shop-name">${t("smart_supermarket")}</div>
            ${barcodeHtml}
            <div class="item-name">${selectedProduct.name}</div>
            <div class="price">${selectedProduct.sellingPrice} ETB</div>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const openBarcodeDialog = (product: Product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handleScan = () => {
    // In real app, this would interface with hardware scanner
    // For demo, we'll use the search input
    if (search && /^\d+$/.test(search)) {
      const product = getProductByBarcode(search);
      if (product) {
        openBarcodeDialog(product);
      } else {
        toast({
          title: t("not_found"),
          description: t("no_product_found_barcode"),
          variant: "destructive",
        });
      }
    }
  };

  return (
    <RoleLayout allowedRoles={["store_keeper"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">{t("barcode_management")}</h1>
          <p className="text-muted-foreground">
            {t("generate_scan_print_barcodes")}
          </p>
        </div>

        {/* Scanner Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              {t("barcode_scanner")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("scan_or_enter_barcode")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  className="pl-10 h-12 text-lg font-mono"
                  autoFocus
                />
              </div>
              <Button onClick={handleScan} className="h-12 px-6">
                <Search className="mr-2 h-4 w-4" />
                {t("search")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => openBarcodeDialog(product)}
              >
                {/* Product Image */}
                <div className="aspect-square relative bg-muted">
                  {product.pictureUrl ? (
                    <img
                      src={product.pictureUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-muted-foreground/50" />
                    </div>
                  )}
                  {!(product.barcodes && product.barcodes.length > 0) &&
                    !product.barcode && (
                      <Badge
                        variant="destructive"
                        className="absolute top-2 right-2"
                      >
                        {t("no_barcode")}
                      </Badge>
                    )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium truncate">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {product.category}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-bold text-primary">
                      {product.sellingPrice} ETB
                    </span>
                    {product.barcodes && product.barcodes.length > 0 ? (
                      <div className="text-xs font-mono text-muted-foreground">
                        {(product.barcodes || []).join(", ")}
                      </div>
                    ) : product.barcode ? (
                      <span className="text-xs font-mono text-muted-foreground">
                        {product.barcode}
                      </span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Barcode Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("barcode_management")}</DialogTitle>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-4">
                {/* Product Info */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-accent/50">
                  {selectedProduct.pictureUrl ? (
                    <img
                      src={selectedProduct.pictureUrl}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{selectedProduct.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedProduct.category}
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {selectedProduct.sellingPrice} ETB
                    </p>
                  </div>
                </div>

                {/* Barcode Preview */}
                {selectedProduct.barcode ? (
                  <div className="barcode-label text-center">
                    <p className="font-bold text-sm mb-2">
                      {t("smart_supermarket")}
                    </p>
                    <svg ref={barcodeRef} className="mx-auto"></svg>
                    <p className="text-xs mt-1">{selectedProduct.name}</p>
                    <p className="font-bold">
                      {selectedProduct.sellingPrice} ETB
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted rounded-xl">
                    <Barcode className="w-16 h-16 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">
                      {t("no_barcode_assigned")}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => generateBarcode(selectedProduct)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {selectedProduct.barcode ? t("regenerate") : t("generate")}
                  </Button>
                  {selectedProduct.barcode && (
                    <Button className="flex-1" onClick={handlePrint}>
                      <Printer className="mr-2 h-4 w-4" />
                      {t("print_label")}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleLayout>
  );
}

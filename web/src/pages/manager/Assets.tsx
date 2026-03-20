// src/pages/manager/Assets.tsx
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/Modal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Plus, Trash2, FileText, Image as ImageIcon, Download, Printer, RefreshCw, Boxes, DollarSign, UserCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function ManagerAssets() {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const auth = useAuthStore((s) => s.user);
  const API_BASE = import.meta.env.VITE_API_URL || "";

  // Form state
  const [name, setName] = useState("");
  const [sizeOrType, setSizeOrType] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [status, setStatus] = useState("new");
  const [conditions, setConditions] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [qty, setQty] = useState<number | "">("");
  const [purchasePrice, setPurchasePrice] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingAsset, setViewingAsset] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load assets and employees
  const fetchData = async () => {
    if (!auth?.martId) return;
    setIsLoading(true);
    try {
      const token = auth.token;
      const headers = { Authorization: `Bearer ${token}` };

      const [assetsRes, employeesRes] = await Promise.all([
        fetch(`${API_BASE}/api/assets?martId=${auth.martId}`, { headers }),
        fetch(`${API_BASE}/api/employees?martId=${auth.martId}`, { headers })
      ]);

      if (assetsRes.ok) {
        const list = await assetsRes.json();
        setAssets(list.map((a: any) => ({ ...a, id: a._id || a.id })));
      }
      if (employeesRes.ok) {
        const list = await employeesRes.json();
        setEmployees(list);
      }
    } catch (err) {
      console.error("Fetch error", err);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [auth]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setName("");
    setSizeOrType("");
    setPurchaseDate("");
    setStatus("new");
    setConditions("");
    setAssignedTo("");
    setQty("");
    setPurchasePrice("");
    setDescription("");
    setImageFile(null);
    setImagePreview(null);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (asset: any) => {
    setEditingId(asset.id);
    setName(asset.name || "");
    setSizeOrType(asset.sizeOrType || "");
    setPurchaseDate(asset.purchaseDate ? asset.purchaseDate.split('T')[0] : "");
    setStatus(asset.status || "new");
    setConditions(asset.conditions || "");
    setAssignedTo(asset.assignedTo || "");
    setQty(asset.quantity || "");
    setPurchasePrice(asset.purchasePrice || "");
    setDescription(asset.description || "");
    setImagePreview(asset.image || null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || qty === "" || Number(qty) <= 0) {
      toast.error("Please fill required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = auth?.token;
      const formData = new FormData();
      formData.append("name", name);
      formData.append("sizeOrType", sizeOrType);
      formData.append("purchaseDate", purchaseDate);
      formData.append("status", status);
      formData.append("conditions", conditions);
      formData.append("assignedTo", assignedTo);
      formData.append("quantity", String(qty));
      formData.append("purchasePrice", String(purchasePrice || 0));
      formData.append("description", description);
      formData.append("martId", auth?.martId || "");
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const url = editingId 
        ? `${API_BASE}/api/assets/${editingId}`
        : `${API_BASE}/api/assets`;
      
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to save asset");

      const saved = await res.json();
      const normalized = { ...saved, id: saved._id || saved.id };

      if (editingId) {
        setAssets(assets.map(a => a.id === editingId ? normalized : a));
        toast.success("Asset updated successfully");
      } else {
        setAssets([normalized, ...assets]);
        toast.success("Asset registered successfully");
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error("Submit error", err);
      toast.error("Error saving asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (asset: any) => {
    if (!window.confirm(`Are you sure you want to remove ${asset.name}?`)) return;

    try {
      const token = auth?.token;
      const res = await fetch(`${API_BASE}/api/assets/${asset.id}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      if (!res.ok) throw new Error("Delete failed");
      setAssets(assets.filter(a => a.id !== asset.id));
      toast.success("Asset removed");
    } catch (err) {
      console.error("Delete error", err);
      toast.error("Failed to remove asset");
    }
  };

  const exportToPDF = async () => {
    // Portrait A4, like a ledger/register
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.width;
    const leftMargin = 10;

    toast.info("Generating PDF, please wait...");

    // Pre-load images
    const loadImage = (url: string): Promise<HTMLImageElement | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };
    const loadedImages = await Promise.all(
      assets.map(a => a.image ? loadImage(a.image) : Promise.resolve(null))
    );

    // Header block
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Asset Inventory Report", pageWidth / 2, 16, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`, pageWidth / 2, 22, { align: "center" });

    // Thin divider line
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(leftMargin, 25, pageWidth - leftMargin, 25);

    // Build table rows
    const tableData = assets.map((a, index) => [
      index + 1,                   // #
      a.assetId || "-",            // Asset ID
      a.name || "-",               // Name
      "",                          // Image
      a.sizeOrType || "-",         // Size or Type
      a.purchasePrice != null ? Number(a.purchasePrice).toLocaleString() : "0",  // Purchase
      a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "-", // Purchase Date
      a.conditions || "-",         // Conditions
      a.assignedTo || "-",         // Assigned To
      String(a.quantity ?? 1),     // Qty
    ]);

    const totalPurchasePrice = assets.reduce((sum, a) => sum + Number(a.purchasePrice || 0), 0);
    const totalQty = assets.reduce((sum, a) => sum + Number(a.quantity || 0), 0);

    autoTable(doc, {
      startY: 28,
      head: [["#", "Asset ID", "Name", "Image", "Size or type", "Purchase", "Purchase date", "Conditions", "Assigned To", "Qty"]],
      body: tableData,
      foot: [["Total:", "", "", "", "", totalPurchasePrice.toLocaleString(), "", "", "", String(totalQty)]],
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [180, 180, 180],
        lineWidth: 0.2,
        valign: "middle",
      },
      headStyles: {
        fillColor: [232, 232, 232],
        textColor: [20, 20, 20],
        fontStyle: "bold",
        halign: "center",
      },
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: [20, 20, 20],
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },   // #
        1: { cellWidth: 20 },                       // Asset ID
        2: { cellWidth: 25 },                       // Name
        3: { cellWidth: 22, halign: "center" },     // Image
        4: { cellWidth: 20 },                       // Size or type
        5: { cellWidth: 20, halign: "right" },      // Purchase
        6: { cellWidth: 20, halign: "center" },     // Purchase date
        7: { cellWidth: 18 },                       // Conditions
        8: { cellWidth: 20 },                       // Assigned To
        9: { cellWidth: 10, halign: "center" },     // Qty
      },
      showFoot: "lastPage",
      didParseCell: (data) => {
        if (data.section === "body") {
          data.cell.styles.minCellHeight = 22;
        }
      },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const img = loadedImages[data.row.index];
          if (img) {
            const padding = 1.5;
            const maxWidth = data.cell.width - padding * 2;
            const maxHeight = data.cell.height - padding * 2;
            const side = Math.max(1, Math.min(maxWidth, maxHeight));
            const x = data.cell.x + (data.cell.width - side) / 2;
            const y = data.cell.y + (data.cell.height - side) / 2;

            doc.addImage(img, "JPEG", x, y, side, side);
          }
        }
      },
    });

    // Page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - leftMargin, pageHeight - 5, { align: "right" });
    }

    doc.save(`Assets_${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF generated successfully");
  };

  const columns: DataTableColumn<any>[] = [
    {
      key: "image",
      header: t("image"),
      cell: (row) => (
        <div 
          className="h-10 w-10 overflow-hidden rounded-md border bg-muted cursor-zoom-in hover:border-primary transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            if (row.image) setPreviewImage(row.image);
          }}
        >
          {row.image ? (
            <img src={row.image} alt={row.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "assetId",
      header: t("id"),
      accessor: "assetId",
      sortable: true,
      searchable: true,
      className: "font-mono text-xs uppercase",
    },
    {
      key: "name",
      header: t("name"),
      accessor: "name",
      sortable: true,
      searchable: true,
      className: "font-medium",
    },
    {
      key: "sizeOrType",
      header: t("size_or_type"),
      accessor: "sizeOrType",
      sortable: true,
      className: "max-w-[120px] truncate",
    },
    {
      key: "quantity",
      header: t("qty"),
      accessor: "quantity",
      sortable: true,
      className: "text-center font-bold",
    },
    {
      key: "purchasePrice",
      header: t("purchase_price"),
      cell: (row) => (
        <span className="font-semibold text-primary">
          {Number(row.purchasePrice || 0).toLocaleString()} ETB
        </span>
      ),
      sortable: true,
    },
    {
      key: "status",
      header: t("status"),
      cell: (row) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          row.status === 'new' ? 'bg-green-100 text-green-800' :
          row.status === 'damaged' ? 'bg-red-100 text-red-800' :
          'bg-orange-100 text-orange-800'
        }`}>
          {t(row.status)}
        </span>
      ),
    },
    {
      key: "assignedTo",
      header: t("assigned_to"),
      accessor: "assignedTo",
      sortable: true,
    },
  ];

  return (
    <RoleLayout allowedRoles={["manager", "owner"]}>
      <div className="space-y-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">{t("asset_registration")}</h1>
            <p className="text-muted-foreground">
              Manage and track your company assets in one place.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={openAddModal} className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> {t("register_asset")}
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        {/* ── Stats Bar ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Assets",
              value: assets.length,
              Icon: Boxes,
              color: "text-blue-500",
            },
            {
              label: "Total Value",
              value: `${assets.reduce((s, a) => s + Number(a.purchasePrice || 0), 0).toLocaleString()} ETB`,
              Icon: DollarSign,
              color: "text-emerald-500",
            },
            {
              label: "Assigned",
              value: assets.filter(a => a.assignedTo).length,
              Icon: UserCheck,
              color: "text-purple-500",
            },
            {
              label: "New Condition",
              value: assets.filter(a => a.status === "new").length,
              Icon: Sparkles,
              color: "text-amber-500",
            },
          ].map(({ label, value, Icon, color }, i) => (
            <div key={i} className="bg-card border rounded-xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
              <div className={`p-2 rounded-lg bg-muted ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={assets}
          rowKey="id"
          isLoading={isLoading}
          searchable
          searchPlaceholder="Search assets..."
          pagination
          initialPageSize={10}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onRowClick={(row) => {
            setViewingAsset(row);
            setIsDetailModalOpen(true);
          }}
          toolbarContent={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={fetchData} title={t("refresh")}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> {t("refresh")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> {t("print")}
              </Button>
            </div>
          }
        />

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingId ? t("edit_asset") : t("register_asset")}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Upload القسم */}
              <div className="space-y-4 md:col-span-2">
                <label className="text-sm font-semibold">{t("asset_image")}</label>
                <div 
                  className="group relative flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:border-primary/50 hover:bg-muted"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="h-full w-full rounded-lg object-cover" />
                  ) : (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm transition-transform group-hover:scale-110">
                        <Plus className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{t("click_to_upload_image")}</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageChange} 
                  />
                  {imagePreview && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <p className="text-sm font-medium text-white">{t("change_image")}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("asset_name")} *</label>
                <Input
                  required
                  placeholder="e.g. Office Chair"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("quantity")} *</label>
                <Input
                  required
                  type="number"
                  min="1"
                  placeholder="10"
                  value={qty}
                  onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("purchase_price")} (ETB)</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="2500"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("size_or_type")}</label>
                <Input
                  placeholder="e.g. Ergonomic - Mesh"
                  value={sizeOrType}
                  onChange={(e) => setSizeOrType(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("status")}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="new">{t("new")}</option>
                  <option value="slightly_used">{t("slightly_used")}</option>
                  <option value="used">{t("used")}</option>
                  <option value="old">{t("old")}</option>
                  <option value="damaged">{t("damaged")}</option>
                  <option value="lost">{t("lost")}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("assigned_to")}</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">{t("select_employee")}</option>
                  {employees.map(emp => (
                    <option key={emp.id || emp._id} value={emp.name}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t("purchase_date")}</label>
                <Input
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">{t("description")}</label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Additional details about the asset..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-4 border-t pt-6">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("saving") : editingId ? t("update_asset") : t("register_asset")}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Asset Detail Modal */}
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={t("asset_details")}
          size="md"
        >
          {viewingAsset && (
            <div className="space-y-6">
              <div className="aspect-video w-full overflow-hidden rounded-xl border bg-muted">
                {viewingAsset.image ? (
                  <img 
                    src={viewingAsset.image} 
                    alt={viewingAsset.name} 
                    className="h-full w-full object-cover cursor-zoom-in" 
                    onClick={() => setPreviewImage(viewingAsset.image)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/20" />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("id")}</p>
                  <p className="font-mono font-bold uppercase">{viewingAsset.assetId || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("name")}</p>
                  <p className="font-bold">{viewingAsset.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("status")}</p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    viewingAsset.status === 'new' ? 'bg-green-100 text-green-800' :
                    viewingAsset.status === 'damaged' ? 'bg-red-100 text-red-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {t(viewingAsset.status)}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("qty")}</p>
                  <p className="font-bold">{viewingAsset.quantity}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("purchase_price")}</p>
                  <p className="font-bold text-primary">{Number(viewingAsset.purchasePrice || 0).toLocaleString()} ETB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("purchase_date")}</p>
                  <p className="font-bold">{viewingAsset.purchaseDate ? new Date(viewingAsset.purchaseDate).toLocaleDateString() : "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("assigned_to")}</p>
                  <p className="font-bold">{viewingAsset.assignedTo || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">{t("size_or_type")}</p>
                  <p className="font-bold">{viewingAsset.sizeOrType || "-"}</p>
                </div>
              </div>
              
              <div className="space-y-1 border-t pt-4 text-sm">
                <p className="text-muted-foreground">{t("description")}</p>
                <p className="leading-relaxed whitespace-pre-wrap">{viewingAsset.description || "-"}</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setIsDetailModalOpen(false);
                  openEditModal(viewingAsset);
                }}>
                  {t("edit")}
                </Button>
                <Button onClick={() => setIsDetailModalOpen(false)}>{t("close")}</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Image Preview Modal (Lightbox) */}
        <Modal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          title={t("image_preview")}
          size="xl"
        >
          <div className="flex items-center justify-center p-0 overflow-hidden bg-black/5 rounded-lg">
            {previewImage && (
              <img 
                src={previewImage} 
                alt="Preview" 
                className="max-h-[80vh] w-auto object-contain shadow-2xl transition-transform hover:scale-105 duration-500" 
              />
            )}
          </div>
        </Modal>
      </div>
    </RoleLayout>
  );
}

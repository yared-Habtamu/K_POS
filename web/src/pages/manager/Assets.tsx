// src/pages/manager/Assets.tsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/authStore";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function ManagerAssets() {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<any[]>([]);
  const auth = useAuthStore((s) => s.user);
  const API_BASE = import.meta.env.VITE_API_URL || "";
  const [name, setName] = useState("");
  const [assetIdField, setAssetIdField] = useState("");
  const [image, setImage] = useState("");
  const [sizeOrType, setSizeOrType] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [status, setStatus] = useState("new");
  const [conditions, setConditions] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [qty, setQty] = useState<number | "">("");
  // when editing an existing asset we keep its id here
  const [editingId, setEditingId] = useState<string | null>(null);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 7;

  // Load assets from backend when auth/mart changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const martId = auth?.martId;
        if (!martId) return;
        const token = auth?.token;
        const res = await fetch(`${API_BASE}/api/assets?martId=${martId}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) {
          console.warn("Failed to load assets", res.status);
          return;
        }
        const list = await res.json();
        if (!mounted) return;
        const normalized = list.map((a: any) => ({
          ...a,
          id: a._id || a.id,
        }));
        setAssets(normalized);
      } catch (err) {
        console.error("Load assets error", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [auth]);

  const add = () => {
    if (!name || qty === "" || Number(qty) <= 0) return;
    (async () => {
      try {
        const token = auth?.token;
        const payload = {
          name,
          assetId: assetIdField,
          image,
          sizeOrType,
          purchaseDate,
          status,
          conditions,
          assignedTo,
          quantity: Number(qty),
          martId: auth?.martId
        };
        let res;
        if (editingId) {
          // update existing asset
          res = await fetch(`${API_BASE}/api/assets/${editingId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          });
        } else {
          // create new asset
          res = await fetch(`${API_BASE}/api/assets`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          });
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.warn(
            editingId ? "Failed to update asset" : "Failed to add asset",
            err,
          );
          return;
        }
        const saved = await res.json();
        const normalizedSaved = { ...saved, id: saved._id || saved.id };
        if (editingId) {
          setAssets((a) =>
            a.map((x) =>
              x.id === editingId ? normalizedSaved : x
            )
          );
        } else {
          setAssets((a) => [normalizedSaved, ...a]);
          setCurrentPage(1);
        }
        // reset form
        setName("");
        setAssetIdField("");
        setImage("");
        setSizeOrType("");
        setPurchaseDate("");
        setStatus("new");
        setConditions("");
        setAssignedTo("");
        setQty("");
        setEditingId(null);
      } catch (err) {
        console.error(
          editingId ? "Update asset error" : "Add asset error",
          err,
        );
      }
    })();
  };

  const exportCSV = () => {
    if (!assets.length) return;
    const keys = ["assetId", "name", "image", "sizeOrType", "purchaseDate", "status", "conditions", "assignedTo", "quantity"];
    const csv = [
      keys.join(","),
      ...assets.map((a) => `"${a.assetId || ""}","${a.name}","${a.image || ""}","${a.sizeOrType || ""}","${a.purchaseDate || ""}","${a.status || ""}","${a.conditions || ""}","${a.assignedTo || ""}",${a.quantity}`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "assets.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    const pageWidth = doc.internal.pageSize.width;
    doc.setFontSize(18);
    doc.text("Asset Inventory Report", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: "center" });

    autoTable(doc, {
      startY: 30,
      head: [["Asset ID", "Name", "Image", "Size/Type", "Purchase Date", "Status", "Assigned To", "Conditions", "Qty"]],
      body: assets.map((a) => [
        a.assetId || "-",
        a.name,
        a.image ? "Yes" : "No",
        a.sizeOrType || "-",
        a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : "-",
        a.status || "-",
        a.assignedTo || "-",
        a.conditions || "-",
        a.quantity
      ]),
      theme: "grid",
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 8 }
    });
    doc.save("assets_report.pdf");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName("");
    setAssetIdField("");
    setImage("");
    setSizeOrType("");
    setPurchaseDate("");
    setStatus("new");
    setConditions("");
    setAssignedTo("");
    setQty("");
  };

  const printList = () => {
    const printTitle = t("supermarket_asset");
    // build page with title and centered header
    const html = `<!DOCTYPE html><html><head><title>${printTitle}</title><style>body{font-family:sans-serif;}h1{text-align:center;}</style></head><body><h1>${printTitle}</h1><table border="1" cellpadding="8" style="margin:auto"><tr><th>${t("name")}</th><th>${t("quantity")}</th></tr>${assets
      .map((a) => `<tr><td>${a.name}</td><td>${a.quantity}</td></tr>`)
      .join("")}</table></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    // set title explicitly in case print header uses it
    w.document.title = printTitle;
    w.document.write(html);
    w.document.close();
    w.print();
    w.close();
  };

  // ✅ Pagination logic
  const totalPages = Math.ceil(assets.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedAssets = assets.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // ✅ Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <RoleLayout allowedRoles={["manager", "owner"]}>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("asset_registration")}</h1>
            <p className="text-muted-foreground">
              {t("register_company_assets_quickly")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportCSV} size="sm">
              {t("export_csv")}
            </Button>
            <Button onClick={exportToPDF} size="sm" className="bg-red-600 hover:bg-red-700">
              Export PDF
            </Button>
            <Button variant="outline" onClick={printList} size="sm">
              {t("print")}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? t("edit_asset") : t("add_asset")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("asset_name")} *</label>
                <Input
                  placeholder="e.g. Pips"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("asset_id")}</label>
                <Input
                  placeholder="e.g. AST0001"
                  value={assetIdField}
                  onChange={(e) => setAssetIdField(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("image_url")}</label>
                <Input
                  placeholder="https://..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("size_or_type")}</label>
                <Input
                  placeholder="e.g. Black XL"
                  value={sizeOrType}
                  onChange={(e) => setSizeOrType(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("purchase_date")}</label>
                <Input
                  type="date"
                  value={purchaseDate ? purchaseDate.split('T')[0] : ""}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("status")}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="new">{t("new")}</option>
                  <option value="old">{t("old")}</option>
                  <option value="damaged">{t("damaged")}</option>
                  <option value="lost">{t("lost")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("assigned_to")}</label>
                <Input
                  placeholder="Staff name"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("conditions")}</label>
                <Input
                  placeholder="Good, needs repair, etc."
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("quantity")} *</label>
                <Input
                  placeholder="Quantity"
                  value={qty === "" ? "" : String(qty)}
                  onChange={(e) =>
                    setQty(
                      e.target.value.replace(/[^0-9]/g, "") === ""
                        ? ""
                        : Number(e.target.value.replace(/[^0-9]/g, ""))
                    )
                  }
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={add} className="w-full md:w-auto">{editingId ? t("save_changes") : t("register_asset")}</Button>
              {editingId && (
                <Button variant="outline" onClick={cancelEdit}>
                  {t("cancel")}
                </Button>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {paginatedAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("no_assets_registered")}
                </p>
              ) : (
                paginatedAssets.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-2 rounded-md bg-accent/50"
                  >
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <p className="font-bold text-sm">{a.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{a.assetId || t("no_id")}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">{t("quantity_short")}: {a.quantity}</p>
                        <p className="text-[10px] text-muted-foreground">{a.sizeOrType || t("no_size_type")}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium">{t("status")}: <span className={a.status === 'new' ? 'text-green-600' : 'text-orange-600'}>{t(a.status)}</span></p>
                        <p className="text-[10px] text-muted-foreground">{t("to")}: {a.assignedTo || t("unassigned")}</p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-xs font-medium">{t("purchased")}: {a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : 'N/A'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{a.conditions || t("no_info")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          // populate form for editing
                          setEditingId(a.id);
                          setName(a.name || "");
                          setAssetIdField(a.assetId || "");
                          setImage(a.image || "");
                          setSizeOrType(a.sizeOrType || "");
                          setPurchaseDate(a.purchaseDate || "");
                          setStatus(a.status || "new");
                          setConditions(a.conditions || "");
                          setAssignedTo(a.assignedTo || "");
                          setQty(a.quantity);
                        }}
                      >
                        {t("edit")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          try {
                            const token = auth?.token;
                            const res = await fetch(
                              `${API_BASE}/api/assets/${a.id}`,
                              {
                                method: "DELETE",
                                headers: {
                                  ...(token
                                    ? { Authorization: `Bearer ${token}` }
                                    : {}),
                                },
                              },
                            );
                            if (!res.ok) {
                              const err = await res.json().catch(() => ({}));
                              console.warn("Failed to delete asset", err);
                              return;
                            }
                            setAssets((s) => s.filter((x) => x.id !== a.id));
                          } catch (err) {
                            console.error("Delete asset error", err);
                          }
                        }}
                      >
                        {t("remove")}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* ✅ PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-3 border-t border-border mt-4">
                <div className="text-xs text-muted-foreground mb-2 sm:mb-0">
                  {t("showing")}{" "}
                  <span className="font-medium">{startIndex + 1}</span>–
                  <span className="font-medium">
                    {Math.min(startIndex + ITEMS_PER_PAGE, assets.length)}
                  </span>{" "}
                  {t("of")}
                  <span className="font-medium"> {assets.length}</span>{" "}
                  {t("assets")}
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPage}
                    disabled={currentPage === 1}
                  >
                    {t("prev")}
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </Button>
                    ),
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                  >
                    {t("next")}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}

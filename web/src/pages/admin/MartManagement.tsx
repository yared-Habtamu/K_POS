// src/pages/admin/MartManagement.tsx
import React, { useState } from "react"; // ✅ Added useState
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Trash, Edit2, RotateCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";

type Shop = {
  id: string;
  name: string;
  owner: string;
  status: "active" | "pending" | "suspended" | "rejected";
  sales: number;
  users: number;
  permissions?: string[];
  address?: {
    country?: string;
    region?: string;
    city?: string;
  };
};

type PendingMartAction = {
  shopId: string;
  action: "approve" | "reject" | "suspend" | "unsuspend";
};

type EditShopForm = {
  id: string;
  name: string;
  owner: string;
  country: string;
  region: string;
  city: string;
};

const DEFAULT_KEY = "pos_admin_shops_v1";

const initialShops: Shop[] = [
  {
    id: "1",
    name: "Kiya Supermarket",
    owner: "Abebe Kebede",
    status: "active",
    sales: 156420,
    users: 8,
    permissions: ["owner"],
    address: {
      country: "Ethiopia",
      region: "Addis Ababa",
      city: "Addis Ababa",
    },
  },
  {
    id: "2",
    name: "Habesha Mart",
    owner: "Sara Bekele",
    status: "active",
    sales: 98750,
    users: 5,
    permissions: ["owner"],
    address: { country: "Ethiopia", region: "Oromia", city: "Adama" },
  },
  {
    id: "3",
    name: "Addis Groceries",
    owner: "Yonas Gebre",
    status: "pending",
    sales: 0,
    users: 2,
    permissions: [],
    address: { country: "Ethiopia", region: "Amhara", city: "Bahir Dar" },
  },
  {
    id: "4",
    name: "Ethio Retail",
    owner: "Tigist Haile",
    status: "active",
    sales: 67890,
    users: 4,
    permissions: ["owner"],
    address: { country: "Ethiopia", region: "Tigray", city: "Mekelle" },
  },
  {
    id: "5",
    name: "Unity Store",
    owner: "Dawit Tadesse",
    status: "suspended",
    sales: 34500,
    users: 3,
    permissions: [],
    address: {
      country: "Ethiopia",
      region: "Southern Nations",
      city: "Hawassa",
    },
  },
  {
    id: "6",
    name: "Beta Mart",
    owner: "Mesfin Alem",
    status: "pending",
    sales: 0,
    users: 1,
    permissions: [],
    address: { country: "Ethiopia", region: "Gambela", city: "Gambela" },
  },
  {
    id: "7",
    name: "Gamma Grocers",
    owner: "Lensa Kassa",
    status: "pending",
    sales: 0,
    users: 2,
    permissions: [],
    address: { country: "Ethiopia", region: "Sidama", city: "Dilla" },
  },
  {
    id: "8",
    name: "Delta Supplies",
    owner: "Fikru Solomon",
    status: "pending",
    sales: 0,
    users: 1,
    permissions: [],
    address: { country: "Ethiopia", region: "Benishangul", city: "Assosa" },
  },
  {
    id: "9",
    name: "Epsilon Foods",
    owner: "Helen Tadesse",
    status: "pending",
    sales: 0,
    users: 3,
    permissions: [],
    address: { country: "Ethiopia", region: "Harari", city: "Harar" },
  },
  {
    id: "10",
    name: "Zeta Convenience",
    owner: "Kebede Abiy",
    status: "pending",
    sales: 0,
    users: 1,
    permissions: [],
    address: { country: "Ethiopia", region: "Somali", city: "Jijiga" },
  },
  {
    id: "11",
    name: "Eta Market",
    owner: "Martha Solomon",
    status: "pending",
    sales: 0,
    users: 2,
    permissions: [],
    address: { country: "Ethiopia", region: "Afar", city: "Semera" },
  },
  {
    id: "12",
    name: "Theta Foods",
    owner: "Samuel Mekonnen",
    status: "pending",
    sales: 0,
    users: 1,
    permissions: [],
    address: { country: "Ethiopia", region: "Benishangul", city: "Asosa" },
  },
  {
    id: "13",
    name: "Iota Grocers",
    owner: "Aster Yohannes",
    status: "pending",
    sales: 0,
    users: 2,
    permissions: [],
    address: { country: "Ethiopia", region: "Sidama", city: "Yirga Alem" },
  },
  {
    id: "14",
    name: "Kappa Supplies",
    owner: "Bekele Hailu",
    status: "pending",
    sales: 0,
    users: 1,
    permissions: [],
    address: { country: "Ethiopia", region: "Gambela", city: "Gambela" },
  },
  {
    id: "15",
    name: "Lambda Store",
    owner: "Selamawit Desta",
    status: "pending",
    sales: 0,
    users: 1,
    permissions: [],
    address: {
      country: "Ethiopia",
      region: "Addis Ababa",
      city: "Addis Ababa",
    },
  },
];

function loadShops(): Shop[] {
  try {
    const raw = localStorage.getItem(DEFAULT_KEY);
    if (!raw) return initialShops;
    const stored = (JSON.parse(raw) as Shop[]) || [];
    const storedMap = new Map<string, Shop>(stored.map((s) => [s.id, s]));

    const merged: Shop[] = initialShops.map((seed) => {
      const existing = storedMap.get(seed.id);
      if (!existing) return seed;

      const mergedAddress = {
        ...(seed.address || {}),
        ...(existing.address || {}),
      };

      return {
        ...seed,
        ...existing,
        address: mergedAddress,
      } as Shop;
    });

    stored.forEach((s) => {
      if (!initialShops.find((seed) => seed.id === s.id)) merged.push(s);
    });

    return merged;
  } catch (e) {
    return initialShops;
  }
}

function saveShops(shops: Shop[]) {
  localStorage.setItem(DEFAULT_KEY, JSON.stringify(shops));
}

export default function MartManagement() {
  const [shops, setShops] = React.useState<Shop[]>(() => loadShops());
  const { toast } = useToast();
  const [filter, setFilter] = React.useState<
    "all" | "active" | "pending" | "suspended" | "rejected"
  >("all");
  const [pendingAction, setPendingAction] =
    React.useState<PendingMartAction | null>(null);
  const [editForm, setEditForm] = React.useState<EditShopForm | null>(null);
  const [shopToDelete, setShopToDelete] = React.useState<Shop | null>(null);
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1); // ✅ Now useState is available
  const ITEMS_PER_PAGE = 7;

  const filteredShops = React.useMemo(() => {
    if (filter === "all") return shops;
    return shops.filter((s) => s.status === filter);
  }, [shops, filter]);

  // ✅ Pagination logic
  const totalPages = Math.ceil(filteredShops.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedShops = filteredShops.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  React.useEffect(() => {
    saveShops(shops);
  }, [shops]);

  // Fetch real data from backend when available (system admin view)
  // Only one set of declarations!

  const API_BASE = import.meta.env.VITE_API_URL || "";
  const authUser = useAuthStore((s) => s.user);

  const getAuthHeaders = () => {
    const h: Record<string, string> = {};
    if (authUser && authUser.token)
      h["Authorization"] = `Bearer ${authUser.token}`;
    return h;
  };

  const mapBackendToShop = (m: any): Shop => {
    const ownerName = (m.ownerId && (m.ownerId.name || m.ownerId)) || "Owner";
    const statusMap: Record<string, Shop["status"]> = {
      pending: "pending",
      approved: "active",
      disabled: "suspended",
      rejected: "rejected",
    };
    return {
      id: m._id,
      name: m.martName || m.name || "Unnamed",
      owner: ownerName,
      status: statusMap[m.status] || "pending",
      sales: 0,
      users: 1,
      permissions: m.ownerId ? ["owner"] : [],
      address: { country: m.country, region: m.region, city: m.city },
    } as Shop;
  };

  const fetchShopsFromServer = async (statusQuery = "") => {
    if (!API_BASE) return false;
    try {
      const q = statusQuery ? `?status=${encodeURIComponent(statusQuery)}` : "";
      const res = await fetch(`${API_BASE}/api/marts${q}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json();
      const mapped = (Array.isArray(data) ? data : []).map(mapBackendToShop);
      setShops(mapped);
      return true;
    } catch (err) {
      // keep local data as fallback
      console.error("Failed to fetch marts from server", err);
      return false;
    }
  };

  const statusQueryByFilter: Record<
    "all" | "active" | "pending" | "suspended" | "rejected",
    string
  > = {
    all: "",
    pending: "pending",
    active: "approved",
    suspended: "disabled",
    rejected: "rejected",
  };

  const getCurrentStatusQuery = () => statusQueryByFilter[filter] || "";

  // When filter changes, try to fetch from server (map frontend filter to backend status)
  React.useEffect(() => {
    fetchShopsFromServer(getCurrentStatusQuery());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

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

  const approveShop = async (id: string) => {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/marts/${id}/approve`, {
          method: "PUT",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Server approve failed");
        await fetchShopsFromServer(getCurrentStatusQuery());
        toast({
          title: "Shop approved",
          description: "The shop has been approved on server.",
        });
        return;
      } catch (err) {
        console.error(err);
      }
    }

    setShops((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status: "active",
              permissions:
                s.permissions && s.permissions.length
                  ? s.permissions
                  : ["owner"],
            }
          : s,
      ),
    );
    toast({
      title: "Shop approved",
      description: "The shop has been approved and owner permission assigned.",
    });
  };

  const suspendShop = async (id: string) => {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/marts/${id}/disable`, {
          method: "PUT",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Server suspend failed");
        await fetchShopsFromServer(getCurrentStatusQuery());
        toast({
          title: "Shop suspended",
          description: "The shop has been suspended on server.",
        });
        return;
      } catch (err) {
        console.error(err);
      }
    }

    setShops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "suspended" } : s)),
    );
    toast({
      title: "Shop suspended",
      description: "The shop has been suspended.",
    });
  };

  const unsuspendShop = async (id: string) => {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/marts/${id}/approve`, {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) throw new Error("Server unsuspend failed");
        await fetchShopsFromServer(getCurrentStatusQuery());
        toast({
          title: "Shop unsuspended",
          description: "The shop is active on server.",
        });
        return;
      } catch (err) {
        console.error(err);
      }
    }

    setShops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "active" } : s)),
    );
    toast({
      title: "Shop unsuspended",
      description: "The shop is active again.",
    });
  };

  const deleteShop = (id: string) => {
    setShops((prev) => prev.filter((s) => s.id !== id));
    toast({
      title: "Shop deleted",
      description: "Shop removed from registry.",
    });
  };

  const editShop = (id: string) => {
    const shop = shops.find((s) => s.id === id);
    if (!shop) return;
    setEditForm({
      id: shop.id,
      name: shop.name,
      owner: shop.owner,
      country: shop.address?.country || "Ethiopia",
      region: shop.address?.region || "",
      city: shop.address?.city || "",
    });
  };

  const saveEditedShop = () => {
    if (!editForm) return;

    setShops((prev) =>
      prev.map((s) =>
        s.id === editForm.id
          ? {
              ...s,
              name: editForm.name,
              owner: editForm.owner,
              address: {
                country: editForm.country,
                region: editForm.region,
                city: editForm.city,
              },
            }
          : s,
      ),
    );
    setEditForm(null);
    toast({
      title: "Shop updated",
      description: "Shop information saved locally.",
    });
  };

  const rejectShop = async (id: string) => {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/marts/${id}/reject`, {
          method: "PUT",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        });
        if (!res.ok) throw new Error("Server reject failed");
        await fetchShopsFromServer(getCurrentStatusQuery());
        toast({
          title: "Shop rejected",
          description: "The shop registration was rejected on server.",
        });
        return;
      } catch (err) {
        console.error(err);
      }
    }

    setShops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "rejected" } : s)),
    );
    toast({
      title: "Shop rejected",
      description: "The shop registration was rejected.",
    });
  };

  const pendingShop = pendingAction
    ? (shops.find((shop) => shop.id === pendingAction.shopId) ?? null)
    : null;

  const confirmPendingAction = async () => {
    if (!pendingAction) return;

    const { shopId, action } = pendingAction;
    setPendingAction(null);

    if (action === "approve") {
      await approveShop(shopId);
      return;
    }

    if (action === "suspend") {
      await suspendShop(shopId);
      return;
    }

    if (action === "unsuspend") {
      await unsuspendShop(shopId);
      return;
    }

    await rejectShop(shopId);
  };

  const refreshMarts = async () => {
    setIsRefreshing(true);
    try {
      await fetchShopsFromServer(getCurrentStatusQuery());
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <RoleLayout allowedRoles={["system_admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mart Management</h1>
            <p className="text-muted-foreground">
              Approve or reject new supermarket registrations; update or delete
              existing shops.
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void refreshMarts()}
            disabled={isRefreshing}
            aria-label="Refresh marts"
            title="Refresh marts"
          >
            <RotateCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filter === "all" ? undefined : "ghost"}
            onClick={() => setFilter("all")}
          >
            All{" "}
            <span className="ml-2 text-xs text-muted-foreground">
              {shops.length}
            </span>
          </Button>
          <Button
            size="sm"
            variant={filter === "active" ? undefined : "ghost"}
            onClick={() => setFilter("active")}
          >
            Active{" "}
            <span className="ml-2 text-xs text-muted-foreground">
              {shops.filter((s) => s.status === "active").length}
            </span>
          </Button>
          <Button
            size="sm"
            variant={filter === "pending" ? undefined : "ghost"}
            onClick={() => setFilter("pending")}
          >
            Pending{" "}
            <span className="ml-2 text-xs text-muted-foreground">
              {shops.filter((s) => s.status === "pending").length}
            </span>
          </Button>
          <Button
            size="sm"
            variant={filter === "suspended" ? undefined : "ghost"}
            onClick={() => setFilter("suspended")}
          >
            Suspended{" "}
            <span className="ml-2 text-xs text-muted-foreground">
              {shops.filter((s) => s.status === "suspended").length}
            </span>
          </Button>
          <Button
            size="sm"
            variant={filter === "rejected" ? undefined : "ghost"}
            onClick={() => setFilter("rejected")}
          >
            Rejected{" "}
            <span className="ml-2 text-xs text-muted-foreground">
              {shops.filter((s) => s.status === "rejected").length}
            </span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Registered Supermarkets{" "}
              <Badge variant="secondary">{shops.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedShops.length > 0 ? (
                    paginatedShops.map((shop) => (
                      <TableRow key={shop.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {shop.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{shop.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {(shop.permissions || []).join(", ") ||
                                  "No perms"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{shop.owner}</TableCell>
                        <TableCell>
                          {shop.status === "active" && (
                            <Badge className="bg-success/10 text-success border-success/20">
                              <CheckCircle className="w-3 h-3 mr-1" /> Active
                            </Badge>
                          )}
                          {shop.status === "pending" && (
                            <Badge className="bg-warning/10 text-warning border-warning/20">
                              <span className="mr-1">⏳</span> Pending
                            </Badge>
                          )}
                          {shop.status === "suspended" && (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                              <XCircle className="w-3 h-3 mr-1" /> Suspended
                            </Badge>
                          )}
                          {shop.status === "rejected" && (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                              <XCircle className="w-3 h-3 mr-1" /> Rejected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {shop.address ? (
                            <div className="text-sm">
                              <div>{shop.address.city || "-"}</div>
                              <div className="text-xs text-muted-foreground">
                                {shop.address.region || "-"},{" "}
                                {shop.address.country || "-"}
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{shop.users}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {shop.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setPendingAction({
                                      shopId: shop.id,
                                      action: "approve",
                                    })
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setPendingAction({
                                      shopId: shop.id,
                                      action: "reject",
                                    })
                                  }
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {shop.status === "active" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  setPendingAction({
                                    shopId: shop.id,
                                    action: "suspend",
                                  })
                                }
                              >
                                Suspend
                              </Button>
                            )}
                            {shop.status === "suspended" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  setPendingAction({
                                    shopId: shop.id,
                                    action: "unsuspend",
                                  })
                                }
                              >
                                Unsuspend
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => editShop(shop.id)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setShopToDelete(shop)}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-4 text-muted-foreground"
                      >
                        No shops found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ✅ PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-3 border-t border-border mt-4">
                <div className="text-xs text-muted-foreground mb-2 sm:mb-0">
                  Showing <span className="font-medium">{startIndex + 1}</span>–
                  <span className="font-medium">
                    {Math.min(
                      startIndex + ITEMS_PER_PAGE,
                      filteredShops.length,
                    )}
                  </span>{" "}
                  of
                  <span className="font-medium">
                    {" "}
                    {filteredShops.length}
                  </span>{" "}
                  shops
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPage}
                    disabled={currentPage === 1}
                  >
                    Prev
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
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog
          open={Boolean(pendingAction)}
          onOpenChange={(open) => !open && setPendingAction(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingAction?.action === "approve"
                  ? "Are you sure you want to approve this market?"
                  : pendingAction?.action === "suspend"
                    ? "Are you sure you want to suspend this market?"
                    : pendingAction?.action === "unsuspend"
                      ? "Are you sure you want to unsuspend this market?"
                      : "Are you sure you want to reject this market?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {pendingShop
                  ? `${pendingAction?.action === "approve" ? "Approving" : pendingAction?.action === "suspend" ? "Suspending" : pendingAction?.action === "unsuspend" ? "Unsuspending" : "Rejecting"} ${pendingShop.name} for ${pendingShop.owner} will update its registration status immediately.`
                  : "This action will update the registration status immediately."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className={
                  pendingAction?.action === "approve" ||
                  pendingAction?.action === "unsuspend"
                    ? undefined
                    : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                }
                onClick={() => {
                  void confirmPendingAction();
                }}
              >
                {pendingAction?.action === "approve"
                  ? "Yes, approve"
                  : pendingAction?.action === "suspend"
                    ? "Yes, suspend"
                    : pendingAction?.action === "unsuspend"
                      ? "Yes, unsuspend"
                      : "Yes, reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={Boolean(editForm)}
          onOpenChange={(open) => !open && setEditForm(null)}
        >
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Update market details</DialogTitle>
              <DialogDescription>
                Edit the registered market information before saving changes.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="market-name">Market name</Label>
                <Input
                  id="market-name"
                  value={editForm?.name || ""}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, name: event.target.value } : prev,
                    )
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="market-owner">Owner name</Label>
                <Input
                  id="market-owner"
                  value={editForm?.owner || ""}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, owner: event.target.value } : prev,
                    )
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="market-country">Country</Label>
                  <Input
                    id="market-country"
                    value={editForm?.country || ""}
                    onChange={(event) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, country: event.target.value } : prev,
                      )
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="market-region">Region</Label>
                  <Input
                    id="market-region"
                    value={editForm?.region || ""}
                    onChange={(event) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, region: event.target.value } : prev,
                      )
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="market-city">City</Label>
                  <Input
                    id="market-city"
                    value={editForm?.city || ""}
                    onChange={(event) =>
                      setEditForm((prev) =>
                        prev ? { ...prev, city: event.target.value } : prev,
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditForm(null)}>
                Cancel
              </Button>
              <Button onClick={saveEditedShop}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={Boolean(shopToDelete)}
          onOpenChange={(open) => !open && setShopToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Are you sure you want to delete this market?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {shopToDelete
                  ? `Deleting ${shopToDelete.name} for ${shopToDelete.owner} will remove it from the registry. This action cannot be undone.`
                  : "This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (!shopToDelete) return;
                  deleteShop(shopToDelete.id);
                  setShopToDelete(null);
                }}
              >
                Yes, delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleLayout>
  );
}

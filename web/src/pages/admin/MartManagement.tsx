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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle,
  XCircle,
  Trash,
  Edit2,
  RotateCw,
  Key,
  MoreHorizontal,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";

type Shop = {
  id: string;
  name: string;
  owner: string;
  ownerId?: string;
  ownerUsername?: string;
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
  ownerId?: string;
  ownerUsername?: string;
  newPassword?: string;
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
  const [resetPasswordTarget, setResetPasswordTarget] =
    React.useState<Shop | null>(null);
  const [viewShop, setViewShop] = React.useState<Shop | null>(null);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [isResettingPassword, setIsResettingPassword] = React.useState(false);
  const [isSavingEdit, setIsSavingEdit] = React.useState(false);
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
    const ownerId = m.ownerId ? m.ownerId._id || m.ownerId : undefined;
    const ownerUsername = m.ownerId ? m.ownerId.username : undefined;
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
      ownerId: ownerId,
      ownerUsername: ownerUsername,
      status: statusMap[m.status] || "pending",
      sales: 0,
      users: 1,
      permissions: m.ownerId ? ["owner"] : [],
      address: { country: m.country, region: m.region, city: m.city },
    } as Shop;
  };

  const fetchShopsFromServer = async () => {
    if (!API_BASE) return false;
    try {
      const res = await fetch(`${API_BASE}/api/marts`, {
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

  // Keep the full mart list in memory and filter client-side,
  // so status counters (active/pending/suspended/rejected) remain stable.
  React.useEffect(() => {
    fetchShopsFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        await fetchShopsFromServer();
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
        await fetchShopsFromServer();
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
        await fetchShopsFromServer();
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

  const deleteShop = async (id: string) => {
    if (API_BASE) {
      try {
        const res = await fetch(`${API_BASE}/api/marts/${id}`, {
          method: "DELETE",
          headers: { ...getAuthHeaders() },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Server delete failed");
        }

        await fetchShopsFromServer();
        toast({
          title: "Shop deleted",
          description: "Shop removed from registry.",
        });
        return;
      } catch (err: any) {
        console.error("Failed to delete mart", err);
        toast({
          title: "Delete failed",
          description: err?.message || "Failed to delete shop",
          variant: "destructive",
        });
        return;
      }
    }

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
      ownerId: shop.ownerId,
      ownerUsername: shop.ownerUsername || "",
      newPassword: "",
      country: shop.address?.country || "Ethiopia",
      region: shop.address?.region || "",
      city: shop.address?.city || "",
    });
  };

  const saveEditedShop = async () => {
    if (!editForm) return;

    if (API_BASE) {
      setIsSavingEdit(true);
      try {
        // 1. Update Mart
        const martRes = await fetch(`${API_BASE}/api/marts/${editForm.id}`, {
          method: "PUT",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            martName: editForm.name,
            country: editForm.country,
            region: editForm.region,
            city: editForm.city,
          }),
        });
        if (!martRes.ok) throw new Error("Failed to update market details");

        // 2. Update Owner User if there's an ownerId
        if (editForm.ownerId) {
          const userRes = await fetch(
            `${API_BASE}/api/auth/users/${editForm.ownerId}`,
            {
              method: "PUT",
              headers: {
                ...getAuthHeaders(),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: editForm.owner,
                username: editForm.ownerUsername,
              }),
            },
          );
          if (!userRes.ok) throw new Error("Failed to update owner details");

          // 3. Reset Password if provided
          if (editForm.newPassword) {
            const passRes = await fetch(
              `${API_BASE}/api/auth/users/${editForm.ownerId}/reset-password`,
              {
                method: "PUT",
                headers: {
                  ...getAuthHeaders(),
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  newPassword: editForm.newPassword,
                  confirmPassword: editForm.newPassword,
                }),
              },
            );
            if (!passRes.ok) throw new Error("Failed to reset password");
          }
        }

        await fetchShopsFromServer();
        toast({
          title: "Shop updated",
          description:
            "Market and owner details have been successfully updated.",
        });
        setEditForm(null);
      } catch (err: any) {
        toast({
          title: "Update failed",
          description:
            err.message || "An error occurred while updating the shop.",
          variant: "destructive",
        });
      } finally {
        setIsSavingEdit(false);
      }
      return;
    }

    setShops((prev) =>
      prev.map((s) =>
        s.id === editForm.id
          ? {
              ...s,
              name: editForm.name,
              owner: editForm.owner,
              ownerUsername: editForm.ownerUsername,
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
        await fetchShopsFromServer();
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

  const handleResetPassword = async () => {
    if (!resetPasswordTarget?.ownerId) {
      toast({
        title: "Error",
        description: "Cannot reset password: owner ID is missing.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!API_BASE) {
      toast({
        title: "Mock Success",
        description: "Password updated successfully (mock).",
      });
      setResetPasswordTarget(null);
      setNewPassword("");
      setConfirmPassword("");
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/auth/users/${resetPasswordTarget.ownerId}/reset-password`,
        {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newPassword,
            confirmPassword,
          }),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to reset password");
      }

      toast({
        title: "Success",
        description: `Password for ${resetPasswordTarget.owner} has been reset successfully.`,
      });
      setResetPasswordTarget(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        title: "Error",
        description:
          err.message || "An error occurred while resetting the password.",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const refreshMarts = async () => {
    setIsRefreshing(true);
    try {
      await fetchShopsFromServer();
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
                      <TableRow
                        key={shop.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setViewShop(shop)}
                      >
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
                        <TableCell
                          className="text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setViewShop(shop)}
                              >
                                <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                                View Details
                              </DropdownMenuItem>
                              {shop.status === "pending" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setPendingAction({
                                        shopId: shop.id,
                                        action: "approve",
                                      })
                                    }
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4 text-success" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setPendingAction({
                                        shopId: shop.id,
                                        action: "reject",
                                      })
                                    }
                                    className="text-destructive focus:bg-destructive/10"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {shop.status === "active" && (
                                <>
                                  {shop.ownerId && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        setResetPasswordTarget(shop)
                                      }
                                    >
                                      <Key className="mr-2 h-4 w-4 text-muted-foreground" />
                                      Reset Password
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setPendingAction({
                                        shopId: shop.id,
                                        action: "suspend",
                                      })
                                    }
                                    className="text-destructive focus:bg-destructive/10"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Suspend
                                  </DropdownMenuItem>
                                </>
                              )}
                              {shop.status === "suspended" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    setPendingAction({
                                      shopId: shop.id,
                                      action: "unsuspend",
                                    })
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4 text-success" />
                                  Unsuspend
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => editShop(shop.id)}
                              >
                                <Edit2 className="mr-2 h-4 w-4 text-muted-foreground" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setShopToDelete(shop)}
                                className="text-destructive focus:bg-destructive/10"
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="market-owner">Owner Name</Label>
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

                <div className="grid gap-2">
                  <Label htmlFor="market-owner-username">Owner Username</Label>
                  <Input
                    id="market-owner-username"
                    value={editForm?.ownerUsername || ""}
                    onChange={(event) =>
                      setEditForm((prev) =>
                        prev
                          ? { ...prev, ownerUsername: event.target.value }
                          : prev,
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="market-owner-password">
                  Reset Owner Password (Optional)
                </Label>
                <Input
                  id="market-owner-password"
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={editForm?.newPassword || ""}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev
                        ? { ...prev, newPassword: event.target.value }
                        : prev,
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
              <Button
                variant="outline"
                onClick={() => setEditForm(null)}
                disabled={isSavingEdit}
              >
                Cancel
              </Button>
              <Button onClick={saveEditedShop} loading={isSavingEdit}>
                Save changes
              </Button>
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
                onClick={async () => {
                  if (!shopToDelete) return;
                  await deleteShop(shopToDelete.id);
                  setShopToDelete(null);
                }}
              >
                Yes, delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Change Password Dialog */}
        <Dialog
          open={!!resetPasswordTarget}
          onOpenChange={(open) => {
            if (!open) {
              setResetPasswordTarget(null);
              setNewPassword("");
              setConfirmPassword("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Reset Password for {resetPasswordTarget?.owner}
              </DialogTitle>
              <DialogDescription>
                Enter a new password for this store owner. This will log them
                out of existing sessions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setResetPasswordTarget(null);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                disabled={isResettingPassword}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                loading={isResettingPassword}
              >
                Save Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Shop Details Modal */}
        <Dialog
          open={!!viewShop}
          onOpenChange={(open) => !open && setViewShop(null)}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Market Details</DialogTitle>
              <DialogDescription>
                Comprehensive information for {viewShop?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Market Name
                  </h4>
                  <p className="text-base font-semibold">{viewShop?.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Owner / Contact
                  </h4>
                  <p className="text-base font-medium">{viewShop?.owner}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Status
                  </h4>
                  <div className="mt-1">
                    {viewShop?.status === "active" && (
                      <Badge className="bg-success/10 text-success border-success/20">
                        Active
                      </Badge>
                    )}
                    {viewShop?.status === "pending" && (
                      <Badge className="bg-warning/10 text-warning border-warning/20">
                        Pending
                      </Badge>
                    )}
                    {viewShop?.status === "suspended" && (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                        Suspended
                      </Badge>
                    )}
                    {viewShop?.status === "rejected" && (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                        Rejected
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Location
                  </h4>
                  <p className="text-base">
                    {viewShop?.address ? (
                      <>
                        <span>{viewShop.address.city || "Unknown City"}</span>
                        <span className="block text-muted-foreground text-sm">
                          {viewShop.address.region || "-"},{" "}
                          {viewShop.address.country || "-"}
                        </span>
                      </>
                    ) : (
                      "Address not provided"
                    )}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Registered Users
                  </h4>
                  <p className="text-base">
                    {viewShop?.users || 0} users enrolled
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Total Sales (Placeholder)
                  </h4>
                  <p className="text-base font-medium text-primary">
                    Birr {viewShop?.sales?.toLocaleString() || "0"}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setViewShop(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleLayout>
  );
}

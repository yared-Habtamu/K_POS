import { useEffect, useMemo, useState } from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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

type SubscriptionSettings = {
  defaultFeeEtb: number;
  billingPeriodDays: number;
  defaultProductLimit: number;
  defaultTransactionLimit: number;
  warningDaysBeforeExpiry: number;
  autoSuspendEnabled: boolean;
};

type MartSubscriptionRow = {
  martId: string;
  martName: string;
  status: string;
  subscriptionStatus: string;
  billingPeriodDays?: number;
  daysLeft: number | null;
  productCount?: number;
  productLimit?: number;
  transactionCount?: number;
  transactionLimit?: number;
  feeEtb: number;
  startDate?: string;
  endDate?: string;
  exceeded: boolean;
};

type PlanForm = {
  feeEtb: string;
  billingPeriodDays: string;
  productLimit: string;
  transactionLimit: string;
  subscriptionEndDate: string;
  unsuspend: boolean;
};

const emptySettings: SubscriptionSettings = {
  defaultFeeEtb: 1000,
  billingPeriodDays: 30,
  defaultProductLimit: 100,
  defaultTransactionLimit: 500,
  warningDaysBeforeExpiry: 5,
  autoSuspendEnabled: true,
};

function toInputDate(dateValue?: string) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function statusVariant(s: string) {
  if (s === "active" || s === "approved") return "default" as const;
  if (s === "suspended" || s === "rejected") return "destructive" as const;
  if (s === "warning") return "secondary" as const;
  return "outline" as const;
}

export default function AdminSubscriptionsPage() {
  const auth = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${auth?.token}`, "Content-Type": "application/json" }),
    [auth?.token],
  );
  const API_BASE = import.meta.env.VITE_API_URL || "";

  const [settings, setSettings] = useState<SubscriptionSettings>(emptySettings);
  const [marts, setMarts] = useState<MartSubscriptionRow[]>([]);
  const [planForms, setPlanForms] = useState<Record<string, PlanForm>>({});

  const [loadingSettings, setLoadingSettings] = useState(false);
  const [loadingMarts, setLoadingMarts] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingMart, setSavingMart] = useState<string | null>(null);
  const [checkingAll, setCheckingAll] = useState(false);

  const [selectedMartId, setSelectedMartId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingMartId, setEditingMartId] = useState<string | null>(null);

  const selectedMart = useMemo(
    () => marts.find((r) => r.martId === selectedMartId) || null,
    [marts, selectedMartId],
  );

  const editingForm = editingMartId ? planForms[editingMartId] : undefined;

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await fetch(`${API_BASE}/api/subscriptions/settings`, {
        headers,
      });
      if (!res.ok) throw new Error(`Failed to load settings (${res.status})`);
      const data = await res.json();
      setSettings({
        defaultFeeEtb: Number(data.defaultFeeEtb || 0),
        billingPeriodDays: Number(data.billingPeriodDays || 30),
        defaultProductLimit: Number(data.defaultProductLimit || 100),
        defaultTransactionLimit: Number(data.defaultTransactionLimit || 500),
        warningDaysBeforeExpiry: Number(data.warningDaysBeforeExpiry || 5),
        autoSuspendEnabled: Boolean(data.autoSuspendEnabled),
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Load failed",
        description: "Could not load subscription settings.",
        variant: "destructive",
      });
    } finally {
      setLoadingSettings(false);
    }
  };

  const loadMarts = async () => {
    try {
      setLoadingMarts(true);
      console.log("[Subscriptions] loadMarts called, API_BASE:", API_BASE, "token:", auth?.token?.slice(0, 20));
      const res = await fetch(`${API_BASE}/api/subscriptions/marts`, {
        headers,
      });
      console.log("[Subscriptions] loadMarts response:", res.status);
      if (!res.ok) throw new Error(`Failed to load marts (${res.status})`);
      const data = await res.json();
      console.log("[Subscriptions] loadMarts data:", JSON.stringify(data).slice(0, 300));
      const rows = (Array.isArray(data) ? data : []) as MartSubscriptionRow[];
      setMarts(rows);

      const nextForms: Record<string, PlanForm> = {};
      rows.forEach((row) => {
        nextForms[row.martId] = {
          feeEtb: String(Math.round(Number(row.feeEtb || 0))),
          billingPeriodDays: String(
            Math.round(
              Number(row.billingPeriodDays || settings.billingPeriodDays || 30),
            ),
          ),
          productLimit: String(Math.round(Number(row.productLimit || settings.defaultProductLimit || 100))),
          transactionLimit: String(Math.round(Number(row.transactionLimit || settings.defaultTransactionLimit || 500))),
          subscriptionEndDate: toInputDate(row.endDate),
          unsuspend: false,
        };
      });
      setPlanForms(nextForms);
    } catch (err) {
      console.error(err);
      toast({
        title: "Load failed",
        description: "Could not load mart subscription statuses.",
        variant: "destructive",
      });
    } finally {
      setLoadingMarts(false);
    }
  };

  useEffect(() => {
    if (!auth?.token) return;
    loadSettings();
    loadMarts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  const onSaveSettings = async () => {
    try {
      setSavingSettings(true);
      const payload = {
        defaultFeeEtb: Number(settings.defaultFeeEtb || 0),
        billingPeriodDays: Number(settings.billingPeriodDays || 30),
        defaultProductLimit: Number(settings.defaultProductLimit || 100),
        defaultTransactionLimit: Number(settings.defaultTransactionLimit || 500),
        warningDaysBeforeExpiry: Number(settings.warningDaysBeforeExpiry || 5),
        autoSuspendEnabled: Boolean(settings.autoSuspendEnabled),
      };

      const res = await fetch(`${API_BASE}/api/subscriptions/settings`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      toast({
        title: "Settings saved",
        description: "Subscription settings updated.",
      });
      await loadSettings();
    } catch (err) {
      console.error(err);
      toast({
        title: "Save failed",
        description: "Could not save subscription settings.",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const onRunCheckAll = async () => {
    try {
      setCheckingAll(true);
      const res = await fetch(`${API_BASE}/api/subscriptions/check-all`, {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error(`Check failed (${res.status})`);
      toast({
        title: "Check complete",
        description: "Subscription check ran for all marts.",
      });
      await loadMarts();
    } catch (err) {
      console.error(err);
      toast({
        title: "Check failed",
        description: "Could not run subscription check.",
        variant: "destructive",
      });
    } finally {
      setCheckingAll(false);
    }
  };

  const onSaveMartPlan = async (martId: string) => {
    try {
      setSavingMart(martId);
      const form = planForms[martId];
      if (!form) return;

      const payload: Record<string, unknown> = {
        feeEtb: Number(form.feeEtb || 0),
        billingPeriodDays: Number(
          form.billingPeriodDays || settings.billingPeriodDays || 30,
        ),
        productLimit: Number(form.productLimit || settings.defaultProductLimit || 100),
        transactionLimit: Number(form.transactionLimit || settings.defaultTransactionLimit || 500),
        unsuspend: form.unsuspend,
      };

      if (form.subscriptionEndDate) {
        payload.subscriptionEndDate = new Date(
          form.subscriptionEndDate,
        ).toISOString();
      }

      const res = await fetch(
        `${API_BASE}/api/subscriptions/marts/${martId}/plan`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) throw new Error(`Update failed (${res.status})`);

      await loadMarts();
      toast({
        title: "Plan updated",
        description: "Mart subscription plan was updated.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Update failed",
        description: "Could not update mart subscription plan.",
        variant: "destructive",
      });
    } finally {
      setSavingMart(null);
    }
  };

  const updatePlanForm = (martId: string, patch: Partial<PlanForm>) => {
    setPlanForms((prev) => ({
      ...prev,
      [martId]: {
        ...(prev[martId] || {
          feeEtb: "0",
          billingPeriodDays: "30",
          productLimit: "100",
          transactionLimit: "500",
          subscriptionEndDate: "",
          unsuspend: false,
        }),
        ...patch,
      },
    }));
  };

  const openDetails = (martId: string) => {
    setSelectedMartId(martId);
    setIsDetailsOpen(true);
  };

  const openUpdateModal = (martId: string) => {
    setEditingMartId(martId);
  };

  const closeUpdateModal = () => {
    setEditingMartId(null);
  };

  return (
    <RoleLayout allowedRoles={["system_admin"]}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Subscription Management</h1>
            <p className="text-muted-foreground">
              Configure platform fees, product limits, expiry warnings, and
              automatic suspension.
            </p>
          </div>
          <Button
            onClick={onRunCheckAll}
            disabled={checkingAll || loadingMarts}
          >
            {checkingAll ? "Running..." : "Run Check for All Marts"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Global Subscription Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Label>Default Fee (ETB)</Label>
                <Input
                  type="number"
                  value={settings.defaultFeeEtb}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultFeeEtb: Number(e.target.value || 0),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Billing Period (Days)</Label>
                <Input
                  type="number"
                  value={settings.billingPeriodDays}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      billingPeriodDays: Number(e.target.value || 0),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Default Product Limit</Label>
                <Input
                  type="number"
                  value={settings.defaultProductLimit}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultProductLimit: Number(e.target.value || 100),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Default Transaction Limit</Label>
                <Input
                  type="number"
                  value={settings.defaultTransactionLimit}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      defaultTransactionLimit: Number(e.target.value || 500),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Warn Before Expiry (Days)</Label>
                <Input
                  type="number"
                  value={settings.warningDaysBeforeExpiry}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      warningDaysBeforeExpiry: Number(e.target.value || 0),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Auto Suspend Exceeded Marts</Label>
                <div className="h-10 flex items-center">
                  <Switch
                    checked={settings.autoSuspendEnabled}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        autoSuspendEnabled: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={onSaveSettings}
                disabled={savingSettings || loadingSettings}
              >
                {savingSettings ? "Saving..." : "Save Global Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mart Subscription Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mart</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Days Left</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marts.map((row) => (
                    <TableRow
                      key={row.martId}
                      className="cursor-pointer"
                      onClick={() => openDetails(row.martId)}
                    >
                      <TableCell className="font-medium">
                        {row.martName}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.status)}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(row.subscriptionStatus)}>
                          {row.subscriptionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {typeof row.productCount === "number" ? (
                          <span className={row.productLimit && row.productCount >= row.productLimit ? "text-destructive font-medium" : ""}>
                            {row.productCount}/{row.productLimit || "\u221E"}
                          </span>
                        ) : "N/A"}
                      </TableCell>
                      <TableCell>
                        {typeof row.transactionCount === "number" ? (
                          <span className={row.transactionLimit && row.transactionCount >= row.transactionLimit ? "text-destructive font-medium" : ""}>
                            {row.transactionCount}/{row.transactionLimit || "\u221E"}
                          </span>
                        ) : "N/A"}
                      </TableCell>
                      <TableCell>
                        {typeof row.daysLeft === "number"
                          ? row.daysLeft
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openUpdateModal(row.martId);
                          }}
                        >
                          Update
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!loadingMarts && marts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground"
                      >
                        No marts found.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedMart?.martName || "Mart Details"}
              </DialogTitle>
              <DialogDescription>
                Subscription details for the selected mart.
              </DialogDescription>
            </DialogHeader>
            {selectedMart ? (
              <div className="space-y-2 text-sm">
                <div>
                  Mart Status:{" "}
                  <span className="font-medium">{selectedMart.status}</span>
                </div>
                <div>
                  Subscription Status:{" "}
                  <span className="font-medium">
                    {selectedMart.subscriptionStatus}
                  </span>
                </div>
                <div>
                  Fee:{" "}
                  <span className="font-medium">{selectedMart.feeEtb} ETB</span>
                </div>
                <div>
                  Billing Days:{" "}
                  <span className="font-medium">
                    {selectedMart.billingPeriodDays ||
                      settings.billingPeriodDays}
                  </span>
                </div>
                <div>
                  Products:{" "}
                  <span className="font-medium">
                    {selectedMart.productCount ?? "N/A"} /{" "}
                    {selectedMart.productLimit ?? "\u221E"}
                  </span>
                </div>
                <div>
                  Transactions:{" "}
                  <span className="font-medium">
                    {selectedMart.transactionCount ?? "N/A"} /{" "}
                    {selectedMart.transactionLimit ?? "\u221E"}
                  </span>
                </div>
                <div>
                  Days Left:{" "}
                  <span className="font-medium">
                    {typeof selectedMart.daysLeft === "number"
                      ? selectedMart.daysLeft
                      : "N/A"}
                  </span>
                </div>
                <div>
                  Start Date:{" "}
                  <span className="font-medium">
                    {selectedMart.startDate
                      ? new Date(selectedMart.startDate).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div>
                  End Date:{" "}
                  <span className="font-medium">
                    {selectedMart.endDate
                      ? new Date(selectedMart.endDate).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </div>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
              {selectedMart ? (
                <Button onClick={() => openUpdateModal(selectedMart.martId)}>
                  Update Plan
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(editingMartId)}
          onOpenChange={(open) => {
            if (!open) closeUpdateModal();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Mart Subscription Plan</DialogTitle>
              <DialogDescription>
                Update billing, product limits, expiry date, and suspension
                override.
              </DialogDescription>
            </DialogHeader>

            {editingMartId && editingForm ? (
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label>Fee (ETB)</Label>
                  <Input
                    type="number"
                    value={editingForm.feeEtb}
                    onChange={(e) =>
                      updatePlanForm(editingMartId, { feeEtb: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Billing Days</Label>
                  <Input
                    type="number"
                    value={editingForm.billingPeriodDays}
                    onChange={(e) =>
                      updatePlanForm(editingMartId, {
                        billingPeriodDays: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Product Limit</Label>
                  <Input
                    type="number"
                    value={editingForm.productLimit}
                    onChange={(e) =>
                      updatePlanForm(editingMartId, {
                        productLimit: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Transaction Limit</Label>
                  <Input
                    type="number"
                    value={editingForm.transactionLimit}
                    onChange={(e) =>
                      updatePlanForm(editingMartId, {
                        transactionLimit: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Subscription End Date</Label>
                  <Input
                    type="date"
                    value={editingForm.subscriptionEndDate}
                    onChange={(e) =>
                      updatePlanForm(editingMartId, {
                        subscriptionEndDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Unsuspend Mart</p>
                    <p className="text-xs text-muted-foreground">
                      If enabled, suspended marts will be set back to approved
                      on update.
                    </p>
                  </div>
                  <Switch
                    checked={editingForm.unsuspend}
                    onCheckedChange={(checked) =>
                      updatePlanForm(editingMartId, { unsuspend: checked })
                    }
                  />
                </div>
              </div>
            ) : null}

            <DialogFooter>
              <Button variant="outline" onClick={closeUpdateModal}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!editingMartId) return;
                  await onSaveMartPlan(editingMartId);
                  closeUpdateModal();
                }}
                disabled={Boolean(
                  editingMartId && savingMart === editingMartId,
                )}
              >
                {editingMartId && savingMart === editingMartId
                  ? "Saving..."
                  : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleLayout>
  );
}

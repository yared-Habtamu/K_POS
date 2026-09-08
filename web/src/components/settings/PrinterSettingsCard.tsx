import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import printNodeBridge from "@/services/printBridge/printNodeBridge";
import type { MartPrinterAssignment } from "@/services/printBridge/printNodeBridge";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@/types";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Search,
  Users,
  Printer,
  Settings,
  HelpCircle,
  Save,
  RefreshCw,
  Edit,
  Pencil,
  Check,
  X,
} from "lucide-react";

type PrinterSettingsCardProps = {
  role: UserRole;
  title?: string;
  description?: string;
};

export function PrinterSettingsCard({
  role,
  title,
  description,
}: PrinterSettingsCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const auth = useAuthStore((s) => s.user);
  const printNodeId = useSettingsStore((s) => s.printNodeId);
  const setPrintNodeId = useSettingsStore((s) => s.setPrintNodeId);
  const syncFromDB = useSettingsStore((s) => s.syncFromDB);

  const isOwnerOrManager = ["owner", "manager", "systemAdmin"].includes(role);

  const [printNodeStatus, setPrintNodeStatus] = useState<"checking" | "online" | "offline">("checking");
  const [printNodePrinters, setPrintNodePrinters] = useState<{ id: number; name: string; originalName?: string; customLabel?: string | null }[]>([]);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [saving, setSaving] = useState(false);

  // User's printer name (per-user, stored on user record)
  const [printerName, setPrinterName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Mart-level printer labels (shared across all staff)
  const [printerLabels, setPrinterLabels] = useState<Record<string, string>>({});
  const [editingLabelPrinterId, setEditingLabelPrinterId] = useState<number | null>(null);
  const [editLabelValue, setEditLabelValue] = useState("");
  const [savingLabel, setSavingLabel] = useState(false);

  // Mart printers (owner/manager view)
  const [martAssignments, setMartAssignments] = useState<MartPrinterAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editPrinterId, setEditPrinterId] = useState<number>(0);
  const [editPrinterName, setEditPrinterName] = useState("");

  const loadPrinterLabels = async () => {
    try {
      const labels = await printNodeBridge.getPrinterLabels();
      setPrinterLabels(labels);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const check = async () => {
      try {
        const health = await printNodeBridge.getPrintNodeHealth();
        setPrintNodeStatus(health.reachable ? "online" : health.configured ? "offline" : "offline");

        if (health.reachable) {
          const printers = await printNodeBridge.listPrinters();
          setPrintNodePrinters(
            printers.map((p) => ({
              id: p.id,
              name: p.name,
              originalName: (p as any).originalName || p.name,
              customLabel: (p as any).customLabel || null,
            }))
          );

          // Load mart-level printer labels
          await loadPrinterLabels();

          // Load user's saved printer from DB
          const saved = await printNodeBridge.getUserPrinter();
          if (saved.printNodeId) {
            syncFromDB(saved.printNodeId);
            if (saved.printerName) setPrinterName(saved.printerName);
          } else if (!printNodeId && printers.length > 0) {
            const firstPrinter = printers[0].id;
            setPrintNodeId(firstPrinter);
            await printNodeBridge.saveUserPrinter(firstPrinter, printers[0].name);
            toast({
              title: t("printer_auto_detected"),
              description: `${t("using_printer")}: ${printers[0].name}`,
            });
          }
        }
      } catch {
        setPrintNodeStatus("offline");
      }
    };
    check();
  }, []);

  const loadMartAssignments = async () => {
    setLoadingAssignments(true);
    const assignments = await printNodeBridge.getMartPrinterAssignments();
    setMartAssignments(assignments);
    setLoadingAssignments(false);
  };

  useEffect(() => {
    if (isOwnerOrManager) {
      loadMartAssignments();
    }
  }, [isOwnerOrManager]);

  const handleAutoDetect = async () => {
    setAutoDetecting(true);
    try {
      const printers = await printNodeBridge.listPrinters();
      setPrintNodePrinters(
        printers.map((p) => ({
          id: Number(p.id),
          name: String(p.name || ""),
          originalName: String((p as any).originalName || p.name || ""),
          customLabel: (p as any).customLabel || null,
        }))
      );

      if (printers.length > 0) {
        const firstPrinter = Number(printers[0].id);
        const firstName = String(printers[0].name || "");
        setPrintNodeId(firstPrinter);
        await printNodeBridge.saveUserPrinter(firstPrinter, firstName);
        toast({
          title: String(t("printer_found")),
          description: String(t("using_printer")) + ": " + firstName,
        });
      } else {
        toast({
          variant: "destructive",
          title: t("no_printers_found"),
          description: t("ensure_printnode_running"),
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("detection_failed"),
        description: t("cannot_connect_printnode"),
      });
    } finally {
      setAutoDetecting(false);
    }
  };

  const handleSelectPrinter = async (printerId: number) => {
    setSaving(true);
    setPrintNodeId(printerId);
    const printer = printNodePrinters.find((p) => p.id === printerId);
    const displayName = printerLabels[String(printerId)] || printer?.name || String(printerId);
    const success = await printNodeBridge.saveUserPrinter(printerId, displayName);
    setSaving(false);

    if (success) {
      toast({
        title: t("printer_saved"),
        description: `${t("using_printer")}: ${displayName}`,
      });
    } else {
      toast({
        variant: "destructive",
        title: t("save_failed"),
        description: t("could_not_save_printer"),
      });
    }
  };

  const handleSaveName = async () => {
    setSavingName(true);
    const success = await printNodeBridge.saveUserPrinter(printNodeId || 0, printerName);
    setSavingName(false);

    if (success) {
      toast({
        title: t("printer_name_saved"),
        description: printerName ? `${t("printer_named")}: ${printerName}` : t("printer_name_cleared"),
      });
    }
  };

  const handleSaveLabel = async (printerId: number) => {
    setSavingLabel(true);
    const success = await printNodeBridge.savePrinterLabel(printerId, editLabelValue);
    setSavingLabel(false);

    if (success) {
      // Update local state
      const updated = { ...printerLabels };
      if (editLabelValue.trim()) {
        updated[String(printerId)] = editLabelValue.trim();
      } else {
        delete updated[String(printerId)];
      }
      setPrinterLabels(updated);

      // Update the printer list display
      setPrintNodePrinters((prev) =>
        prev.map((p) =>
          p.id === printerId
            ? { ...p, name: editLabelValue.trim() || p.originalName || p.name, customLabel: editLabelValue.trim() || null }
            : p
        )
      );

      toast({
        title: t("printer_label_saved", { defaultValue: "Printer name updated" }),
        description: editLabelValue.trim()
          ? `${t("printer_named")}: ${editLabelValue.trim()}`
          : t("printer_name_cleared", { defaultValue: "Restored to default name" }),
      });
      setEditingLabelPrinterId(null);
    }
  };

  const handleUpdateUserPrinter = async (userId: string) => {
    if (!editPrinterId) return;
    const success = await printNodeBridge.updateMartPrinter(userId, editPrinterId, editPrinterName);
    if (success) {
      toast({ title: t("printer_updated") });
      setEditingUser(null);
      loadMartAssignments();
    } else {
      toast({ variant: "destructive", title: t("update_failed") });
    }
  };

  // Resolve display name for a printer ID (custom label > PrintNode name > ID)
  const getDisplayName = (printerId: number, fallback?: string) => {
    return printerLabels[String(printerId)] || fallback || `Printer ${printerId}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          {title || t("device_printer")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="my-printer" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="my-printer" className="gap-1.5">
              <Printer className="h-4 w-4" />
              {t("my_printer", { defaultValue: "My Printer" })}
            </TabsTrigger>
            {isOwnerOrManager && (
              <TabsTrigger value="mart-printers" className="gap-1.5">
                <Users className="h-4 w-4" />
                {t("mart_printers", { defaultValue: "Mart Printers" })}
              </TabsTrigger>
            )}
            <TabsTrigger value="setup-guide" className="gap-1.5">
              <HelpCircle className="h-4 w-4" />
              {t("setup_guide", { defaultValue: "Setup Guide" })}
            </TabsTrigger>
          </TabsList>

          {/* ─── My Printer Tab ─────────────────────────────────── */}
          <TabsContent value="my-printer" className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              {printNodeStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {printNodeStatus === "online" && <CheckCircle className="h-4 w-4 text-green-500" />}
              {printNodeStatus === "offline" && <XCircle className="h-4 w-4 text-orange-500" />}
              <span className="text-sm font-medium">
                {printNodeStatus === "online" ? t("printnode_connected") : printNodeStatus === "offline" ? t("printnode_offline") : t("checking")}
              </span>
              {printNodeStatus === "online" && <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700">{t("active")}</Badge>}
            </div>

            {/* Current Printer */}
            <div>
              <Label>{t("current_printer")}</Label>
              {printNodeId ? (
                <div className="mt-1 p-3 rounded-lg bg-muted/30 border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {getDisplayName(printNodeId, printerName)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("printer_id", { defaultValue: "ID" })}: {printNodeId}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-1 p-3 rounded-lg bg-muted/30 border">
                  <p className="text-sm text-muted-foreground">
                    {autoDetecting ? t("detecting_printer") : t("no_printer_detected")}
                  </p>
                </div>
              )}
            </div>

            {/* Detect Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoDetect}
              disabled={autoDetecting || printNodeStatus !== "online"}
            >
              {autoDetecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              {printNodeId ? t("detect_different_printer") : t("auto_detect_printer")}
            </Button>

            {/* Available Printers */}
            {printNodePrinters.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium">{t("available_printers_in_shop", { defaultValue: "Available Printers in Your Shop" })}</p>
                <p className="text-xs text-muted-foreground">
                  {t("available_printers_hint", { defaultValue: "These printers are connected to your shop's PrintNode account. Select the one plugged into YOUR computer." })}
                </p>
                {printNodePrinters.map((p) => {
                  const label = printerLabels[String(p.id)];
                  const displayName = label || p.name;
                  const isEditingLabel = editingLabelPrinterId === p.id;

                  return (
                    <div
                      key={p.id}
                      className={`block w-full text-xs p-3 rounded border transition-colors ${
                        printNodeId === p.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-muted hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <button
                          className="flex-1 text-left"
                          onClick={() => handleSelectPrinter(p.id)}
                          disabled={saving}
                        >
                          {isEditingLabel ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editLabelValue}
                                onChange={(e) => setEditLabelValue(e.target.value)}
                                placeholder={p.originalName || p.name}
                                className="h-7 text-xs flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveLabel(p.id);
                                  if (e.key === "Escape") setEditingLabelPrinterId(null);
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveLabel(p.id);
                                }}
                                disabled={savingLabel}
                              >
                                {savingLabel ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingLabelPrinterId(null);
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{displayName}</span>
                                {printNodeId === p.id && <CheckCircle className="h-4 w-4 text-primary" />}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-muted-foreground">ID: {p.id}</span>
                                {label && p.originalName && p.originalName !== label && (
                                  <span className="text-muted-foreground">({p.originalName})</span>
                                )}
                              </div>
                            </>
                          )}
                        </button>

                        {/* Owner/Manager can rename printers */}
                        {isOwnerOrManager && !isEditingLabel && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 ml-2 shrink-0"
                            title={t("rename_printer", { defaultValue: "Rename printer" })}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingLabelPrinterId(p.id);
                              setEditLabelValue(label || "");
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {t("ensure_printnode_client")}
            </p>
          </TabsContent>

          {/* ─── Mart Printers Tab (Owner/Manager) ──────────────── */}
          {isOwnerOrManager && (
            <TabsContent value="mart-printers" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("all_mart_printers", { defaultValue: "All Printers in This Shop" })}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("mart_printers_desc", { defaultValue: "See which printer is assigned to each staff member. You can reassign printers here." })}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={loadMartAssignments} disabled={loadingAssignments}>
                  <RefreshCw className={`h-4 w-4 mr-1 ${loadingAssignments ? "animate-spin" : ""}`} />
                  {t("refresh")}
                </Button>
              </div>

              {loadingAssignments ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : martAssignments.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("no_staff_found", { defaultValue: "No staff members found in this shop" })}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {martAssignments.map((user) => (
                    <div key={user.id} className="p-3 rounded-lg border">
                      {editingUser === user.id ? (
                        /* Edit mode */
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{user.name}</p>
                              <p className="text-xs text-muted-foreground">@{user.username} - {user.role}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <select
                              value={editPrinterId}
                              onChange={(e) => setEditPrinterId(Number(e.target.value))}
                              className="flex-1 text-xs p-2 rounded border bg-background"
                            >
                              {printNodePrinters.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {printerLabels[String(p.id)] || p.name} (ID: {p.id})
                                </option>
                              ))}
                            </select>
                            <Input
                              value={editPrinterName}
                              onChange={(e) => setEditPrinterName(e.target.value)}
                              placeholder={t("printer_name", { defaultValue: "Printer name" })}
                              className="flex-1"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setEditingUser(null)}>
                              {t("cancel")}
                            </Button>
                            <Button size="sm" onClick={() => handleUpdateUserPrinter(user.id)}>
                              {t("save")}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {user.printerName && <span>{user.printerName}</span>}
                              {user.printerName && user.printNodeId && <span className="text-muted-foreground mx-1">-</span>}
                              {user.printNodeId ? (
                                <span className="font-mono text-xs">ID: {user.printNodeId}</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">{t("no_printer_assigned", { defaultValue: "No printer assigned" })}</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.name} (@{user.username}) - {user.role}
                              {user.printNodeId && (
                                <span> - {printerLabels[String(user.printNodeId)] || printNodePrinters.find(p => p.id === user.printNodeId)?.name || ""}</span>
                              )}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingUser(user.id);
                              setEditPrinterId(user.printNodeId || (printNodePrinters[0]?.id || 0));
                              setEditPrinterName(user.printerName || "");
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* ─── Setup Guide Tab ────────────────────────────────── */}
          <TabsContent value="setup-guide" className="space-y-4">
            <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 space-y-4">
              <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400">
                {t("printer_setup_guide", { defaultValue: "Printer Setup Guide" })}
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <span className="font-bold text-blue-600">1.</span>
                  <div>
                    <p className="font-medium">{t("step1_title", { defaultValue: "Create a PrintNode Account" })}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("step1_desc", { defaultValue: "Go to printnode.com and create a free account. Each shop needs its own account." })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="font-bold text-blue-600">2.</span>
                  <div>
                    <p className="font-medium">{t("step2_title", { defaultValue: "Install PrintNode Client" })}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("step2_desc", { defaultValue: "Download and install PrintNode Client on EVERY cashier's computer. This software connects your printer to the cloud." })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="font-bold text-blue-600">3.</span>
                  <div>
                    <p className="font-medium">{t("step3_title", { defaultValue: "Connect Your Printers" })}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("step3_desc", { defaultValue: "Plug each receipt printer into the computer it will be used at. The PrintNode Client will detect it automatically." })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="font-bold text-blue-600">4.</span>
                  <div>
                    <p className="font-medium">{t("step4_title", { defaultValue: "Get Your API Key" })}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("step4_desc", { defaultValue: "In PrintNode, go to Account > API Keys. Copy the API key and give it to the shop owner." })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="font-bold text-blue-600">5.</span>
                  <div>
                    <p className="font-medium">{t("step5_title", { defaultValue: "Owner: Enter API Key" })}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("step5_desc", { defaultValue: "The shop owner goes to Settings > Printer > PrintNode API Key tab and enters the API key." })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="font-bold text-blue-600">6.</span>
                  <div>
                    <p className="font-medium">{t("step6_title", { defaultValue: "Each Cashier: Select Their Printer" })}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("step6_desc", { defaultValue: "Each cashier goes to their Settings > Printer, clicks 'Detect Printer', and selects the printer plugged into THEIR computer. They can also give it a name." })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="font-bold text-blue-600">7.</span>
                  <div>
                    <p className="font-medium">{t("step7_title", { defaultValue: "Test Print" })}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("step7_desc", { defaultValue: "Complete a test sale and verify the receipt prints on the correct printer." })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 space-y-2">
              <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400">
                {t("important_notes", { defaultValue: "Important Notes" })}
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>{t("note1", { defaultValue: "Each shop MUST have its own PrintNode account. Do NOT share API keys between shops." })}</li>
                <li>{t("note2", { defaultValue: "PrintNode Client must be running on each computer for printing to work." })}</li>
                <li>{t("note3", { defaultValue: "Each cashier must select the printer connected to THEIR computer, not someone else's." })}</li>
                <li>{t("note4", { defaultValue: "The owner can rename printers and reassign them for any staff member from the 'Mart Printers' tab." })}</li>
                <li>{t("note5", { defaultValue: "Printer names (e.g. 'Front Desk Printer') are shared across all staff in the shop." })}</li>
                <li>{t("note6", { defaultValue: "PrintNode free plan supports up to 2 printers. Upgrade for more." })}</li>
              </ul>
            </div>

            <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 space-y-2">
              <h3 className="text-sm font-bold text-green-700 dark:text-green-400">
                {t("how_it_works_title", { defaultValue: "How Multi-Printer Printing Works" })}
              </h3>
              <div className="text-xs text-muted-foreground space-y-2">
                <p>{t("how_it_works_1", { defaultValue: "When a cashier clicks 'Print', the system looks up which printer that cashier is assigned to." })}</p>
                <p>{t("how_it_works_2", { defaultValue: "The print job is sent to the PrintNode cloud with that specific printer's ID." })}</p>
                <p>{t("how_it_works_3", { defaultValue: "PrintNode delivers the job to the computer where that printer is connected." })}</p>
                <p>{t("how_it_works_4", { defaultValue: "Even though all shops share the same system, each shop has its own PrintNode account, so printers from other shops are NEVER visible." })}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

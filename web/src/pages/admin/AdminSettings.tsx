import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import useSettingsStore from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { Plus, Trash2, Loader2 } from "lucide-react";
import {
  ContactItem,
  ICON_OPTIONS,
  fetchContactsFromDB,
  getIconConfig,
} from "@/pages/Index";

const KEY = "pos_admin_settings_v1";

type Settings = {
  registrationApprovalRequired: boolean;
  defaultCommission: number;
  notificationEmail: string;
};

const defaults: Settings = {
  registrationApprovalRequired: true,
  defaultCommission: 2.5,
  notificationEmail: "",
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    return JSON.parse(raw) as Settings;
  } catch {
    return defaults;
  }
}

function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export default function AdminSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const token = user?.token ?? "";
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [contactItems, setContactItems] = useState<ContactItem[]>([]);
  const [isSavingContacts, setIsSavingContacts] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);

  // Add Channel Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("facebook");
  const [newValue, setNewValue] = useState("");

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  // Load contacts from DB on mount
  React.useEffect(() => {
    setIsLoadingContacts(true);
    fetchContactsFromDB()
      .then(setContactItems)
      .finally(() => setIsLoadingContacts(false));
  }, []);

  const preferredPrinter = useSettingsStore((s) =>
    s.getPreferredPrinter("system_admin"),
  );
  const setPrinterForRole = useSettingsStore((s) => s.setPrinterForRole);

  const update = (patch: Partial<Settings>) =>
    setSettings((s) => ({ ...s, ...patch }));

  const onSave = () => {
    saveSettings(settings);
    toast({
      title: t("settings_saved"),
      description: t("admin_settings_saved"),
    });
  };

  const onSaveContacts = async () => {
    setIsSavingContacts(true);
    try {
      const activeToken =
        user?.token ||
        localStorage.getItem("pos_token") ||
        sessionStorage.getItem("pos_token") ||
        "";
      const res = await fetch(`${API_BASE}/api/site-settings/contacts`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: activeToken ? `Bearer ${activeToken}` : "",
        },
        body: JSON.stringify({ contacts: contactItems }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed with ${res.status}`);
      }
      const data = await res.json();
      // Reload confirmed state from server response
      if (Array.isArray(data.contacts)) setContactItems(data.contacts);
      // Notify landing page footer in the same browser tab
      window.dispatchEvent(new Event("contact-settings-updated"));
      toast({
        title: t("contact_info_saved"),
        description: t("landing_contacts_saved"),
      });
    } catch (err: any) {
      toast({
        title: t("save_failed"),
        description: err?.message || t("could_not_save_contact"),
        variant: "destructive",
      });
    } finally {
      setIsSavingContacts(false);
    }
  };

  const handleAddChannelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newValue.trim()) {
      toast({
        title: t("validation_error"),
        description: t("fill_label_and_value"),
        variant: "destructive",
      });
      return;
    }

    const newItem: ContactItem = {
      id: String(Date.now()),
      label: newLabel.trim(),
      icon: newIcon,
      value: newValue.trim(),
    };

    setContactItems((prev) => [...prev, newItem]);
    setNewLabel("");
    setNewIcon("facebook");
    setNewValue("");
    setIsAddModalOpen(false);

    toast({
      title: t("channel_added"),
      description: `${t("channel_added")}: "${newItem.label}". ${t("remember_to_save")}`,
    });
  };

  const updateContactItem = (
    id: string,
    field: keyof ContactItem,
    value: string,
  ) => {
    setContactItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const removeContactItem = (id: string) => {
    setContactItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <RoleLayout allowedRoles={["system_admin"]}>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{t("admin_settings")}</h1>
          <p className="text-muted-foreground">
            {t("configure_system")}
          </p>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <div className="w-full overflow-x-auto pb-1">
            <TabsList className="inline-flex min-w-max justify-start gap-2">
              <TabsTrigger value="general" className="shrink-0">
                {t("general")}
              </TabsTrigger>
              <TabsTrigger value="contact" className="shrink-0">
                {t("landing_contact_info")}
              </TabsTrigger>
              <TabsTrigger value="printer" className="shrink-0">
                {t("printer_tab")}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* General Tab */}
          <TabsContent value="general" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("general")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Label>
                        {t("require_approval")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("require_approval_desc")}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.registrationApprovalRequired}
                      onChange={(e) =>
                        update({
                          registrationApprovalRequired: e.target.checked,
                        })
                      }
                      className="toggle"
                    />
                  </div>

                  <div>
                    <Label>{t("default_commission")}</Label>
                    <Input
                      type="number"
                      value={String(settings.defaultCommission)}
                      onChange={(e) =>
                        update({
                          defaultCommission: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label>{t("notification_email")}</Label>
                    <Input
                      type="email"
                      value={settings.notificationEmail}
                      onChange={(e) =>
                        update({ notificationEmail: e.target.value })
                      }
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button onClick={onSave}>{t("save_settings")}</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Landing Contact Info Tab */}
          <TabsContent value="contact" className="mt-4 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t("landing_contacts_title")}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("landing_contacts_desc")}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsAddModalOpen(true)}
                  className="gap-1 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> {t("add_channel")}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Loading skeleton while fetching from DB */}
                  {isLoadingContacts ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="p-4 border rounded-xl flex items-center gap-3 animate-pulse"
                        >
                          <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-muted rounded w-1/3" />
                            <div className="h-4 bg-muted rounded w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {!isLoadingContacts && contactItems.map((item) => {
                    const { Icon, colorClass } = getIconConfig(item.icon);
                    return (
                      <div
                        key={item.id}
                        className="p-4 border rounded-xl bg-card/60 flex flex-col md:flex-row items-start md:items-center gap-3"
                      >
                        {/* Icon preview */}
                        <div
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${colorClass}`}
                          title={`Icon preview: ${item.icon}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Label input */}
                        <div className="flex-1 w-full md:w-auto">
                          <Label className="text-xs text-muted-foreground">{t("label")}</Label>
                          <Input
                            value={item.label}
                            onChange={(e) =>
                              updateContactItem(item.id, "label", e.target.value)
                            }
                            placeholder={t("label_placeholder")}
                          />
                        </div>

                        {/* Icon Dropdown */}
                        <div className="w-full md:w-48">
                          <Label className="text-xs text-muted-foreground">{t("choose_icon")}</Label>
                          <select
                            className="w-full border rounded-md h-10 px-3 text-sm bg-background border-input"
                            value={item.icon}
                            onChange={(e) =>
                              updateContactItem(item.id, "icon", e.target.value)
                            }
                          >
                            {ICON_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Value / Link input */}
                        <div className="flex-[2] w-full md:w-auto">
                          <Label className="text-xs text-muted-foreground">{t("url_contact")}</Label>
                          <Input
                            value={item.value}
                            onChange={(e) =>
                              updateContactItem(item.id, "value", e.target.value)
                            }
                            placeholder={t("url_placeholder")}
                          />
                        </div>

                        {/* Delete button */}
                        <Button
                          variant="outline"
                          size="icon"
                          className="self-end md:self-center shrink-0 text-destructive hover:bg-destructive/10"
                          onClick={() => removeContactItem(item.id)}
                          title={t("remove_channel")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}

                  {!isLoadingContacts && contactItems.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground text-sm border border-dashed rounded-xl space-y-2">
                      <p className="font-medium text-foreground">{t("no_channels")}</p>
                      <p className="text-xs text-muted-foreground">{t("no_channels_desc")}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddModalOpen(true)}
                        className="mt-2 gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> {t("add_first_channel")}
                      </Button>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-4 border-t">
                    <Button onClick={onSaveContacts} disabled={isSavingContacts} className="min-w-[160px]">
                      {isSavingContacts ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t("saving")}
                        </>
                      ) : (
                        t("save_contact_info")
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Printer Tab */}
          <TabsContent value="printer" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("device_printer")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 max-w-xl">
                  <p className="text-sm text-muted-foreground">
                    {t("printnode_configured")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal Dialog for Adding New Contact Channel */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleAddChannelSubmit}>
              <DialogHeader>
                <DialogTitle>{t("add_new_channel")}</DialogTitle>
                <DialogDescription>
                  {t("add_channel_desc")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="channelLabel">{t("channel_label")}</Label>
                  <Input
                    id="channelLabel"
                    placeholder={t("channel_label_placeholder")}
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channelIcon">{t("choose_icon")}</Label>
                  <select
                    id="channelIcon"
                    className="w-full border rounded-md h-10 px-3 text-sm bg-background border-input"
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="channelValue">{t("url_contact")}</Label>
                  <Input
                    id="channelValue"
                    placeholder={t("url_placeholder")}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit">{t("add_contact_channel")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </RoleLayout>
  );
}

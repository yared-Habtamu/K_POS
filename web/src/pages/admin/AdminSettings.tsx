import React from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const KEY = 'pos_admin_settings_v1';

type Settings = {
  registrationApprovalRequired: boolean;
  defaultCommission: number;
  notificationEmail: string;
};

const defaults: Settings = {
  registrationApprovalRequired: true,
  defaultCommission: 2.5,
  notificationEmail: '',
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    return JSON.parse(raw) as Settings;
  } catch (e) {
    return defaults;
  }
}

function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = React.useState<Settings>(() => loadSettings());

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

  const onSave = () => {
    saveSettings(settings);
    toast({ title: 'Settings saved', description: 'Admin settings saved locally.' });
  };

  const onReset = () => {
    setSettings(defaults);
    saveSettings(defaults);
    toast({ title: 'Settings reset', description: 'Reverted to defaults.' });
  };

  return (
    <RoleLayout allowedRoles={["system_admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Admin Settings</h1>
          <p className="text-muted-foreground">Configure system behavior for registrations and notifications (frontend-only).</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 max-w-xl">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require approval for new supermarket registrations</Label>
                  <p className="text-xs text-muted-foreground">When enabled, new shops will be set to pending and require admin approval.</p>
                </div>
                <div>
                  <input
                    type="checkbox"
                    checked={settings.registrationApprovalRequired}
                    onChange={(e) => update({ registrationApprovalRequired: e.target.checked })}
                    className="toggle"
                  />
                </div>
              </div>

              <div>
                <Label>Default Commission Rate (%)</Label>
                <Input type="number" value={String(settings.defaultCommission)} onChange={(e) => update({ defaultCommission: Number(e.target.value) || 0 })} />
              </div>

              <div>
                <Label>Notification Email</Label>
                <Input type="email" value={settings.notificationEmail} onChange={(e) => update({ notificationEmail: e.target.value })} />
              </div>

              <div className="flex gap-2">
                <Button onClick={onSave}>Save Settings</Button>
                <Button variant="ghost" onClick={onReset}>Reset</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}

import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { KeyRound, Moon, Sun, Upload, UserCircle } from "lucide-react";

import { RoleLayout } from "@/components/layout/RoleLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import type { UserRole } from "@/types";

function getRoleLabel(role?: UserRole) {
  switch (role) {
    case "cashier":
      return "cashier";
    case "store_keeper":
      return "store_keeper";
    case "manager":
      return "manager";
    case "owner":
      return "owner";
    case "system_admin":
      return "system_admin";
    default:
      return "unknown";
  }
}

function getInitials(name?: string, username?: string) {
  const source = String(name || username || "U").trim();
  if (!source) return "U";
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  const [fullName, setFullName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profilePictureUrl, setProfilePictureUrl] = useState(user?.profilePictureUrl || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const roleLabel = useMemo(() => t(getRoleLabel(user?.role)), [user?.role, t]);

  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast({
        title: "Image too large",
        description: "Please choose an image smaller than 5MB.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setProfilePictureUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!user?.id || !user?.token) return;

    setIsSavingProfile(true);
    try {
      const payload = {
        name: fullName.trim(),
        username: username.trim(),
        phone: phone.trim(),
        email: email.trim(),
        profilePictureUrl: profilePictureUrl.trim(),
      };

      const res = await fetch(`${API_BASE}/api/auth/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to update profile");
      }

      setUser({
        ...user,
        name: data.name || payload.name,
        username: data.username || payload.username,
        phone: data.phone || payload.phone,
        email: data.email || payload.email,
        profilePictureUrl: data.profilePictureUrl || payload.profilePictureUrl,
      });

      toast({
        title: "Profile updated",
        description: "Your personal information has been saved.",
      });
    } catch (error) {
      toast({
        title: "Failed to update profile",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.token) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Missing password fields",
        description: "Fill in current password, new password, and confirmation.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Confirm the new password exactly.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to change password");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: "Password changed",
        description: "Your password has been updated.",
      });
    } catch (error) {
      toast({
        title: "Failed to change password",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <RoleLayout allowedRoles={["cashier", "store_keeper", "manager", "owner", "system_admin"]}>
      <div className="mx-auto max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('profile_personal_information')}</CardTitle>
            <CardDescription>{t('profile_manage_details')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="h-24 w-24 border border-border">
                {profilePictureUrl ? <AvatarImage src={profilePictureUrl} alt={fullName || username} /> : null}
                <AvatarFallback className="text-lg font-semibold">
                  {getInitials(fullName, username)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{t('profile_picture')}</p>
                  <p className="text-sm text-muted-foreground">{t('profile_picture_optional')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('upload_picture')}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setProfilePictureUrl("")}>{t('remove_picture')}</Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfileImageChange}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-full-name">{t('profile_full_name')}</Label>
                <Input id="profile-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-username">{t('profile_username')}</Label>
                <Input id="profile-username" value={username} onChange={(event) => setUsername(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-phone">{t('profile_phone_number')}</Label>
                <Input id="profile-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">{t('profile_email')}</Label>
                <Input id="profile-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t('profile_email_optional')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="profile-role">{t('profile_role')}</Label>
                <Input id="profile-role" value={roleLabel} readOnly className="bg-muted" />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={handleSaveProfile} disabled={isSavingProfile}>
                <UserCircle className="mr-2 h-4 w-4" />
                {isSavingProfile ? t('saving') : t('save_profile')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('profile_security')}</CardTitle>
            <CardDescription>{t('profile_security_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="current-password">{t('current_password')}</Label>
                <Input id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">{t('new_password')}</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('confirm_password')}</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={handleChangePassword} disabled={isSavingPassword}>
                <KeyRound className="mr-2 h-4 w-4" />
                {isSavingPassword ? t('saving') : t('change_password')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('profile_preferences')}</CardTitle>
            <CardDescription>{t('profile_preferences_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:max-w-xs">
              <div className="space-y-2">
                <Label htmlFor="theme-select">Theme</Label>
                <Select value={theme === "dark" ? "dark" : "light"} onValueChange={setTheme}>
                  <SelectTrigger id="theme-select">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t('light_mode')}</SelectItem>
                    <SelectItem value="dark">{t('dark_mode')}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  <span>{theme === "dark" ? t('dark_mode_active') : t('light_mode_active')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}
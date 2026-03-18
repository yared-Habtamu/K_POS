import React from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { AutoComplete } from "@/components/ui/AutoComplete";

type CountryOption = { id: string; label: string };

const COUNTRY_KEY = "pos_admin_country_options_v1";
const BLOCKED_COUNTRIES = new Set([
  "united states",
  "united states of america",
  "usa",
  "u.s.a",
  "us",
  "u.s",
  "united kingdom",
  "uk",
  "u.k",
  "great britain",
]);

const normalizeCountryValue = (value: string) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ");

const isBlockedCountry = (value: string) =>
  BLOCKED_COUNTRIES.has(normalizeCountryValue(value).toLowerCase());

function loadSavedCountries(): CountryOption[] {
  try {
    const raw = localStorage.getItem(COUNTRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CountryOption[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        id: String(item?.id || item?.label || "").trim(),
        label: normalizeCountryValue(String(item?.label || "")),
      }))
      .filter((item) => item.id && item.label && !isBlockedCountry(item.label));
  } catch {
    return [];
  }
}

function saveCountries(options: CountryOption[]) {
  try {
    localStorage.setItem(COUNTRY_KEY, JSON.stringify(options));
  } catch {
    // ignore storage errors
  }
}

function dedupeCountryOptions(options: CountryOption[]) {
  const seen = new Set<string>();
  const merged: CountryOption[] = [];
  for (const option of options) {
    const normalized = normalizeCountryValue(option.label);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key) || isBlockedCountry(normalized)) continue;
    seen.add(key);
    merged.push({ id: option.id || key, label: normalized });
  }
  return merged;
}

export default function RegisterMart() {
  const { toast } = useToast();
  const token = useAuthStore((s) => s.user?.token);
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const [name, setName] = React.useState("");
  const [owner, setOwner] = React.useState("");
  const [ownerEmail, setOwnerEmail] = React.useState("");
  const [country, setCountry] = React.useState("Ethiopia");
  const [region, setRegion] = React.useState("");
  const [city, setCity] = React.useState("Addis Ababa");
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [countryOptions, setCountryOptions] = React.useState<CountryOption[]>(
    () =>
      dedupeCountryOptions([
        { id: "ethiopia", label: "Ethiopia" },
        { id: "kenya", label: "Kenya" },
        { id: "uganda", label: "Uganda" },
        { id: "tanzania", label: "Tanzania" },
        { id: "rwanda", label: "Rwanda" },
        ...loadSavedCountries(),
      ]),
  );

  React.useEffect(() => {
    let mounted = true;

    const loadCountriesFromMarts = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/api/marts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const marts = await res.json().catch(() => []);
        if (!mounted || !Array.isArray(marts)) return;

        const fromMarts: CountryOption[] = marts
          .map((mart: any) => {
            const label = normalizeCountryValue(String(mart?.country || ""));
            if (!label) return null;
            return { id: label.toLowerCase().replace(/\s+/g, "_"), label };
          })
          .filter(Boolean) as CountryOption[];

        setCountryOptions((current) => {
          const merged = dedupeCountryOptions([...current, ...fromMarts]);
          saveCountries(merged);
          return merged;
        });
      } catch {
        // ignore network errors and keep local options
      }
    };

    void loadCountriesFromMarts();

    return () => {
      mounted = false;
    };
  }, [API_BASE, token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !name.trim() ||
      !owner.trim() ||
      !username.trim() ||
      !password ||
      !confirmPassword
    ) {
      toast({ title: "Mart, owner, username and password are required" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please login again as system admin.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/marts/admin-register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          martName: name.trim(),
          ownerName: owner.trim(),
          ownerUsername: username.trim(),
          ownerPassword: password,
          ownerConfirmPassword: confirmPassword,
          ownerPhone: phone.trim() || undefined,
          phone: phone.trim() || undefined,
          email: ownerEmail.trim() || undefined,
          country: country.trim() || undefined,
          region: region.trim() || undefined,
          city: city.trim() || undefined,
          address: address.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Failed to register mart");
      }

      toast({
        title: "Mart registered",
        description:
          "The mart was created directly in the database and approved.",
      });
      // reset
      setName("");
      setOwner("");
      setOwnerEmail("");
      setPhone("");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setRegion("");
      setCity("Addis Ababa");
      setAddress("");
      setCountry("Ethiopia");
    } catch (err) {
      console.error(err);
      toast({
        title: "Registration failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleLayout allowedRoles={["system_admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Register Your Supermarket</h1>
          <p className="text-muted-foreground">Create a new mart</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New Mart</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl"
            >
              <div>
                <Label>Mart Name</Label>
                <Input
                  placeholder="e.g. Kebele Supermarket"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Owner Name</Label>
                <Input
                  placeholder="Full name"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  placeholder="owner@company.com"
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                />
              </div>
              <div>
                <AutoComplete<CountryOption>
                  id="mart-country-autocomplete"
                  label="Country"
                  placeholder="Select or add country"
                  items={countryOptions}
                  value={country}
                  onValueChange={setCountry}
                  getItemLabel={(item) => item.label}
                  getItemValue={(item) => item.id}
                  onSelect={(item) => setCountry(item.label)}
                  allowCreate
                  onCreateOption={async (query) => {
                    const label = normalizeCountryValue(query);
                    if (!label) return null;
                    if (isBlockedCountry(label)) return null;
                    const option = {
                      id: label.toLowerCase().replace(/\s+/g, "_"),
                      label,
                    };

                    setCountryOptions((current) => {
                      const merged = dedupeCountryOptions([...current, option]);
                      saveCountries(merged);
                      return merged;
                    });

                    setCountry(label);
                    return option;
                  }}
                  createOptionLabel={(q) => `Add "${q}"`}
                />
              </div>
              <div>
                <Label>Region</Label>
                <Input
                  placeholder="Select region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  placeholder="Addis Ababa"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Label>Address</Label>
                <Input
                  placeholder="Street, area"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="+251 9xx xxx xxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <Label>Owner Username</Label>
                <Input
                  placeholder="choose-a-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <Label>Password</Label>
                <Input
                  placeholder="Choose a secure password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input
                  placeholder="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Registering..." : "Register Mart"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setName("");
                    setOwner("");
                    setOwnerEmail("");
                    setCountry("Ethiopia");
                    setRegion("");
                    setCity("Addis Ababa");
                    setAddress("");
                    setPhone("");
                    setUsername("");
                    setPassword("");
                    setConfirmPassword("");
                  }}
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}

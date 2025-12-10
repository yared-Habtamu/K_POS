import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";

export default function RegisterMart() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = React.useState({
    martName: "",
    email: "",
    country: "Ethiopia",
    region: "",
    city: "",
    address: "",
    ownerName: "",
    // single phone input used for both mart and owner (owner will provide it)
    ownerPhone: "",
    ownerUsername: "",
    ownerPassword: "",
    ownerConfirmPassword: "",
  });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      // validate confirm password on client
      if (form.ownerPassword !== form.ownerConfirmPassword) {
        toast({
          title: "Passwords do not match",
          description: "Please ensure both passwords are the same",
          variant: "destructive",
        });
        return;
      }
      const payload = { ...form, phone: form.ownerPhone };
      const res = await fetch(
        (import.meta.env.VITE_API_URL || "") + "/api/marts/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        let msg = "Failed to submit registration.";
        try {
          const body = await res.json();
          if (body && body.message) msg = body.message;
        } catch {}
        // helpful hint when backend not configured
        if (res.status === 404)
          msg += " (backend not found). Check VITE_API_URL or run the backend.";
        throw new Error(msg);
      }
      const body = await res.json();
      const martId = body?.mart?._id || body?.mart?.id;
      toast({
        title: "Request sent",
        description: "Registration request submitted to system admin.",
      });
      // auto-login the owner so their martId is in the auth store and they can manage employees
      try {
        // try to log in automatically using username (from response) or the username owner typed
        const loginName = body?.owner?.username || form.ownerUsername;
        if (loginName) {
          await login(loginName, form.ownerPassword);
        }
      } catch (err) {
        // ignore login error — owner can still login manually
        console.warn("Auto-login failed", err);
      }
      if (martId) navigate(`/owner/register/waiting/${martId}`);
      else navigate("/");
    } catch (err) {
      console.error(err);
      const message = err?.message || "Failed to submit registration.";
      toast({ title: "Error", description: message });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Register Your Supermarket</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3">
            <div>
              <Label>Mart Name</Label>
              <Input
                name="martName"
                value={form.martName}
                onChange={onChange}
                required
                placeholder="e.g. Kebele Supermarket"
                aria-label="Mart Name"
              />
            </div>
            {/* Keep a single phone input (owner provides the contact number) */}
            <div>
              <Label>Email</Label>
              <Input
                name="email"
                value={form.email}
                onChange={onChange}
                type="email"
                placeholder="owner@company.com"
                aria-label="Mart Email"
              />
            </div>
            <div>
              <Label>Country</Label>
              <Input
                name="country"
                value={form.country}
                onChange={onChange}
                placeholder="Ethiopia"
                aria-label="Country"
              />
            </div>
            <div>
              <Label>Region</Label>
              <Select
                value={form.region}
                onValueChange={(v) => setForm({ ...form, region: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Addis Ababa">Addis Ababa</SelectItem>
                  <SelectItem value="Dire Dawa">Dire Dawa</SelectItem>
                  <SelectItem value="Tigray Region">Tigray Region</SelectItem>
                  <SelectItem value="Afar Region">Afar Region</SelectItem>
                  <SelectItem value="Amhara Region">Amhara Region</SelectItem>
                  <SelectItem value="Oromia Region">Oromia Region</SelectItem>
                  <SelectItem value="Somali Region">Somali Region</SelectItem>
                  <SelectItem value="Benishangul-Gumuz Region">
                    Benishangul-Gumuz Region
                  </SelectItem>
                  <SelectItem value="SNNPR">SNNPR</SelectItem>
                  <SelectItem value="Gambela Region">Gambela Region</SelectItem>
                  <SelectItem value="Harari Region">Harari Region</SelectItem>
                  <SelectItem value="Sidama Region">Sidama Region</SelectItem>
                  <SelectItem value="South West Ethiopia Peoples’ Region">
                    South West Ethiopia Peoples’ Region
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>City</Label>
              <Input
                name="city"
                value={form.city}
                onChange={onChange}
                placeholder="Addis Ababa"
                aria-label="City"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                name="address"
                value={form.address}
                onChange={onChange}
                placeholder="Street, area"
                aria-label="Address"
              />
            </div>

            <hr />
            <div>
              <Label>Owner Name</Label>
              <Input
                name="ownerName"
                value={form.ownerName}
                onChange={onChange}
                required
                placeholder="Full name"
                aria-label="Owner Name"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                name="ownerPhone"
                value={form.ownerPhone}
                onChange={onChange}
                required
                placeholder="+251 9xx xxx xxx"
                aria-label="Phone"
              />
            </div>
            <div>
              <Label>Owner Username</Label>
              <Input
                name="ownerUsername"
                value={form.ownerUsername}
                onChange={onChange}
                required
                placeholder="choose-a-username"
                aria-label="Owner Username"
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                name="ownerPassword"
                value={form.ownerPassword}
                onChange={onChange}
                type="password"
                required
                placeholder="Choose a secure password"
                aria-label="Password"
              />
            </div>
            <div>
              <Label>Confirm Password</Label>
              {/* add live matching feedback: green if matches, red if mismatched */}
              <Input
                name="ownerConfirmPassword"
                value={form.ownerConfirmPassword}
                onChange={onChange}
                type="password"
                required
                placeholder="Confirm password"
                aria-label="Confirm Password"
                className={
                  form.ownerConfirmPassword.length === 0
                    ? ""
                    : form.ownerPassword === form.ownerConfirmPassword
                    ? "ring-2 ring-green-400/60 border-green-400"
                    : "ring-2 ring-red-400/60 border-red-400"
                }
              />
              {form.ownerConfirmPassword.length > 0 && (
                <p
                  className={`text-xs mt-1 ${
                    form.ownerPassword === form.ownerConfirmPassword
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {form.ownerPassword === form.ownerConfirmPassword
                    ? "Passwords match"
                    : "Passwords do not match"}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                title="Send Registration"
                aria-label="Send Registration"
              >
                Send Registration
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

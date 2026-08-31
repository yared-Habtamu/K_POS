import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AutoComplete } from "@/components/ui/AutoComplete";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SuccessModal } from "@/components/ui/SuccessModal";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { defaultPhoneCountries } from "@/lib/input-formatting";
import { ArrowLeft, Loader2 } from "lucide-react";

type CountryOption = {
  id: string;
  name: string;
};

export default function RegisterMart() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [countryOptions, setCountryOptions] = React.useState<CountryOption[]>(
    () => {
      const names = Array.from(
        new Set(defaultPhoneCountries.map((country) => country.name.trim())),
      );
      return names.map((name) => ({
        id: name.toLowerCase().replace(/\s+/g, "-"),
        name,
      }));
    },
  );
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
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

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

      setIsSubmitting(true);
      const locationState = location.state || {};
      const payload = {
        ...form,
        phone: form.ownerPhone,
        packageMonths: locationState.packageMonths ?? 1,
        packageName: locationState.packageName || "1 Month",
        packagePrice: locationState.packagePrice ?? 1000,
        scannersCount: locationState.scannersCount || 0,
        printersCount: locationState.printersCount || 0,
        scannerUnitPrice: locationState.scannerUnitPrice || 20000,
        printerUnitPrice: locationState.printerUnitPrice || 30000,
      };
      const res = await fetch(
        (import.meta.env.VITE_API_URL || "") + "/api/marts/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        let msg = "Failed to submit registration.";
        let parsedBody: any = null;
        try {
          parsedBody = await res.json();
          if (parsedBody && parsedBody.message) msg = parsedBody.message;
        } catch {}

        // Duplicate values should be handled as a validation notifier, not a scary error.
        if (res.status === 409) {
          const duplicates = Array.isArray(parsedBody?.duplicates)
            ? parsedBody.duplicates.join(", ")
            : "one or more fields";

          toast({
            title: "Please update duplicate fields",
            description: `This registration already uses: ${duplicates}. Change them and try again.`,
            duration: 6000,
          });
          return;
        }

        // helpful hint when backend not configured
        if (res.status === 404)
          msg += " (backend not found). Check VITE_API_URL or run the backend.";
        throw new Error(msg);
      }
      const body = await res.json();
      const martId = body?.mart?._id || body?.mart?.id;
      // auto-login the owner so their martId is in the auth store and they can manage employees
      try {
        const loginName = body?.owner?.username || form.ownerUsername;
        if (loginName) {
          await login(loginName, form.ownerPassword);
        }
      } catch (err) {
        console.warn("Auto-login failed", err);
      }

      toast({
        title: "Registration Complete",
        description: "Proceeding to checkout for payment & screenshot upload.",
      });

      navigate("/checkout", {
        state: {
          martId,
          martName: form.martName,
          ownerPhone: form.ownerPhone,
          packageName: locationState.packageName || "1 Month",
          packageMonths: locationState.packageMonths ?? 1,
          packagePrice: locationState.packagePrice ?? 1000,
          scannersCount: locationState.scannersCount || 0,
          printersCount: locationState.printersCount || 0,
          scannerUnitPrice: locationState.scannerUnitPrice || 20000,
          printerUnitPrice: locationState.printerUnitPrice || 30000,
        },
      });
    } catch (err) {
      console.error(err);
      const message = err?.message || "Failed to submit registration.";
      toast({ title: "Registration not submitted", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessOpen(false);
    navigate("/");
  };

  const locationState = location.state || {};
  const hasSubSelection = Boolean(locationState.packageName);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2 text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      </div>

      {hasSubSelection && (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4 flex items-center justify-between text-sm">
            <div>
              <p className="font-bold text-emerald-900">Selected Plan: {locationState.packageName}</p>
              <p className="text-xs text-emerald-700">
                {(locationState.scannersCount || 0) > 0 ? `${locationState.scannersCount} Scanner(s) ` : ""}
                {(locationState.printersCount || 0) > 0 ? `${locationState.printersCount} Printer(s)` : ""}
              </p>
            </div>
            <p className="font-extrabold text-base text-emerald-700">
              {(() => {
                const total = (locationState.packagePrice ?? 1000) + (locationState.scannersCount || 0) * 20000 + (locationState.printersCount || 0) * 30000;
                return total === 0 ? "Free" : `${total.toLocaleString()} ETB`;
              })()}
            </p>
          </CardContent>
        </Card>
      )}

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
              <AutoComplete<CountryOption>
                id="country-autocomplete"
                items={countryOptions}
                getItemLabel={(item) => item.name}
                getItemValue={(item) => item.id}
                value={form.country}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, country: value }))
                }
                onSelect={(item) =>
                  setForm((prev) => ({ ...prev, country: item.name }))
                }
                placeholder="Select or type country"
                allowCreate
                onCreateOption={(query) => {
                  const trimmed = query.trim();
                  if (!trimmed) return null;

                  const created = {
                    id: trimmed.toLowerCase().replace(/\s+/g, "-"),
                    name: trimmed,
                  };

                  setCountryOptions((current) => {
                    if (
                      current.some(
                        (item) =>
                          item.name.toLowerCase() === trimmed.toLowerCase(),
                      )
                    ) {
                      return current;
                    }
                    return [...current, created];
                  });

                  return created;
                }}
                createOptionLabel={(query) => `Use "${query}"`}
                noResultsMessage="No country found"
                emptyQueryMessage="Type to search countries"
                name="country"
                inputClassName="h-10"
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

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                size="lg"
                title="Proceed to Checkout"
                aria-label="Proceed to Checkout"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-semibold shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Proceed to Checkout"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <SuccessModal
        isOpen={successOpen}
        onClose={handleCloseSuccess}
        title="Registration Submitted"
        message="Your registration request was sent successfully."
        details={
          <div className="space-y-3 text-left">
            <p>It is now under system admin review.</p>
            <div>
              <p className="font-medium">Need help?</p>
              <p>Email: support@smartpos.example</p>
              <p>Phone: +251-936-092-577</p>
            </div>
          </div>
        }
        confirmLabel="Back to Home"
      />
    </div>
  );
}

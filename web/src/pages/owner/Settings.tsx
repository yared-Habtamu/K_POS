import { useState } from "react";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';

export default function OwnerSettings() {
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [slogan, setSlogan] = useState("");
  const [currency, setCurrency] = useState("");
  const [paymentSystem, setPaymentSystem] = useState("");
  const [tax, setTax] = useState("");
  const { toast } = useToast();

  const saveBranding = () => {
    toast({ title: 'Branding saved' });
  };

  const savePayments = () => {
    toast({ title: 'Payment settings saved' });
  };

  const saveTax = () => {
    toast({ title: 'Tax settings saved' });
  };

  return (
    <RoleLayout allowedRoles={["owner"]}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Branding Section */}
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium">Supermarket Name</p>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" className="mt-2" />
              </div>

              <div>
                <p className="text-sm font-medium">Logo</p>
                <Input type="file" accept="image/*" onChange={e => setLogo(e.target.files?.[0]?.name ?? null)} className="mt-2" />
                {logo && <div className="mt-2 text-xs">Selected: {logo}</div>}
              </div>

              <div>
                <p className="text-sm font-medium">Slogan</p>
                <Input value={slogan} onChange={e => setSlogan(e.target.value)} placeholder="Enter slogan" className="mt-2" />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={saveBranding}>Save Branding</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments & Currency Section */}
        <Card>
          <CardHeader>
            <CardTitle>Payments & Currency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium">Currency</p>
                <Input value={currency} onChange={e => setCurrency(e.target.value)} placeholder="ETB, USD, etc." className="mt-2" />
              </div>

              <div>
                <p className="text-sm font-medium">Payment System</p>
                <Input value={paymentSystem} onChange={e => setPaymentSystem(e.target.value)} placeholder="e.g. CBE, Telebirr, Amole" className="mt-2" />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={savePayments}>Save Payment Settings</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Section */}
        <Card>
          <CardHeader>
            <CardTitle>Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium">Tax Setting (%)</p>
                <Input type="number" value={tax} onChange={e => setTax(e.target.value)} placeholder="Enter tax rate" className="mt-2 w-44" />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={saveTax}>Save Tax</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}

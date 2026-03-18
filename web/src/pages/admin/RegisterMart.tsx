import React from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type NewShop = {
  id: string;
  name: string;
  owner: string;
  ownerEmail?: string;
  country?: string;
  region?: string;
  city?: string;
  status?: 'pending' | 'active';
};

const KEY = 'pos_admin_shops_v1';

function loadShops(): NewShop[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as NewShop[];
  } catch {
    return [];
  }
}

function saveShop(s: NewShop) {
  try {
    const list = loadShops();
    list.push(s);
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    // ignore
  }
}

export default function RegisterMart() {
  const { toast } = useToast();
  const [name, setName] = React.useState('');
  const [owner, setOwner] = React.useState('');
  const [ownerEmail, setOwnerEmail] = React.useState('');
  const [country, setCountry] = React.useState('Ethiopia');
  const [region, setRegion] = React.useState('');
  const [city, setCity] = React.useState('Addis Ababa');
  const [address, setAddress] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !owner.trim()) {
      toast({ title: 'Name and owner are required' });
      return;
    }
    setSubmitting(true);
    try {
      const shop: NewShop = {
        id: `shop-${Date.now()}`,
        name: name.trim(),
        owner: owner.trim(),
        ownerEmail: ownerEmail.trim() || undefined,
        country: country || undefined,
        region: region || undefined,
        city: city || undefined,
        status: 'pending',
      };
      // persist locally so admin can see it in MartManagement
      saveShop(shop);
      toast({ title: 'Mart registered', description: 'The mart was added (pending approval).' });
      // reset
      setName('');
      setOwner('');
      setOwnerEmail('');
      setRegion('');
      setCity('');
    } catch (err) {
      console.error(err);
      toast({ title: 'Registration failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleLayout allowedRoles={["system_admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Register Your Supermarket</h1>
          <p className="text-muted-foreground">Create a new mart (frontend-only registration). It will appear in the Mart Management list.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New Mart</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl">
              <div>
                <Label>Mart Name</Label>
                <Input placeholder="e.g. Kebele Supermarket" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <Label>Owner Name</Label>
                <Input placeholder="Full name" value={owner} onChange={(e) => setOwner(e.target.value)} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input placeholder="owner@company.com" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
              <div>
                <Label>Region</Label>
                <Input placeholder="Select region" value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
              <div>
                <Label>City</Label>
                <Input placeholder="Addis Ababa" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>

              <div className="md:col-span-2">
                <Label>Address</Label>
                <Input placeholder="Street, area" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>

              <div>
                <Label>Phone</Label>
                <Input placeholder="+251 9xx xxx xxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <Label>Owner Username</Label>
                <Input placeholder="choose-a-username" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>

              <div>
                <Label>Password</Label>
                <Input placeholder="Choose a secure password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input placeholder="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={submitting}>{submitting ? 'Registering...' : 'Register Mart'}</Button>
                <Button variant="ghost" onClick={() => { setName(''); setOwner(''); setOwnerEmail(''); setCountry('Ethiopia'); setRegion(''); setCity('Addis Ababa'); setAddress(''); setPhone(''); setUsername(''); setPassword(''); setConfirmPassword(''); }}>Reset</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}

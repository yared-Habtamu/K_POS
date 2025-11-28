import React from 'react';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoreHorizontal, CheckCircle, XCircle, Trash, Edit2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

  type Shop = {
  id: string;
  name: string;
  owner: string;
  status: 'active' | 'pending' | 'suspended' | 'rejected';
  sales: number;
  users: number;
  permissions?: string[];
  address?: {
    country?: string;
    region?: string;
    city?: string;
  };
};

const DEFAULT_KEY = 'pos_admin_shops_v1';

const initialShops: Shop[] = [
  { id: '1', name: 'Kiya Supermarket', owner: 'Abebe Kebede', status: 'active', sales: 156420, users: 8, permissions: ['owner'], address: { country: 'Ethiopia', region: 'Addis Ababa', city: 'Addis Ababa' } },
  { id: '2', name: 'Habesha Mart', owner: 'Sara Bekele', status: 'active', sales: 98750, users: 5, permissions: ['owner'], address: { country: 'Ethiopia', region: 'Oromia', city: 'Adama' } },
  { id: '3', name: 'Addis Groceries', owner: 'Yonas Gebre', status: 'pending', sales: 0, users: 2, permissions: [], address: { country: 'Ethiopia', region: 'Amhara', city: 'Bahir Dar' } },
  { id: '4', name: 'Ethio Retail', owner: 'Tigist Haile', status: 'active', sales: 67890, users: 4, permissions: ['owner'], address: { country: 'Ethiopia', region: 'Tigray', city: 'Mekelle' } },
  { id: '5', name: 'Unity Store', owner: 'Dawit Tadesse', status: 'suspended', sales: 34500, users: 3, permissions: [], address: { country: 'Ethiopia', region: 'Southern Nations', city: 'Hawassa' } },
  // Additional pending shops for testing
  { id: '6', name: 'Beta Mart', owner: 'Mesfin Alem', status: 'pending', sales: 0, users: 1, permissions: [], address: { country: 'Ethiopia', region: 'Gambela', city: 'Gambela' } },
  { id: '7', name: 'Gamma Grocers', owner: 'Lensa Kassa', status: 'pending', sales: 0, users: 2, permissions: [], address: { country: 'Ethiopia', region: 'Sidama', city: 'Dilla' } },
  { id: '8', name: 'Delta Supplies', owner: 'Fikru Solomon', status: 'pending', sales: 0, users: 1, permissions: [], address: { country: 'Ethiopia', region: 'Benishangul', city: 'Assosa' } },
  { id: '9', name: 'Epsilon Foods', owner: 'Helen Tadesse', status: 'pending', sales: 0, users: 3, permissions: [], address: { country: 'Ethiopia', region: 'Harari', city: 'Harar' } },
  { id: '10', name: 'Zeta Convenience', owner: 'Kebede Abiy', status: 'pending', sales: 0, users: 1, permissions: [], address: { country: 'Ethiopia', region: 'Somali', city: 'Jijiga' } },
  // Five more pending shops
  { id: '11', name: 'Eta Market', owner: 'Martha Solomon', status: 'pending', sales: 0, users: 2, permissions: [], address: { country: 'Ethiopia', region: 'Afar', city: 'Semera' } },
  { id: '12', name: 'Theta Foods', owner: 'Samuel Mekonnen', status: 'pending', sales: 0, users: 1, permissions: [], address: { country: 'Ethiopia', region: 'Benishangul', city: 'Asosa' } },
  { id: '13', name: 'Iota Grocers', owner: 'Aster Yohannes', status: 'pending', sales: 0, users: 2, permissions: [], address: { country: 'Ethiopia', region: 'Sidama', city: 'Yirga Alem' } },
  { id: '14', name: 'Kappa Supplies', owner: 'Bekele Hailu', status: 'pending', sales: 0, users: 1, permissions: [], address: { country: 'Ethiopia', region: 'Gambela', city: 'Gambela' } },
  { id: '15', name: 'Lambda Store', owner: 'Selamawit Desta', status: 'pending', sales: 0, users: 1, permissions: [], address: { country: 'Ethiopia', region: 'Addis Ababa', city: 'Addis Ababa' } },
];

function loadShops(): Shop[] {
  try {
    const raw = localStorage.getItem(DEFAULT_KEY);
    if (!raw) return initialShops;
    const stored = (JSON.parse(raw) as Shop[]) || [];
    // Merge seeded initialShops into stored entries, filling missing address fields
    const storedMap = new Map<string, Shop>(stored.map((s) => [s.id, s]));

    // Build result preserving initialShops order, preferring stored values but
    // filling missing nested address fields from the seeded initialShops.
    const merged: Shop[] = initialShops.map((seed) => {
      const existing = storedMap.get(seed.id);
      if (!existing) return seed;

      const mergedAddress = {
        ...(seed.address || {}),
        ...(existing.address || {}),
      };

      return {
        ...seed,
        ...existing,
        address: mergedAddress,
      } as Shop;
    });

    // Append any stored entries that were not in the seed list
    stored.forEach((s) => {
      if (!initialShops.find((seed) => seed.id === s.id)) merged.push(s);
    });

    return merged;
  } catch (e) {
    return initialShops;
  }
}

function saveShops(shops: Shop[]) {
  localStorage.setItem(DEFAULT_KEY, JSON.stringify(shops));
}

export default function MartManagement() {
  const [shops, setShops] = React.useState<Shop[]>(() => loadShops());
  const { toast } = useToast();
  const [filter, setFilter] = React.useState<'all' | 'active' | 'pending' | 'suspended' | 'rejected'>('all');

  const filteredShops = React.useMemo(() => {
    if (filter === 'all') return shops;
    return shops.filter((s) => s.status === filter);
  }, [shops, filter]);

  React.useEffect(() => {
    saveShops(shops);
  }, [shops]);

  const approveShop = (id: string) => {
    setShops((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, status: 'active', permissions: s.permissions && s.permissions.length ? s.permissions : ['owner'] }
          : s,
      ),
    );
    toast({ title: 'Shop approved', description: 'The shop has been approved and owner permission assigned.' });
  };

  const suspendShop = (id: string) => {
    if (!window.confirm('Suspend this shop?')) return;
    setShops((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'suspended' } : s)));
    toast({ title: 'Shop suspended', description: 'The shop has been suspended.' });
  };

  const unsuspendShop = (id: string) => {
    if (!window.confirm('Unsuspend this shop?')) return;
    setShops((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'active' } : s)));
    toast({ title: 'Shop unsuspended', description: 'The shop is active again.' });
  };

  const deleteShop = (id: string) => {
    if (!window.confirm('Delete this shop? This action is irreversible.')) return;
    setShops((prev) => prev.filter((s) => s.id !== id));
    toast({ title: 'Shop deleted', description: 'Shop removed from registry.' });
  };

  const editShop = (id: string) => {
    const shop = shops.find((s) => s.id === id);
    if (!shop) return;
    const newName = window.prompt('Shop name', shop.name) || shop.name;
    const newOwner = window.prompt('Owner name', shop.owner) || shop.owner;
    const newCountry = window.prompt('Country', shop.address?.country || 'Ethiopia') || (shop.address?.country ?? '');
    const newRegion = window.prompt('Region', shop.address?.region || '') || (shop.address?.region ?? '');
    const newCity = window.prompt('City', shop.address?.city || '') || (shop.address?.city ?? '');
    setShops((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, name: newName, owner: newOwner, address: { country: newCountry, region: newRegion, city: newCity } }
          : s,
      ),
    );
    toast({ title: 'Shop updated', description: 'Shop information saved locally.' });
  };

  const rejectShop = (id: string) => {
    if (!window.confirm('Reject this shop registration?')) return;
    setShops((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'rejected' } : s)));
    toast({ title: 'Shop rejected', description: 'The shop registration was rejected.' });
  };

  return (
    <RoleLayout allowedRoles={["system_admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mart Management</h1>
          <p className="text-muted-foreground">Approve or reject new supermarket registrations; update or delete existing shops.</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant={filter === 'all' ? undefined : 'ghost'} onClick={() => setFilter('all')}>All <span className="ml-2 text-xs text-muted-foreground">{shops.length}</span></Button>
          <Button size="sm" variant={filter === 'active' ? undefined : 'ghost'} onClick={() => setFilter('active')}>Active <span className="ml-2 text-xs text-muted-foreground">{shops.filter(s=>s.status==='active').length}</span></Button>
          <Button size="sm" variant={filter === 'pending' ? undefined : 'ghost'} onClick={() => setFilter('pending')}>Pending <span className="ml-2 text-xs text-muted-foreground">{shops.filter(s=>s.status==='pending').length}</span></Button>
          <Button size="sm" variant={filter === 'suspended' ? undefined : 'ghost'} onClick={() => setFilter('suspended')}>Suspended <span className="ml-2 text-xs text-muted-foreground">{shops.filter(s=>s.status==='suspended').length}</span></Button>
          <Button size="sm" variant={filter === 'rejected' ? undefined : 'ghost'} onClick={() => setFilter('rejected')}>Rejected <span className="ml-2 text-xs text-muted-foreground">{shops.filter(s=>s.status==='rejected').length}</span></Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">Registered Supermarkets <Badge variant="secondary">{shops.length}</Badge></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShops.map((shop) => (
                    <TableRow key={shop.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">{shop.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{shop.name}</div>
                            <div className="text-xs text-muted-foreground">{(shop.permissions||[]).join(', ') || 'No perms'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{shop.owner}</TableCell>
                      <TableCell>
                        {shop.status === 'active' && <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="w-3 h-3 mr-1"/> Active</Badge>}
                        {shop.status === 'pending' && <Badge className="bg-warning/10 text-warning border-warning/20"><span className="mr-1">⏳</span> Pending</Badge>}
                        {shop.status === 'suspended' && <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1"/> Suspended</Badge>}
                        {shop.status === 'rejected' && <Badge className="bg-destructive/10 text-destructive border-destructive/20"><XCircle className="w-3 h-3 mr-1"/> Rejected</Badge>}
                      </TableCell>
                      <TableCell>
                        {shop.address ? (
                          <div className="text-sm">
                            <div>{shop.address.city || '-'}</div>
                            <div className="text-xs text-muted-foreground">{shop.address.region || '-'}, {shop.address.country || '-'}</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-center"><Badge variant="outline">{shop.users}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {shop.status === 'pending' && (
                            <>
                              <Button size="sm" onClick={() => approveShop(shop.id)}>Approve</Button>
                              <Button variant="ghost" size="sm" onClick={() => rejectShop(shop.id)}>Reject</Button>
                            </>
                          )}
                          {shop.status === 'active' && (
                            <Button variant="destructive" size="sm" onClick={() => suspendShop(shop.id)}>Suspend</Button>
                          )}
                          {shop.status === 'suspended' && (
                            <Button size="sm" onClick={() => unsuspendShop(shop.id)}>Unsuspend</Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => editShop(shop.id)}><Edit2 className="w-4 h-4"/></Button>
                          <Button variant="destructive" size="sm" onClick={() => deleteShop(shop.id)}><Trash className="w-4 h-4"/></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}

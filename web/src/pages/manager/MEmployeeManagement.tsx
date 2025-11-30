// src/pages/employees/ManagerEmployeeManagement.tsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Clock,
  Phone,
  DollarSign,
  UserCog,
} from 'lucide-react';
import type { UserRole } from '@/types';

/** Manager can only assign these roles */
type ManagerAssignableRole = 'cashier' | 'store_keeper';

const mockEmployees = [
  { id: '1', name: 'Tigist Haile', phone: '+251922345678', role: 'cashier' as UserRole, salary: 15000, status: 'active' },
  { id: '2', name: 'Dawit Tadesse', phone: '+251933456789', role: 'cashier' as UserRole, salary: 8000, status: 'active' },
  { id: '3', name: 'Mulugeta Assefa', phone: '+251944567890', role: 'store_keeper' as UserRole, salary: 9000, status: 'active' },
  { id: '4', name: 'Sara Bekele', phone: '+251955678901', role: 'cashier' as UserRole, salary: 8000, status: 'active' },
  { id: '5', name: 'Yonas Gebre', phone: '+251966789012', role: 'cashier' as UserRole, salary: 8000, status: 'inactive' },
];

export default function ManagerEmployeeManagement() {
  const { t } = useTranslation();

  const [employees, setEmployees] = useState(mockEmployees);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<typeof mockEmployees[0] | null>(null);

  // Permission state: { [userId]: { discount: boolean } }
  const [permissions, setPermissions] = useState<Record<string, { discount: boolean }>>(() => {
    const initial: Record<string, { discount: boolean }> = {};
    mockEmployees.forEach(emp => {
      if (emp.role === 'cashier' || emp.role === 'store_keeper') {
        initial[emp.id] = { discount: false };
      }
    });
    return initial;
  });

  const [form, setForm] = useState({
    name: '',
    phone: '',
    role: 'cashier' as ManagerAssignableRole,
    salary: '',
    password: '',
  });

  const filteredEmployees = employees.filter((e) => {
    // Hide managers from manager's view
    if (e.role === 'manager') return false;
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search);
    const matchRole = roleFilter === 'all' || e.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Initialize permissions when employees change
  useEffect(() => {
    const initial: Record<string, { discount: boolean }> = {};
    filteredEmployees.forEach(emp => {
      initial[emp.id] = permissions[emp.id] || { discount: false };
    });
    setPermissions(initial);
  }, [filteredEmployees]);

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      role: 'cashier',
      salary: '',
      password: '',
    });
    setEditingEmployee(null);
  };

  const handleEdit = (employee: typeof mockEmployees[0]) => {
    const safeRole = (employee.role === 'cashier' || employee.role === 'store_keeper')
      ? (employee.role as ManagerAssignableRole)
      : 'cashier';

    setEditingEmployee(employee);
    setForm({
      name: employee.name,
      phone: employee.phone,
      role: safeRole,
      salary: String(employee.salary),
      password: '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setEmployees(employees.filter((e) => e.id !== id));
    // Clean up permissions
    setPermissions(prev => {
      const newPerms = { ...prev };
      delete newPerms[id];
      return newPerms;
    });
    toast({ title: 'Employee deleted successfully' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.phone || !form.salary) {
      toast({ title: 'Please fill required fields' });
      return;
    }

    if (editingEmployee) {
      setEmployees(employees.map(emp =>
        emp.id === editingEmployee.id
          ? { ...emp, name: form.name, phone: form.phone, role: form.role as UserRole, salary: Number(form.salary) }
          : emp
      ));
      toast({ title: 'Employee updated successfully' });
    } else {
      const newEmployee = {
        id: Date.now().toString(),
        name: form.name,
        phone: form.phone,
        role: form.role as UserRole,
        salary: Number(form.salary),
        status: 'active' as const,
      };
      setEmployees([...employees, newEmployee]);
      // Initialize new employee permissions
      setPermissions(prev => ({
        ...prev,
        [newEmployee.id]: { discount: false }
      }));
      toast({ title: t('employee_added') });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleClockIn = (id: string) => {
    toast({ title: 'Clocked In', description: 'Attendance recorded' });
  };

  const toggleDiscountPermission = (employeeId: string, value: boolean) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    setPermissions(prev => ({
      ...prev,
      [employeeId]: { discount: value }
    }));

    toast({
      title: `Discount permission ${value ? 'enabled' : 'disabled'} for ${employee.name}`
    });
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'manager': return 'default';
      case 'cashier': return 'secondary';
      case 'store_keeper': return 'outline';
      default: return 'secondary';
    }
  };

  const roleOptions: ManagerAssignableRole[] = ['cashier', 'store_keeper'];

  // Get subordinates for permission section
  const cashiers = filteredEmployees.filter(e => e.role === 'cashier');
  const storeKeepers = filteredEmployees.filter(e => e.role === 'store_keeper');

  return (
    <RoleLayout allowedRoles={['manager']}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('employees')}</h1>
            <p className="text-muted-foreground">Manage your team members</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('add_employee')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEmployee ? 'Edit Employee' : t('add_employee')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('employee_name')} *</Label>
                  <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phone')} *</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+251..." required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">{t('role')} *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as ManagerAssignableRole })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_role')} />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map(role => (
                        <SelectItem key={role} value={role}>{t(role)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">{t('salary')} (ETB) *</Label>
                  <Input id="salary" type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} required />
                </div>
                {!editingEmployee && (
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('password')} *</Label>
                    <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                  <Button type="submit">{t('save')}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {roleOptions.map(role => (
                    <SelectItem key={role} value={role}>{t(role)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('employees')}
              <Badge variant="secondary" className="ml-2">{filteredEmployees.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('employee_name')}</TableHead>
                    <TableHead>{t('phone')}</TableHead>
                    <TableHead>{t('role')}</TableHead>
                    <TableHead className="text-right">{t('salary')}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(e.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{e.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />{e.phone}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(e.role)}>{t(e.role)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          {e.salary.toLocaleString()} ETB
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={e.status === 'active' ? 'secondary' : 'outline'}>{e.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleClockIn(e.id)}><Clock className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(e)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* PERMISSIONS SECTION */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Manage Team Permissions
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Control what actions your team members can perform in the POS system.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Storekeepers Section */}
            {storeKeepers.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Store Keeper Permissions</p>
                <p className="text-xs text-muted-foreground mb-3">Assign warehouse permissions</p>
                <div className="space-y-3">
                  {storeKeepers.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{emp.name}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">Apply Discounts</span>
                        <Switch
                          checked={!!permissions[emp.id]?.discount}
                          onCheckedChange={(v) => toggleDiscountPermission(emp.id, v)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cashiers Section */}
            {cashiers.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Cashier Permissions</p>
                <p className="text-xs text-muted-foreground mb-3">Assign front-desk permissions</p>
                <div className="space-y-3">
                  {cashiers.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{emp.name}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">Apply Discounts</span>
                        <Switch
                          checked={!!permissions[emp.id]?.discount}
                          onCheckedChange={(v) => toggleDiscountPermission(emp.id, v)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {storeKeepers.length === 0 && cashiers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No team members to manage permissions for.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
}
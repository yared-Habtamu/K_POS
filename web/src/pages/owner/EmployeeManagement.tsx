import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { RoleLayout } from '@/components/layout/RoleLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import type { UserRole } from '@/types';

// Mock employees
const mockEmployees = [
  { id: '1', name: 'Tigist Haile', phone: '+251922345678', role: 'manager' as UserRole, salary: 15000, status: 'active' },
  { id: '2', name: 'Dawit Tadesse', phone: '+251933456789', role: 'cashier' as UserRole, salary: 8000, status: 'active' },
  { id: '3', name: 'Mulugeta Assefa', phone: '+251944567890', role: 'store_keeper' as UserRole, salary: 9000, status: 'active' },
  { id: '4', name: 'Sara Bekele', phone: '+251955678901', role: 'cashier' as UserRole, salary: 8000, status: 'active' },
  { id: '5', name: 'Yonas Gebre', phone: '+251966789012', role: 'cashier' as UserRole, salary: 8000, status: 'inactive' },
];

export default function EmployeeManagement() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState(mockEmployees);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<typeof mockEmployees[0] | null>(null);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    role: 'cashier' as UserRole,
    salary: '',
    password: '',
  });

  const filteredEmployees = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search);
    const matchRole = roleFilter === 'all' || e.role === roleFilter;
    return matchSearch && matchRole;
  });

  const resetForm = () => {
    setForm({ name: '', phone: '', role: 'cashier', salary: '', password: '' });
    setEditingEmployee(null);
  };

  const handleEdit = (employee: typeof mockEmployees[0]) => {
    setEditingEmployee(employee);
    setForm({
      name: employee.name,
      phone: employee.phone,
      role: employee.role,
      salary: employee.salary.toString(),
      password: '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setEmployees(employees.filter(e => e.id !== id));
    toast({ title: 'Employee deleted successfully' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingEmployee) {
      setEmployees(employees.map(emp =>
        emp.id === editingEmployee.id
          ? { ...emp, name: form.name, phone: form.phone, role: form.role, salary: parseInt(form.salary) }
          : emp
      ));
      toast({ title: 'Employee updated successfully' });
    } else {
      const newEmployee = {
        id: Date.now().toString(),
        name: form.name,
        phone: form.phone,
        role: form.role,
        salary: parseInt(form.salary),
        status: 'active' as const,
      };
      setEmployees([...employees, newEmployee]);
      toast({ title: t('employee_added') });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleClockIn = (id: string) => {
    toast({ title: 'Clocked In', description: 'Attendance recorded' });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'manager': return 'default';
      case 'cashier': return 'secondary';
      case 'store_keeper': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <RoleLayout allowedRoles={['owner', 'manager']}>
      <div className="space-y-6">
        {/* Header */}
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
                <DialogTitle>
                  {editingEmployee ? 'Edit Employee' : t('add_employee')}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('employee_name')} *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phone')} *</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+251..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">{t('role')} *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">{t('manager')}</SelectItem>
                      <SelectItem value="cashier">{t('cashier')}</SelectItem>
                      <SelectItem value="store_keeper">{t('store_keeper')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">{t('salary')} (ETB) *</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={form.salary}
                    onChange={(e) => setForm({ ...form, salary: e.target.value })}
                    required
                  />
                </div>
                {!editingEmployee && (
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('password')} *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required={!editingEmployee}
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button type="submit">{t('save')}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="manager">{t('manager')}</SelectItem>
                  <SelectItem value="cashier">{t('cashier')}</SelectItem>
                  <SelectItem value="store_keeper">{t('store_keeper')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
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
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {getInitials(employee.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{employee.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {employee.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(employee.role)}>
                          {t(employee.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          {employee.salary.toLocaleString()} ETB
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.status === 'active' ? 'secondary' : 'outline'}>
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleClockIn(employee.id)}>
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(employee)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(employee.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

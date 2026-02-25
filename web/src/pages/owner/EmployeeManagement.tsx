// src/pages/owner/EmployeeManagement.tsx
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/stores/authStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  DollarSign,
  UserCog,
  Download,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { UserRole } from '@/types';

// ✅ PDF Dependencies (install: npm install jspdf html2canvas)
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  createAttendance,
  deleteAttendance,
  fetchAttendance,
  updateAttendance,
  type AttendanceApiRecord,
} from '@/lib/api/attendance';

// Owner-managed employees are fetched from backend

const ALL_ROLES: UserRole[] = ['manager', 'cashier', 'store_keeper'];

const formatDateKey = (date: Date) => date.toISOString().split('T')[0];
const toDateTimeLocal = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName?: string;
  clockIn: string; // ISO
  clockOut: string | null;
  durationMinutes: number | null;
  date: string; // YYYY-MM-DD
};

const ITEMS_PER_PAGE = 7; // ✅ 7 items per page

export default function OwnerEmployeeManagement(): JSX.Element {
  const { t } = useTranslation();

  const { user } = useAuthStore();
  const token = user?.token;
  const martId = user?.martId;

  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Attendance state
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance'>('employees');

  // Permission state
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});

  const [form, setForm] = useState({
    username: '',
    name: '',
    phone: '',
    role: 'manager' as UserRole,
    salary: '',
    password: '',
    confirmPassword: '',
  });

  // Attendance filter
  const [attendanceFilter, setAttendanceFilter] = useState({
    employeeId: 'all',
    dateRange: 'today' as 'today' | 'this-week' | 'this-month' | 'custom',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Manual entry form
  const [manualEntry, setManualEntry] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    clockIn: '',
    clockOut: '',
  });
  const [manualEditingId, setManualEditingId] = useState<string | null>(null);

  // Attendance edit subpage
  const [editSubpageOpen, setEditSubpageOpen] = useState(false);
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(null);
  const [attendanceEditForm, setAttendanceEditForm] = useState({
    employeeId: '',
    clockIn: '',
    clockOut: '',
  });

  const filteredEmployees = employees.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search);
    const matchRole = roleFilter === 'all' || e.role === roleFilter;
    return matchSearch && matchRole;
  });

  // fetch employees for this mart
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!martId) return;
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || '');
        const res = await fetch(`${API_BASE}/api/auth/users?martId=${martId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error('Failed to fetch employees');
        const data = await res.json();
        // normalize to expected shape
        const list = data
        .map((u:any) => ({
          id: u._id || u.id,
          name: u.name,
          username: u.username,
          phone: u.phone,
          // normalize backend role names to frontend representation
          role: u.role === 'storeKeeper' || u.role === 'store_keeper' ? 'store_keeper' : (u.role === 'systemAdmin' ? 'system_admin' : u.role),
          martId: u.martId || u.martid || u.shopId,
          salary: u.salary || 0,
          permissions: u.permissions || [],
          status: 'active',
        }))
        // don't include the owner/system admin account in the list
        .filter((u:any) => u.role !== 'system_admin' && u.role !== 'owner' && u.id !== user?.id);
      setEmployees(list);
      } catch (err) {
        console.error('fetch employees error', err);
      }
    };
    fetchEmployees();
  }, [martId]);

  // Initialize permissions when employees change
  useEffect(() => {
    const initial: Record<string, Record<string, boolean>> = {};
    employees.forEach(emp => {
      const has = (k:string) => Array.isArray(emp.permissions) && emp.permissions.includes(k);
      if (emp.role === 'manager') initial[emp.id] = { discount: has('discount'), addItem: has('addItem') };
      // store keepers are managed via transferStock permission
      else if (emp.role === 'store_keeper' || emp.role === 'storeKeeper') initial[emp.id] = { transferStock: has('transferStock') };
      else initial[emp.id] = { discount: has('discount') };
    });
    setPermissions(initial);
  }, [employees]);

  const resetForm = () => {
    setForm({ username: '', name: '', phone: '', role: 'manager', salary: '', password: '', confirmPassword: '' });
    setEditingEmployee(null);
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setForm({
      username: employee.username || '',
      name: employee.name,
      phone: employee.phone,
      role: employee.role,
      salary: String(employee.salary),
      password: '',
      confirmPassword: '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '');
      const res = await fetch(`${API_BASE}/api/auth/users/${id}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setEmployees(prev => prev.filter(e => e.id !== id));
      setPermissions(prev => { const c = { ...prev }; delete c[id]; return c; });
      toast({ title: 'Employee deleted successfully' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Failed to delete employee' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.phone || !form.salary) {
      toast({ title: 'Please fill required fields' });
      return;
    }

    if (editingEmployee) {
      // update on backend
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || '');
        const res = await fetch(`${API_BASE}/api/auth/users/${editingEmployee.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name: form.name, phone: form.phone, role: form.role === 'store_keeper' ? 'storeKeeper' : form.role, salary: Number(form.salary), username: form.username || undefined }),
        });
        if (!res.ok) throw new Error('Failed to update employee');
        const updated = await res.json();
        setEmployees(employees.map(emp => emp.id === editingEmployee.id ? { ...emp, ...updated } : emp));
        toast({ title: 'Employee updated successfully' });
      } catch (err) {
        console.error(err);
        toast({ title: 'Failed to update employee' });
      }
      // success toast handled above
    } else {
      // ensure password confirmation matches
      if (!form.password || form.password !== form.confirmPassword) {
        toast({ title: 'Passwords do not match', description: 'Please ensure both passwords are the same', variant: 'destructive' });
        return;
      }
      // Create employee on backend using owner account
      try {
        const API_BASE = (import.meta.env.VITE_API_URL || '');
        const apiRole = form.role === 'store_keeper' ? 'storeKeeper' : form.role;
        const payload: any = {
          name: form.name,
          username: form.username || undefined,
          password: form.password,
          confirmPassword: form.confirmPassword,
          role: apiRole,
          martId,
          phone: form.phone,
          salary: Number(form.salary),
        };
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.message || 'Failed to add employee');
        }
        const body = await res.json();
        const user = body.user;
        const newEmployee = {
          id: user.id || user._id,
          name: user.name,
          username: user.username,
          phone: user.phone,
          role: user.role,
          salary: user.salary || Number(form.salary),
          status: 'active' as const,
        };
        setEmployees(prev => [...prev, newEmployee]);
        setPermissions(prev => {
          const newPerms = { ...prev };
          if (newEmployee.role === 'manager') newPerms[newEmployee.id] = { discount: false, addItem: false };
          else if (newEmployee.role === 'store_keeper' || newEmployee.role === 'storeKeeper') newPerms[newEmployee.id] = { transferStock: false };
          else newPerms[newEmployee.id] = { discount: false };
          return newPerms;
        });
        toast({ title: t('employee_added') });
      } catch (err:any) {
        console.error(err);
        toast({ title: 'Failed to add employee', description: err?.message || 'Server error' });
      }
      // toast is handled after API success
    }

    setIsDialogOpen(false);
    resetForm();
  };

  
  const togglePermission = async (employeeId: string, key: string, value: boolean) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    // Validate permission applicability for the target role
    const allowedPerRole: Record<string, string[]> = {
      manager: ['discount', 'addItem'],
      cashier: ['discount'],
      store_keeper: ['transferStock'],
      storeKeeper: ['transferStock'],
    };

    const allowed = allowedPerRole[employee.role] || [];
    if (!allowed.includes(key)) {
      toast({ title: 'Not allowed', description: 'This permission cannot be assigned to the selected role.', variant: 'destructive' });
      return;
    }

    // build new permissions array
    const cur = Array.isArray(employee.permissions) ? [...employee.permissions] : [];
    const idx = cur.indexOf(key);
    if (value && idx === -1) cur.push(key);
    if (!value && idx !== -1) cur.splice(idx, 1);

    // optimistic UI update
    setPermissions(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [key]: value
      }
    }));

    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '');
      const res = await fetch(`${API_BASE}/api/auth/users/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ permissions: cur }),
      });
      const body = await res.json().catch(() => null);
      console.debug('togglePermission response', res.status, body);
      if (!res.ok) throw new Error(body?.message || 'Failed to save permissions');

      // update local employee's permissions
      setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, permissions: cur } : e));

      // If this is the currently logged-in user, update their session immediately so the change persists locally
      const currentUser = useAuthStore.getState().user;
      if (currentUser && currentUser.id === employeeId) {
        useAuthStore.getState().setUser({ ...currentUser, permissions: cur });
        toast({ title: 'Your permissions were updated', description: 'Changes applied to your current session.' });
      }

      const labels: Record<string, string> = {
        discount: 'Apply Discounts',
        addItem: 'Add Items with Purchase Price',
        transferStock: 'Transfer Stock'
      };

      toast({
        title: `${labels[key]} ${value ? 'enabled' : 'disabled'} for ${employee.name}`
      });
    } catch (err) {
      // rollback UI
      setPermissions(prev => ({
        ...prev,
        [employeeId]: {
          ...prev[employeeId],
          [key]: !value
        }
      }));
      console.error('save permission err', err);
      toast({ title: 'Failed to save permission', description: String(err) });
    }
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

  // Group employees
  // Build groups for the permissions card from employees that belong to the current mart
  const myEmployees = filteredEmployees.filter(e => String(e.martId) === String(martId));

  const managers = myEmployees.filter(e => e.role === 'manager');
  const storeKeepers = myEmployees.filter(e => e.role === 'store_keeper' || e.role === 'storeKeeper');
  const cashiers = myEmployees.filter(e => e.role === 'cashier');

  // ===== PAGINATION FOR EMPLOYEES =====
  const [employeePage, setEmployeePage] = useState(1);
  const employeeTotalPages = Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE);
  const employeeStartIndex = (employeePage - 1) * ITEMS_PER_PAGE;
  const paginatedEmployees = filteredEmployees.slice(employeeStartIndex, employeeStartIndex + ITEMS_PER_PAGE);

  const goToEmployeePage = (page: number) => {
    if (page >= 1 && page <= employeeTotalPages) {
      setEmployeePage(page);
    }
  };

  const nextEmployeePage = () => {
    if (employeePage < employeeTotalPages) {
      setEmployeePage(employeePage + 1);
    }
  };

  const prevEmployeePage = () => {
    if (employeePage > 1) {
      setEmployeePage(employeePage - 1);
    }
  };

  // ===== ATTENDANCE FUNCTIONS =====

  const filteredAttendance = attendance.filter(record => {
    let include = true;

    if (attendanceFilter.employeeId !== 'all') {
      include = record.employeeId === attendanceFilter.employeeId;
    }

    const start = new Date(attendanceFilter.startDate);
    const end = new Date(attendanceFilter.endDate);

    switch (attendanceFilter.dateRange) {
      case 'today': {
        const todayStr = new Date().toISOString().split('T')[0];
        include = record.date === todayStr;
        break;
      }
      case 'this-week': {
        const now = new Date();
        const firstDayOfWeek = new Date(now);
        firstDayOfWeek.setDate(now.getDate() - now.getDay());
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        const recordDate = new Date(record.date);
        include = recordDate >= firstDayOfWeek && recordDate <= lastDayOfWeek;
        break;
      }
      case 'this-month': {
        const year = new Date().getFullYear();
        const month = new Date().getMonth();
        const recordDate = new Date(record.date);
        include = recordDate.getFullYear() === year && recordDate.getMonth() === month;
        break;
      }
      case 'custom': {
        const recordDate = new Date(record.date);
        include = recordDate >= start && recordDate <= end;
        break;
      }
    }

    return include;
  });

  const shiftAttendanceDay = (delta: number) => {
    const baseStr = attendanceFilter.dateRange === 'custom'
      ? attendanceFilter.startDate
      : new Date().toISOString().split('T')[0];
    const base = new Date(baseStr);
    base.setDate(base.getDate() + delta);
    const nextStr = base.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    // don't navigate beyond today
    if (nextStr > today) return;
    setAttendanceFilter(prev => ({
      ...prev,
      dateRange: 'custom',
      startDate: nextStr,
      endDate: nextStr,
    }));
  };

  // ===== PAGINATION FOR ATTENDANCE =====
  const [attendancePage, setAttendancePage] = useState(1);
  const attendanceTotalPages = Math.ceil(filteredAttendance.length / ITEMS_PER_PAGE);
  const attendanceStartIndex = (attendancePage - 1) * ITEMS_PER_PAGE;
  const paginatedAttendance = filteredAttendance.slice(attendanceStartIndex, attendanceStartIndex + ITEMS_PER_PAGE);

  const goToAttendancePage = (page: number) => {
    if (page >= 1 && page <= attendanceTotalPages) {
      setAttendancePage(page);
    }
  };

  // clock-in state has been removed; attendance is handled in the dedicated tab

  const timeToHHmm = (timeRaw: string) => {
    const s = (timeRaw || '').trim();
    if (!s) return '';
    // already HH:mm
    const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
    if (m24) {
      const hh = String(Math.max(0, Math.min(23, Number(m24[1])))).padStart(2, '0');
      const mm = String(Math.max(0, Math.min(59, Number(m24[2])))).padStart(2, '0');
      return `${hh}:${mm}`;
    }
    // hh:mm AM/PM
    const m12 = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (m12) {
      let hh = Number(m12[1]);
      const mm = Number(m12[2]);
      const ap = m12[3].toUpperCase();
      if (ap === 'AM') {
        if (hh === 12) hh = 0;
      } else {
        if (hh !== 12) hh = hh + 12;
      }
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
    return '';
  };

  const isoFromDateAndTime = (dateYmd: string, timeRaw: string) => {
    // If API ever returns ISO, keep it.
    if (timeRaw && timeRaw.includes('T')) {
      const d = new Date(timeRaw);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    const hhmm = timeToHHmm(timeRaw);
    if (!dateYmd || !hhmm) return new Date(dateYmd || Date.now()).toISOString();
    const d = new Date(`${dateYmd}T${hhmm}:00`);
    return d.toISOString();
  };

  const mapApiAttendance = (r: AttendanceApiRecord): AttendanceRecord => {
    const id = (r._id || r.id || '') as string;
    const employeeId = (r.employeeId || '') as string;
    const date = (r.dateYmd || '') as string;
    const clockInIso = isoFromDateAndTime(date, String(r.clockIn || ''));
    const clockOutIso = r.clockOut
      ? isoFromDateAndTime(date, String(r.clockOut))
      : null;
    return {
      id,
      employeeId,
      employeeName: r.employeeName || undefined,
      date,
      clockIn: clockInIso,
      clockOut: clockOutIso,
      durationMinutes: (typeof r.durationMinutes === 'number' ? r.durationMinutes : null),
    };
  };

  const deriveActiveFromAttendance = (records: AttendanceRecord[]) => {
    const next: Record<string, string> = {};
    records.forEach((r) => {
      if (!r.clockOut) next[r.employeeId] = r.clockIn;
    });
    return next;
  };

  const refreshAttendance = async () => {
    if (!token) return;
    try {
      const data = await fetchAttendance({}, token);
      const mapped = (Array.isArray(data) ? data : []).map(mapApiAttendance);
      setAttendance(mapped);
    } catch (e: any) {
      console.error('fetch attendance error', e);
      toast({
        title: 'Failed to load attendance',
        description: e?.message || 'Server error',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (activeTab !== 'attendance') return;
    refreshAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token]);


  const nextAttendancePage = () => {
    if (attendancePage < attendanceTotalPages) {
      setAttendancePage(attendancePage + 1);
    }
  };

  const prevAttendancePage = () => {
    if (attendancePage > 1) {
      setAttendancePage(attendancePage - 1);
    }
  };

  const handleSaveManualAttendance = async () => {
    const { employeeId, date, clockIn, clockOut } = manualEntry;

    if (!employeeId || !date || !clockIn) {
      toast({ title: 'Please fill employee, date and clock-in' });
      return;
    }

    if (clockOut && clockOut <= clockIn) {
      toast({ title: 'Invalid Time', description: 'Clock-out must be after clock-in.' });
      return;
    }
    if (!token) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return;
    }

    try {
      const emp = employees.find(e => e.id === employeeId);
      await createAttendance(
        {
          employeeId,
          employeeName: emp?.name,
          dateYmd: date,
          clockIn,
          clockOut: clockOut || null,
        },
        token,
      );
      await refreshAttendance();
      toast({ title: 'Attendance Saved', description: 'Saved to database.' });
      setManualEditingId(null);
      setManualEntry({ employeeId: '', date: formatDateKey(new Date()), clockIn: '', clockOut: '' });
    } catch (e: any) {
      console.error('manual attendance save failed', e);
      toast({ title: 'Failed to save attendance', description: e?.message || 'Server error', variant: 'destructive' });
    }
  };

  const handleEditAttendance = (rec: AttendanceRecord) => {
    setEditingAttendanceId(rec.id || null);
    setAttendanceEditForm({
      employeeId: rec.employeeId || '',
      clockIn: toDateTimeLocal(new Date(rec.clockIn)),
      clockOut: rec.clockOut ? toDateTimeLocal(new Date(rec.clockOut)) : '',
    });
    // make sure the "Add Attendance Manually" form is not populated
    setManualEditingId(null);
    setManualEntry({ employeeId: '', date: new Date().toISOString().split('T')[0], clockIn: '', clockOut: '' });
    setEditSubpageOpen(true);
  };

  const handleSaveEditedAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendanceId) return;

    const employeeId = attendanceEditForm.employeeId;
    if (!employeeId || !attendanceEditForm.clockIn) {
      toast({ title: 'Please fill employee and clock-in' });
      return;
    }

    const clockInTime = attendanceEditForm.clockIn.includes('T')
      ? attendanceEditForm.clockIn.split('T')[1].slice(0, 5)
      : attendanceEditForm.clockIn;
    const clockOutTime = attendanceEditForm.clockOut
      ? (attendanceEditForm.clockOut.includes('T')
          ? attendanceEditForm.clockOut.split('T')[1].slice(0, 5)
          : attendanceEditForm.clockOut)
      : '';

    if (clockOutTime && clockOutTime <= clockInTime) {
      toast({ title: 'Invalid Time', description: 'Clock-out must be after clock-in.' });
      return;
    }

    (async () => {
      if (!token) {
        toast({ title: 'Not authenticated', variant: 'destructive' });
        return;
      }
      try {
        const emp = employees.find(e => e.id === employeeId);
        await updateAttendance(
          editingAttendanceId,
          {
            employeeId,
            employeeName: emp?.name || null,
            clockIn: clockInTime,
            clockOut: clockOutTime || null,
          },
          token,
        );
        await refreshAttendance();
        toast({ title: 'Attendance updated', description: 'Saved to database.' });
        setEditSubpageOpen(false);
        setEditingAttendanceId(null);
      } catch (e: any) {
        console.error('attendance edit save failed', e);
        toast({ title: 'Failed to update attendance', description: e?.message || 'Server error', variant: 'destructive' });
      }
    })();
  };

  const exportAttendanceToCSV = () => {
    if (filteredAttendance.length === 0) {
      toast({ title: 'No attendance data to export' });
      return;
    }

    const headers = ['Employee Name', 'Date', 'Clock In', 'Clock Out', 'Duration (min)'];
    const rows = filteredAttendance.map(rec => {
      const emp = employees.find(e => e.id === rec.employeeId);
      const inTime = new Date(rec.clockIn).toLocaleString();
      const outTime = rec.clockOut ? new Date(rec.clockOut).toLocaleString() : '—';
      return `"${emp?.name || 'Unknown'}", "${rec.date}", "${inTime}", "${outTime}", "${rec.durationMinutes ?? '—'}"`;
    });

    const csvContent = [headers.join(' '), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAttendanceToPDF = async () => {
    if (filteredAttendance.length === 0) {
      toast({ title: 'No attendance data to export' });
      return;
    }

    const pdfContent = document.createElement('div');
    pdfContent.style.padding = '20px';
    pdfContent.style.width = '800px';
    pdfContent.style.fontFamily = 'Arial, sans-serif';
    pdfContent.style.fontSize = '14px';

    const title = document.createElement('h2');
    title.textContent = 'Attendance Report';
    title.style.textAlign = 'center';
    title.style.marginBottom = '20px';
    title.style.color = '#1f2937';
    pdfContent.appendChild(title);

    const totalRecords = filteredAttendance.length;
    const totalHours = filteredAttendance.reduce((sum, rec) => sum + (rec.durationMinutes || 0), 0) / 60;
    const avgHours = totalRecords > 0 ? (totalHours / totalRecords).toFixed(1) : '0';

    const summary = document.createElement('div');
    summary.innerHTML = `
      <div style="display: flex; gap: 20px; margin-bottom: 20px;">
        <div style="background: #ecfdf5; padding: 12px; border-radius: 8px; flex: 1; border: 1px solid #a7f3d0;">
          <div style="font-size: 12px; color: #065f46; font-weight: 600;">TOTAL RECORDS</div>
          <div style="font-size: 28px; font-weight: bold; color: #065f46; margin-top: 4px;">${totalRecords}</div>
        </div>
        <div style="background: #fef2f2; padding: 12px; border-radius: 8px; flex: 1; border: 1px solid #fecaca;">
          <div style="font-size: 12px; color: #b91c1c; font-weight: 600;">TOTAL HOURS</div>
          <div style="font-size: 28px; font-weight: bold; color: #b91c1c; margin-top: 4px;">${totalHours.toFixed(1)}h</div>
        </div>
        <div style="background: #f3f4f6; padding: 12px; border-radius: 8px; flex: 1; border: 1px solid #d1d5db;">
          <div style="font-size: 12px; color: #4b5563; font-weight: 600;">AVG PER DAY</div>
          <div style="font-size: 28px; font-weight: bold; color: #4b5563; margin-top: 4px;">${avgHours}h</div>
        </div>
      </div>
    `;
    pdfContent.appendChild(summary);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '20px';
    table.innerHTML = `
      <thead>
        <tr>
          <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left; background: #f9fafb; font-weight: 600;">Employee</th>
          <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left; background: #f9fafb; font-weight: 600;">Date</th>
          <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left; background: #f9fafb; font-weight: 600;">Clock In</th>
          <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left; background: #f9fafb; font-weight: 600;">Clock Out</th>
          <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left; background: #f9fafb; font-weight: 600;">Duration</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement('tbody');
    if (filteredAttendance.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #9ca3af;">No attendance data</td></tr>`;
    } else {
      filteredAttendance.forEach(rec => {
        const emp = employees.find(e => e.id === rec.employeeId);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="border: 1px solid #e5e7eb; padding: 10px;">${emp?.name || 'Unknown'}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px;">${rec.date}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px;">${new Date(rec.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px;">${rec.clockOut ? new Date(rec.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px;">${rec.durationMinutes ? `${rec.durationMinutes} min` : '—'}</td>
        `;
        tbody.appendChild(row);
      });
    }
    table.appendChild(tbody);
    pdfContent.appendChild(table);

    document.body.appendChild(pdfContent);
    pdfContent.style.position = 'absolute';
    pdfContent.style.left = '-10000px';

    try {
      const canvas = await html2canvas(pdfContent, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({ title: 'Failed to generate PDF', variant: 'destructive' });
    } finally {
      document.body.removeChild(pdfContent);
    }
  };

  return (
    <RoleLayout allowedRoles={['owner']}>
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex border-b">
          <Button
            variant={activeTab === 'employees' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('employees')}
            className="rounded-none"
          >
            Employees
          </Button>
          <Button
            variant={activeTab === 'attendance' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('attendance')}
            className="rounded-none"
          >
            Attendance
          </Button>
        </div>

        {activeTab === 'employees' && (
          <>
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
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                  <DialogHeader>
                    <DialogTitle>{editingEmployee ? 'Edit Employee' : t('add_employee')}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username (optional)</Label>
                      <Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="login username (optional)" />
                    </div>
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
                      <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('select_role')} />
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_ROLES.map(role => (
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
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={form.confirmPassword}
                          onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                          required
                          placeholder="Confirm password"
                          className={form.confirmPassword.length === 0 ? '' : (form.password === form.confirmPassword ? 'ring-2 ring-green-400/60 border-green-400' : 'ring-2 ring-red-400/60 border-red-400')}
                        />
                        {form.confirmPassword.length > 0 && (
                          <p className={`text-xs mt-1 ${form.password === form.confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                            {form.password === form.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                          </p>
                        )}
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
                      {ALL_ROLES.map(role => (
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
                      {paginatedEmployees.length > 0 ? (
                        paginatedEmployees.map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(e.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{e.name}</span>
                                  </div>
                                </div>
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
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(e)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                            {search || roleFilter !== 'all' 
                              ? 'No employees found' 
                              : 'No employees yet.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* ✅ EMPLOYEE PAGINATION */}
                {employeeTotalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-3 border-t border-border mt-4">
                    <div className="text-xs text-muted-foreground mb-2 sm:mb-0">
                      Showing <span className="font-medium">{employeeStartIndex + 1}</span>–
                      <span className="font-medium">{Math.min(employeeStartIndex + ITEMS_PER_PAGE, filteredEmployees.length)}</span> of 
                      <span className="font-medium"> {filteredEmployees.length}</span> employees
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevEmployeePage}
                        disabled={employeePage === 1}
                      >
                        Prev
                      </Button>
                      
                      {Array.from({ length: employeeTotalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={employeePage === page ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => goToEmployeePage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextEmployeePage}
                        disabled={employeePage === employeeTotalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* PERMISSIONS SECTION */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  Manage Permissions
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Control which actions each employee is allowed to perform in the POS system.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Managers Section */}
                {managers.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Manager Permissions</p>
                    <p className="text-xs text-muted-foreground mb-3">Assign manager-level permissions</p>
                    <div className="space-y-3">
                      {managers.map(emp => (
                        <div key={emp.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                          <div>
                            <p className="text-sm font-medium">{emp.name}</p>
                          </div>
                          <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">Apply Discounts</span>
                              <Switch
                                checked={!!permissions[emp.id]?.discount}
                                onCheckedChange={(v) => togglePermission(emp.id, 'discount', v)}
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-muted-foreground">Add Items (w/ Price)</span>
                              <Switch
                                checked={!!permissions[emp.id]?.addItem}
                                onCheckedChange={(v) => togglePermission(emp.id, 'addItem', v)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                                  <span className="text-xs text-muted-foreground">Transfer Stock</span>
                                  <Switch
                                    checked={!!permissions[emp.id]?.transferStock}
                                    onCheckedChange={(v) => togglePermission(emp.id, 'transferStock', v)}
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
                              onCheckedChange={(v) => togglePermission(emp.id, 'discount', v)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {managers.length === 0 && storeKeepers.length === 0 && cashiers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No employees to manage permissions for.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'attendance' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Attendance</h1>
                <p className="text-muted-foreground">Track and manage employee attendance</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportAttendanceToCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={exportAttendanceToPDF}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Filter Section */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Employee</Label>
                    <Select
                      value={attendanceFilter.employeeId}
                      onValueChange={(v) => setAttendanceFilter(prev => ({ ...prev, employeeId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Employees" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Employees</SelectItem>
                        {filteredEmployees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date Range</Label>
                    <Select
                      value={attendanceFilter.dateRange}
                      onValueChange={(v) => setAttendanceFilter(prev => ({ ...prev, dateRange: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Today" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="this-week">This Week</SelectItem>
                        <SelectItem value="this-month">This Month</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {attendanceFilter.dateRange === 'custom' && (
                    <>
                      <div>
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          value={attendanceFilter.startDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            const today = new Date().toISOString().split('T')[0];
                            setAttendanceFilter(prev => ({ ...prev, startDate: val > today ? today : val }));
                          }}
                        />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          value={attendanceFilter.endDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            const today = new Date().toISOString().split('T')[0];
                            setAttendanceFilter(prev => ({ ...prev, endDate: val > today ? today : val }));
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Manual Entry Section */}
            {!editSubpageOpen && (
              <Card>
              <CardHeader>
                <CardTitle>Add Attendance Manually</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                  <div>
                    <Label>Employee</Label>
                    <Select
                      value={manualEntry.employeeId}
                      onValueChange={(v) => setManualEntry(prev => ({ ...prev, employeeId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredEmployees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date</Label>
                    <Input
                      type="date"
                      max={new Date().toISOString().split('T')[0]}
                      value={manualEntry.date}
                      onChange={(e) => {
                        const val = e.target.value;
                        const today = new Date().toISOString().split('T')[0];
                        setManualEntry(prev => ({ ...prev, date: val > today ? today : val }));
                      }}
                    />
                  </div>
                  <div>
                    <Label>Clock In</Label>
                    <Input
                      type="time"
                      value={manualEntry.clockIn}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, clockIn: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Clock Out</Label>
                    <Input
                      type="time"
                      value={manualEntry.clockOut}
                      onChange={(e) => setManualEntry(prev => ({ ...prev, clockOut: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleSaveManualAttendance}>Save Attendance</Button>
                  </div>
                </div>
              </CardContent>
              </Card>
            )}

            {/* Attendance Records Table */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredAttendance.length} records
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => shiftAttendanceDay(-1)} aria-label="Previous day">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-medium">
                      {(attendanceFilter.dateRange === 'custom' ? attendanceFilter.startDate : new Date().toISOString().split('T')[0])}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => shiftAttendanceDay(1)} aria-label="Next day">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedAttendance.length > 0 ? (
                          paginatedAttendance.map((rec) => {
                          const emp = employees.find(e => e.id === rec.employeeId);
                          const today = new Date().toISOString().split('T')[0];
                          const isPast = rec.date < today;
                          return (
                            <TableRow key={rec.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(emp?.name || '')}</AvatarFallback>
                                  </Avatar>
                                  <span>{emp?.name || 'Unknown'}</span>
                                </div>
                              </TableCell>
                              <TableCell>{rec.date}</TableCell>
                              <TableCell>{new Date(rec.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                              <TableCell>{rec.clockOut ? new Date(rec.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                              <TableCell>{rec.durationMinutes ? `${rec.durationMinutes} min` : '—'}</TableCell>
                              <TableCell className="text-right">
                                      {(!rec.clockOut || rec.clockOut === null) && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={async () => {
                                            if (!token) {
                                              toast({ title: 'Not authenticated', variant: 'destructive' });
                                              return;
                                            }
                                            try {
                                              const now = new Date();
                                              const nowHHmm = now.toTimeString().slice(0, 5);
                                              await updateAttendance(rec.id, { clockOut: nowHHmm }, token);
                                              await refreshAttendance();
                                              toast({ title: 'Clocked out', description: `${emp?.name || rec.employeeName || 'Employee'} clocked out now` });
                                            } catch (e: any) {
                                              console.error('clock out now failed', e);
                                              toast({ title: 'Failed to clock out', description: e?.message || 'Server error', variant: 'destructive' });
                                            }
                                          }}
                                        >
                                          Clock Out Now
                                        </Button>
                                      )}
                                      {!isPast && (
                                        <>
                                          <Button variant="ghost" size="icon" onClick={() => handleEditAttendance(rec)}>
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive"
                                                aria-label="Delete attendance"
                                                disabled={rec.date < new Date().toISOString().split('T')[0]}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Delete attendance record?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Delete the attendance record for {emp?.name || rec.employeeName || 'this employee'} on {rec.date}? This action cannot be undone.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                  onClick={() => {
                                                    void (async () => {
                                                      if (!token) {
                                                        toast({ title: 'Not authenticated', variant: 'destructive' });
                                                        return;
                                                      }
                                                      try {
                                                        await deleteAttendance(rec.id, token);
                                                        await refreshAttendance();
                                                        toast({ title: 'Attendance deleted', description: 'Removed from database.' });
                                                      } catch (e: any) {
                                                        console.error('delete attendance failed', e);
                                                        toast({ title: 'Failed to delete attendance', description: e?.message || 'Server error', variant: 'destructive' });
                                                      }
                                                    })();
                                                  }}
                                                >
                                                  Delete
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </>
                                      )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                            {attendanceFilter.employeeId !== 'all' || attendanceFilter.dateRange !== 'today'
                              ? 'No attendance records found'
                              : 'No attendance records yet.'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* ✅ ATTENDANCE PAGINATION */}
                {attendanceTotalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-3 border-t border-border mt-4">
                    <div className="text-xs text-muted-foreground mb-2 sm:mb-0">
                      Showing <span className="font-medium">{attendanceStartIndex + 1}</span>–
                      <span className="font-medium">{Math.min(attendanceStartIndex + ITEMS_PER_PAGE, filteredAttendance.length)}</span> of 
                      <span className="font-medium"> {filteredAttendance.length}</span> records
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevAttendancePage}
                        disabled={attendancePage === 1}
                      >
                        Prev
                      </Button>
                      
                      {Array.from({ length: attendanceTotalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={attendancePage === page ? 'default' : 'outline'}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => goToAttendancePage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextAttendancePage}
                        disabled={attendancePage === attendanceTotalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Attendance Subpage (slide-over) */}
            {editSubpageOpen && (
              <div className="fixed inset-0 z-50 flex">
                <div
                  className="flex-1"
                  onClick={() => {
                    setEditSubpageOpen(false);
                    setEditingAttendanceId(null);
                  }}
                />
                <div className="w-full sm:w-1/2 lg:w-1/3 h-full bg-background border-l border-border overflow-auto p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Edit Attendance</h2>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditSubpageOpen(false);
                        setEditingAttendanceId(null);
                      }}
                    >
                      Close
                    </Button>
                  </div>

                  <form onSubmit={handleSaveEditedAttendance} className="space-y-4">
                    <div>
                      <Label>Employee</Label>
                      <Select
                        value={attendanceEditForm.employeeId}
                        onValueChange={(v) => setAttendanceEditForm(prev => ({ ...prev, employeeId: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Clock In</Label>
                      <Input
                        type="datetime-local"
                        value={attendanceEditForm.clockIn}
                        onChange={(e) => setAttendanceEditForm(prev => ({ ...prev, clockIn: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <Label>Clock Out</Label>
                      <Input
                        type="datetime-local"
                        value={attendanceEditForm.clockOut}
                        onChange={(e) => setAttendanceEditForm(prev => ({ ...prev, clockOut: e.target.value }))}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditSubpageOpen(false);
                          setEditingAttendanceId(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit">Save Changes</Button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </RoleLayout>
  );
}
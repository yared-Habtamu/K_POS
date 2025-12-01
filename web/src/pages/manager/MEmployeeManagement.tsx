// src/pages/manager/MEmployeeManagement.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  DialogFooter,
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
  Calendar,
  Download,
  FileText,
  Eye,
  Filter,
} from 'lucide-react';
import type { UserRole } from '@/types';

// PDF Dependencies
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/** Manager can only assign these roles */
type ManagerAssignableRole = 'cashier' | 'store_keeper';

type Employee = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  salary: number;
  status: 'active' | 'inactive';
};

type AttendanceRecord = {
  id: string; // unique per record
  employeeId: string;
  clockIn: string; // ISO
  clockOut: string | null; // ISO | null
  durationMinutes: number | null;
  date: string; // YYYY-MM-DD
};

const mockEmployees: Employee[] = [
  { id: '1', name: 'Tigist Haile', phone: '+251922345678', role: 'cashier' as UserRole, salary: 15000, status: 'active' },
  { id: '2', name: 'Dawit Tadesse', phone: '+251933456789', role: 'cashier' as UserRole, salary: 8000, status: 'active' },
  { id: '3', name: 'Mulugeta Assefa', phone: '+251944567890', role: 'store_keeper' as UserRole, salary: 9000, status: 'active' },
  { id: '4', name: 'Sara Bekele', phone: '+251955678901', role: 'cashier' as UserRole, salary: 8000, status: 'active' },
  { id: '5', name: 'Yonas Gebre', phone: '+251966789012', role: 'cashier' as UserRole, salary: 8000, status: 'inactive' },
];

// Helper: Get all weekdays (Mon-Fri) in a month
const getWeekdaysInMonth = (year: number, month: number) => {
  const days: Date[] = [];
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      days.push(new Date(d));
    }
  }
  return days;
};

// Helper: Format date as YYYY-MM-DD
const formatDateKey = (date: Date) => date.toISOString().split('T')[0];
const formatDateTimeLocal = (date: Date) => date.toISOString().slice(0, 16);

export default function MEmployeeManagement(): JSX.Element {
  console.log("✅ MEmployeeManagement loaded!");
  const { t } = useTranslation();

  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | ManagerAssignableRole | 'manager'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Attendance state
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activeClockIns, setActiveClockIns] = useState<Record<string, string>>({});

  // Manual attendance dialog
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [attendanceForm, setAttendanceForm] = useState({
    clockIn: '',
    clockOut: '',
  });

  // Monthly attendance dialog
  const [monthlyDialogOpen, setMonthlyDialogOpen] = useState(false);
  const [viewingEmployeeId, setViewingEmployeeId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Daily detail dialog
  const [dailyDialogOpen, setDailyDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // New: Attendance View State
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance'>('employees');
  const [attendanceFilter, setAttendanceFilter] = useState({
    employeeId: 'all',
    dateRange: 'today' as 'today' | 'this-week' | 'this-month' | 'custom',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [manualEntryForm, setManualEntryForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    clockIn: '',
    clockOut: '',
  });

  // Permission state
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

  const roleOptions: ManagerAssignableRole[] = ['cashier', 'store_keeper'];

  const filteredEmployees = employees.filter((e) => {
    if (e.role === 'manager') return false;
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.phone.includes(search);
    const matchRole = roleFilter === 'all' || e.role === roleFilter;
    return matchSearch && matchRole;
  });

  useEffect(() => {
    setPermissions(prev => {
      const next = { ...prev };
      employees.forEach(emp => {
        if ((emp.role === 'cashier' || emp.role === 'store_keeper') && !next[emp.id]) {
          next[emp.id] = { discount: false };
        }
      });
      Object.keys(next).forEach(id => {
        if (!employees.find(e => e.id === id)) delete next[id];
      });
      return next;
    });

    // Initialize attendance records from mock if needed
    setAttendance(prev => {
      if (prev.length > 0) return prev;
      return [
        {
          id: '1',
          employeeId: '1',
          clockIn: '2025-12-01T08:00:00Z',
          clockOut: '2025-12-01T17:00:00Z',
          durationMinutes: 540,
          date: '2025-12-01'
        },
        {
          id: '2',
          employeeId: '2',
          clockIn: '2025-12-01T08:30:00Z',
          clockOut: '2025-12-01T16:30:00Z',
          durationMinutes: 480,
          date: '2025-12-01'
        },
        {
          id: '3',
          employeeId: '3',
          clockIn: '2025-12-01T09:00:00Z',
          clockOut: '2025-12-01T18:00:00Z',
          durationMinutes: 540,
          date: '2025-12-01'
        },
      ];
    });

    setActiveClockIns(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        if (!employees.find(e => e.id === id)) delete next[id];
      });
      return next;
    });
  }, [employees]);

  const resetForm = () => {
    setForm({ name: '', phone: '', role: 'cashier', salary: '', password: '' });
    setEditingEmployee(null);
  };

  const handleEdit = (employee: Employee) => {
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
    setEmployees(prev => prev.filter((e) => e.id !== id));
    toast({ title: 'Employee deleted successfully' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.phone || !form.salary) {
      toast({ title: 'Please fill required fields' });
      return;
    }

    if (editingEmployee) {
      setEmployees(prev =>
        prev.map(emp =>
          emp.id === editingEmployee.id
            ? { ...emp, name: form.name, phone: form.phone, role: form.role as UserRole, salary: Number(form.salary) }
            : emp
        )
      );
      toast({ title: 'Employee updated successfully' });
    } else {
      const newEmployee: Employee = {
        id: Date.now().toString(),
        name: form.name,
        phone: form.phone,
        role: form.role as UserRole,
        salary: Number(form.salary),
        status: 'active',
      };
      setEmployees(prev => [...prev, newEmployee]);
      toast({ title: t('employee_added') || 'Employee added' });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  // Real-time clock toggle
  const handleClockToggle = (employeeId: string) => {
    const now = new Date();
    const nowIso = now.toISOString();
    const isClockedIn = !!activeClockIns[employeeId];

    if (isClockedIn) {
      const clockInIso = activeClockIns[employeeId];
      const clockInDate = new Date(clockInIso);
      const duration = Math.round((now.getTime() - clockInDate.getTime()) / 60000);

      setAttendance(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          employeeId,
          clockIn: clockInIso,
          clockOut: nowIso,
          durationMinutes: duration,
          date: formatDateKey(new Date(clockInIso)),
        }
      ]);

      setActiveClockIns(prev => {
        const copy = { ...prev };
        delete copy[employeeId];
        return copy;
      });

      const emp = employees.find(e => e.id === employeeId);
      toast({ title: 'Clocked Out', description: emp ? `${emp.name} worked ${duration} minutes` : `Worked ${duration} minutes` });
    } else {
      setActiveClockIns(prev => ({ ...prev, [employeeId]: nowIso }));
      setAttendance(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          employeeId,
          clockIn: nowIso,
          clockOut: null,
          durationMinutes: null,
          date: formatDateKey(now),
        }
      ]);

      const emp = employees.find(e => e.id === employeeId);
      toast({ title: 'Clocked In', description: emp ? `${emp.name} clocked in` : 'Clocked in' });
    }
  };

  // Open manual attendance dialog
  const handleOpenAttendanceDialog = (employeeId: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    setAttendanceForm({
      clockIn: `${today}T08:00`,
      clockOut: `${today}T17:00`,
    });
    setSelectedEmployeeId(employeeId);
    setAttendanceDialogOpen(true);
  };

  // Save manual attendance
  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    const clockInDate = new Date(attendanceForm.clockIn);
    const clockOutDate = new Date(attendanceForm.clockOut);

    if (clockOutDate <= clockInDate) {
      toast({ title: 'Invalid Time', description: 'Clock-out must be after clock-in.' });
      return;
    }

    const durationMs = clockOutDate.getTime() - clockInDate.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      employeeId: selectedEmployeeId,
      clockIn: clockInDate.toISOString(),
      clockOut: clockOutDate.toISOString(),
      durationMinutes,
      date: formatDateKey(clockInDate),
    };

    setAttendance(prev => [...prev, newRecord]);

    if (activeClockIns[selectedEmployeeId]) {
      setActiveClockIns(prev => {
        const copy = { ...prev };
        delete copy[selectedEmployeeId];
        return copy;
      });
    }

    const emp = employees.find(e => e.id === selectedEmployeeId);
    toast({
      title: 'Attendance Saved',
      description: `${emp?.name} worked ${durationMinutes} minutes.`,
    });

    setAttendanceDialogOpen(false);
  };

  // Open monthly attendance view
  const handleViewMonthlyAttendance = (employeeId: string) => {
    const now = new Date();
    setViewingEmployeeId(employeeId);
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
    setMonthlyDialogOpen(true);
  };

  // === NEW: ATTENDANCE TAB FEATURES ===

  // Filter attendance records based on current filter
  const filteredAttendance = useMemo(() => {
    let records = [...attendance];

    if (attendanceFilter.employeeId !== 'all') {
      records = records.filter(r => r.employeeId === attendanceFilter.employeeId);
    }

    const start = new Date(attendanceFilter.startDate);
    const end = new Date(attendanceFilter.endDate);

    switch (attendanceFilter.dateRange) {
      case 'today':
        const todayStr = formatDateKey(new Date());
records = records.filter(r => r.date === todayStr);
break;
case 'this-week':
  const now = new Date(); // ✅ Unique name
        const firstDayOfWeek = new Date(now);
        firstDayOfWeek.setDate(now.getDate() - now.getDay());
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        records = records.filter(r => {
          const d = new Date(r.date);
          return d >= firstDayOfWeek && d <= lastDayOfWeek;
        });
        break;
      case 'this-month':
        const year = new Date().getFullYear();
        const month = new Date().getMonth();
        records = records.filter(r => {
          const d = new Date(r.date);
          return d.getFullYear() === year && d.getMonth() === month;
        });
        break;
      case 'custom':
        records = records.filter(r => {
          const d = new Date(r.date);
          return d >= start && d <= end;
        });
        break;
    }

    return records.sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime());
  }, [attendance, attendanceFilter]);

  // Handle manual entry save
  const handleSaveManualEntry = () => {
    const { employeeId, date, clockIn, clockOut } = manualEntryForm;

    if (!employeeId || !date || !clockIn || !clockOut) {
      toast({ title: 'Please fill all fields' });
      return;
    }

    const clockInDate = new Date(`${date}T${clockIn}`);
    const clockOutDate = new Date(`${date}T${clockOut}`);

    if (clockOutDate <= clockInDate) {
      toast({ title: 'Invalid Time', description: 'Clock-out must be after clock-in.' });
      return;
    }

    const durationMs = clockOutDate.getTime() - clockInDate.getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
      employeeId,
      clockIn: clockInDate.toISOString(),
      clockOut: clockOutDate.toISOString(),
      durationMinutes,
      date: date,
    };

    setAttendance(prev => [...prev, newRecord]);
    toast({ title: 'Attendance Saved', description: 'Manual entry saved successfully.' });

    // Reset form
    setManualEntryForm({
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      clockIn: '',
      clockOut: '',
    });
  };

  // Export to CSV
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

    const csvContent = [headers.join(','), ...rows].join('\n');
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

  // Export to PDF
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

    // Summary
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

    // Table
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

  // === END ATTENDANCE TAB FEATURES ===

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

  const cashiers = filteredEmployees.filter(e => e.role === 'cashier');
  const storeKeepers = filteredEmployees.filter(e => e.role === 'store_keeper');

  // Compute monthly attendance data
  const monthlyAttendanceData = useMemo(() => {
    if (!viewingEmployeeId) return { presentDays: new Set<string>(), weekdays: [] };

    const records = attendance.filter(r => r.employeeId === viewingEmployeeId);
    const presentDays = new Set<string>();

    records.forEach(rec => {
      if (rec.clockIn) {
        const dateKey = formatDateKey(new Date(rec.clockIn));
        presentDays.add(dateKey);
      }
    });

    const weekdays = getWeekdaysInMonth(selectedYear, selectedMonth);

    return { presentDays, weekdays };
  }, [viewingEmployeeId, attendance, selectedYear, selectedMonth]);

  const { presentDays, weekdays } = monthlyAttendanceData;
  const totalWeekdays = weekdays.length;
  const totalPresent = Array.from(presentDays).filter(date => {
    const d = new Date(date);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  }).length;
  const totalAbsent = totalWeekdays - totalPresent;

  return (
    <RoleLayout allowedRoles={['manager']}>
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
                <h1 className="text-2xl font-bold">{t('employees') || 'Employees'}</h1>
                <p className="text-muted-foreground">Manage your team members</p>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('add_employee') || 'Add Employee'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingEmployee ? 'Edit Employee' : t('add_employee') || 'Add Employee'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('employee_name') || 'Name'} *</Label>
                      <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">{t('phone') || 'Phone'} *</Label>
                      <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+251..." required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">{t('role') || 'Role'} *</Label>
                      <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as ManagerAssignableRole })}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('select_role') || 'Select role'} />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map(role => (
                            <SelectItem key={role} value={role}>{t(role) || role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salary">{t('salary') || 'Salary'} (ETB) *</Label>
                      <Input id="salary" type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} required />
                    </div>
                    {!editingEmployee && (
                      <div className="space-y-2">
                        <Label htmlFor="password">{t('password') || 'Password'} *</Label>
                        <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('cancel') || 'Cancel'}</Button>
                      <Button type="submit">{t('save') || 'Save'}</Button>
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
                  <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as any)}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roleOptions.map(role => (
                        <SelectItem key={role} value={role}>{t(role) || role}</SelectItem>
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
                  {t('employees') || 'Employees'}
                  <Badge variant="secondary" className="ml-2">{filteredEmployees.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('employee_name') || 'Name'}</TableHead>
                        <TableHead>{t('phone') || 'Phone'}</TableHead>
                        <TableHead>{t('role') || 'Role'}</TableHead>
                        <TableHead className="text-right">{t('salary') || 'Salary'}</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">{t('actions') || 'Actions'}</TableHead>
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
                            <Badge variant={getRoleBadgeVariant(e.role)}>{t(e.role) || e.role}</Badge>
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
                            <div className="flex justify-end gap-1 items-center">
                              {/* <Button variant="ghost" size="icon" onClick={() => handleClockToggle(e.id)}>
                                <Clock className="h-4 w-4" />
                              </Button> */}
                              {/* <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenAttendanceDialog(e.id)}
                              >
                                <UserCog className="h-4 w-4" />
                              </Button> */}
                              {/* <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewMonthlyAttendance(e.id)}
                              >
                                <Calendar className="h-4 w-4" />
                              </Button> */}
                              {activeClockIns[e.id] ? <Badge variant="secondary">Clocked In</Badge> : null}
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(e)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {attendance.filter(r => r.employeeId === e.id).length > 0 && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {attendance
                                  .filter(r => r.employeeId === e.id)
                                  .slice(-3)
                                  .reverse()
                                  .map((rec, i) => (
                                    <div key={i} className="flex justify-between">
                                      <div>{new Date(rec.clockIn).toLocaleString()}</div>
                                      <div>{rec.clockOut ? `${rec.durationMinutes}m` : '—'}</div>
                                    </div>
                                  ))}
                              </div>
                            )}
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
          </>
        )}

        {activeTab === 'attendance' && (
          <>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
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
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
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
                  <div className="flex-1">
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
                      <div className="flex-1">
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={attendanceFilter.startDate}
                          onChange={(e) => setAttendanceFilter(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                      </div>
                      <div className="flex-1">
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={attendanceFilter.endDate}
                          onChange={(e) => setAttendanceFilter(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Manual Entry Form */}
            <Card>
              <CardHeader>
                <CardTitle>Add Attendance Manually</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                  <div>
                    <Label>Employee</Label>
                    <Select
                      value={manualEntryForm.employeeId}
                      onValueChange={(v) => setManualEntryForm(prev => ({ ...prev, employeeId: v }))}
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
                      value={manualEntryForm.date}
                      onChange={(e) => setManualEntryForm(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Clock In</Label>
                    <Input
                      type="time"
                      value={manualEntryForm.clockIn}
                      onChange={(e) => setManualEntryForm(prev => ({ ...prev, clockIn: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Clock Out</Label>
                    <Input
                      type="time"
                      value={manualEntryForm.clockOut}
                      onChange={(e) => setManualEntryForm(prev => ({ ...prev, clockOut: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleSaveManualEntry}>Save Attendance</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Showing {filteredAttendance.length} records
                </p>
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
                      {filteredAttendance.map((rec) => {
                        const emp = employees.find(e => e.id === rec.employeeId);
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
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Manual Attendance Dialog */}
        <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Attendance</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {selectedEmployeeId
                  ? `For: ${employees.find(e => e.id === selectedEmployeeId)?.name}`
                  : ''}
              </p>
            </DialogHeader>
            <form onSubmit={handleSaveAttendance} className="space-y-4">
              <div className="space-y-2">
                <Label>Clock In</Label>
                <Input
                  type="datetime-local"
                  value={attendanceForm.clockIn}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, clockIn: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Clock Out</Label>
                <Input
                  type="datetime-local"
                  value={attendanceForm.clockOut}
                  onChange={(e) => setAttendanceForm({ ...attendanceForm, clockOut: e.target.value })}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAttendanceDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Attendance</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Monthly Attendance Dialog */}
        <Dialog open={monthlyDialogOpen} onOpenChange={setMonthlyDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Monthly Attendance</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {viewingEmployeeId
                  ? `${employees.find(e => e.id === viewingEmployeeId)?.name} - ${new Date(selectedYear, selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                  : ''}
              </p>
            </DialogHeader>

            {/* Month/Year Selector */}
            <div className="flex gap-2 mb-4">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(Number(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {new Date(0, i).toLocaleDateString('en-US', { month: 'short' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 3 }, (_, i) => {
                    const year = new Date().getFullYear() - 1 + i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            <div className="flex gap-4 mb-4">
              <Badge variant="secondary">Present: {totalPresent}</Badge>
              <Badge variant="destructive">Absent: {totalAbsent}</Badge>
              <Badge>Total Workdays: {totalWeekdays}</Badge>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
                const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

                const cells = [];
                for (let i = 0; i < firstDay; i++) {
                  cells.push(<div key={`empty-${i}`} className="h-8"></div>);
                }
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(selectedYear, selectedMonth, day);
                  const dateKey = formatDateKey(date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isPresent = presentDays.has(dateKey);

                  let bgColor = 'bg-background border';
                  if (!isWeekend) {
                    bgColor = isPresent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
                  }

                  if (isWeekend) {
                    cells.push(
                      <div
                        key={day}
                        className={`h-8 flex items-center justify-center text-xs rounded ${bgColor}`}
                      >
                        {day}
                      </div>
                    );
                  } else {
                    cells.push(
                      <button
                        key={day}
                        onClick={() => {
                          setSelectedDate(date);
                          setDailyDialogOpen(true);
                        }}
                        className={`h-8 w-full flex items-center justify-center text-xs rounded ${bgColor} hover:opacity-80 transition`}
                        title={isPresent ? 'Click for details' : 'Absent'}
                      >
                        {day}
                      </button>
                    );
                  }
                }
                return cells;
              })()}
            </div>

            <DialogFooter className="mt-4 flex gap-2">
              <Button variant="outline" onClick={exportAttendanceToCSV}>
                Export CSV
              </Button>
              <Button variant="outline" onClick={exportAttendanceToPDF}>
                Export PDF
              </Button>
              <Button onClick={() => setMonthlyDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Daily Attendance Detail Dialog */}
        <Dialog open={dailyDialogOpen} onOpenChange={setDailyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Attendance on {selectedDate?.toDateString()}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {viewingEmployeeId && employees.find(e => e.id === viewingEmployeeId)?.name}
              </p>
            </DialogHeader>
            {selectedDate && viewingEmployeeId && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(() => {
                  const dateKey = formatDateKey(selectedDate);
                  const recordsOnDay = attendance.filter(rec => {
                    const recDate = formatDateKey(new Date(rec.clockIn));
                    return recDate === dateKey && rec.employeeId === viewingEmployeeId;
                  });

                  if (recordsOnDay.length === 0) {
                    return <p className="text-muted-foreground">No attendance records for this day.</p>;
                  }

                  return recordsOnDay.map((rec, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex justify-between text-sm">
                        <span>Clock In:</span>
                        <span>{new Date(rec.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Clock Out:</span>
                        <span>{rec.clockOut ? new Date(rec.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1 font-medium">
                        <span>Duration:</span>
                        <span>{rec.durationMinutes ? `${rec.durationMinutes} min` : '—'}</span>
                      </div>
                    </Card>
                  ));
                })()}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setDailyDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleLayout>
  );
}
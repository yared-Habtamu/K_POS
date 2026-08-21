import { formatLocalizedDate } from "@/utils/ethiopian-calendar";
// src/pages/manager/MEmployeeManagement.tsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EthiopianDatePicker from "@/components/ui/ethiopian-date-picker";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  ChevronLeft,
  ChevronRight,
  Key,
} from "lucide-react";
import type { UserRole } from "@/types";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

// PDF Dependencies
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  createAttendance,
  deleteAttendance,
  fetchAttendance,
  updateAttendance,
  type AttendanceApiRecord,
} from "@/lib/api/attendance";
import {
  AdvancedFilters,
  type AdvancedFilterValues,
} from "@/components/ui/AdvancedFilters";

/** Manager can only assign these roles */
type ManagerAssignableRole = "cashier";

type Employee = {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  salary: number;
  status: "active" | "inactive";
  // optional runtime fields returned by the API
  permissions?: string[];
  martId?: string;
  username?: string;
};

type AttendanceRecord = {
  id: string; // unique per record
  employeeId: string;
  employeeName?: string;
  clockIn: string; // ISO
  clockOut: string | null; // ISO | null
  lunchOut: string | null;
  lunchBack: string | null;
  durationMinutes: number | null;
  date: string; // YYYY-MM-DD
};

// Manager-view employees are fetched from backend by martId

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
const formatDateKey = (date: Date) => date.toISOString().split("T")[0];
const formatDateTimeLocal = (date: Date) => date.toISOString().slice(0, 16);
const TODAY_KEY = formatDateKey(new Date());

const defaultEmployeeFilterValues: AdvancedFilterValues = {
  query: "",
  role: "all",
  sortBy: "name_asc",
};

const defaultAttendanceFilterValues: AdvancedFilterValues = {
  query: "",
  employeeId: "all",
  dateRange: "today",
  customRange: { from: TODAY_KEY, to: TODAY_KEY },
  sortBy: "latest",
};

const ITEMS_PER_PAGE = 7;

export default function MEmployeeManagement(): JSX.Element {
  console.log("✅ MEmployeeManagement loaded!");
  const { t } = useTranslation();

  const { user } = useAuthStore();
  const canDelete = user?.role === "owner";
  const token = user?.token;
  const martId = user?.martId;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | ManagerAssignableRole | "manager"
  >("all");
  const [employeeSortBy, setEmployeeSortBy] = useState("name_asc");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [pendingDeleteEmployee, setPendingDeleteEmployee] =
    useState<Employee | null>(null);

  // Attendance state
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activeClockIns, setActiveClockIns] = useState<Record<string, string>>(
    {},
  );

  // Manual attendance dialog
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [attendanceForm, setAttendanceForm] = useState({
    clockIn: "",
    lunchOut: "",
    lunchBack: "",
    clockOut: "",
  });
  const [editingAttendanceId, setEditingAttendanceId] = useState<string | null>(
    null,
  );
  const [editSubpageOpen, setEditSubpageOpen] = useState(false);

  // Monthly attendance dialog
  const [monthlyDialogOpen, setMonthlyDialogOpen] = useState(false);
  const [viewingEmployeeId, setViewingEmployeeId] = useState<string | null>(
    null,
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Daily detail dialog
  const [dailyDialogOpen, setDailyDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // New: Attendance View State
  const [activeTab, setActiveTab] = useState<"employees" | "attendance">(
    "employees",
  );
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceSortBy, setAttendanceSortBy] = useState("latest");
  const [attendanceFilter, setAttendanceFilter] = useState({
    employeeId: "all",
    dateRange: "today" as "today" | "this-week" | "this-month" | "custom",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [manualEntryForm, setManualEntryForm] = useState({
    employeeId: "",
    date: new Date().toISOString().split("T")[0],
    clockIn: "",
    lunchOut: "",
    lunchBack: "",
    clockOut: "",
  });

  // Permission state (fields optional to allow partial updates)
  const [permissions, setPermissions] = useState<
    Record<string, { discount?: boolean; transferStock?: boolean }>
  >({});

  // fetch employees for this mart
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!martId) return;
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "";
        const res = await fetch(`${API_BASE}/api/auth/users?martId=${martId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error("Failed to fetch employees");
        const data = await res.json();
        const list: Employee[] = data
          .filter((u: any) => u.role === "cashier")
          .map((u: any) => ({
            id: u._id || u.id,
            name: typeof u.name === "string" ? u.name : "",
            phone: typeof u.phone === "string" ? u.phone : "",
            role: u.role === "storeKeeper" ? "store_keeper" : u.role,
            salary: Number(u.salary) || 0,
            status: "active",
            permissions: u.permissions || [],
            martId: u.martId || u.martid || u.shopId,
          }));
        setEmployees(list);
      } catch (err) {
        console.error("fetch employees error", err);
      }
    };
    fetchEmployees();
  }, [martId]);

  const [form, setForm] = useState({
    username: "",
    name: "",
    phone: "",
    role: "cashier" as ManagerAssignableRole,
    salary: "",
    password: "",
    confirmPassword: "",
  });

  const roleOptions: ManagerAssignableRole[] = ["cashier"];

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = employees.filter((employee) => {
      if (employee.role === "manager") return false;
      const name =
        typeof employee.name === "string" ? employee.name.toLowerCase() : "";
      const phone =
        typeof employee.phone === "string" ? employee.phone.toLowerCase() : "";
      const username =
        typeof employee.username === "string"
          ? employee.username.toLowerCase()
          : "";
      const matchSearch =
        !query ||
        name.includes(query) ||
        phone.includes(query) ||
        username.includes(query);
      const matchRole = roleFilter === "all" || employee.role === roleFilter;
      return matchSearch && matchRole;
    });

    return filtered.sort((left, right) => {
      switch (employeeSortBy) {
        case "name_desc":
          return String(right.name || "").localeCompare(
            String(left.name || ""),
          );
        case "salary_asc":
          return Number(left.salary || 0) - Number(right.salary || 0);
        case "salary_desc":
          return Number(right.salary || 0) - Number(left.salary || 0);
        case "role_asc":
          return String(left.role || "").localeCompare(
            String(right.role || ""),
          );
        case "name_asc":
        default:
          return String(left.name || "").localeCompare(
            String(right.name || ""),
          );
      }
    });
  }, [employeeSortBy, employees, roleFilter, search]);

  useEffect(() => {
    setPermissions((prev) => {
      const next = { ...prev };
      employees.forEach((emp) => {
        if (emp.role === "cashier" && !next[emp.id]) {
          // initialize from backend permissions if present
          const has = (k: string) =>
            Array.isArray((emp as any).permissions) &&
            (emp as any).permissions.includes(k);
          next[emp.id] = {
            discount: has("discount"),
            transferStock: has("transferStock"),
          };
        }
      });
      Object.keys(next).forEach((id) => {
        if (!employees.find((e) => e.id === id)) delete next[id];
      });
      return next;
    });

    setActiveClockIns((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (!employees.find((e) => e.id === id)) delete next[id];
      });
      return next;
    });
  }, [employees]);

  const timeToHHmm = (timeRaw: string) => {
    const s = (timeRaw || "").trim();
    if (!s) return "";
    const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
    if (m24) {
      const hh = String(Math.max(0, Math.min(23, Number(m24[1])))).padStart(
        2,
        "0",
      );
      const mm = String(Math.max(0, Math.min(59, Number(m24[2])))).padStart(
        2,
        "0",
      );
      return `${hh}:${mm}`;
    }
    const m12 = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/);
    if (m12) {
      let hh = Number(m12[1]);
      const mm = Number(m12[2]);
      const ap = m12[3].toUpperCase();
      if (ap === "AM") {
        if (hh === 12) hh = 0;
      } else {
        if (hh !== 12) hh = hh + 12;
      }
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
    return "";
  };

  const isoFromDateAndTime = (dateYmd: string, timeRaw: string) => {
    if (timeRaw && timeRaw.includes("T")) {
      const d = new Date(timeRaw);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
    const hhmm = timeToHHmm(timeRaw);
    if (!dateYmd || !hhmm) return new Date(dateYmd || Date.now()).toISOString();
    return new Date(`${dateYmd}T${hhmm}:00`).toISOString();
  };

  const mapApiAttendance = (r: AttendanceApiRecord): AttendanceRecord => {
    const id = (r._id || r.id || "") as string;
    const employeeId = (r.employeeId || "") as string;
    const date = (r.dateYmd || "") as string;
    const clockInIso = isoFromDateAndTime(date, String(r.clockIn || ""));
    const clockOutIso = r.clockOut
      ? isoFromDateAndTime(date, String(r.clockOut))
      : null;
    const lunchOutIso = r.lunchOut
      ? isoFromDateAndTime(date, String(r.lunchOut))
      : null;
    const lunchBackIso = r.lunchBack
      ? isoFromDateAndTime(date, String(r.lunchBack))
      : null;
    return {
      id,
      employeeId,
      employeeName: r.employeeName || undefined,
      date,
      clockIn: clockInIso,
      clockOut: clockOutIso,
      lunchOut: lunchOutIso,
      lunchBack: lunchBackIso,
      durationMinutes:
        typeof r.durationMinutes === "number" ? r.durationMinutes : null,
    };
  };

  const refreshAttendance = async () => {
    if (!token) return;
    try {
      const data = await fetchAttendance({}, token);
      const allowedEmployeeIds = new Set(employees.map((emp) => emp.id));
      const mapped = (Array.isArray(data) ? data : [])
        .map(mapApiAttendance)
        .filter((record) => allowedEmployeeIds.has(record.employeeId));
      setAttendance(mapped);
      // derive open clock-ins
      const next: Record<string, string> = {};
      mapped.forEach((r) => {
        if (!r.clockOut) next[r.employeeId] = r.clockIn;
      });
      setActiveClockIns(next);
    } catch (e: any) {
      console.error("fetch attendance error", e);
      toast({
        title: "Failed to load attendance",
        description: e?.message || "Server error",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (activeTab !== "attendance") return;
    refreshAttendance();
  }, [activeTab, token, employees]);

  const resetForm = () => {
    setForm({
      username: "",
      name: "",
      phone: "",
      role: "cashier",
      salary: "",
      password: "",
      confirmPassword: "",
    });
    setEditingEmployee(null);
  };

  const handleEdit = (employee: Employee) => {
    const safeRole =
      employee.role === "cashier"
        ? (employee.role as ManagerAssignableRole)
        : "cashier";

    setEditingEmployee(employee);
    setForm({
      username: (employee as any).username || "",
      name: employee.name,
      phone: employee.phone,
      role: safeRole,
      salary: String(employee.salary),
      password: "",
      confirmPassword: "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API_BASE}/api/auth/users/${id}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error("Delete failed");
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      toast({ title: "Employee deleted successfully" });
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to delete employee" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.phone || !form.salary) {
      toast({ title: "Please fill required fields" });
      return;
    }

    if (editingEmployee) {
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "";
        const res = await fetch(
          `${API_BASE}/api/auth/users/${editingEmployee.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              name: form.name,
              phone: form.phone,
              role: form.role === "store_keeper" ? "storeKeeper" : form.role,
              salary: Number(form.salary),
              username: form.username || undefined,
            }),
          },
        );
        if (!res.ok) throw new Error("Failed to update");
        const updated = await res.json();
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === editingEmployee.id ? { ...emp, ...updated } : emp,
          ),
        );
        toast({ title: "Employee updated successfully" });
      } catch (err) {
        console.error(err);
        toast({ title: "Failed to update employee" });
      }
    } else {
      // ensure password confirmation matches when creating a new employee
      if (!form.password || form.password !== form.confirmPassword) {
        toast({
          title: "Passwords do not match",
          description: "Please ensure both passwords are the same",
          variant: "destructive",
        });
        return;
      }
      // create employee via backend
      try {
        const API_BASE = import.meta.env.VITE_API_URL || "";
        const apiRole =
          form.role === "store_keeper" ? "storeKeeper" : form.role;
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
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || "Failed to add employee");
        }
        const body = await res.json();
        const u = body.user;
        const newEmployee: Employee = {
          id: u.id || u._id,
          name: u.name,
          phone: u.phone,
          role: u.role === "storeKeeper" ? "store_keeper" : u.role,
          salary: u.salary || Number(form.salary),
          status: "active",
        };
        setEmployees((prev) => [...prev, newEmployee]);
        toast({ title: t("employee_added") || "Employee added" });
      } catch (err: any) {
        console.error(err);
        toast({
          title: "Failed to add employee",
          description: err?.message || "Server error",
        });
      }
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }
    try {
      const API_BASE = import.meta.env.VITE_API_URL || "";
      const res = await fetch(
        `${API_BASE}/api/auth/users/${passwordTarget.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ password: newPassword }),
        },
      );
      if (!res.ok) throw new Error("Failed to update password");
      toast({ title: "Password updated successfully" });
      setChangePasswordOpen(false);
      setNewPassword("");
      setPasswordTarget(null);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to update password", variant: "destructive" });
    }
  };

  // Open manual attendance dialog
  const handleOpenAttendanceDialog = (employeeId: string) => {
    setAttendanceForm({
      clockIn: "08:00",
      clockOut: "17:00",
    });
    setEditingAttendanceId(null);
    setSelectedEmployeeId(employeeId);
    setAttendanceDialogOpen(true);
  };

  const handleEditAttendance = (rec: AttendanceRecord) => {
    setEditingAttendanceId(rec.id || null);
    setSelectedEmployeeId(rec.employeeId);
    setAttendanceForm({
      clockIn: new Date(rec.clockIn).toTimeString().slice(0, 5),
      lunchOut: rec.lunchOut
        ? new Date(rec.lunchOut).toTimeString().slice(0, 5)
        : "",
      lunchBack: rec.lunchBack
        ? new Date(rec.lunchBack).toTimeString().slice(0, 5)
        : "",
      clockOut: rec.clockOut
        ? new Date(rec.clockOut).toTimeString().slice(0, 5)
        : "",
    });
    // clear manual entry form so top "Add Attendance Manually" isn't populated
    setManualEntryForm({
      employeeId: "",
      date: new Date().toISOString().split("T")[0],
      clockIn: "",
      lunchOut: "",
      lunchBack: "",
      clockOut: "",
    });
    setEditSubpageOpen(true);
  };

  // Save manual attendance
  const handleSaveAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;
    if (!employees.find((emp) => emp.id === selectedEmployeeId)) return;

    const clockInTime = attendanceForm.clockIn.includes("T")
      ? attendanceForm.clockIn.split("T")[1].slice(0, 5)
      : attendanceForm.clockIn;
    const lunchOutTime = attendanceForm.lunchOut
      ? attendanceForm.lunchOut.includes("T")
        ? attendanceForm.lunchOut.split("T")[1].slice(0, 5)
        : attendanceForm.lunchOut
      : "";
    const lunchBackTime = attendanceForm.lunchBack
      ? attendanceForm.lunchBack.includes("T")
        ? attendanceForm.lunchBack.split("T")[1].slice(0, 5)
        : attendanceForm.lunchBack
      : "";
    const clockOutTime = attendanceForm.clockOut
      ? attendanceForm.clockOut.includes("T")
        ? attendanceForm.clockOut.split("T")[1].slice(0, 5)
        : attendanceForm.clockOut
      : "";

    if (clockOutTime && clockOutTime <= clockInTime) {
      toast({
        title: "Invalid Time",
        description: "Clock-out must be after clock-in.",
      });
      return;
    }

    if (lunchOutTime && lunchBackTime && lunchBackTime <= lunchOutTime) {
      toast({
        title: "Invalid Time",
        description: "Lunch back must be after lunch out.",
      });
      return;
    }

    (async () => {
      if (!token) {
        toast({ title: "Not authenticated", variant: "destructive" });
        return;
      }

      const day = editingAttendanceId
        ? attendance.find((r) => r.id === editingAttendanceId)?.date ||
          formatDateKey(new Date())
        : formatDateKey(new Date());
      const emp = employees.find((e) => e.id === selectedEmployeeId);

      try {
        if (editingAttendanceId) {
          await updateAttendance(
            editingAttendanceId,
            {
              employeeId: selectedEmployeeId,
              employeeName: emp?.name || null,
              clockIn: clockInTime,
              lunchOut: lunchOutTime || null,
              lunchBack: lunchBackTime || null,
              clockOut: clockOutTime || null,
            },
            token,
          );
          setEditingAttendanceId(null);
        } else {
          await createAttendance(
            {
              employeeId: selectedEmployeeId,
              employeeName: emp?.name,
              dateYmd: day,
              clockIn: clockInTime,
              lunchOut: lunchOutTime || null,
              lunchBack: lunchBackTime || null,
              clockOut: clockOutTime || null,
            },
            token,
          );
        }

        await refreshAttendance();
        toast({ title: "Attendance Saved", description: "Saved to database." });
        setAttendanceDialogOpen(false);
        setEditSubpageOpen(false);
      } catch (e: any) {
        console.error("save attendance failed", e);
        toast({
          title: "Failed to save attendance",
          description: e?.message || "Server error",
          variant: "destructive",
        });
      }
    })();
  };

  const handleClockOutNow = (recordId: string) => {
    (async () => {
      if (!token) {
        toast({ title: "Not authenticated", variant: "destructive" });
        return;
      }
      try {
        const now = new Date();
        const nowHHmm = now.toTimeString().slice(0, 5);
        await updateAttendance(recordId, { clockOut: nowHHmm }, token);
        await refreshAttendance();
        toast({ title: "Clocked Out", description: "Saved to database." });
      } catch (e: any) {
        console.error("clock out now failed", e);
        toast({
          title: "Failed to clock out",
          description: e?.message || "Server error",
          variant: "destructive",
        });
      }
    })();
  };

  const handleDeleteAttendanceRecord = (recordId: string) => {
    if (!canDelete) return;
    (async () => {
      if (!token) {
        toast({ title: "Not authenticated", variant: "destructive" });
        return;
      }
      try {
        await deleteAttendance(recordId, token);
        await refreshAttendance();
        toast({
          title: "Attendance deleted",
          description: "Removed from database.",
        });
      } catch (e: any) {
        console.error("delete attendance failed", e);
        toast({
          title: "Failed to delete attendance",
          description: e?.message || "Server error",
          variant: "destructive",
        });
      }
    })();
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
    const allowedEmployeeIds = new Set(employees.map((emp) => emp.id));
    records = records.filter((record) =>
      allowedEmployeeIds.has(record.employeeId),
    );
    const query = attendanceSearch.trim().toLowerCase();

    if (attendanceFilter.employeeId !== "all") {
      records = records.filter(
        (r) => r.employeeId === attendanceFilter.employeeId,
      );
    }

    const start = new Date(attendanceFilter.startDate);
    const end = new Date(attendanceFilter.endDate);

    switch (attendanceFilter.dateRange) {
      case "today":
        const todayStr = formatDateKey(new Date());
        records = records.filter((r) => r.date === todayStr);
        break;
      case "this-week":
        const now = new Date(); // ✅ Unique name
        const firstDayOfWeek = new Date(now);
        firstDayOfWeek.setDate(now.getDate() - now.getDay());
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        records = records.filter((r) => {
          const d = new Date(r.date);
          return d >= firstDayOfWeek && d <= lastDayOfWeek;
        });
        break;
      case "this-month":
        const year = new Date().getFullYear();
        const month = new Date().getMonth();
        records = records.filter((r) => {
          const d = new Date(r.date);
          return d.getFullYear() === year && d.getMonth() === month;
        });
        break;
      case "custom":
        records = records.filter((r) => {
          const d = new Date(r.date);
          return d >= start && d <= end;
        });
        break;
    }

    records = records.filter((record) => {
      if (!query) return true;
      const employee = employees.find((item) => item.id === record.employeeId);
      const employeeName = String(
        employee?.name || record.employeeName || "",
      ).toLowerCase();
      const employeePhone = String(employee?.phone || "").toLowerCase();

      return (
        employeeName.includes(query) ||
        employeePhone.includes(query) ||
        String(record.date || "")
          .toLowerCase()
          .includes(query)
      );
    });

    return records.sort((left, right) => {
      switch (attendanceSortBy) {
        case "earliest":
          return (
            new Date(left.clockIn).getTime() - new Date(right.clockIn).getTime()
          );
        case "duration_desc":
          return (
            Number(right.durationMinutes || 0) -
            Number(left.durationMinutes || 0)
          );
        case "duration_asc":
          return (
            Number(left.durationMinutes || 0) -
            Number(right.durationMinutes || 0)
          );
        case "latest":
        default:
          return (
            new Date(right.clockIn).getTime() - new Date(left.clockIn).getTime()
          );
      }
    });
  }, [
    attendance,
    attendanceFilter,
    attendanceSearch,
    attendanceSortBy,
    employees,
  ]);

  const shiftAttendanceDay = (delta: number) => {
    const baseStr =
      attendanceFilter.dateRange === "custom"
        ? attendanceFilter.startDate
        : formatDateKey(new Date());
    const base = new Date(baseStr);
    base.setDate(base.getDate() + delta);
    const nextStr = formatDateKey(base);
    const today = formatDateKey(new Date());
    if (nextStr > today) return;
    setAttendanceFilter((prev) => ({
      ...prev,
      dateRange: "custom",
      startDate: nextStr,
      endDate: nextStr,
    }));
  };

  // Handle manual entry save
  const handleSaveManualEntry = async () => {
    const { employeeId, date, clockIn, lunchOut, lunchBack, clockOut } = manualEntryForm;

    if (!employeeId || !date || !clockIn) {
      toast({ title: "Please fill employee, date and clock-in" });
      return;
    }
    if (!employees.find((emp) => emp.id === employeeId)) return;

    if (clockOut && clockOut <= clockIn) {
      toast({
        title: "Invalid Time",
        description: "Clock-out must be after clock-in.",
      });
      return;
    }

    if (lunchOut && lunchBack && lunchBack <= lunchOut) {
      toast({
        title: "Invalid Time",
        description: "Lunch back must be after lunch out.",
      });
      return;
    }

    if (!token) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }

    try {
      const emp = employees.find((e) => e.id === employeeId);
      await createAttendance(
        {
          employeeId,
          employeeName: emp?.name,
          dateYmd: date,
          clockIn,
          lunchOut: lunchOut || null,
          lunchBack: lunchBack || null,
          clockOut: clockOut || null,
        },
        token,
      );
      await refreshAttendance();
      toast({ title: "Attendance Saved", description: "Saved to database." });
      setManualEntryForm({
        employeeId: "",
        date: formatDateKey(new Date()),
        clockIn: "",
        lunchOut: "",
        lunchBack: "",
        clockOut: "",
      });
    } catch (e: any) {
      console.error("manual entry save failed", e);
      toast({
        title: "Failed to save attendance",
        description: e?.message || "Server error",
        variant: "destructive",
      });
    }
  };

  // Export to CSV
  const exportAttendanceToCSV = () => {
    if (filteredAttendance.length === 0) {
      toast({ title: "No attendance data to export" });
      return;
    }

    const headers = [
      "Employee Name",
      "Date",
      "Clock In",
      "Lunch Out",
      "Lunch Back",
      "Clock Out",
      "Duration (min)",
    ];
    const rows = filteredAttendance.map((rec) => {
      const emp = employees.find((e) => e.id === rec.employeeId);
      const inTime = formatLocalizedDate(rec.clockIn, { withTime: true });
      const lunchOutTime = rec.lunchOut
        ? formatLocalizedDate(rec.lunchOut, { withTime: true })
        : "—";
      const lunchBackTime = rec.lunchBack
        ? formatLocalizedDate(rec.lunchBack, { withTime: true })
        : "—";
      const outTime = rec.clockOut
        ? formatLocalizedDate(rec.clockOut, { withTime: true })
        : "—";
      return `"${emp?.name || "Unknown"}", "${formatLocalizedDate(rec.date)}", "${inTime}", "${lunchOutTime}", "${lunchBackTime}", "${outTime}", "${rec.durationMinutes ?? "—"}"`;
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `attendance_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to PDF
  const exportAttendanceToPDF = async () => {
    if (filteredAttendance.length === 0) {
      toast({ title: "No attendance data to export" });
      return;
    }

    const pdfContent = document.createElement("div");
    pdfContent.style.padding = "20px";
    pdfContent.style.width = "800px";
    pdfContent.style.fontFamily = "Arial, sans-serif";
    pdfContent.style.fontSize = "14px";

    const title = document.createElement("h2");
    title.textContent = "Attendance Report";
    title.style.textAlign = "center";
    title.style.marginBottom = "20px";
    title.style.color = "#1f2937";
    pdfContent.appendChild(title);

    // Summary
    const totalRecords = filteredAttendance.length;
    const totalHours =
      filteredAttendance.reduce(
        (sum, rec) => sum + (rec.durationMinutes || 0),
        0,
      ) / 60;
    const avgHours =
      totalRecords > 0 ? (totalHours / totalRecords).toFixed(1) : "0";

    const summary = document.createElement("div");
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
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.marginTop = "20px";
    table.innerHTML = `
      <thead>
        <tr>
          <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left; background: #f9fafb; font-weight: 600;">Employee</th>
          <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left; background: #f9fafb; font-weight: 600;">Date</th>
          <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left; background: #f9fafb; font-weight: 600;">Clock In</th>
          <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left; background: #f9fafb; font-weight: 600;">Lunch Out</th>
          <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left; background: #f9fafb; font-weight: 600;">Lunch Back</th>
          <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left; background: #f9fafb; font-weight: 600;">Clock Out</th>
          <th style="border: 1px solid #e5e7eb; padding: 10px; text-align: left; background: #f9fafb; font-weight: 600;">Duration</th>
        </tr>
      </thead>
    `;

    const tbody = document.createElement("tbody");
    if (filteredAttendance.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #9ca3af;">No attendance data</td></tr>`;
    } else {
      filteredAttendance.forEach((rec) => {
        const emp = employees.find((e) => e.id === rec.employeeId);
        const row = document.createElement("tr");
        row.innerHTML = `
          <td style="border: 1px solid #e5e7eb; padding: 10px;">${escapeHtml(emp?.name || "Unknown")}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px;">${escapeHtml(rec.date)}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px;">${escapeHtml(new Date(rec.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px;">${escapeHtml(rec.lunchOut ? new Date(rec.lunchOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—")}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px;">${escapeHtml(rec.lunchBack ? new Date(rec.lunchBack).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—")}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px;">${escapeHtml(rec.clockOut ? new Date(rec.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—")}</td>
          <td style="border: 1px solid #e5e7eb; padding: 10px;">${escapeHtml(rec.durationMinutes ? `${rec.durationMinutes} min` : "—")}</td>
        `;
        tbody.appendChild(row);
      });
    }
    table.appendChild(tbody);
    pdfContent.appendChild(table);

    document.body.appendChild(pdfContent);
    pdfContent.style.position = "absolute";
    pdfContent.style.left = "-10000px";

    try {
      const canvas = await html2canvas(pdfContent, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `attendance_report_${new Date().toISOString().split("T")[0]}.pdf`,
      );
    } catch (error) {
      console.error("PDF export failed:", error);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      document.body.removeChild(pdfContent);
    }
  };

  // === END ATTENDANCE TAB FEATURES ===

  const toggleDiscountPermission = async (
    employeeId: string,
    value: boolean,
  ) => {
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return;

    // Managers cannot modify other managers; store-keepers are not allowed to have discount permission
    if (employee.role === "manager") {
      toast({
        title: "Not allowed",
        description: "You cannot modify other managers.",
        variant: "destructive",
      });
      return;
    }
    if (employee.role === "store_keeper") {
      toast({
        title: "Not allowed",
        description:
          "Store keepers cannot be assigned the discount permission.",
        variant: "destructive",
      });
      return;
    }

    // optimistic UI update
    setPermissions((prev) => ({
      ...prev,
      [employeeId]: { ...(prev[employeeId] || {}), discount: value },
    }));

    try {
      // build permissions array from employee.permissions
      const cur = Array.isArray((employee as any).permissions)
        ? [...(employee as any).permissions]
        : [];
      const idx = cur.indexOf("discount");
      if (value && idx === -1) cur.push("discount");
      if (!value && idx !== -1) cur.splice(idx, 1);

      const API_BASE = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API_BASE}/api/auth/users/${employeeId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ permissions: cur }),
      });
      if (!res.ok) throw new Error("Failed to save permission");

      // update employee permissions locally
      setEmployees((prev) =>
        prev.map((e) => (e.id === employeeId ? { ...e, permissions: cur } : e)),
      );

      toast({
        title: `Discount permission ${value ? "enabled" : "disabled"} for ${employee.name}`,
      });
    } catch (err) {
      // rollback
      setPermissions((prev) => ({
        ...prev,
        [employeeId]: { discount: !value },
      }));
      console.error("save permission err", err);
      toast({ title: "Failed to save permission", description: String(err) });
    }
  };

  const toggleTransferStockPermission = async () => {
    toast({
      title: "Not allowed",
      description: "Manager cannot manage store keeper permissions.",
      variant: "destructive",
    });
  };

  const getInitials = (name: string) =>
    (name || "")
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase();

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "manager":
        return "default";
      case "cashier":
        return "secondary";
      case "store_keeper":
        return "outline";
      default:
        return "secondary";
    }
  };

  const cashiers = filteredEmployees.filter((e) => e.role === "cashier");

  // ===== PAGINATION FOR EMPLOYEES =====
  const [employeePage, setEmployeePage] = useState(1);
  const employeeTotalPages = Math.ceil(
    filteredEmployees.length / ITEMS_PER_PAGE,
  );
  const employeeStartIndex = (employeePage - 1) * ITEMS_PER_PAGE;
  const paginatedEmployees = filteredEmployees.slice(
    employeeStartIndex,
    employeeStartIndex + ITEMS_PER_PAGE,
  );

  const goToEmployeePage = (page: number) => {
    if (page >= 1 && page <= employeeTotalPages) setEmployeePage(page);
  };

  const nextEmployeePage = () => {
    if (employeePage < employeeTotalPages) setEmployeePage(employeePage + 1);
  };
  const prevEmployeePage = () => {
    if (employeePage > 1) setEmployeePage(employeePage - 1);
  };

  useEffect(() => {
    setEmployeePage(1);
  }, [employeeSortBy, roleFilter, search]);

  // Compute monthly attendance data
  const monthlyAttendanceData = useMemo(() => {
    if (!viewingEmployeeId)
      return { presentDays: new Set<string>(), weekdays: [] };

    const records = attendance.filter(
      (r) => r.employeeId === viewingEmployeeId,
    );
    const presentDays = new Set<string>();

    records.forEach((rec) => {
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
  const totalPresent = Array.from(presentDays).filter((date) => {
    const d = new Date(date);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  }).length;
  const totalAbsent = totalWeekdays - totalPresent;

  return (
    <RoleLayout allowedRoles={["manager"]}>
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex border-b">
          <Button
            variant={activeTab === "employees" ? "default" : "ghost"}
            onClick={() => setActiveTab("employees")}
            className="rounded-none"
          >
            Employees
          </Button>
          <Button
            variant={activeTab === "attendance" ? "default" : "ghost"}
            onClick={() => setActiveTab("attendance")}
            className="rounded-none"
          >
            Attendance
          </Button>
        </div>

        {activeTab === "employees" && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">
                  {t("employees") || "Employees"}
                </h1>
                <p className="text-muted-foreground">
                  Manage your team members
                </p>
              </div>

              {/* Manager is not allowed to add employees; Add UI intentionally removed */}
            </div>

            <Card>
              <CardContent className="p-4">
                <AdvancedFilters
                  title="Search and filter employees"
                  description="Find team members by name, username, phone, role, or sort order."
                  fields={[
                    {
                      key: "query",
                      label: "Search",
                      type: "search",
                      placeholder: "Search by name, username, or phone",
                    },
                    {
                      key: "role",
                      label: "Role",
                      type: "select",
                      placeholder: "All roles",
                      options: [
                        { label: "All Roles", value: "all" },
                        ...roleOptions.map((role) => ({
                          label: t(role) || role,
                          value: role,
                        })),
                      ],
                    },
                    {
                      key: "sortBy",
                      label: "Sort by",
                      type: "select",
                      placeholder: "Name A -> Z",
                      options: [
                        { label: "Name A -> Z", value: "name_asc" },
                        { label: "Name Z -> A", value: "name_desc" },
                        { label: "Salary Low -> High", value: "salary_asc" },
                        { label: "Salary High -> Low", value: "salary_desc" },
                        { label: "Role A -> Z", value: "role_asc" },
                      ],
                    },
                  ]}
                  values={{
                    query: search,
                    role: roleFilter,
                    sortBy: employeeSortBy,
                  }}
                  onValuesChange={(values) => {
                    setSearch(String(values.query || ""));
                    setRoleFilter(
                      String(values.role || "all") as
                        | "all"
                        | ManagerAssignableRole
                        | "manager",
                    );
                    setEmployeeSortBy(String(values.sortBy || "name_asc"));
                  }}
                  onReset={() => {
                    setSearch(String(defaultEmployeeFilterValues.query));
                    setRoleFilter(
                      String(defaultEmployeeFilterValues.role) as
                        | "all"
                        | ManagerAssignableRole
                        | "manager",
                    );
                    setEmployeeSortBy(
                      String(defaultEmployeeFilterValues.sortBy),
                    );
                  }}
                  showActiveBadges={false}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t("employees") || "Employees"}
                  <Badge variant="secondary" className="ml-2">
                    {filteredEmployees.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">No</TableHead>
                        <TableHead>{t("employee_name") || "Name"}</TableHead>
                        <TableHead>{t("phone") || "Phone"}</TableHead>
                        <TableHead>{t("role") || "Role"}</TableHead>
                        <TableHead className="text-right">
                          {t("salary") || "Salary"}
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">
                          {t("actions") || "Actions"}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEmployees.map((e, index) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-center text-muted-foreground">
                            {employeeStartIndex + index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                  {getInitials(e.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{e.name}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {e.phone}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(e.role)}>
                              {t(e.role) || e.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <DollarSign className="h-3 w-3 text-muted-foreground" />
                              {e.salary.toLocaleString()} ETB
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                e.status === "active" ? "secondary" : "outline"
                              }
                            >
                              {e.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 items-center">
                              {/* attendance handled on attendance tab */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setPasswordTarget(e);
                                  setChangePasswordOpen(true);
                                }}
                                title="Change Password"
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(e)}
                                title="Edit Employee"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setPendingDeleteEmployee(e)}
                                  className="text-destructive hover:text-destructive"
                                  title="Delete Employee"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            {attendance.filter((r) => r.employeeId === e.id)
                              .length > 0 && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {attendance
                                  .filter((r) => r.employeeId === e.id)
                                  .slice(-3)
                                  .reverse()
                                  .map((rec, i) => (
                                    <div
                                      key={i}
                                      className="flex justify-between"
                                    >
                                      <div>
                                        {formatLocalizedDate(rec.clockIn, { withTime: true })}
                                      </div>
                                      <div>
                                        {rec.clockOut
                                          ? `${rec.durationMinutes}m`
                                          : "—"}
                                      </div>
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
                {/* EMPLOYEE PAGINATION */}
                {employeeTotalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-3 border-t border-border mt-4">
                    <div className="text-xs text-muted-foreground mb-2 sm:mb-0">
                      Showing{" "}
                      <span className="font-medium">
                        {employeeStartIndex + 1}
                      </span>
                      –
                      <span className="font-medium">
                        {Math.min(
                          employeeStartIndex + ITEMS_PER_PAGE,
                          filteredEmployees.length,
                        )}
                      </span>{" "}
                      of
                      <span className="font-medium">
                        {" "}
                        {filteredEmployees.length}
                      </span>{" "}
                      employees
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

                      {Array.from(
                        { length: employeeTotalPages },
                        (_, i) => i + 1,
                      ).map((page) => (
                        <Button
                          key={page}
                          variant={
                            employeePage === page ? "default" : "outline"
                          }
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
                  Manage Team Permissions
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Control which actions your team members are allowed to perform
                  in the POS system.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {cashiers.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">
                      Cashier Permissions
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Assign front-desk permissions
                    </p>
                    <div className="space-y-3">
                      {cashiers.map((emp) => (
                        <div
                          key={emp.id}
                          className="flex items-center justify-between p-3 bg-background rounded-lg border"
                        >
                          <div>
                            <p className="text-sm font-medium">{emp.name}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground">
                              Apply Discounts
                            </span>
                            <Switch
                              checked={!!permissions[emp.id]?.discount}
                              onCheckedChange={(v) =>
                                toggleDiscountPermission(emp.id, v)
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cashiers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No team members to manage permissions for.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === "attendance" && (
          <>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold">Attendance</h1>
                <p className="text-muted-foreground">
                  Track and manage employee attendance
                </p>
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
                <AdvancedFilters
                  title="Search and filter attendance"
                  description="Search attendance by employee or date, adjust the date window, and sort records."
                  fields={[
                    {
                      key: "query",
                      label: "Search",
                      type: "search",
                      placeholder: "Search by employee name, phone, or date",
                    },
                    {
                      key: "employeeId",
                      label: "Employee",
                      type: "select",
                      placeholder: "All employees",
                      options: [
                        { label: "All Employees", value: "all" },
                        ...filteredEmployees.map((employee) => ({
                          label: employee.name,
                          value: employee.id,
                        })),
                      ],
                    },
                    {
                      key: "dateRange",
                      label: "Date range",
                      type: "select",
                      placeholder: "Today",
                      options: [
                        { label: "Today", value: "today" },
                        { label: "This Week", value: "this-week" },
                        { label: "This Month", value: "this-month" },
                        { label: "Custom Range", value: "custom" },
                      ],
                    },
                    {
                      key: "customRange",
                      label: "Custom range",
                      type: "date-range",
                      fromLabel: "Start date",
                      toLabel: "End date",
                    },
                    {
                      key: "sortBy",
                      label: "Sort by",
                      type: "select",
                      placeholder: "Latest first",
                      options: [
                        { label: "Latest First", value: "latest" },
                        { label: "Earliest First", value: "earliest" },
                        {
                          label: "Duration High -> Low",
                          value: "duration_desc",
                        },
                        {
                          label: "Duration Low -> High",
                          value: "duration_asc",
                        },
                      ],
                    },
                  ]}
                  values={{
                    query: attendanceSearch,
                    employeeId: attendanceFilter.employeeId,
                    dateRange: attendanceFilter.dateRange,
                    customRange: {
                      from: attendanceFilter.startDate,
                      to: attendanceFilter.endDate,
                    },
                    sortBy: attendanceSortBy,
                  }}
                  onValuesChange={(values) => {
                    const customRange = values.customRange as
                      | { from?: string; to?: string }
                      | undefined;
                    const today = formatDateKey(new Date());
                    const nextDateRange = String(
                      values.dateRange || "today",
                    ) as "today" | "this-week" | "this-month" | "custom";
                    const from =
                      customRange?.from && customRange.from <= today
                        ? customRange.from
                        : today;
                    const to =
                      customRange?.to && customRange.to <= today
                        ? customRange.to
                        : from;

                    setAttendanceSearch(String(values.query || ""));
                    setAttendanceSortBy(String(values.sortBy || "latest"));
                    setAttendanceFilter((prev) => ({
                      ...prev,
                      employeeId: String(values.employeeId || "all"),
                      dateRange: nextDateRange,
                      startDate:
                        nextDateRange === "custom" ? from : prev.startDate,
                      endDate: nextDateRange === "custom" ? to : prev.endDate,
                    }));
                  }}
                  onReset={() => {
                    setAttendanceSearch(
                      String(defaultAttendanceFilterValues.query),
                    );
                    setAttendanceSortBy(
                      String(defaultAttendanceFilterValues.sortBy),
                    );
                    setAttendanceFilter({
                      employeeId: "all",
                      dateRange: "today",
                      startDate: TODAY_KEY,
                      endDate: TODAY_KEY,
                    });
                  }}
                  showActiveBadges={false}
                />
              </CardContent>
            </Card>

            {/* Manual Entry Form */}
            {!editSubpageOpen && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Attendance Manually</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                      <Label>Employee</Label>
                      <Select
                        value={manualEntryForm.employeeId}
                        onValueChange={(v) =>
                          setManualEntryForm((prev) => ({
                            ...prev,
                            employeeId: v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredEmployees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date</Label>
                      <EthiopianDatePicker
                        value={manualEntryForm.date}
                        onChange={(ymd) => {
                          setManualEntryForm((prev) => ({
                            ...prev,
                            date: ymd,
                          }));
                        }}
                        disableFuture
                      />
                    </div>
                    <div>
                      <Label>Clock In</Label>
                      <Input
                        type="time"
                        value={manualEntryForm.clockIn}
                        onChange={(e) =>
                          setManualEntryForm((prev) => ({
                            ...prev,
                            clockIn: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Lunch Out</Label>
                      <Input
                        type="time"
                        value={manualEntryForm.lunchOut}
                        onChange={(e) =>
                          setManualEntryForm((prev) => ({
                            ...prev,
                            lunchOut: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Lunch Back</Label>
                      <Input
                        type="time"
                        value={manualEntryForm.lunchBack}
                        onChange={(e) =>
                          setManualEntryForm((prev) => ({
                            ...prev,
                            lunchBack: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Clock Out</Label>
                      <Input
                        type="time"
                        value={manualEntryForm.clockOut}
                        onChange={(e) =>
                          setManualEntryForm((prev) => ({
                            ...prev,
                            clockOut: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-end sm:col-span-2 md:col-span-3 lg:col-span-6 justify-end">
                      <Button onClick={handleSaveManualEntry}>
                        Save Attendance
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attendance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Records</CardTitle>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredAttendance.length} records
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => shiftAttendanceDay(-1)}
                      aria-label="Previous day"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-medium">
                      {formatLocalizedDate(
                        attendanceFilter.dateRange === "custom"
                          ? attendanceFilter.startDate
                          : new Date().toISOString().split("T")[0],
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => shiftAttendanceDay(1)}
                      aria-label="Next day"
                    >
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
                        <TableHead>Lunch Out</TableHead>
                        <TableHead>Lunch Back</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendance.map((rec) => {
                        const emp = employees.find(
                          (e) => e.id === rec.employeeId,
                        );
                        const isPast = rec.date < formatDateKey(new Date());
                        return (
                          <TableRow key={rec.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {getInitials(emp?.name || "")}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{emp?.name || "Unknown"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{formatLocalizedDate(rec.date)}</TableCell>
                            <TableCell>
                              {new Date(rec.clockIn).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell>
                              {rec.lunchOut
                                ? new Date(rec.lunchOut).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {rec.lunchBack
                                ? new Date(rec.lunchBack).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {rec.clockOut
                                ? new Date(rec.clockOut).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                  )
                                : "—"}
                            </TableCell>
                            <TableCell>
                              {rec.durationMinutes
                                ? `${rec.durationMinutes} min`
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {!rec.lunchOut && !rec.clockOut && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      if (!token) return;
                                      try {
                                        const nowHHmm = new Date().toTimeString().slice(0, 5);
                                        await updateAttendance(rec.id, { lunchOut: nowHHmm }, token);
                                        await refreshAttendance();
                                        toast({ title: "Lunch Out recorded" });
                                      } catch (e: any) {
                                        toast({ title: "Failed to record lunch out", variant: "destructive" });
                                      }
                                    }}
                                  >
                                    Lunch Out
                                  </Button>
                                )}
                                {rec.lunchOut && !rec.lunchBack && !rec.clockOut && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      if (!token) return;
                                      try {
                                        const nowHHmm = new Date().toTimeString().slice(0, 5);
                                        await updateAttendance(rec.id, { lunchBack: nowHHmm }, token);
                                        await refreshAttendance();
                                        toast({ title: "Lunch Back recorded" });
                                      } catch (e: any) {
                                        toast({ title: "Failed to record lunch back", variant: "destructive" });
                                      }
                                    }}
                                  >
                                    Lunch Back
                                  </Button>
                                )}
                                {(!rec.clockOut || rec.clockOut === null) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleClockOutNow(rec.id)}
                                  >
                                    Clock Out Now
                                  </Button>
                                )}
                                {!isPast && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditAttendance(rec)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    {canDelete && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            aria-label="Delete attendance"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>
                                              Delete attendance record?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Delete the attendance record for{" "}
                                              {emp?.name ||
                                                rec.employeeName ||
                                                "this employee"}{" "}
                                              on {formatLocalizedDate(rec.date)}? This action cannot be
                                              undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>
                                              Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              onClick={() =>
                                                handleDeleteAttendanceRecord(
                                                  rec.id,
                                                )
                                              }
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </>
                                )}
                              </div>
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
        <Dialog
          open={attendanceDialogOpen}
          onOpenChange={setAttendanceDialogOpen}
        >
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Set Attendance</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {selectedEmployeeId
                  ? `For: ${employees.find((e) => e.id === selectedEmployeeId)?.name}`
                  : ""}
              </p>
            </DialogHeader>
            <form onSubmit={handleSaveAttendance} className="space-y-4">
              <div className="space-y-2">
                <Label>Clock In</Label>
                <Input
                  type="time"
                  value={attendanceForm.clockIn}
                  onChange={(e) =>
                    setAttendanceForm({
                      ...attendanceForm,
                      clockIn: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Clock Out</Label>
                <Input
                  type="time"
                  value={attendanceForm.clockOut}
                  onChange={(e) =>
                    setAttendanceForm({
                      ...attendanceForm,
                      clockOut: e.target.value,
                    })
                  }
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAttendanceDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Attendance</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
            <div className="w-full sm:w-1/2 lg:w-1/3 h-full bg-white shadow-xl overflow-auto p-6">
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
              <form onSubmit={handleSaveAttendance} className="space-y-4">
                <div>
                  <Label>Employee</Label>
                  <Select
                    value={selectedEmployeeId || ""}
                    onValueChange={(v) => setSelectedEmployeeId(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Clock In</Label>
                  <Input
                    type="time"
                    value={attendanceForm.clockIn}
                    onChange={(e) =>
                      setAttendanceForm((prev) => ({
                        ...prev,
                        clockIn: e.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label>Lunch Out</Label>
                  <Input
                    type="time"
                    value={attendanceForm.lunchOut}
                    onChange={(e) =>
                      setAttendanceForm((prev) => ({
                        ...prev,
                        lunchOut: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Lunch Back</Label>
                  <Input
                    type="time"
                    value={attendanceForm.lunchBack}
                    onChange={(e) =>
                      setAttendanceForm((prev) => ({
                        ...prev,
                        lunchBack: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Clock Out</Label>
                  <Input
                    type="time"
                    value={attendanceForm.clockOut}
                    onChange={(e) =>
                      setAttendanceForm((prev) => ({
                        ...prev,
                        clockOut: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    type="button"
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

        {/* Monthly Attendance Dialog */}
        <Dialog open={monthlyDialogOpen} onOpenChange={setMonthlyDialogOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Monthly Attendance</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {viewingEmployeeId
                  ? `${employees.find((e) => e.id === viewingEmployeeId)?.name} - ${new Date(selectedYear, selectedMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`
                  : ""}
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
                      {new Date(0, i).toLocaleDateString("en-US", {
                        month: "short",
                      })}
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
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const firstDay = new Date(
                  selectedYear,
                  selectedMonth,
                  1,
                ).getDay();
                const daysInMonth = new Date(
                  selectedYear,
                  selectedMonth + 1,
                  0,
                ).getDate();

                const cells = [];
                for (let i = 0; i < firstDay; i++) {
                  cells.push(<div key={`empty-${i}`} className="h-8"></div>);
                }
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(selectedYear, selectedMonth, day);
                  const dateKey = formatDateKey(date);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isPresent = presentDays.has(dateKey);

                  let bgColor = "bg-background border";
                  if (!isWeekend) {
                    bgColor = isPresent
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800";
                  }

                  if (isWeekend) {
                    cells.push(
                      <div
                        key={day}
                        className={`h-8 flex items-center justify-center text-xs rounded ${bgColor}`}
                      >
                        {day}
                      </div>,
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
                        title={isPresent ? "Click for details" : "Absent"}
                      >
                        {day}
                      </button>,
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
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Attendance on {selectedDate?.toDateString()}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {viewingEmployeeId &&
                  employees.find((e) => e.id === viewingEmployeeId)?.name}
              </p>
            </DialogHeader>
            {selectedDate && viewingEmployeeId && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {(() => {
                  const dateKey = formatDateKey(selectedDate);
                  const recordsOnDay = attendance.filter((rec) => {
                    const recDate = formatDateKey(new Date(rec.clockIn));
                    return (
                      recDate === dateKey &&
                      rec.employeeId === viewingEmployeeId
                    );
                  });

                  if (recordsOnDay.length === 0) {
                    return (
                      <p className="text-muted-foreground">
                        No attendance records for this day.
                      </p>
                    );
                  }

                  return recordsOnDay.map((rec, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex justify-between text-sm">
                        <span>Clock In:</span>
                        <span>
                          {new Date(rec.clockIn).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Clock Out:</span>
                        <span>
                          {rec.clockOut
                            ? new Date(rec.clockOut).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1 font-medium">
                        <span>Duration:</span>
                        <span>
                          {rec.durationMinutes
                            ? `${rec.durationMinutes} min`
                            : "—"}
                        </span>
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

        <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Change Password for {passwordTarget?.name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  minLength={6}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChangePasswordOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Password</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={Boolean(pendingDeleteEmployee)}
          onOpenChange={(open) => {
            if (!open) setPendingDeleteEmployee(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete employee?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDeleteEmployee
                  ? `This will permanently delete ${pendingDeleteEmployee.name || "this employee"}.`
                  : "This action will permanently delete the selected employee."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (!pendingDeleteEmployee) return;
                  void handleDelete(pendingDeleteEmployee.id);
                  setPendingDeleteEmployee(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleLayout>
  );
}

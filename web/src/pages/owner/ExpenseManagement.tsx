import { useEffect, useState } from "react";
import { getImageUrl, handleImageError } from "@/utils/imageUrl";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wallet,
  Plus,
  FileDown,
  Search,
  Trash2,
  Edit,
  Home,
  Zap,
  Droplets,
  Sparkles,
  MoreHorizontal,
  Users,
  TrendingDown,
  Loader2,
  Camera,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import EthiopianDatePicker from "@/components/ui/ethiopian-date-picker";
import { formatLocalizedDate, ethiopianMonthLabel } from "@/utils/ethiopian-calendar";
import { toast } from "sonner";
import type { Expense, ExpenseCategory } from "@/types";
import { useProductStore } from "@/stores/productStore";
import { AutoComplete } from "@/components/ui/AutoComplete";
import { useAuthStore } from "@/stores/authStore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const expenseCategories: {
  value: ExpenseCategory;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    value: "salary",
    label: "salary_expense",
    icon: Users,
    color: "hsl(var(--chart-1))",
  },
  { value: "rent", label: "rent", icon: Home, color: "hsl(var(--chart-2))" },
  {
    value: "electricity",
    label: "electricity",
    icon: Zap,
    color: "hsl(var(--chart-3))",
  },
  {
    value: "water",
    label: "water",
    icon: Droplets,
    color: "hsl(var(--chart-4))",
  },
  {
    value: "cleaning",
    label: "cleaning",
    icon: Sparkles,
    color: "hsl(var(--chart-5))",
  },
  {
    value: "miscellaneous",
    label: "miscellaneous",
    icon: MoreHorizontal,
    color: "hsl(var(--muted-foreground))",
  },
];

const ITEMS_PER_PAGE = 7; // ✅ 7 items per page

export default function ExpenseManagement() {
  const { t } = useTranslation();
  const [paymentOptions, setPaymentOptions] = useState([
    { id: "cash", label: t("cash") },
    { id: "card", label: t("card") },
    { id: "mobile", label: t("mobile") },
    { id: "transfer", label: t("transfer") },
    { id: "other", label: t("other") },
  ] as { id: string; label: string }[]);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const auth = useAuthStore((s) => s.user);
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";
  // localStorage helpers to persist created payment types across refreshes
  const localPaymentKey = (martId?: string) =>
    `pos:local:payment-types:${martId || "global"}`;
  const loadLocalPaymentTypes = (martId?: string) => {
    try {
      // Load mart-specific first, then global fallback; dedupe by id
      const keys = [] as string[];
      if (martId) keys.push(localPaymentKey(martId));
      keys.push(localPaymentKey(undefined));
      const merged: { id: string; label: string }[] = [];
      const seen = new Set<string>();
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const arr = (JSON.parse(raw) as { id: string; label: string }[]) || [];
        for (const it of arr) {
          if (!it || !it.id) continue;
          if (seen.has(it.id)) continue;
          seen.add(it.id);
          merged.push(it);
        }
      }
      return merged;
    } catch {
      return [] as { id: string; label: string }[];
    }
  };
  const saveLocalPaymentType = (
    martId: string | undefined,
    item: { id: string; label: string },
  ) => {
    try {
      const list = loadLocalPaymentTypes(martId);
      if (!list.find((l) => l.id === item.id)) list.push(item);
      localStorage.setItem(localPaymentKey(martId), JSON.stringify(list));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = auth?.token;
        const martId = auth?.martId;
        const serverItems: { id: string; label: string }[] = [];
        if (martId && API_BASE) {
          const res = await fetch(
            `${API_BASE}/api/payment-types?martId=${martId}`,
            {
              headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
            },
          );
          if (res.ok) {
            const list = await res.json().catch(() => []);
            if (Array.isArray(list)) {
              const normalized = list.map((p: any) => {
                if (typeof p === "string")
                  return { id: String(p), label: String(p) };
                const id = String(p._id || p.id || p.name || "");
                const label = String(p.label || p.name || id || "");
                return { id, label };
              });
              serverItems.push(...normalized);
            }
          }
        }
        const localItems = loadLocalPaymentTypes(auth?.martId);
        const items = [...localItems, ...serverItems];
        if (!mounted) return;
        setPaymentOptions((cur) => {
          const merged = [...items, ...cur];
          const seen = new Set<string>();
          return merged.filter((it) => {
            if (seen.has(it.id)) return false;
            seen.add(it.id);
            return true;
          });
        });
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [API_BASE, auth?.martId]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState<
    "all" | "owner" | "manager"
  >("all");
  const [managerFilter, setManagerFilter] = useState("all");
  const [managers, setManagers] = useState<
    Array<{ id: string; name: string }>
  >([]);
  // month filter formatted as YYYY-MM; empty = all
  const [monthFilter, setMonthFilter] = useState<string>(() =>
    new Date().toISOString().slice(0, 7),
  );
  const [exactDate, setExactDate] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("all");

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const addDaysToStr = (dateStr: string, days: number): string => {
    const cur = dateStr || getTodayStr();
    const [y, m, d] = cur.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const handlePrevDay = () => {
    const baseStr = exactDate || (monthFilter ? `${monthFilter}-01` : getTodayStr());
    setExactDate(addDaysToStr(baseStr, -1));
    setCurrentPage(1);
  };

  const handleNextDay = () => {
    const baseStr = exactDate || (monthFilter ? `${monthFilter}-01` : getTodayStr());
    setExactDate(addDaysToStr(baseStr, 1));
    setCurrentPage(1);
  };

  // compute unique month options: include last 12 calendar months plus any months actually present
  const monthSet = new Set<string>();
  // add recent 12 months
  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthSet.add(d.toISOString().slice(0, 7));
  }
  // also include any months that exist in data
  expenses.forEach((e) => {
    monthSet.add(new Date(e.date).toISOString().slice(0, 7));
  });
  const monthOptions = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); // ✅ Pagination state
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeleteExpense, setPendingDeleteExpense] =
    useState<Expense | null>(null);

  const [form, setForm] = useState({
    category: "miscellaneous" as ExpenseCategory,
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentType: "cash",
    paymentScreenshot: null as File | null,
    productPicture: null as File | null,
    name: "",
    reason: "",
    screenshots: [] as File[],
  });
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState<
    string | null
  >(null);
  const [productPicturePreview, setProductPicturePreview] = useState<
    string | null
  >(null);
  const [screenshotsPreview, setScreenshotsPreview] = useState<string[]>([]);

  const filteredExpenses = expenses.filter((e) => {
    const matchSearch = e.description
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "all" || e.category === categoryFilter;
    const matchCreator =
      creatorFilter === "all" || (e.createdByRole || "other") === creatorFilter;
    const matchManager =
      creatorFilter !== "manager" ||
      managerFilter === "all" ||
      String(e.createdBy || "") === managerFilter;
    const matchMonth =
      !monthFilter ||
      new Date(e.date).toISOString().slice(0, 7) === monthFilter;
    const matchExactDate =
      !exactDate ||
      new Date(e.date).toISOString().slice(0, 10) === exactDate;
    const matchPaymentType =
      paymentTypeFilter === "all" ||
      (e as any).paymentType === paymentTypeFilter;
    return (
      matchSearch &&
      matchCategory &&
      matchMonth &&
      matchCreator &&
      matchManager &&
      matchExactDate &&
      matchPaymentType
    );
  });

  // Total reflects ALL active filters (search, category, creator, date, payment)
  const totalExpensesThisMonth = filteredExpenses.reduce(
    (sum, e) => sum + e.amount,
    0,
  );

  const {
    categories: productCategories,
    fetchCategories: fetchProductCategories,
  } = useProductStore();
  const [savedExpenseCategories, setSavedExpenseCategories] = useState<
    { id: string; label: string }[]
  >([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = auth?.token;
        const martId = auth?.martId;
        if (!API_BASE || !martId) return;
        const res = await fetch(
          `${API_BASE}/api/expense-categories?martId=${martId}`,
          {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          },
        );
        if (!res.ok) return;
        const list = await res.json().catch(() => []);
        if (!mounted || !Array.isArray(list)) return;
        setSavedExpenseCategories(
          list.map((c: any) => ({
            id: String(c._id || c.id || c.name),
            label: c.name,
          })),
        );
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [API_BASE, auth?.martId]);

  const categoryItems = (
    [
      // include predefined expense categories as options
      ...expenseCategories.map((c) => ({
        id: c.value,
        label: t(c.label),
        value: c.value,
      })),
      // include server-saved expense categories
      ...savedExpenseCategories.map((c) => ({
        id: c.id,
        label: c.label,
        value: c.label,
      })),
      // include product categories fetched from productStore
      ...(productCategories || []).map((c) => ({
        id: c.id,
        label: c.name,
        value: c.name,
      })),
    ] as { id: string; label: string; value: string }[]
  ).filter((v, i, arr) => arr.findIndex((x) => x.value === v.value) === i);

  // Include any categories present in expenses (including manually created),
  // plus predefined expense categories and product-derived categories.
  const allCategoryValues = new Set<string>();
  expenses.forEach((e) => {
    if (e.category) allCategoryValues.add(String(e.category));
  });
  expenseCategories.forEach((c) => allCategoryValues.add(c.value));
  (savedExpenseCategories || []).forEach((c) => allCategoryValues.add(c.label));
  (productCategories || []).forEach((c) => allCategoryValues.add(c.name));

  const expensesByCategory = Array.from(allCategoryValues)
    .map((catValue) => {
      const predefined = expenseCategories.find((c) => c.value === catValue);
      const productCat = (productCategories || []).find(
        (p) => p.name === catValue,
      );
      const saved = (savedExpenseCategories || []).find(
        (s) => s.label === catValue,
      );
      const name = predefined
        ? t(predefined.label)
        : productCat?.name || saved?.label || catValue;
      const color = predefined
        ? predefined.color
        : "hsl(var(--muted-foreground))";
      const value = expenses
        .filter((e) => String(e.category) === String(catValue))
        .reduce((sum, e) => sum + e.amount, 0);
      return { name, value, color };
    })
    .filter((item) => item.value > 0);

  // ✅ Pagination logic
  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedExpenses = filteredExpenses.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const handleDelete = (id: string) => {
    (async () => {
      try {
        const token = auth?.token;
        const res = await fetch(`${API_BASE}/api/expenses/${id}`, {
          method: "DELETE",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast(err.message || t("failed_delete_expense"));
          return;
        }
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        toast(t("expense_deleted"));
      } catch (err) {
        console.error(err);
        toast(t("failed_delete_expense"));
      }
    })();
    // Reset to page 1 if current page becomes empty
    if (
      filteredExpenses.length <= (currentPage - 1) * ITEMS_PER_PAGE &&
      currentPage > 1
    ) {
      setCurrentPage(1);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpenseId(expense.id);
    setForm((prev) => ({
      ...prev,
      category: (expense as any).category || prev.category,
      description: expense.description,
      amount: expense.amount.toString(),
      date: new Date(expense.date).toISOString().split("T")[0],
      name: (expense as any).name || "",
      reason: (expense as any).reason || "",
      screenshots: [],
    }));
    setIsDialogOpen(true);
  };

  const addExpense = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const token = auth?.token;
    const payload = {
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      date: form.date,
      martId: auth?.martId,
      name: form.name,
      reason: form.reason,
    };

    try {
      if (editingExpenseId) {
        // update existing
        // if files present send FormData
        let res;
        if (
          form.paymentScreenshot ||
          form.productPicture ||
          (form.screenshots && form.screenshots.length)
        ) {
          const fd = new FormData();
          fd.append("category", String(payload.category));
          fd.append("description", String(payload.description));
          fd.append("amount", String(payload.amount));
          fd.append("date", String(payload.date));
          fd.append("martId", String(payload.martId));
          fd.append("paymentType", form.paymentType || "");
          fd.append("name", form.name || "");
          fd.append("reason", form.reason || "");
          if (form.paymentScreenshot)
            fd.append("paymentScreenshot", form.paymentScreenshot);
          if (form.productPicture)
            fd.append("productPicture", form.productPicture);
          if (form.screenshots && form.screenshots.length) {
            form.screenshots.forEach((f) => fd.append("screenshots", f));
          }
          res = await fetch(`${API_BASE}/api/expenses/${editingExpenseId}`, {
            method: "PUT",
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: fd,
          });
        } else {
          res = await fetch(`${API_BASE}/api/expenses/${editingExpenseId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ...payload, paymentType: form.paymentType }),
          });
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast(err.message || t("failed_update_expense"));
          return;
        }
        const saved = await res.json();
        setExpenses((prev) =>
          prev.map((e) =>
            e.id === editingExpenseId
              ? {
                  ...e,
                  category: saved.category,
                  description: saved.description,
                  amount: saved.amount,
                  date: new Date(saved.date),
                }
              : e,
          ),
        );
        toast(t("expense_updated"));
      } else {
        // create new
        let res;
        if (
          form.paymentScreenshot ||
          form.productPicture ||
          (form.screenshots && form.screenshots.length)
        ) {
          const fd = new FormData();
          fd.append("category", String(payload.category));
          fd.append("description", String(payload.description));
          fd.append("amount", String(payload.amount));
          fd.append("date", String(payload.date));
          fd.append("martId", String(payload.martId));
          fd.append("paymentType", form.paymentType || "");
          fd.append("name", form.name || "");
          fd.append("reason", form.reason || "");
          if (form.paymentScreenshot)
            fd.append("paymentScreenshot", form.paymentScreenshot);
          if (form.productPicture)
            fd.append("productPicture", form.productPicture);
          if (form.screenshots && form.screenshots.length) {
            form.screenshots.forEach((f) => fd.append("screenshots", f));
          }
          res = await fetch(`${API_BASE}/api/expenses`, {
            method: "POST",
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: fd,
          });
        } else {
          res = await fetch(`${API_BASE}/api/expenses`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ ...payload, paymentType: form.paymentType }),
          });
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast(err.message || t("failed_add_expense"));
          return;
        }
        const saved = await res.json();
        const newExpense: any = {
          id: saved._id || saved.id || Date.now().toString(),
          category: saved.category,
          description: saved.description,
          amount: saved.amount,
          date: new Date(saved.date),
          paymentType: (saved as any).paymentType,
          paymentScreenshot: (saved as any).paymentScreenshot,
          productPicture: (saved as any).productPicture,
          name: (saved as any).name,
          reason: (saved as any).reason,
          screenshots: (saved as any).screenshots || [],
          shopId: String(saved.martId || saved.shopId || ""),
          createdBy: String(saved.createdBy || ""),
          createdByRole:
            (saved as any).createdByRole ||
            (auth?.role === "owner"
              ? "owner"
              : auth?.role === "manager"
                ? "manager"
                : "other"),
          createdByName: (saved as any).createdByName || auth?.name || "",
          createdAt: new Date((saved as any).createdAt || saved.createdAt),
        } as any;
        setExpenses((prev) => [newExpense, ...prev]);
        toast(t("expense_added"));
      }
      // reset dialog/form state
      setIsDialogOpen(false);
      setEditingExpenseId(null);
      setForm({
        category: "miscellaneous",
        description: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        paymentType: "cash",
        paymentScreenshot: null,
        productPicture: null,
        name: "",
        reason: "",
        screenshots: [],
      });
      setPaymentScreenshotPreview(null);
      setProductPicturePreview(null);
      setScreenshotsPreview([]);
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      toast.error(
        editingExpenseId ? t("failed_update_expense") : t("failed_add_expense"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addExpense();
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = auth?.token;
        const martId = auth?.martId;
        if (!martId) return;
        const res = await fetch(`${API_BASE}/api/expenses?martId=${martId}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) {
          console.warn("Failed to load expenses", res.status);
          return;
        }
        const list = await res.json();
        if (!mounted) return;
        const normalized: Expense[] = list.map((s: any) => ({
          id: s._id || s.id,
          category: s.category,
          description: s.description,
          amount: s.amount,
          date: new Date(s.date),
          shopId: String(s.martId || s.shopId || ""),
          createdBy: String(s.createdBy || ""),
          createdByRole: s.createdByRole,
          createdByName: s.createdByName,
          createdAt: new Date(s.createdAt),
          name: s.name,
          reason: s.reason,
          screenshots: s.screenshots || [],
          productPicture: s.productPicture,
          paymentScreenshot: s.paymentScreenshot,
          paymentType: s.paymentType,
        }));
        setExpenses(normalized);
      } catch (err) {
        console.error("Load expenses error", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [auth]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = auth?.token;
        const martId = auth?.martId;
        if (!martId) return;
        const res = await fetch(`${API_BASE}/api/employees?martId=${martId}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) return;
        const list = await res.json();
        if (!mounted || !Array.isArray(list)) return;
        const managerList = list
          .filter((u: any) => u?.role === "manager")
          .map((u: any) => ({
            id: String(u._id || u.id || ""),
            name: String(u.name || u.username || "Unnamed"),
          }))
          .filter((u: any) => u.id);
        setManagers(managerList);
      } catch (err) {
        console.error("Load managers error", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [auth, API_BASE]);

  const getCategoryIcon = (category: ExpenseCategory) => {
    const cat = expenseCategories.find((c) => c.value === category);
    return cat?.icon || MoreHorizontal;
  };

  // ✅ Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const downloadExpensePdf = async () => {
    if (filteredExpenses.length === 0) {
      toast(
        t("no_expenses_to_export", { defaultValue: "No expenses to export" }),
      );
      return;
    }

    try {
      toast.info(
        t("generating_pdf_wait", {
          defaultValue: "Generating PDF, please wait...",
        }),
      );

      const loadImage = (
        url: string | null,
      ): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          if (!url) return resolve(null);
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };

      const [loadedItemImages, loadedScreenshotImages] = await Promise.all([
        Promise.all(
          filteredExpenses.map((e) =>
            (e as any).productPicture
              ? loadImage((e as any).productPicture)
              : Promise.resolve(null),
          ),
        ),
        Promise.all(
          filteredExpenses.map((e) => {
            const s =
              (Array.isArray((e as any).screenshots) &&
                (e as any).screenshots[0]) ||
              (e as any).paymentScreenshot ||
              null;
            return s ? loadImage(s) : Promise.resolve(null);
          }),
        ),
      ]);

      const bodyRows: string[][] = filteredExpenses.map((expense, idx) => [
        String(idx + 1),
        String(
          expense.category === "salary"
            ? t("salary_expense")
            : t(expense.category),
        ),
        "",
        String(expense.description || ""),
        `$ ${Number(expense.amount || 0).toFixed(2)}`,
        "",
      ]);

      const totalAmount = filteredExpenses.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0,
      );

      bodyRows.push(["Σ", "", "", "", totalAmount.toFixed(2), ""]);

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(
        t("expense_report", { defaultValue: "Expense Report" }),
        105,
        14,
        { align: "center" },
      );

      autoTable(doc, {
        startY: 18,
        head: [
          [
            "#",
            t("category", { defaultValue: "Category" }),
            t("item_image", { defaultValue: "Item image" }),
            t("description", { defaultValue: "Description" }),
            t("amount", { defaultValue: "Amount" }),
            t("screenshots", { defaultValue: "Screenshots" }),
          ],
        ],
        body: bodyRows,
        theme: "grid",
        styles: {
          fontSize: 8,
          cellPadding: 2,
          lineColor: [180, 180, 180],
          lineWidth: 0.2,
          valign: "middle",
        },
        headStyles: {
          fillColor: [232, 232, 232],
          textColor: [20, 20, 20],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 22, halign: "right" },
          5: { cellWidth: 30 },
        },
        didParseCell: (data) => {
          if (
            data.section === "body" &&
            data.row.index < filteredExpenses.length
          ) {
            data.cell.styles.minCellHeight = 22;
          }
          if (
            data.section === "body" &&
            data.row.index === filteredExpenses.length
          ) {
            data.cell.styles.fillColor = [240, 240, 240];
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawCell: (data) => {
          if (
            data.section !== "body" ||
            data.row.index >= filteredExpenses.length
          )
            return;

          const padding = 1.5;
          const maxWidth = data.cell.width - padding * 2;
          const maxHeight = data.cell.height - padding * 2;
          const side = Math.max(1, Math.min(maxWidth, maxHeight));
          const x = data.cell.x + (data.cell.width - side) / 2;
          const y = data.cell.y + (data.cell.height - side) / 2;

          if (data.column.index === 2) {
            const img = loadedItemImages[data.row.index];
            if (img) {
              doc.addImage(img, "JPEG", x, y, side, side);
            }
          } else if (data.column.index === 5) {
            const img = loadedScreenshotImages[data.row.index];
            if (img) {
              doc.addImage(img, "JPEG", x, y, side, side);
            }
          }
        },
      });

      const filenameMonth = monthFilter || "all-months";
      doc.save(`expense-${filenameMonth}.pdf`);
      toast.success(
        t("pdf_generated_success", {
          defaultValue: "PDF generated successfully",
        }),
      );
    } catch (err) {
      console.error("downloadExpensePdf error", err);
      toast.error(
        t("failed_download_pdf", { defaultValue: "Failed to download PDF" }),
      );
    }
  };

  return (
    <RoleLayout allowedRoles={["owner"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t("expenses")}</h1>
            <p className="text-muted-foreground">
              {t("track_manage_business_expenses")}
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingExpenseId ? t("edit_expense") : t("add_expense")}
                </DialogTitle>
                <DialogDescription>
                  {editingExpenseId
                    ? t("edit_expense_description")
                    : t("add_expense_description")}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={handleSubmit}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="space-y-2">
                  <AutoComplete<{ id: string; label: string; value: string }>
                    id="expense-category-autocomplete"
                    label={t("expense_category")}
                    placeholder={t("select_or_create_category", {
                      defaultValue: "Select or create category",
                    })}
                    items={categoryItems}
                    getItemLabel={(it) => it.label}
                    getItemValue={(it) => it.value}
                    onSelect={(it) =>
                      setForm({
                        ...form,
                        category: it.value as unknown as ExpenseCategory,
                      })
                    }
                    allowCreate
                    onCreateOption={async (query) => {
                      const q = String(query || "").trim();
                      if (!q)
                        return { id: `cat-${Date.now()}`, label: q, value: q };
                      try {
                        const token = auth?.token;
                        if (API_BASE) {
                          const res = await fetch(
                            `${API_BASE}/api/expense-categories`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                ...(token
                                  ? { Authorization: `Bearer ${token}` }
                                  : {}),
                              },
                              body: JSON.stringify({
                                name: q,
                                martId: auth?.martId,
                              }),
                            },
                          );
                          if (res.ok) {
                            const created = await res
                              .json()
                              .catch(() => ({
                                name: q,
                                _id: `cat-${Date.now()}`,
                              }));
                            const item = {
                              id: String(created._id || created.id || q),
                              label: q,
                            };
                            setSavedExpenseCategories((cur) => {
                              if (cur.find((c) => c.label === q)) return cur;
                              return [
                                ...cur,
                                { id: item.id, label: item.label },
                              ];
                            });
                            return {
                              id: String(created._id || created.id || q),
                              label: q,
                              value: q,
                            };
                          }
                        }
                      } catch (err) {
                        console.error("create expense category failed", err);
                      }
                      return { id: `cat-${Date.now()}`, label: q, value: q };
                    }}
                    createOptionLabel={(q) => `Add "${q}"`}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">{t("description")} *</Label>
                  <Input
                    id="description"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <AutoComplete<{ id: string; label: string }>
                    id="payment-type-autocomplete"
                    label={t("payment_type")}
                    placeholder={t("payment_type", {
                      defaultValue: "Payment type",
                    })}
                    items={paymentOptions}
                    getItemLabel={(it) => it.label}
                    getItemValue={(it) => it.id}
                    onSelect={(it) => setForm({ ...form, paymentType: it.id })}
                    allowCreate
                    onCreateOption={async (query) => {
                      const q = String(query || "").trim();
                      if (!q) return null;
                      const local = {
                        id: q.toLowerCase().replace(/\s+/g, "_"),
                        label: q,
                      };
                      try {
                        const token = auth?.token;
                        const res = await fetch(
                          `${API_BASE}/api/payment-types`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              ...(token
                                ? { Authorization: `Bearer ${token}` }
                                : {}),
                            },
                            body: JSON.stringify({
                              name: q,
                              martId: auth?.martId,
                            }),
                          },
                        );
                        if (res.ok) {
                          const saved = await res.json().catch(() => null);
                          const item = saved
                            ? {
                                id: String(saved._id || saved.id || q),
                                label: saved.label || saved.name || q,
                              }
                            : local;
                          setPaymentOptions((cur) => [...cur, item]);
                          saveLocalPaymentType(auth?.martId, item);
                          setForm((f) => ({ ...f, paymentType: item.id }));
                          return item;
                        }
                      } catch (err) {
                        console.error("create payment type failed", err);
                      }
                      setPaymentOptions((cur) => [...cur, local]);
                      saveLocalPaymentType(auth?.martId, local);
                      setForm((f) => ({ ...f, paymentType: local.id }));
                      return local;
                    }}
                    createOptionLabel={(q) => `Add "${q}"`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">{t("amount")} (ETB) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">{t("date")} *</Label>
                  <EthiopianDatePicker
                    id="date"
                    value={form.date}
                    onChange={(ymd) => setForm({ ...form, date: ymd })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productPicture">{t("product_picture")}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="productPicture"
                      type="file"
                      accept="image/*"
                      onChange={(e: any) => {
                        const f = e.target.files?.[0] || null;
                        setForm({ ...form, productPicture: f });
                        setProductPicturePreview(
                          f ? URL.createObjectURL(f) : null,
                        );
                      }}
                    />
                    <input
                      id="productPictureCamera"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e: any) => {
                        const f = e.target.files?.[0] || null;
                        setForm({ ...form, productPicture: f });
                        setProductPicturePreview(
                          f ? URL.createObjectURL(f) : null,
                        );
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        document.getElementById("productPictureCamera")?.click()
                      }
                      aria-label={t("take_photo", "Take photo")}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  {productPicturePreview && (
                    <img
                      src={productPicturePreview}
                      className="w-20 h-20 object-cover rounded"
                      alt="product"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentScreenshot">
                    {t("payment_screenshot")}
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="paymentScreenshot"
                      type="file"
                      accept="image/*"
                      onChange={(e: any) => {
                        const f = e.target.files?.[0] || null;
                        setForm({ ...form, paymentScreenshot: f });
                        setPaymentScreenshotPreview(
                          f ? URL.createObjectURL(f) : null,
                        );
                      }}
                    />
                    <input
                      id="paymentScreenshotCamera"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e: any) => {
                        const f = e.target.files?.[0] || null;
                        setForm({ ...form, paymentScreenshot: f });
                        setPaymentScreenshotPreview(
                          f ? URL.createObjectURL(f) : null,
                        );
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        document
                          .getElementById("paymentScreenshotCamera")
                          ?.click()
                      }
                      aria-label={t("take_photo", "Take photo")}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  {paymentScreenshotPreview && (
                    <img
                      src={paymentScreenshotPreview}
                      className="w-32 h-20 object-contain rounded"
                      alt="payment"
                    />
                  )}
                </div>
                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingExpenseId(null);
                    }}
                    disabled={isSubmitting}
                  >
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t("loading")}
                      </span>
                    ) : editingExpenseId ? (
                      t("save")
                    ) : (
                      t("add")
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full sm:w-auto"
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {monthFilter
                            ? `${ethiopianMonthLabel(monthFilter)} ${t("expenses")}`
                            : t("expenses")}
                        </p>
                        <p className="text-2xl font-bold">
                          {totalExpensesThisMonth.toLocaleString()} ETB
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-destructive/10 text-destructive">
                        <TrendingDown className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    {editingExpenseId ? t("edit_expense") : t("add_expense")}
                  </Button>
                </DialogTrigger>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={downloadExpensePdf}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </motion.div>
          </Dialog>
        </div>

        {/* Chart & Filters */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="order-2 lg:col-span-3 min-w-0"
          >
            <Card className="max-w-xl h-full">
              <CardHeader>
                <CardTitle>{t("expenses_by_category")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) =>
                          `${value.toLocaleString()} ETB`
                        }
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="order-1 lg:col-span-3 min-w-0"
          >
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3">
                  {/* ── Row 1: title + primary filters ── */}
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="flex items-center gap-2 flex-1 min-w-0">
                      <Wallet className="h-5 w-5 shrink-0" />
                      {t("recent_expenses")}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 items-center">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t("search") + "..."}
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="pl-10 w-40"
                        />
                      </div>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder={t("category")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("all")}</SelectItem>
                          {expenseCategories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {t(cat.label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={creatorFilter}
                        onValueChange={(v) =>
                          setCreatorFilter(v as "all" | "owner" | "manager")
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder={t("created_by", { defaultValue: "Created by" })} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("all_creators", { defaultValue: "All creators" })}</SelectItem>
                          <SelectItem value="owner">{t("owner")}</SelectItem>
                          <SelectItem value="manager">{t("manager")}</SelectItem>
                        </SelectContent>
                      </Select>
                      {creatorFilter === "manager" && (
                        <Select value={managerFilter} onValueChange={setManagerFilter}>
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder={t("manager")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("all_managers", { defaultValue: "All managers" })}</SelectItem>
                            {managers.map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Select
                        value={monthFilter || "all"}
                        onValueChange={(v) => {
                          setMonthFilter(v === "all" ? "" : v);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue
                            placeholder={
                              monthFilter
                                ? ethiopianMonthLabel(monthFilter)
                                : t("all_months")
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("all_months")}</SelectItem>
                          {monthOptions.map((m) => (
                            <SelectItem key={m} value={m}>
                              {ethiopianMonthLabel(m)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Payment Method filter dropdown */}
                      <Select
                        value={paymentTypeFilter}
                        onValueChange={(v) => {
                          setPaymentTypeFilter(v);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder={t("payment_method")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t("all_methods", { defaultValue: "All methods" })}</SelectItem>
                          {paymentOptions.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Date Navigation Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-b py-3 px-6 bg-slate-50/50 dark:bg-slate-900/10">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevDay}
                  className="h-8 w-8 rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  aria-label={t("prev")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2">
                  <EthiopianDatePicker
                    value={exactDate}
                    onChange={(ymd) => {
                      setExactDate(ymd || "");
                      setCurrentPage(1);
                    }}
                    placeholder={t("all_days_select_date", { defaultValue: "All Days (Select Date)" })}
                    className="w-[230px]"
                  />
                  {exactDate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setExactDate("");
                        setCurrentPage(1);
                      }}
                      className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title={t("clear_date_filter", { defaultValue: "Clear date filter" })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextDay}
                  className="h-8 w-8 rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                  aria-label={t("next")}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">No</TableHead>
                        <TableHead>{t("product_picture")}</TableHead>
                        <TableHead>{t("expense_category")}</TableHead>
                        <TableHead>{t("description")}</TableHead>
                        <TableHead>{t("payment_type")}</TableHead>
                        <TableHead>{t("payment_screenshot")}</TableHead>
                        <TableHead className="text-right">
                          {t("amount")}
                        </TableHead>
                        <TableHead>{t("date")}</TableHead>
                        <TableHead className="text-right">
                          {t("actions")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedExpenses.length > 0 ? (
                        paginatedExpenses.map((expense, index) => {
                          const Icon = getCategoryIcon(expense.category);
                          return (
                            <TableRow key={expense.id}>
                              <TableCell className="text-center text-muted-foreground">
                                {startIndex + index + 1}
                              </TableCell>
                              <TableCell className="w-20">
                                {(expense as any).productPicture ? (
                                  <img
                                    src={(expense as any).productPicture}
                                    className="w-16 h-16 object-cover rounded"
                                    alt="product"
                                  />
                                ) : null}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-muted-foreground" />
                                  <Badge variant="outline">
                                    {t(
                                      expense.category === "salary"
                                        ? "salary_expense"
                                        : expense.category,
                                    )}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>{expense.description}</TableCell>
                              <TableCell className="capitalize">
                                {paymentOptions.find(
                                  (p) => p.id === (expense as any).paymentType,
                                )?.label ||
                                  t((expense as any).paymentType) ||
                                  "-"}
                              </TableCell>
                              <TableCell className="w-24">
                                {(expense as any).paymentScreenshot ? (
                                  <img
                                    src={getImageUrl((expense as any).paymentScreenshot)}
                                    className="w-16 h-16 object-cover rounded"
                                    alt="payment"
                                    onError={handleImageError}
                                  />
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {expense.amount.toLocaleString()} ETB
                              </TableCell>
                              <TableCell>
                                {formatLocalizedDate(expense.date)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(expense)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    setPendingDeleteExpense(expense)
                                  }
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="text-center py-4 text-muted-foreground"
                          >
                            {search || categoryFilter !== "all"
                              ? t("no_expenses_found")
                              : t("no_expenses_recorded_yet")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    {filteredExpenses.length > 0 && (
                      <TableFooter>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                          <TableCell
                            colSpan={6}
                            className="font-semibold text-foreground"
                          >
                            {t("total", { defaultValue: "Total" })}(
                            {filteredExpenses.length}{" "}
                            {t("items", { defaultValue: "items" })})
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground">
                            {totalExpensesThisMonth.toLocaleString()} ETB
                          </TableCell>
                          <TableCell colSpan={2} />
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
                </div>

                {/* ✅ PAGINATION CONTROLS */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between px-2 py-3 border-t border-border mt-4">
                    <div className="text-xs text-muted-foreground mb-2 sm:mb-0">
                      {t("showing")}{" "}
                      <span className="font-medium">{startIndex + 1}</span>–
                      <span className="font-medium">
                        {Math.min(
                          startIndex + ITEMS_PER_PAGE,
                          filteredExpenses.length,
                        )}
                      </span>{" "}
                      {t("of")}
                      <span className="font-medium">
                        {" "}
                        {filteredExpenses.length}
                      </span>{" "}
                      {t("expenses")}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={prevPage}
                        disabled={currentPage === 1}
                      >
                        {t("prev")}
                      </Button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => goToPage(page)}
                          >
                            {page}
                          </Button>
                        ),
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={nextPage}
                        disabled={currentPage === totalPages}
                      >
                        {t("next")}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <AlertDialog
          open={Boolean(pendingDeleteExpense)}
          onOpenChange={(open) => {
            if (!open) setPendingDeleteExpense(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDeleteExpense
                  ? `This will permanently delete expense \"${pendingDeleteExpense.description || "Unnamed expense"}\".`
                  : "This action will permanently delete the selected expense."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (!pendingDeleteExpense) return;
                  handleDelete(pendingDeleteExpense.id);
                  setPendingDeleteExpense(null);
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

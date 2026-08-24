import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  Coins,
  CreditCard,
  Eye,
  HandCoins,
  History,
  Pencil,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/Modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import {
  AdvancedFilters,
  type AdvancedFilterValues,
} from "@/components/ui/AdvancedFilters";
import { ThreeDotActionMenu } from "@/components/ui/ThreeDotActionMenu";
import useCustomers from "@/hooks/useCustomers";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";

type CustomerFormState = {
  name: string;
  phoneNumber: string;
  city: string;
};

type CustomerEditState = CustomerFormState & {
  totalCredit: number;
  totalPaid: number;
};

type CustomerRow = {
  id: string;
  _id?: string;
  name: string;
  phoneNumber: string;
  city?: string;
  totalCredit?: number;
  totalPaid?: number;
  totalUnpaid?: number;
  cashierCredit?: number;
  myRepayments?: number;
  creditByCashier?: Array<{
    cashierId: string;
    cashierName: string;
    creditAmount: number;
  }>;
  repaymentsByCashier?: Array<{
    collectedBy: string;
    collectedByName: string;
    collectedByRole: string;
    amountPaid: number;
  }>;
};

type CustomerModalMode = "view" | "edit" | "delete";

const HIGH_DEBT_THRESHOLD = 1000;

const emptyCustomerForm: CustomerFormState = {
  name: "",
  phoneNumber: "",
  city: "",
};

const emptyFilterValues: AdvancedFilterValues = {
  query: "",
  city: "",
  balanceStatus: "all",
  cashierId: "all",
  sortBy: "name_asc",
};

function formatCityName(value?: string) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) return "";

  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function CustomerManagement() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  const [filterValues, setFilterValues] =
    useState<AdvancedFilterValues>(emptyFilterValues);
  const [appliedFilters, setAppliedFilters] =
    useState<AdvancedFilterValues>(emptyFilterValues);

  const selectedCashierFilter = String(appliedFilters.cashierId || "all");

  const {
    customers,
    loading,
    error,
    create,
    update,
    payCredit,
    getPayments,
    getStaffList,
    remove,
  } = useCustomers(selectedCashierFilter);

  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phoneNumber?: string;
  }>({});

  const [modalMode, setModalMode] = useState<CustomerModalMode>("view");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(
    null,
  );
  const [editForm, setEditForm] = useState<CustomerEditState>({
    ...emptyCustomerForm,
    totalCredit: 0,
    totalPaid: 0,
  });
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Pay Credit Modal states
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingCustomer, setPayingCustomer] = useState<CustomerRow | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  // Customer Payment History
  const [paymentsHistory, setPaymentsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Staff List for Owner filter
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string; username: string; role: string }>>([]);

  // Add Customer dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const isOwner = user?.role === "owner";
  const isManagement = user?.role === "owner" || user?.role === "manager";
  const isCashier = user?.role === "cashier";

  // Fetch staff list whenever user changes (wait for auth to be available)
  useEffect(() => {
    if (!user?.id) return;
    getStaffList().then((res) => {
      if (Array.isArray(res)) setStaffList(res);
    }).catch(console.error);
  }, [user?.id]);

  const validateCustomer = (values: CustomerFormState) => {
    const errors: { name?: string; phoneNumber?: string } = {};

    if (!values.name || String(values.name).trim().length < 2) {
      errors.name = t("valid_name_min2");
    }

    const cleanPhone = String(values.phoneNumber || "").trim();
    if (!cleanPhone || cleanPhone.length < 7) {
      errors.phoneNumber = t("valid_phone_required");
    } else if (!/^\+?[0-9\s-]+$/.test(cleanPhone)) {
      errors.phoneNumber = t("valid_phone_digits_only", "Phone number must contain only numbers.");
    }

    return errors;
  };

  const formatMoney = (value?: number) =>
    `${Number(value || 0).toLocaleString()} ETB`;

  const staffOptions = useMemo(() => {
    const opts = [{ label: t("all_staff", "All Staff"), value: "all" }];
    for (const member of staffList) {
      const displayName = member.name || member.username;
      opts.push({
        label: `${displayName} (${member.role})`,
        value: member.id,
      });
    }
    return opts;
  }, [staffList, t]);

  const cityOptions = useMemo(() => {
    const uniqueCities = new Map<string, string>();

    for (const customer of customers as CustomerRow[]) {
      const rawCity = String(customer.city || "").trim();
      if (!rawCity) continue;
      const key = rawCity.toLowerCase();
      if (!uniqueCities.has(key)) {
        uniqueCities.set(key, formatCityName(rawCity));
      }
    }

    return Array.from(uniqueCities.entries())
      .sort((left, right) => left[1].localeCompare(right[1]))
      .map(([value, label]) => ({ label, value }));
  }, [customers]);

  const sortOptions = useMemo(
    () => [
      { label: t("name_a_to_z"), value: "name_asc" },
      { label: t("name_z_to_a"), value: "name_desc" },
      { label: t("city_a_to_z"), value: "city_asc" },
      { label: t("city_z_to_a"), value: "city_desc" },
      { label: t("credit_low_to_high"), value: "totalCredit_asc" },
      { label: t("credit_high_to_low"), value: "totalCredit_desc" },
      { label: t("paid_low_to_high"), value: "totalPaid_asc" },
      { label: t("paid_high_to_low"), value: "totalPaid_desc" },
      { label: t("balance_low_to_high"), value: "totalUnpaid_asc" },
      { label: t("balance_high_to_low"), value: "totalUnpaid_desc" },
    ],
    [t],
  );

  const balanceStatusOptions = useMemo(
    () => [
      { label: t("all"), value: "all" },
      { label: t("paid"), value: "paid" },
      { label: t("unpaid"), value: "unpaid" },
      { label: t("high_debt"), value: "high_debt" },
    ],
    [t],
  );

  const filteredCustomers = useMemo(() => {
    const query = String(appliedFilters.query || "")
      .trim()
      .toLowerCase();
    const city = String(appliedFilters.city || "")
      .trim()
      .toLowerCase();
    const balanceStatus = String(appliedFilters.balanceStatus || "all");
    const sortBy = String(appliedFilters.sortBy || "name_asc");

    const rows = (customers as CustomerRow[]).filter((customer) => {
      const matchesQuery =
        !query ||
        [customer.name, customer.phoneNumber, customer.city]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesCity =
        !city ||
        String(customer.city || "")
          .trim()
          .toLowerCase() === city;

      const unpaidBalance = Number(customer.totalUnpaid || 0);
      const matchesBalanceStatus =
        balanceStatus === "all" ||
        (balanceStatus === "paid" && unpaidBalance === 0) ||
        (balanceStatus === "unpaid" && unpaidBalance > 0) ||
        (balanceStatus === "high_debt" && unpaidBalance >= HIGH_DEBT_THRESHOLD);

      // Cashiers only see customers they personally gave credit to
      const matchesCashierScope =
        !isCashier || Number(customer.cashierCredit || 0) > 0;

      return matchesQuery && matchesCity && matchesBalanceStatus && matchesCashierScope;
    });

    const [sortField, sortDirection] = sortBy.split("_");
    const direction = sortDirection === "desc" ? -1 : 1;

    return [...rows].sort((left, right) => {
      const getValue = (customer: CustomerRow) => {
        switch (sortField) {
          case "city":
            return formatCityName(customer.city || t("no_city")).toLowerCase();
          case "totalCredit":
            return Number(customer.totalCredit || 0);
          case "totalPaid":
            return Number(customer.totalPaid || 0);
          case "totalUnpaid":
            return Number(customer.totalUnpaid || 0);
          case "name":
          default:
            return String(customer.name || "").toLowerCase();
        }
      };

      const leftValue = getValue(left);
      const rightValue = getValue(right);

      if (leftValue < rightValue) return -1 * direction;
      if (leftValue > rightValue) return 1 * direction;
      return 0;
    });
  }, [appliedFilters, customers, t, isCashier]);

  // Overall metric totals
  const totalUnpaidBalance = useMemo(() => {
    return filteredCustomers.reduce((sum, c) => sum + Number(c.totalUnpaid || 0), 0);
  }, [filteredCustomers]);

  const totalCreditIssued = useMemo(() => {
    return filteredCustomers.reduce((sum, c) => sum + Number(c.totalCredit || 0), 0);
  }, [filteredCustomers]);

  const totalCreditGivenByMe = useMemo(() => {
    return filteredCustomers.reduce((sum, c) => sum + Number(c.cashierCredit || 0), 0);
  }, [filteredCustomers]);

  // Repayments collected by the current user (or filtered cashier)
  const totalMyRepayments = useMemo(() => {
    return filteredCustomers.reduce((sum, c) => sum + Number(c.myRepayments || 0), 0);
  }, [filteredCustomers]);

  const totalPaidCollected = useMemo(() => {
    return filteredCustomers.reduce((sum, c) => sum + Number(c.totalPaid || 0), 0);
  }, [filteredCustomers]);

  const resetModal = () => {
    setSelectedCustomer(null);
    setModalMode("view");
    setEditForm({
      ...emptyCustomerForm,
      totalCredit: 0,
      totalPaid: 0,
    });
    setPaymentsHistory([]);
    setFormErrors({});
  };

  const openViewModal = async (customer: CustomerRow) => {
    setSelectedCustomer(customer);
    setModalMode("view");
    setEditForm({
      name: customer.name || "",
      phoneNumber: customer.phoneNumber || "",
      city: customer.city || "",
      totalCredit: Number(customer.totalCredit || 0),
      totalPaid: Number(customer.totalPaid || 0),
    });

    setLoadingHistory(true);
    try {
      const history = await getPayments(customer.id);
      setPaymentsHistory(Array.isArray(history) ? history : []);
    } catch (err) {
      console.error(err);
      setPaymentsHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openEditModal = (customer: CustomerRow) => {
    setSelectedCustomer(customer);
    setModalMode("edit");
    setEditForm({
      name: customer.name || "",
      phoneNumber: customer.phoneNumber || "",
      city: customer.city || "",
      totalCredit: Number(customer.totalCredit || 0),
      totalPaid: Number(customer.totalPaid || 0),
    });
  };

  const openDeleteModal = (customer: CustomerRow) => {
    setSelectedCustomer(customer);
    setModalMode("delete");
  };

  const openPayCreditModal = (customer: CustomerRow) => {
    const unpaid = Number(customer.totalUnpaid || 0);
    if (unpaid <= 0) {
      toast({
        title: t("no_unpaid_balance", "No Unpaid Balance"),
        description: `${customer.name} ${t("customer_has_no_debt", "has no outstanding credit balance to pay.")}`,
      });
      return;
    }
    setPayingCustomer(customer);
    setPayAmount("");
    setPayMethod("cash");
    setPayNote("");
    setPayModalOpen(true);
  };

  const handlePayCreditSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!payingCustomer) return;

    const amountNum = Number(payAmount);
    const unpaid = Number(payingCustomer.totalUnpaid || 0);

    if (unpaid <= 0) {
      toast({
        title: t("no_unpaid_balance", "No Unpaid Balance"),
        description: t("customer_has_no_debt", "This customer has no outstanding credit balance to pay."),
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast({
        title: t("invalid_amount", "Invalid Amount"),
        description: t("enter_valid_amount_paid", "Please enter a valid payment amount greater than 0."),
        variant: "destructive",
      });
      return;
    }

    if (amountNum > unpaid) {
      toast({
        title: t("amount_exceeds_balance", "Amount Exceeds Unpaid Balance"),
        description: `${t("amount_cannot_exceed", "Payment amount cannot exceed customer's unpaid balance of")} ${formatMoney(unpaid)}.`,
        variant: "destructive",
      });
      return;
    }

    setPaySubmitting(true);
    try {
      const res = await payCredit(payingCustomer.id, {
        amountPaid: amountNum,
        paymentMethod: payMethod,
        note: payNote,
      });

      toast({
        title: t("payment_recorded", "Payment Recorded"),
        description: `${formatMoney(amountNum)} ${t("deducted_from_customer", "deducted from unpaid balance of")} ${payingCustomer.name}.`,
      });

      setPayModalOpen(false);
      setPayingCustomer(null);
      setPayAmount("");
      setPayNote("");

      if (selectedCustomer && selectedCustomer.id === payingCustomer.id) {
        openViewModal(res?.customer || payingCustomer);
      }
    } catch (err: any) {
      toast({
        title: t("payment_failed", "Payment Failed"),
        description: err?.message || t("server_error"),
        variant: "destructive",
      });
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationErrors = validateCustomer(form);
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast({ title: t("fix_validation_errors"), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const created = await create(form);
      toast({
        title: t("customer_added"),
        description: `${created.name} ${t("added_successfully")}.`,
      });
      setForm(emptyCustomerForm);
      setFormErrors({});
      setAddDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      toast({
        title: t("failed_add_customer"),
        description: err?.message || t("server_error"),
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedCustomer) return;

    const validationErrors = validateCustomer(editForm);
    setFormErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast({ title: t("fix_validation_errors"), variant: "destructive" });
      return;
    }

    setUpdating(true);
    try {
      await update(selectedCustomer.id || selectedCustomer._id || "", {
        name: editForm.name.trim(),
        phoneNumber: editForm.phoneNumber.trim(),
        city: formatCityName(editForm.city),
        totalCredit: Number(editForm.totalCredit || 0),
        totalPaid: Number(editForm.totalPaid || 0),
      });
      toast({
        title: t("customer_updated"),
        description: t("credit_info_updated"),
      });
      resetModal();
    } catch (err: any) {
      toast({
        title: t("update_failed"),
        description: err?.message || t("server_error"),
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    if (!selectedCustomer) return;

    setDeleting(true);
    try {
      await remove(selectedCustomer.id || selectedCustomer._id || "");
      toast({
        title: t("customer_deleted"),
        description: selectedCustomer.name,
      });
      resetModal();
    } catch (err: any) {
      toast({
        title: t("failed_delete_customer"),
        description: err?.message || t("server_error"),
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Label for the "cashierCredit" column changes depending on who is viewing
  // and which staff member is selected in the filter dropdown.
  const creditGivenColumnLabel = useMemo(() => {
    if (isCashier) return t("my_credit_given", "My Credit Given");
    const selected = selectedCashierFilter !== "all"
      ? staffList.find((s) => s.id === selectedCashierFilter)
      : null;
    if (selected) return `${selected.name || selected.username} ${t("credit_given_short", "Credit")}`;
    return t("my_credit_given", "My Credit Given");
  }, [isCashier, selectedCashierFilter, staffList, t]);

  const repaymentColumnLabel = useMemo(() => {
    if (isCashier) return t("my_repayments_collected", "My Repayments");
    const selected = selectedCashierFilter !== "all"
      ? staffList.find((s) => s.id === selectedCashierFilter)
      : null;
    if (selected) return `${selected.name || selected.username} ${t("repayments_short", "Repayments")}`;
    return t("my_repayments_collected", "My Repayments");
  }, [isCashier, selectedCashierFilter, staffList, t]);

  const columns = useMemo<Array<DataTableColumn<CustomerRow>>>(
    () => [
      {
        key: "name",
        header: t("name"),
        accessor: "name",
        searchable: true,
      },
      {
        key: "phoneNumber",
        header: t("phone_number"),
        accessor: "phoneNumber",
        searchable: true,
      },
      {
        key: "city",
        header: t("city"),
        accessor: (row) => formatCityName(row.city) || t("no_city"),
        searchable: true,
      },
      {
        key: "cashierCredit",
        header: creditGivenColumnLabel,
        accessor: (row) => Number(row.cashierCredit || 0),
        cell: (row) => (
          <div className="inline-flex items-center gap-1.5 font-medium text-purple-700 dark:text-purple-300">
            <UserCheck className="h-4 w-4 text-purple-600" />
            <span>{formatMoney(row.cashierCredit)}</span>
          </div>
        ),
      },
      {
        key: "myRepayments",
        header: repaymentColumnLabel,
        accessor: (row) => Number(row.myRepayments || 0),
        cell: (row) => (
          <div
            className={`inline-flex items-center gap-1.5 font-medium ${
              Number(row.myRepayments || 0) > 0
                ? "text-green-700 dark:text-green-400"
                : "text-muted-foreground"
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>{formatMoney(row.myRepayments)}</span>
          </div>
        ),
      },
      {
        key: "totalCredit",
        header: t("total_credit_all", "Total Credit (All)"),
        accessor: (row) => Number(row.totalCredit || 0),
        cell: (row) => (
          <div className="inline-flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-300">
            <CreditCard className="h-4 w-4 text-blue-600" />
            <span>{formatMoney(row.totalCredit)}</span>
          </div>
        ),
      },
      {
        key: "totalPaid",
        header: t("total_paid"),
        accessor: (row) => Number(row.totalPaid || 0),
        cell: (row) => (
          <div className="inline-flex items-center gap-1.5 font-medium text-green-700 dark:text-green-300">
            <Banknote className="h-4 w-4 text-green-600" />
            <span>{formatMoney(row.totalPaid)}</span>
          </div>
        ),
      },
      {
        key: "totalUnpaid",
        header: t("unpaid_balance"),
        accessor: (row) => Number(row.totalUnpaid || 0),
        cell: (row) => (
          <div
            className={`inline-flex items-center gap-1.5 font-semibold ${
              Number(row.totalUnpaid || 0) > 0
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>{formatMoney(row.totalUnpaid)}</span>
          </div>
        ),
      },
    ],
    [t, creditGivenColumnLabel, repaymentColumnLabel],
  );

  return (
    <RoleLayout allowedRoles={["cashier", "owner", "manager"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("customer_management")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("manage_customers_credit")}
            </p>
          </div>
          <Button
            id="open-add-customer-dialog"
            onClick={() => {
              setForm(emptyCustomerForm);
              setFormErrors({});
              setAddDialogOpen(true);
            }}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            {t("add_customer")}
          </Button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-purple-100 bg-purple-50/50 dark:border-purple-950 dark:bg-purple-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    {isCashier
                      ? t("my_credit_given", "My Credit Given")
                      : selectedCashierFilter !== "all"
                        ? `${staffList.find((s) => s.id === selectedCashierFilter)?.name || "Staff"} ${t("credit_given_short", "Credit")}`
                        : t("credit_given", "Credit Given (Me)")}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-purple-900 dark:text-purple-100">
                    {formatMoney(totalCreditGivenByMe)}
                  </h3>
                  {isCashier && (
                    <p className="mt-0.5 text-xs text-purple-700/70 dark:text-purple-400/60">
                      {t("credits_given_by_you", "Credits you personally gave")}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-purple-100 p-3 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                  <UserCheck className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Second card: cashiers see their own repayments; management sees all-staff total credit */}
          {isCashier ? (
            <Card className="border-green-100 bg-green-50/50 dark:border-green-950 dark:bg-green-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      {t("my_repayments_collected", "My Repayments Collected")}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-green-900 dark:text-green-100">
                      {formatMoney(totalMyRepayments)}
                    </h3>
                    <p className="mt-0.5 text-xs text-green-700/70 dark:text-green-400/60">
                      {t("repayments_you_collected", "Repayments you collected")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-green-100 p-3 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                    <Banknote className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-blue-100 bg-blue-50/50 dark:border-blue-950 dark:bg-blue-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {t("total_credit_all", "Total Credit (All Roles)")}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-blue-900 dark:text-blue-100">
                      {formatMoney(totalCreditIssued)}
                    </h3>
                    <p className="mt-0.5 text-xs text-blue-700/70 dark:text-blue-400/60">
                      {t("all_roles_combined", "All roles combined")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    <CreditCard className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-orange-100 bg-orange-50/50 dark:border-orange-950 dark:bg-orange-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    {t("total_unpaid_balance", "Total Outstanding Debt")}
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-orange-900 dark:text-orange-100">
                    {formatMoney(totalUnpaidBalance)}
                  </h3>
                </div>
                <div className="rounded-xl bg-orange-100 p-3 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Last card: management sees total repayments; cashiers see total credit (all roles, for awareness) */}
          {isCashier ? (
            <Card className="border-blue-100 bg-blue-50/50 dark:border-blue-950 dark:bg-blue-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {t("total_credit_all", "Total Credit (All)")}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-blue-900 dark:text-blue-100">
                      {formatMoney(totalCreditIssued)}
                    </h3>
                    <p className="mt-0.5 text-xs text-blue-700/70 dark:text-blue-400/60">
                      {t("all_roles_combined", "All roles combined")}
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-100 p-3 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    <CreditCard className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-100 bg-green-50/50 dark:border-green-950 dark:bg-green-950/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      {t("total_repayments_collected", "Total Repayments Collected")}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-green-900 dark:text-green-100">
                      {formatMoney(totalMyRepayments)}
                    </h3>
                    <p className="mt-0.5 text-xs text-green-700/70 dark:text-green-400/60">
                      {t("all_staff_total", "All Staff Total")}:{" "}
                      <span className="font-medium">{formatMoney(totalPaidCollected)}</span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-green-100 p-3 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                    <Banknote className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Search & Filters */}
        <AdvancedFilters
          title={`${t("search")} ${t("customers")}`}
          description={t("manage_customers_credit")}
          fields={[
            {
              key: "query",
              label: t("search"),
              type: "search",
              placeholder: `${t("search")} ${t("customers_list").toLowerCase()}...`,
            },
            {
              key: "city",
              label: t("city"),
              type: "select",
              placeholder: t("city"),
              options: cityOptions,
            },
            {
              key: "balanceStatus",
              label: t("balance_status"),
              type: "select",
              placeholder: t("balance_status"),
              options: balanceStatusOptions,
            },
            ...(isManagement
              ? [
                  {
                    key: "cashierId",
                    label: t("credit_given_by_staff", "Credit Given By Staff"),
                    type: "select" as const,
                    placeholder: t("all_staff", "All Staff"),
                    options: staffOptions,
                  },
                ]
              : []),
            {
              key: "sortBy",
              label: t("sort_by"),
              type: "select",
              placeholder: t("sort_by"),
              options: sortOptions,
            },
          ]}
          values={filterValues}
          onValuesChange={(values) => {
            setFilterValues(values);
            setAppliedFilters(values);
          }}
          onApply={(values) => setAppliedFilters(values)}
          onReset={() => {
            setFilterValues(emptyFilterValues);
            setAppliedFilters(emptyFilterValues);
          }}
          applyLabel={t("search")}
          resetLabel={t("cancel")}
        />

        {/* Customer Data Table */}
        <DataTable
          title={t("customers_list")}
          columns={columns}
          data={filteredCustomers}
          rowKey="id"
          isLoading={loading}
          loadingMessage={t("loading")}
          emptyMessage={isCashier ? t("no_credited_customers_yet", "You haven't given credit to any customers yet.") : t("no_customers_yet")}
          pagination
          initialPageSize={10}
          pageSizeOptions={[10, 25, 50]}
          renderRowActions={(row) => (
            <ThreeDotActionMenu
              menuLabel={row.name}
              items={[
                {
                  label: t("pay_credit", "Pay Credit"),
                  onSelect: () => openPayCreditModal(row),
                  icon: HandCoins,
                },
                {
                  label: t("view"),
                  onSelect: () => openViewModal(row),
                  icon: Eye,
                },
                ...(isManagement
                  ? [
                      {
                        label: t("edit"),
                        onSelect: () => openEditModal(row),
                        icon: Pencil,
                      },
                    ]
                  : []),
                ...(isOwner
                  ? [
                      {
                        label: t("delete"),
                        onSelect: () => openDeleteModal(row),
                        icon: Trash2,
                        destructive: true,
                      },
                    ]
                  : []),
              ]}
            />
          )}
        />

        {error ? <div className="text-sm text-destructive">{error}</div> : null}

        {/* Add Customer Dialog */}
        <Dialog
          open={addDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setForm(emptyCustomerForm);
              setFormErrors({});
            }
            setAddDialogOpen(open);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                {t("add_new_customer")}
              </DialogTitle>
            </DialogHeader>

            <form id="add-customer-form" onSubmit={handleCreate} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="dlg-customer-name">{t("name")} *</Label>
                <Input
                  id="dlg-customer-name"
                  value={form.name}
                  onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
                  placeholder={t("name")}
                  autoFocus
                  aria-invalid={!!formErrors.name}
                />
                {formErrors.name ? (
                  <p className="text-xs text-destructive">{formErrors.name}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dlg-customer-phone">{t("phone_number")} *</Label>
                <Input
                  id="dlg-customer-phone"
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9+\s-]/g, "");
                    setForm((c) => ({ ...c, phoneNumber: val }));
                  }}
                  placeholder={t("phone_number")}
                  aria-invalid={!!formErrors.phoneNumber}
                />
                {formErrors.phoneNumber ? (
                  <p className="text-xs text-destructive">{formErrors.phoneNumber}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dlg-customer-city">{t("city")}</Label>
                <Input
                  id="dlg-customer-city"
                  value={form.city}
                  onChange={(e) => setForm((c) => ({ ...c, city: e.target.value }))}
                  placeholder={t("city")}
                />
              </div>
            </form>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForm(emptyCustomerForm);
                  setFormErrors({});
                  setAddDialogOpen(false);
                }}
                disabled={submitting}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                form="add-customer-form"
                disabled={submitting}
                className="gap-2"
              >
                <UserPlus className="h-4 w-4" />
                {submitting ? t("adding") : t("add_customer")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pay Credit Modal */}
        <Modal
          isOpen={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          title={`${t("pay_credit", "Pay Credit")} - ${payingCustomer?.name || ""}`}
          size="md"
          type="info"
        >
          {payingCustomer ? (
            <form onSubmit={handlePayCreditSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pay-amount-input">{t("amount_paid", "Amount Paid (ETB)")} *</Label>
                  <span className="text-xs text-muted-foreground">
                    {t("unpaid_balance", "Unpaid Balance")}:{" "}
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {formatMoney(payingCustomer.totalUnpaid)}
                    </span>
                  </span>
                </div>
                <Input
                  id="pay-amount-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={payingCustomer.totalUnpaid || undefined}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  {t("amount_deducted_notice", "This amount will be deducted directly from the customer's unpaid balance.")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pay-method-select">{t("payment_method", "Payment Method")}</Label>
                <select
                  id="pay-method-select"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  <option value="cash">{t("cash", "Cash")}</option>
                  <option value="telebirr">Telebirr</option>
                  <option value="cbe_birr">CBE Birr</option>
                  <option value="bank_transfer">{t("bank_transfer", "Bank Transfer")}</option>
                  <option value="other">{t("other", "Other")}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pay-note-input">{t("note_optional", "Note / Reference (Optional)")}</Label>
                <Input
                  id="pay-note-input"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder={t("enter_receipt_or_note", "e.g. Receipt #1042 or partial settlement")}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setPayModalOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={paySubmitting}>
                  {paySubmitting ? t("loading") : t("record_payment", "Record Payment")}
                </Button>
              </div>
            </form>
          ) : null}
        </Modal>

        {/* View / Edit / Delete Modal */}
        <Modal
          isOpen={Boolean(selectedCustomer) && !payModalOpen}
          onClose={resetModal}
          title={
            modalMode === "edit"
              ? `${t("edit")} ${selectedCustomer?.name || t("customer_management")}`
              : modalMode === "delete"
                ? `${t("delete")} ${selectedCustomer?.name || t("customer_management")}`
                : `${t("view")} ${selectedCustomer?.name || t("customer_management")}`
          }
          size="lg"
          type={
            modalMode === "delete"
              ? "error"
              : modalMode === "edit"
                ? "info"
                : "success"
          }
        >
          {selectedCustomer ? (
            modalMode === "delete" ? (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Delete this customer and remove them from the list. This
                  action cannot be undone.
                </p>
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                  <div className="font-semibold text-foreground">
                    {selectedCustomer.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedCustomer.phoneNumber}
                    {selectedCustomer.city ? ` • ${selectedCustomer.city}` : ""}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetModal}>
                    {t("cancel")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? t("loading") : t("delete")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="modal-customer-name">{t("name")}</Label>
                    <Input
                      id="modal-customer-name"
                      value={editForm.name}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      readOnly={modalMode === "view"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="modal-customer-phone">
                      {t("phone_number")}
                    </Label>
                    <Input
                      id="modal-customer-phone"
                      type="tel"
                      value={editForm.phoneNumber}
                      onChange={(event) => {
                        const val = event.target.value.replace(/[^0-9+\s-]/g, "");
                        setEditForm((current) => ({
                          ...current,
                          phoneNumber: val,
                        }));
                      }}
                      readOnly={modalMode === "view"}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="modal-customer-city">{t("city")}</Label>
                    <Input
                      id="modal-customer-city"
                      value={editForm.city}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                      readOnly={modalMode === "view"}
                      placeholder={t("no_city")}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900/20 dark:bg-blue-900/10">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                      <CreditCard className="h-4 w-4" />
                      {t("total_credit")}
                    </div>
                    {modalMode === "edit" ? (
                      <Input
                        type="number"
                        value={editForm.totalCredit}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            totalCredit: Number(event.target.value || 0),
                          }))
                        }
                      />
                    ) : (
                      <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                        {formatMoney(editForm.totalCredit)}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-green-100 bg-green-50/60 p-4 dark:border-green-900/20 dark:bg-green-900/10">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-300">
                      <Banknote className="h-4 w-4" />
                      {t("total_paid")}
                    </div>
                    {modalMode === "edit" ? (
                      <Input
                        type="number"
                        value={editForm.totalPaid}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            totalPaid: Number(event.target.value || 0),
                          }))
                        }
                      />
                    ) : (
                      <div className="text-lg font-semibold text-green-700 dark:text-green-300">
                        {formatMoney(editForm.totalPaid)}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4 dark:border-orange-900/20 dark:bg-orange-900/10">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-400">
                      <Wallet className="h-4 w-4" />
                      {t("unpaid_balance")}
                    </div>
                    <div className="text-lg font-semibold text-orange-700 dark:text-orange-400">
                      {formatMoney(editForm.totalCredit - editForm.totalPaid)}
                    </div>
                  </div>
                </div>

                {/* Credit Breakdown by Staff Member */}
                {modalMode === "view" && selectedCustomer.creditByCashier && selectedCustomer.creditByCashier.length > 0 ? (
                  <div className="space-y-2 rounded-xl border border-border p-4 bg-muted/30">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      {t("credit_given_by_staff_breakdown", "Credit Given By Staff Breakdown")}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedCustomer.creditByCashier.map((item) => (
                        <div key={item.cashierId} className="flex justify-between items-center p-2 rounded bg-background border">
                          <span className="font-medium text-muted-foreground">{item.cashierName}:</span>
                          <span className="font-semibold text-purple-700 dark:text-purple-300">{formatMoney(item.creditAmount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* Payment History Section */}
                {modalMode === "view" ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <History className="h-4 w-4 text-blue-600" />
                        {t("repayment_history", "Debt Repayment History")}
                      </h4>
                      {Number(selectedCustomer.totalUnpaid || 0) > 0 ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => openPayCreditModal(selectedCustomer)}
                          className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <HandCoins className="h-4 w-4" />
                          {t("pay_credit", "Pay Credit")}
                        </Button>
                      ) : null}
                    </div>

                    {loadingHistory ? (
                      <div className="text-xs text-muted-foreground py-4 text-center">{t("loading_history", "Loading repayment history...")}</div>
                    ) : paymentsHistory.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-4 text-center border rounded-lg bg-muted/20">
                        {t("no_repayments_recorded", "No debt repayments recorded for this customer yet.")}
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto border rounded-lg">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-muted text-muted-foreground font-medium border-b sticky top-0">
                            <tr>
                              <th className="p-2">{t("date", "Date")}</th>
                              <th className="p-2">{t("amount", "Amount Paid")}</th>
                              <th className="p-2">{t("method", "Method")}</th>
                              <th className="p-2">{t("collected_by", "Collected By")}</th>
                              <th className="p-2">{t("note", "Note")}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {paymentsHistory.map((p) => (
                              <tr key={p.id} className="hover:bg-muted/40">
                                <td className="p-2 whitespace-nowrap">{new Date(p.createdAt).toLocaleString()}</td>
                                <td className="p-2 font-bold text-green-700 dark:text-green-400">{formatMoney(p.amountPaid)}</td>
                                <td className="p-2 capitalize">{p.paymentMethod}</td>
                                <td className="p-2">{p.collectedByName} ({p.collectedByRole})</td>
                                <td className="p-2 text-muted-foreground">{p.note || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={resetModal}>
                    {t("cancel")}
                  </Button>
                  {modalMode === "edit" ? (
                    <Button
                      type="button"
                      onClick={handleUpdate}
                      disabled={updating}
                    >
                      {updating ? t("loading") : t("edit")}
                    </Button>
                  ) : null}
                </div>
              </div>
            )
          ) : null}
        </Modal>
      </div>
    </RoleLayout>
  );
}

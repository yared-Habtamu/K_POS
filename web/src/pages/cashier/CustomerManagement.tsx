import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, CreditCard, Eye, Pencil, Trash2, Wallet } from "lucide-react";

import { RoleLayout } from "@/components/layout/RoleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/Modal";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/DataTable";
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
  _id: string;
  name: string;
  phoneNumber: string;
  city?: string;
  totalCredit?: number;
  totalPaid?: number;
  totalUnpaid?: number;
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
  sortBy: "name_asc",
};

function formatCityName(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";

  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function CustomerManagement() {
  const { t } = useTranslation();
  const { customers, loading, error, create, update, remove } = useCustomers();
  const { user } = useAuthStore();
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    phoneNumber?: string;
  }>({});
  const [filterValues, setFilterValues] = useState<AdvancedFilterValues>(
    emptyFilterValues,
  );
  const [appliedFilters, setAppliedFilters] = useState<AdvancedFilterValues>(
    emptyFilterValues,
  );
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

  const isManagement = user?.role === "owner" || user?.role === "manager";

  const validateCustomer = (values: CustomerFormState) => {
    const errors: { name?: string; phoneNumber?: string } = {};

    if (!values.name || String(values.name).trim().length < 2) {
      errors.name = t("valid_name_min2");
    }

    if (!values.phoneNumber || String(values.phoneNumber).trim().length < 7) {
      errors.phoneNumber = t("valid_phone_required");
    }

    return errors;
  };

  const formatMoney = (value?: number) =>
    `${Number(value || 0).toLocaleString()} ETB`;

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
    const query = String(appliedFilters.query || "").trim().toLowerCase();
    const city = String(appliedFilters.city || "").trim().toLowerCase();
    const balanceStatus = String(appliedFilters.balanceStatus || "all");
    const sortBy = String(appliedFilters.sortBy || "name_asc");

    const rows = (customers as CustomerRow[]).filter((customer) => {
      const matchesQuery =
        !query ||
        [customer.name, customer.phoneNumber, customer.city]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));

      const matchesCity =
        !city || String(customer.city || "").trim().toLowerCase() === city;

      const unpaidBalance = Number(customer.totalUnpaid || 0);
      const matchesBalanceStatus =
        balanceStatus === "all" ||
        (balanceStatus === "paid" && unpaidBalance === 0) ||
        (balanceStatus === "unpaid" && unpaidBalance > 0) ||
        (balanceStatus === "high_debt" && unpaidBalance >= HIGH_DEBT_THRESHOLD);

      return matchesQuery && matchesCity && matchesBalanceStatus;
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
  }, [appliedFilters, customers]);

  const resetModal = () => {
    setSelectedCustomer(null);
    setModalMode("view");
    setEditForm({
      ...emptyCustomerForm,
      totalCredit: 0,
      totalPaid: 0,
    });
    setFormErrors({});
  };

  const openViewModal = (customer: CustomerRow) => {
    setSelectedCustomer(customer);
    setModalMode("view");
    setEditForm({
      name: customer.name || "",
      phoneNumber: customer.phoneNumber || "",
      city: customer.city || "",
      totalCredit: Number(customer.totalCredit || 0),
      totalPaid: Number(customer.totalPaid || 0),
    });
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
      await update(selectedCustomer._id, {
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
    if (!selectedCustomer) return;

    setDeleting(true);
    try {
      await remove(selectedCustomer._id);
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
        key: "totalCredit",
        header: t("total_credit"),
        accessor: (row) => Number(row.totalCredit || 0),
        cell: (row) => (
          <div className="inline-flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
            <CreditCard className="h-4 w-4" />
            <span>{formatMoney(row.totalCredit)}</span>
          </div>
        ),
      },
      {
        key: "totalPaid",
        header: t("total_paid"),
        accessor: (row) => Number(row.totalPaid || 0),
        cell: (row) => (
          <div className="inline-flex items-center gap-2 font-medium text-green-700 dark:text-green-300">
            <Banknote className="h-4 w-4" />
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
            className={`inline-flex items-center gap-2 font-semibold ${
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
    [t],
  );

  return (
    <RoleLayout allowedRoles={["cashier", "owner", "manager"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("customer_management")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("manage_customers_credit")}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("add_new_customer")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleCreate}
              className="grid grid-cols-1 gap-4 md:grid-cols-4"
            >
              <div className="space-y-2">
                <Label htmlFor="customer-name">{t("name")}</Label>
                <Input
                  id="customer-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder={t("name")}
                />
                {formErrors.name ? (
                  <p className="text-xs text-destructive">{formErrors.name}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-phone">{t("phone_number")}</Label>
                <Input
                  id="customer-phone"
                  value={form.phoneNumber}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      phoneNumber: event.target.value,
                    }))
                  }
                  placeholder={t("phone_number")}
                />
                {formErrors.phoneNumber ? (
                  <p className="text-xs text-destructive">
                    {formErrors.phoneNumber}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-city">{t("city")}</Label>
                <Input
                  id="customer-city"
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  placeholder={t("city")}
                />
              </div>

              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? t("adding") : t("add_customer")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

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

        <DataTable
          title={t("customers_list")}
          columns={columns}
          data={filteredCustomers}
          rowKey="_id"
          isLoading={loading}
          loadingMessage={t("loading")}
          emptyMessage={t("no_customers_yet")}
          pagination
          initialPageSize={10}
          pageSizeOptions={[10, 25, 50]}
          renderRowActions={(row) => (
            <ThreeDotActionMenu
              menuLabel={row.name}
              items={[
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
                {
                  label: t("delete"),
                  onSelect: () => openDeleteModal(row),
                  icon: Trash2,
                  destructive: true,
                },
              ]}
            />
          )}
        />

        {error ? <div className="text-sm text-destructive">{error}</div> : null}

        <Modal
          isOpen={Boolean(selectedCustomer)}
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
                  Delete this customer and remove them from the list. This action cannot be undone.
                </p>
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                  <div className="font-semibold text-foreground">{selectedCustomer.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedCustomer.phoneNumber}
                    {selectedCustomer.city ? ` • ${selectedCustomer.city}` : ""}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetModal}>
                    {t("cancel")}
                  </Button>
                  <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
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
                    <Label htmlFor="modal-customer-phone">{t("phone_number")}</Label>
                    <Input
                      id="modal-customer-phone"
                      value={editForm.phoneNumber}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          phoneNumber: event.target.value,
                        }))
                      }
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

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetModal}>
                    {t("cancel")}
                  </Button>
                  {modalMode === "edit" ? (
                    <Button type="button" onClick={handleUpdate} disabled={updating}>
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

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";

type ProductRow = {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: "Active" | "Low Stock" | "Draft";
};

const sampleRows: ProductRow[] = [
  { id: 1, name: "Arabica Coffee", category: "Beverages", price: 280, stock: 42, status: "Active" },
  { id: 2, name: "Organic Honey", category: "Groceries", price: 460, stock: 8, status: "Low Stock" },
  { id: 3, name: "Olive Oil", category: "Groceries", price: 620, stock: 24, status: "Active" },
  { id: 4, name: "Notebook A5", category: "Stationery", price: 95, stock: 0, status: "Draft" },
  { id: 5, name: "Sparkling Water", category: "Beverages", price: 55, stock: 96, status: "Active" },
  { id: 6, name: "Chocolate Bar", category: "Snacks", price: 40, stock: 15, status: "Low Stock" },
  { id: 7, name: "Rice 5kg", category: "Groceries", price: 540, stock: 31, status: "Active" },
  { id: 8, name: "Hand Wash", category: "Household", price: 130, stock: 18, status: "Active" },
  { id: 9, name: "Paper Towels", category: "Household", price: 180, stock: 11, status: "Low Stock" },
  { id: 10, name: "Granola", category: "Snacks", price: 210, stock: 27, status: "Active" },
  { id: 11, name: "Green Tea", category: "Beverages", price: 145, stock: 36, status: "Active" },
  { id: 12, name: "Desk Lamp", category: "Electronics", price: 890, stock: 6, status: "Low Stock" },
];

const columns: Array<DataTableColumn<ProductRow>> = [
  {
    key: "name",
    header: "Product",
    accessor: "name",
    sortable: true,
    searchable: true,
    className: "font-medium",
  },
  {
    key: "category",
    header: "Category",
    accessor: "category",
    sortable: true,
    searchable: true,
    cell: (row) => <Badge variant="outline">{row.category}</Badge>,
  },
  {
    key: "price",
    header: "Price",
    accessor: "price",
    sortable: true,
    className: "text-right",
    headerClassName: "text-right",
    cell: (row) => `${row.price.toFixed(2)} ETB`,
  },
  {
    key: "stock",
    header: "Stock",
    accessor: "stock",
    sortable: true,
    className: "text-right",
    headerClassName: "text-right",
    cell: (row) => (
      <span className={row.stock <= 10 ? "font-medium text-destructive" : "text-foreground"}>{row.stock}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    accessor: "status",
    sortable: true,
    searchable: true,
    cell: (row) => {
      const variant = row.status === "Low Stock" ? "destructive" : row.status === "Draft" ? "secondary" : "default";
      return <Badge variant={variant}>{row.status}</Badge>;
    },
  },
];

export function DataTableExample() {
  return (
    <DataTable
      title="Reusable data table example"
      description="This standalone example shows dynamic columns, search, sorting, pagination, built-in row actions, and custom actions."
      columns={columns}
      data={sampleRows}
      rowKey="id"
      searchable
      searchPlaceholder="Search products or categories..."
      pagination
      initialPageSize={5}
      pageSizeOptions={[5, 10, 20]}
      defaultSort={{ columnKey: "name", direction: "asc" }}
      toolbarContent={<Button type="button">Add product</Button>}
      onView={(row) => window.alert(`View ${row.name}`)}
      onEdit={(row) => window.alert(`Edit ${row.name}`)}
      onDelete={(row) => window.alert(`Delete ${row.name}`)}
      customRowActions={[
        {
          label: "Duplicate",
          variant: "outline",
          onClick: (row) => window.alert(`Duplicate ${row.name}`),
        },
      ]}
      emptyMessage="No matching products found."
    />
  );
}

export default DataTableExample;
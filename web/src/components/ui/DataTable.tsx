"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Loader2,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type DataTablePrimitive = string | number | boolean | Date | null | undefined;

export interface DataTableColumn<TData> {
  key: string;
  header: React.ReactNode;
  accessor?: keyof TData | ((row: TData) => DataTablePrimitive);
  cell?: (row: TData) => React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
  sortValue?: (row: TData) => DataTablePrimitive;
  className?: string;
  headerClassName?: string;
}

export interface DataTableRowAction<TData> {
  label: string;
  onClick: (row: TData) => void;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: ButtonProps["variant"];
  className?: string;
}

export interface DataTableProps<TData> {
  columns: Array<DataTableColumn<TData>>;
  data: TData[];
  rowKey: keyof TData | ((row: TData, index: number) => React.Key);
  title?: React.ReactNode;
  description?: React.ReactNode;
  isLoading?: boolean;
  loadingMessage?: React.ReactNode;
  emptyMessage?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchKeys?: Array<keyof TData | ((row: TData) => DataTablePrimitive)>;
  pagination?: boolean;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  paginationVariant?: "default" | "simple";
  showPageSizeSelector?: boolean;
  showEdgeButtons?: boolean;
  defaultSort?: {
    columnKey: string;
    direction?: "asc" | "desc";
  };
  onView?: (row: TData) => void;
  onEdit?: (row: TData) => void;
  onDelete?: (row: TData) => void;
  customRowActions?: Array<DataTableRowAction<TData>>;
  renderRowActions?: (row: TData) => React.ReactNode;
  onRowClick?: (row: TData) => void;
  toolbarContent?: React.ReactNode;
  className?: string;
  tableClassName?: string;
}

function getRowValue<TData>(
  row: TData,
  accessor?: keyof TData | ((row: TData) => DataTablePrimitive),
): DataTablePrimitive {
  if (!accessor) {
    return undefined;
  }

  if (typeof accessor === "function") {
    return accessor(row);
  }

  return row[accessor] as DataTablePrimitive;
}

function normalizeValue(value: DataTablePrimitive): string | number {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  return String(value ?? "").toLowerCase();
}

function matchesSearch<TData>(
  row: TData,
  query: string,
  columns: Array<DataTableColumn<TData>>,
  searchKeys?: Array<keyof TData | ((row: TData) => DataTablePrimitive)>,
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const keys =
    searchKeys && searchKeys.length > 0
      ? searchKeys
      : columns.filter((column) => column.searchable).map((column) => column.accessor).filter(Boolean);

  if (keys.length === 0) {
    return true;
  }

  return keys.some((key) => {
    const value = getRowValue(row, key);
    return String(value ?? "").toLowerCase().includes(normalizedQuery);
  });
}

export function DataTable<TData>({
  columns,
  data,
  rowKey,
  title,
  description,
  isLoading = false,
  loadingMessage,
  emptyMessage,
  searchable = false,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  searchKeys,
  pagination = false,
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50],
  paginationVariant = "default",
  showPageSizeSelector = true,
  showEdgeButtons = true,
  defaultSort,
  onView,
  onEdit,
  onDelete,
  customRowActions,
  renderRowActions,
  toolbarContent,
  onRowClick,
  className,
  tableClassName,
}: DataTableProps<TData>) {
  const { t } = useTranslation();
  const [internalSearch, setInternalSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);
  const [sortState, setSortState] = React.useState<{
    columnKey: string;
    direction: "asc" | "desc";
  } | null>(
    defaultSort
      ? {
          columnKey: defaultSort.columnKey,
          direction: defaultSort.direction ?? "asc",
        }
      : null,
  );

  const activeSearchValue = searchValue ?? internalSearch;
  const hasBuiltInActions = Boolean(onView || onEdit || onDelete || customRowActions?.length || renderRowActions);
  const resolvedLoadingMessage = loadingMessage ?? t("loading_data");
  const resolvedEmptyMessage = emptyMessage ?? t("no_records_found");
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("search_records");

  React.useEffect(() => {
    setPage(1);
  }, [activeSearchValue, pageSize, data.length]);

  const filteredRows = data.filter((row) => matchesSearch(row, activeSearchValue, columns, searchKeys));

  const sortedRows = [...filteredRows].sort((leftRow, rightRow) => {
    if (!sortState) {
      return 0;
    }

    const column = columns.find((item) => item.key === sortState.columnKey);
    if (!column) {
      return 0;
    }

    const leftValue = normalizeValue(column.sortValue ? column.sortValue(leftRow) : getRowValue(leftRow, column.accessor));
    const rightValue = normalizeValue(column.sortValue ? column.sortValue(rightRow) : getRowValue(rightRow, column.accessor));

    if (leftValue < rightValue) {
      return sortState.direction === "asc" ? -1 : 1;
    }

    if (leftValue > rightValue) {
      return sortState.direction === "asc" ? 1 : -1;
    }

    return 0;
  });

  const totalRows = sortedRows.length;
  const totalPages = pagination ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const startIndex = pagination ? (currentPage - 1) * pageSize : 0;
  const pagedRows = pagination ? sortedRows.slice(startIndex, startIndex + pageSize) : sortedRows;
  const firstRowNumber = totalRows === 0 ? 0 : startIndex + 1;
  const lastRowNumber = pagination ? Math.min(startIndex + pageSize, totalRows) : totalRows;
  const colSpan = columns.length + (hasBuiltInActions ? 1 : 0);

  const updateSearch = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value);
      return;
    }

    setInternalSearch(value);
  };

  const toggleSort = (column: DataTableColumn<TData>) => {
    if (!column.sortable) {
      return;
    }

    setSortState((current) => {
      if (!current || current.columnKey !== column.key) {
        return { columnKey: column.key, direction: "asc" };
      }

      return {
        columnKey: column.key,
        direction: current.direction === "asc" ? "desc" : "asc",
      };
    });
  };

  const resolveRowKey = (row: TData, index: number) => {
    if (typeof rowKey === "function") {
      return rowKey(row, index);
    }

    return row[rowKey] as React.Key;
  };

  const getHeaderText = (header: React.ReactNode) => {
    if (typeof header === "string" || typeof header === "number") {
      return String(header);
    }

    return "";
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      {(title || description || searchable || toolbarContent) && (
        <CardHeader className="gap-4 border-b bg-muted/20">
          {(title || description) && (
            <div className="space-y-1">
              {title ? <CardTitle className="text-xl">{title}</CardTitle> : null}
              {description ? <CardDescription>{description}</CardDescription> : null}
            </div>
          )}

          {(searchable || toolbarContent) && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {searchable ? (
                <div className="relative w-full sm:max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={activeSearchValue}
                    onChange={(event) => updateSearch(event.target.value)}
                    placeholder={resolvedSearchPlaceholder}
                    className="pl-10"
                    aria-label={t("search_table_rows")}
                  />
                </div>
              ) : (
                <div />
              )}

              {toolbarContent ? <div className="flex flex-wrap items-center gap-2">{toolbarContent}</div> : null}
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className={cn("min-w-full", tableClassName)}>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              {columns.map((column) => {
                const isSorted = sortState?.columnKey === column.key;

                return (
                  <TableHead key={column.key} className={cn(column.headerClassName)}>
                    {column.sortable ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-left font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => toggleSort(column)}
                        aria-label={t("sort_by_column", {
                          column: getHeaderText(column.header),
                          direction: isSorted ? t(sortState.direction === "asc" ? "ascending" : "descending") : "",
                        }).trim()}
                      >
                        <span>{column.header}</span>
                        <ArrowUpDown className={cn("h-4 w-4", isSorted ? "text-foreground" : "text-muted-foreground/70")} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                );
              })}

              {hasBuiltInActions ? (
                <TableHead className="sticky right-0 z-20 bg-muted text-center border-l border-b">
                  {t("actions")}
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: Math.min(pageSize, 5) }).map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  {Array.from({ length: colSpan }).map((__, cellIndex) => (
                    <TableCell key={`loading-cell-${cellIndex}`}>
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : pagedRows.length > 0 ? (
              pagedRows.map((row, index) => (
                <TableRow 
                  key={resolveRowKey(row, index)}
                  className={cn("group", onRowClick && "cursor-pointer hover:bg-muted/50 transition-colors")}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} className={cn(column.className)}>
                      {column.cell ? column.cell(row) : String(getRowValue(row, column.accessor) ?? "—")}
                    </TableCell>
                  ))}

                  {hasBuiltInActions ? (
                    <TableCell className="sticky right-0 z-10 bg-background text-center border-l border-b transition-colors group-hover:bg-muted/50">
                      <div className="flex justify-center gap-2">
                        {onView ? (
                          <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onView(row); }} aria-label={t("view")}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : null}

                        {onEdit ? (
                          <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(row); }} aria-label={t("edit")}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}

                        {onDelete ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); onDelete(row); }}
                            className="text-destructive hover:text-destructive"
                            aria-label={t("delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : null}

                        {customRowActions?.map((action) => {
                          const ActionIcon = action.icon;

                          return (
                            <Button
                              key={action.label}
                              type="button"
                              variant={action.variant ?? "outline"}
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); action.onClick(row); }}
                              className={action.className}
                            >
                              {ActionIcon ? <ActionIcon className="h-4 w-4" /> : null}
                              {action.label}
                            </Button>
                          );
                        })}

                        {renderRowActions ? renderRowActions(row) : null}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={colSpan} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 opacity-0" />
                    <p className="text-sm">{resolvedEmptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{resolvedLoadingMessage}</span>
          </div>
        ) : pagination ? (
          paginationVariant === "simple" ? (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {t("showing")} <span className="font-medium text-foreground">{firstRowNumber}</span> {t("to")} <span className="font-medium text-foreground">{lastRowNumber}</span> {t("of")} <span className="font-medium text-foreground">{totalRows}</span> {t("entries")}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                >
                  {t("previous", "Prev")}
                </Button>
                <Button type="button" variant="default" size="sm" disabled>
                  {currentPage}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t("next", "Next")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {t("showing")} <span className="font-medium text-foreground">{firstRowNumber}</span> {t("to")} <span className="font-medium text-foreground">{lastRowNumber}</span> {t("of")} <span className="font-medium text-foreground">{totalRows}</span> {t("entries")}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {showPageSizeSelector ? (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t("rows")}</span>
                    <select
                      value={pageSize}
                      onChange={(event) => setPageSize(Number(event.target.value))}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {pageSizeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <div className="flex items-center gap-1">
                  {showEdgeButtons ? (
                    <Button type="button" variant="outline" size="icon" onClick={() => setPage(1)} disabled={currentPage === 1} aria-label={t("first_page")}>
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" size="icon" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1} aria-label={t("previous_page")}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 text-sm text-muted-foreground">
                    {t("page")} <span className="font-medium text-foreground">{currentPage}</span> {t("of")} <span className="font-medium text-foreground">{totalPages}</span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    disabled={currentPage === totalPages}
                    aria-label={t("next_page")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {showEdgeButtons ? (
                    <Button type="button" variant="outline" size="icon" onClick={() => setPage(totalPages)} disabled={currentPage === totalPages} aria-label={t("last_page")}>
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}

export default DataTable;
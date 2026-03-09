"use client";

import * as React from "react";
import { Filter, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type AdvancedFilterFieldValue = string | number | boolean | null | undefined | DateRangeValue;

export type AdvancedFilterValues = Record<string, AdvancedFilterFieldValue>;

export interface DateRangeValue {
  from?: string;
  to?: string;
}

export interface AdvancedFilterOption {
  label: string;
  value: string;
}

interface BaseAdvancedFilterField {
  key: string;
  label: React.ReactNode;
  helperText?: React.ReactNode;
}

export interface SearchFilterField extends BaseAdvancedFilterField {
  type: "search";
  placeholder?: string;
}

export interface SelectFilterField extends BaseAdvancedFilterField {
  type: "select";
  placeholder?: string;
  options: AdvancedFilterOption[];
}

export interface DateFilterField extends BaseAdvancedFilterField {
  type: "date";
}

export interface DateRangeFilterField extends BaseAdvancedFilterField {
  type: "date-range";
  fromLabel?: React.ReactNode;
  toLabel?: React.ReactNode;
}

export interface CustomFilterField extends BaseAdvancedFilterField {
  type: "custom";
  render: (context: {
    value: AdvancedFilterFieldValue;
    allValues: AdvancedFilterValues;
    setValue: (value: AdvancedFilterFieldValue) => void;
  }) => React.ReactNode;
}

export type AdvancedFilterField =
  | SearchFilterField
  | SelectFilterField
  | DateFilterField
  | DateRangeFilterField
  | CustomFilterField;

export interface AdvancedFiltersProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  fields: AdvancedFilterField[];
  values?: AdvancedFilterValues;
  defaultValues?: AdvancedFilterValues;
  onValuesChange?: (values: AdvancedFilterValues) => void;
  onApply?: (values: AdvancedFilterValues) => void;
  onReset?: () => void;
  applyLabel?: React.ReactNode;
  resetLabel?: React.ReactNode;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  showActiveBadges?: boolean;
  className?: string;
}

function isDateRangeValue(value: AdvancedFilterFieldValue): value is DateRangeValue {
  return typeof value === "object" && value !== null && ("from" in value || "to" in value);
}

function isFilterActive(value: AdvancedFilterFieldValue) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return true;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (isDateRangeValue(value)) {
    return Boolean(value.from || value.to);
  }

  return false;
}

function getEmptyValue(field: AdvancedFilterField): AdvancedFilterFieldValue {
  if (field.type === "date-range") {
    return { from: "", to: "" };
  }

  return "";
}

function getFieldBadgeLabel(field: AdvancedFilterField, value: AdvancedFilterFieldValue) {
  if (field.type === "date-range" && isDateRangeValue(value)) {
    const from = value.from || "Any";
    const to = value.to || "Any";
    return `${String(field.label)}: ${from} - ${to}`;
  }

  if (field.type === "select") {
    const selectedOption = field.options.find((option) => option.value === value);
    return `${String(field.label)}: ${selectedOption?.label ?? value}`;
  }

  return `${String(field.label)}: ${String(value)}`;
}

export function AdvancedFilters({
  title = "Advanced filters",
  description = "Refine the dataset with reusable search, select, and date filters.",
  fields,
  values,
  defaultValues = {},
  onValuesChange,
  onApply,
  onReset,
  applyLabel = "Apply filters",
  resetLabel = "Reset",
  defaultExpanded = true,
  collapsible = true,
  showActiveBadges = true,
  className,
}: AdvancedFiltersProps) {
  const [internalValues, setInternalValues] = React.useState<AdvancedFilterValues>(defaultValues);
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const filterValues = values ?? internalValues;

  const updateValues = React.useCallback(
    (nextValues: AdvancedFilterValues) => {
      if (values === undefined) {
        setInternalValues(nextValues);
      }

      onValuesChange?.(nextValues);
    },
    [onValuesChange, values],
  );

  const setFieldValue = React.useCallback(
    (key: string, nextValue: AdvancedFilterFieldValue) => {
      updateValues({
        ...filterValues,
        [key]: nextValue,
      });
    },
    [filterValues, updateValues],
  );

  const handleReset = () => {
    const resetValues = fields.reduce<AdvancedFilterValues>((accumulator, field) => {
      accumulator[field.key] = getEmptyValue(field);
      return accumulator;
    }, {});

    updateValues(resetValues);
    onReset?.();
  };

  const activeFields = fields.filter((field) => isFilterActive(filterValues[field.key]));

  return (
    <Card className={cn(className)}>
      <CardHeader className="gap-4 border-b bg-muted/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <SlidersHorizontal className="h-5 w-5" />
              {title}
            </CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>

          <div className="flex items-center gap-2">
            {activeFields.length > 0 ? <Badge variant="secondary">{activeFields.length} active</Badge> : null}
            {collapsible ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setIsExpanded((current) => !current)}>
                <Filter className="h-4 w-4" />
                {isExpanded ? "Hide" : "Show"}
              </Button>
            ) : null}
          </div>
        </div>

        {showActiveBadges && activeFields.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeFields.map((field) => (
              <Badge key={field.key} variant="outline" className="gap-2 px-3 py-1">
                <span>{getFieldBadgeLabel(field, filterValues[field.key])}</span>
                <button
                  type="button"
                  className="inline-flex items-center"
                  onClick={() => setFieldValue(field.key, getEmptyValue(field))}
                  aria-label={`Clear ${String(field.label)} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
      </CardHeader>

      {isExpanded ? (
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {fields.map((field) => {
              const value = filterValues[field.key];

              return (
                <div key={field.key} className="space-y-2">
                  <label className="text-sm font-medium text-foreground">{field.label}</label>

                  {field.type === "search" ? (
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={typeof value === "string" ? value : ""}
                        onChange={(event) => setFieldValue(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        className="pl-10"
                      />
                    </div>
                  ) : null}

                  {field.type === "select" ? (
                    <Select value={typeof value === "string" ? value : ""} onValueChange={(nextValue) => setFieldValue(field.key, nextValue)}>
                      <SelectTrigger>
                        <SelectValue placeholder={field.placeholder ?? "Select option"} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}

                  {field.type === "date" ? (
                    <Input
                      type="date"
                      value={typeof value === "string" ? value : ""}
                      onChange={(event) => setFieldValue(field.key, event.target.value)}
                    />
                  ) : null}

                  {field.type === "date-range" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{field.fromLabel ?? "From"}</p>
                        <Input
                          type="date"
                          value={isDateRangeValue(value) ? value.from ?? "" : ""}
                          onChange={(event) =>
                            setFieldValue(field.key, {
                              from: event.target.value,
                              to: isDateRangeValue(value) ? value.to ?? "" : "",
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{field.toLabel ?? "To"}</p>
                        <Input
                          type="date"
                          value={isDateRangeValue(value) ? value.to ?? "" : ""}
                          onChange={(event) =>
                            setFieldValue(field.key, {
                              from: isDateRangeValue(value) ? value.from ?? "" : "",
                              to: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  ) : null}

                  {field.type === "custom"
                    ? field.render({
                        value,
                        allValues: filterValues,
                        setValue: (nextValue) => setFieldValue(field.key, nextValue),
                      })
                    : null}

                  {field.helperText ? <p className="text-xs text-muted-foreground">{field.helperText}</p> : null}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              {resetLabel}
            </Button>
            <Button type="button" onClick={() => onApply?.(filterValues)}>
              <Filter className="h-4 w-4" />
              {applyLabel}
            </Button>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default AdvancedFilters;
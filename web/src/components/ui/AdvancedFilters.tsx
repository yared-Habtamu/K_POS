"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Filter, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import EthiopianDatePicker from "@/components/ui/ethiopian-date-picker";
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

export function AdvancedFilters({
  title,
  description,
  fields,
  values,
  defaultValues = {},
  onValuesChange,
  onApply,
  onReset,
  applyLabel,
  resetLabel,
  defaultExpanded = true,
  collapsible = true,
  showActiveBadges = true,
  className,
}: AdvancedFiltersProps) {
  const { t } = useTranslation();
  const translateText = React.useCallback(
    (value?: string) => (value ? t(value, { defaultValue: value }) : ""),
    [t],
  );
  const resolveNode = React.useCallback(
    (value: React.ReactNode) =>
      typeof value === "string" ? translateText(value) : value,
    [translateText],
  );
  const resolveNodeText = React.useCallback(
    (value: React.ReactNode) => {
      if (typeof value === "string") return translateText(value);
      if (typeof value === "number") return String(value);
      return "";
    },
    [translateText],
  );
  const [internalValues, setInternalValues] = React.useState<AdvancedFilterValues>(defaultValues);
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const resolvedTitle = resolveNode(title ?? t("advanced_filters"));
  const resolvedDescription = resolveNode(description ?? t("advanced_filters_description"));
  const resolvedApplyLabel = resolveNode(applyLabel ?? t("apply_filters"));
  const resolvedResetLabel = resolveNode(resetLabel ?? t("reset"));

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
              {resolvedTitle}
            </CardTitle>
            {resolvedDescription ? <CardDescription>{resolvedDescription}</CardDescription> : null}
          </div>

          <div className="flex items-center gap-2">
            {activeFields.length > 0 ? <Badge variant="secondary">{t("active_filters_count", { count: activeFields.length })}</Badge> : null}
            {collapsible ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setIsExpanded((current) => !current)}>
                <Filter className="h-4 w-4" />
                {isExpanded ? t("hide") : t("show")}
              </Button>
            ) : null}
          </div>
        </div>

        {showActiveBadges && activeFields.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {activeFields.map((field) => (
              <Badge key={field.key} variant="outline" className="gap-2 px-3 py-1">
                <span>
                  {(() => {
                    const value = filterValues[field.key];
                    const labelText = resolveNodeText(field.label);

                    if (field.type === "date-range" && isDateRangeValue(value)) {
                      const from = value.from || t("any", { defaultValue: "Any" });
                      const to = value.to || t("any", { defaultValue: "Any" });
                      return `${labelText}: ${from} - ${to}`;
                    }

                    if (field.type === "select") {
                      const selectedOption = field.options.find((option) => option.value === value);
                      const optionLabel = translateText(selectedOption?.label ?? String(value ?? ""));
                      return `${labelText}: ${optionLabel}`;
                    }

                    return `${labelText}: ${String(value ?? "")}`;
                  })()}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center"
                  onClick={() => setFieldValue(field.key, getEmptyValue(field))}
                  aria-label={t("clear_filter")}
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
                  <label className="text-sm font-medium text-foreground">{resolveNode(field.label)}</label>

                  {field.type === "search" ? (
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={typeof value === "string" ? value : ""}
                        onChange={(event) => setFieldValue(field.key, event.target.value)}
                        placeholder={translateText(field.placeholder)}
                        className="pl-10"
                      />
                    </div>
                  ) : null}

                  {field.type === "select" ? (
                    <Select value={typeof value === "string" ? value : ""} onValueChange={(nextValue) => setFieldValue(field.key, nextValue)}>
                      <SelectTrigger>
                        <SelectValue placeholder={translateText(field.placeholder) || t("select_option")} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {translateText(option.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}

                  {field.type === "date" ? (
                    <EthiopianDatePicker
                      value={typeof value === "string" ? value : ""}
                      onChange={(ymd) => setFieldValue(field.key, ymd)}
                    />
                  ) : null}

                  {field.type === "date-range" ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{field.fromLabel ?? t("from")}</p>
                        <EthiopianDatePicker
                          value={isDateRangeValue(value) ? value.from ?? "" : ""}
                          onChange={(ymd) =>
                            setFieldValue(field.key, {
                              from: ymd,
                              to: isDateRangeValue(value) ? value.to ?? "" : "",
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">{field.toLabel ?? t("to")}</p>
                        <EthiopianDatePicker
                          value={isDateRangeValue(value) ? value.to ?? "" : ""}
                          onChange={(ymd) =>
                            setFieldValue(field.key, {
                              from: isDateRangeValue(value) ? value.from ?? "" : "",
                              to: ymd,
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

                  {field.helperText ? <p className="text-xs text-muted-foreground">{resolveNode(field.helperText)}</p> : null}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              {resolvedResetLabel}
            </Button>
            <Button type="button" onClick={() => onApply?.(filterValues)}>
              <Filter className="h-4 w-4" />
              {resolvedApplyLabel}
            </Button>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default AdvancedFilters;
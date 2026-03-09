"use client";

import * as React from "react";

import {
  AdvancedFilters,
  type AdvancedFilterField,
  type AdvancedFilterValues,
} from "@/components/ui/AdvancedFilters";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const fields: AdvancedFilterField[] = [
  {
    key: "search",
    type: "search",
    label: "Search",
    placeholder: "Search by mart, owner, or city...",
  },
  {
    key: "status",
    type: "select",
    label: "Status",
    placeholder: "Select status",
    options: [
      { label: "All", value: "all" },
      { label: "Active", value: "active" },
      { label: "Pending", value: "pending" },
      { label: "Suspended", value: "suspended" },
    ],
  },
  {
    key: "region",
    type: "select",
    label: "Region",
    placeholder: "Choose region",
    options: [
      { label: "All regions", value: "all" },
      { label: "Addis Ababa", value: "addis_ababa" },
      { label: "Oromia", value: "oromia" },
      { label: "Amhara", value: "amhara" },
      { label: "Sidama", value: "sidama" },
    ],
  },
  {
    key: "registeredAt",
    type: "date-range",
    label: "Registration date",
    fromLabel: "Registered from",
    toLabel: "Registered to",
  },
  {
    key: "minRevenue",
    type: "custom",
    label: "Minimum revenue",
    helperText: "Example of a custom filter control inside the shared panel.",
    render: ({ value, setValue }) => (
      <input
        type="number"
        value={typeof value === "number" ? value : ""}
        onChange={(event) => setValue(event.target.value ? Number(event.target.value) : "")}
        placeholder="Minimum ETB"
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
    ),
  },
];

export function AdvancedFiltersExample() {
  const [values, setValues] = React.useState<AdvancedFilterValues>({
    search: "",
    status: "all",
    region: "all",
    registeredAt: { from: "", to: "" },
    minRevenue: "",
  });
  const [appliedValues, setAppliedValues] = React.useState<AdvancedFilterValues>(values);

  return (
    <div className="space-y-6">
      <AdvancedFilters
        title="Reusable advanced filters example"
        description="This shared component supports search, select, date range, custom fields, active filter badges, and apply/reset actions."
        fields={fields}
        values={values}
        onValuesChange={setValues}
        onApply={setAppliedValues}
      />

      <Card>
        <CardHeader>
          <CardTitle>Applied filter snapshot</CardTitle>
          <CardDescription>
            This preview shows the values currently applied through the reusable filters component.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {Object.entries(appliedValues).map(([key, value]) => {
              const hasValue =
                typeof value === "object" && value !== null
                  ? Boolean((value as { from?: string; to?: string }).from || (value as { from?: string; to?: string }).to)
                  : Boolean(value);

              if (!hasValue) {
                return null;
              }

              return (
                <Badge key={key} variant="outline">
                  {key}: {typeof value === "object" && value !== null ? `${(value as { from?: string; to?: string }).from || "Any"} - ${(value as { from?: string; to?: string }).to || "Any"}` : String(value)}
                </Badge>
              );
            })}
          </div>

          <pre className="overflow-x-auto rounded-xl border bg-muted/20 p-4 text-xs text-muted-foreground">
{JSON.stringify(appliedValues, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdvancedFiltersExample;
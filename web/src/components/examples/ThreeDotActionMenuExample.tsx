"use client";

import { Copy, Eye, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThreeDotActionMenu } from "@/components/ui/ThreeDotActionMenu";

const sampleRows = [
  { id: 1, name: "Arabica Coffee", status: "Active" },
  { id: 2, name: "Organic Honey", status: "Draft" },
  { id: 3, name: "Olive Oil", status: "Archived" },
];

export function ThreeDotActionMenuExample() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Three-dot action menu example</CardTitle>
        <CardDescription>
          This shared pattern is designed for row actions, card menus, and compact contextual controls across the app.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-xl border">
          {sampleRows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-4 border-b px-4 py-4 last:border-b-0">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{row.name}</p>
                <div className="mt-2">
                  <Badge variant="outline">{row.status}</Badge>
                </div>
              </div>

              <ThreeDotActionMenu
                menuLabel={row.name}
                items={[
                  {
                    label: "View details",
                    icon: Eye,
                    onSelect: () => window.alert(`View ${row.name}`),
                  },
                  {
                    label: "Edit",
                    icon: Pencil,
                    shortcut: "E",
                    onSelect: () => window.alert(`Edit ${row.name}`),
                  },
                  {
                    label: "Duplicate",
                    icon: Copy,
                    onSelect: () => window.alert(`Duplicate ${row.name}`),
                  },
                  {
                    label: "Delete",
                    icon: Trash2,
                    destructive: true,
                    separatorBefore: true,
                    onSelect: () => window.alert(`Delete ${row.name}`),
                  },
                ]}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ThreeDotActionMenuExample;
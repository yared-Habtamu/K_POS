"use client";

import * as React from "react";

import { AutoComplete } from "@/components/ui/AutoComplete";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type CategoryItem = {
  id: string;
  name: string;
  type: string;
};

type UserItem = {
  id: string;
  name: string;
  email: string;
};

const categories: CategoryItem[] = [
  { id: "cat-1", name: "Beverages", type: "Inventory" },
  { id: "cat-2", name: "Bakery", type: "Inventory" },
  { id: "cat-3", name: "Cleaning Supplies", type: "Operations" },
  { id: "cat-4", name: "Electronics", type: "Assets" },
  { id: "cat-5", name: "Personal Care", type: "Inventory" },
  { id: "cat-6", name: "Snacks", type: "Inventory" },
];

const users: UserItem[] = [
  { id: "usr-1", name: "Abel Tadesse", email: "abel@smartpos.test" },
  { id: "usr-2", name: "Mahi Derese", email: "mahi@smartpos.test" },
  { id: "usr-3", name: "Ruth Bekele", email: "ruth@smartpos.test" },
  { id: "usr-4", name: "Samuel Alemu", email: "samuel@smartpos.test" },
  { id: "usr-5", name: "Hanna Tesfaye", email: "hanna@smartpos.test" },
];

export function AutoCompleteExample() {
  const [categoryOptions, setCategoryOptions] = React.useState<CategoryItem[]>(categories);
  const [userOptions, setUserOptions] = React.useState<UserItem[]>(users);
  const [selectedCategory, setSelectedCategory] = React.useState<CategoryItem | null>(null);
  const [selectedUser, setSelectedUser] = React.useState<UserItem | null>(null);

  const fetchUsers = React.useCallback(async (query: string) => {
    await new Promise((resolve) => window.setTimeout(resolve, 450));

    return userOptions.filter((user) => {
      const normalizedQuery = query.toLowerCase();
      return user.name.toLowerCase().includes(normalizedQuery) || user.email.toLowerCase().includes(normalizedQuery);
    });
  }, [userOptions]);

  const createCategory = React.useCallback(async (query: string) => {
    const createdCategory = {
      id: `cat-${crypto.randomUUID()}`,
      name: query,
      type: "Custom",
    };

    setCategoryOptions((current) => [...current, createdCategory]);
    return createdCategory;
  }, []);

  const createUser = React.useCallback(async (query: string) => {
    await new Promise((resolve) => window.setTimeout(resolve, 350));

    const createdUser = {
      id: `usr-${crypto.randomUUID()}`,
      name: query,
      email: `${query.toLowerCase().replace(/\s+/g, ".")}@smartpos.test`,
    };

    setUserOptions((current) => [...current, createdUser]);
    return createdUser;
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reusable auto-complete example</CardTitle>
        <CardDescription>
          This example shows local and async auto-complete flows, including creating a new option when nothing matches.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <AutoComplete<CategoryItem>
            id="category-autocomplete"
            label="Category"
            placeholder="Search categories..."
            items={categoryOptions}
            getItemLabel={(item) => item.name}
            getItemValue={(item) => item.id}
            onSelect={(item) => setSelectedCategory(item)}
            allowCreate
            onCreateOption={createCategory}
            createOptionLabel={(query) => `Register category "${query}"`}
            helperText="If a category does not exist, you can register it and it becomes searchable immediately."
            renderItem={(item) => (
              <div className="flex items-center justify-between gap-3">
                <span>{item.name}</span>
                <Badge variant="outline">{item.type}</Badge>
              </div>
            )}
          />

          <AutoComplete<UserItem>
            id="user-autocomplete"
            label="Assign user"
            placeholder="Search users by name or email..."
            fetchSuggestions={fetchUsers}
            getItemLabel={(item) => item.name}
            getItemValue={(item) => item.id}
            onSelect={(item) => setSelectedUser(item)}
            minQueryLength={1}
            allowCreate
            onCreateOption={createUser}
            createOptionLabel={(query) => `Register user "${query}"`}
            helperText="Simulates an API-backed suggestion request and lets you register a new user when no result exists."
            renderItem={(item) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{item.name}</p>
                <p className="truncate text-xs text-muted-foreground">{item.email}</p>
              </div>
            )}
          />
        </div>

        <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Selected category</p>
            <p className="text-sm text-muted-foreground">
              {selectedCategory ? `${selectedCategory.name} (${selectedCategory.type})` : "No category selected yet."}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Selected user</p>
            <p className="text-sm text-muted-foreground">
              {selectedUser ? `${selectedUser.name} • ${selectedUser.email}` : "No user selected yet."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default AutoCompleteExample;
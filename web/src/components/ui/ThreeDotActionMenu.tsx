"use client";

import * as React from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ThreeDotActionMenuItem {
  label: React.ReactNode;
  onSelect?: () => void;
  icon?: LucideIcon;
  shortcut?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
  separatorBefore?: boolean;
}

export interface ThreeDotActionMenuProps {
  items: ThreeDotActionMenuItem[];
  menuLabel?: React.ReactNode;
  triggerLabel?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  contentClassName?: string;
  triggerClassName?: string;
}

export function ThreeDotActionMenu({
  items,
  menuLabel,
  triggerLabel = "Open actions menu",
  align = "end",
  side = "bottom",
  contentClassName,
  triggerClassName,
}: ThreeDotActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9 rounded-full", triggerClassName)}
          aria-label={triggerLabel}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} side={side} className={cn("min-w-[12rem]", contentClassName)}>
        {menuLabel ? (
          <>
            <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        ) : null}

        {items.map((item, index) => {
          const Icon = item.icon;

          return (
            <React.Fragment key={`${String(item.label)}-${index}`}>
              {item.separatorBefore ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                disabled={item.disabled}
                onClick={item.onSelect}
                className={cn(item.destructive ? "text-destructive focus:text-destructive" : undefined)}
              >
                {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                <span>{item.label}</span>
                {item.shortcut ? <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut> : null}
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThreeDotActionMenu;
"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva } from "class-variance-authority";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type ModalSize = "sm" | "md" | "lg" | "xl";
export type ModalType = "success" | "error" | "warning" | "info";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  size?: ModalSize;
  type?: ModalType;
  children: React.ReactNode;
}

const modalSizeVariants = cva("w-[calc(100vw-2rem)]", {
  variants: {
    size: {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-2xl",
      xl: "max-w-4xl",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

const modalTypeVariants = cva("border-l-4", {
  variants: {
    type: {
      success: "border-l-success bg-success/5",
      error: "border-l-destructive bg-destructive/5",
      warning: "border-l-warning bg-warning/10",
      info: "border-l-primary bg-primary/5",
    },
  },
  defaultVariants: {
    type: "info",
  },
});

const modalTypeConfig: Record<
  ModalType,
  {
    icon: LucideIcon;
    iconClassName: string;
    chipClassName: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconClassName: "text-success",
    chipClassName: "bg-success/15 text-success",
  },
  error: {
    icon: AlertCircle,
    iconClassName: "text-destructive",
    chipClassName: "bg-destructive/15 text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    iconClassName: "text-warning",
    chipClassName: "bg-warning/20 text-warning",
  },
  info: {
    icon: Info,
    iconClassName: "text-primary",
    chipClassName: "bg-primary/15 text-primary",
  },
};

export function Modal({
  isOpen,
  onClose,
  title,
  size = "md",
  type = "info",
  children,
}: ModalProps) {
  const { t } = useTranslation();
  const { icon: Icon, iconClassName, chipClassName } = modalTypeConfig[type];

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />

        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-background shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] focus:outline-none",
            modalSizeVariants({ size }),
          )}
        >
          <div className={cn("flex items-start justify-between gap-4 border-b px-6 py-5", modalTypeVariants({ type }))}>
            <div className="flex min-w-0 items-start gap-3">
              <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", chipClassName)}>
                <Icon className={cn("h-5 w-5", iconClassName)} />
              </div>

              <div className="min-w-0">
                <DialogPrimitive.Title className="text-lg font-semibold leading-tight text-foreground">
                  {title}
                </DialogPrimitive.Title>
                <p className="mt-1 text-sm capitalize text-muted-foreground">{t(type)}</p>
              </div>
            </div>

            <DialogPrimitive.Close asChild>
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label={t("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 py-5">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export default Modal;
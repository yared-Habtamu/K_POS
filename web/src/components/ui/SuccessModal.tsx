"use client";

import * as React from "react";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal, type ModalSize } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

export interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  message: React.ReactNode;
  details?: React.ReactNode;
  confirmLabel?: React.ReactNode;
  onConfirm?: () => void;
  secondaryLabel?: React.ReactNode;
  onSecondaryAction?: () => void;
  size?: ModalSize;
  children?: React.ReactNode;
  iconClassName?: string;
}

export function SuccessModal({
  isOpen,
  onClose,
  title = "Success",
  message,
  details,
  confirmLabel = "Done",
  onConfirm,
  secondaryLabel,
  onSecondaryAction,
  size = "md",
  children,
  iconClassName,
}: SuccessModalProps) {
  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const handleSecondaryAction = () => {
    onSecondaryAction?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} type="success" size={size}>
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className={cn("mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success", iconClassName)}>
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <p className="text-base font-medium text-foreground">{message}</p>
            {details ? <div className="text-sm leading-6 text-muted-foreground">{details}</div> : null}
          </div>
        </div>

        {children ? <div>{children}</div> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {secondaryLabel ? (
            <Button type="button" variant="outline" onClick={handleSecondaryAction}>
              {secondaryLabel}
            </Button>
          ) : null}

          <Button type="button" onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default SuccessModal;
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal, type ModalSize, type ModalType } from "@/components/ui/Modal";

const modalTypes: ModalType[] = ["success", "error", "warning", "info"];
const modalSizes: ModalSize[] = ["sm", "md", "lg", "xl"];

export function ModalExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<ModalType>("info");
  const [size, setSize] = useState<ModalSize>("md");

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">Reusable modal example</h2>
        <p className="text-sm text-muted-foreground">
          This is a standalone example component showing how to control modal size, type, and open state.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Type</p>
        <div className="flex flex-wrap gap-2">
          {modalTypes.map((modalType) => (
            <Button
              key={modalType}
              type="button"
              variant={type === modalType ? "default" : "outline"}
              onClick={() => setType(modalType)}
            >
              {modalType}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Size</p>
        <div className="flex flex-wrap gap-2">
          {modalSizes.map((modalSize) => (
            <Button
              key={modalSize}
              type="button"
              variant={size === modalSize ? "default" : "outline"}
              onClick={() => setSize(modalSize)}
            >
              {modalSize}
            </Button>
          ))}
        </div>
      </div>

      <Button type="button" size="lg" onClick={() => setIsOpen(true)}>
        Open modal
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Inventory sync completed"
        size={size}
        type={type}
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Use this component anywhere you need a consistent modal shell. The content area accepts any React node,
            so forms, confirmations, and rich layouts can all share the same base component.
          </p>

          <div className="rounded-xl border bg-muted/40 p-4">
            <p className="text-sm font-medium text-foreground">Current configuration</p>
            <p className="mt-2 text-sm text-muted-foreground">Size: {size}</p>
            <p className="text-sm text-muted-foreground">Type: {type}</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => setIsOpen(false)}>
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default ModalExample;
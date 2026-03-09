"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SuccessModal } from "@/components/ui/SuccessModal";

export function SuccessModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Shared success modal example</CardTitle>
          <CardDescription>
            This pattern is intended for successful saves, completed registrations, payment confirmations, and similar flows.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Reusable</Badge>
            <Badge variant="outline">Success state</Badge>
            <Badge variant="outline">Action-ready</Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Open the modal to preview a shared success pattern with a title, message, details, and primary or secondary actions.
          </p>

          <Button type="button" onClick={() => setIsOpen(true)}>
            Open success modal
          </Button>
        </CardContent>
      </Card>

      <SuccessModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Product saved successfully"
        message="The product has been added to your inventory and is ready for use."
        details="Stock levels, barcode lookup, and product search are now updated with the latest record."
        confirmLabel="Continue"
        secondaryLabel="View product"
        onSecondaryAction={() => window.alert("Navigate to product details")}
      >
        <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          Next step: you can review the product details, print a barcode label, or add another item.
        </div>
      </SuccessModal>
    </>
  );
}

export default SuccessModalExample;
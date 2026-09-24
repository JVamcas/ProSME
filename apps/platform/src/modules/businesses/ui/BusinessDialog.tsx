"use client";

import { BusinessForm } from "@/components/applicant/businesses/BusinessForm";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import type { BusinessView } from "@/modules/businesses/BusinessTypes";

type BusinessDialogProps = {
  business?: BusinessView;
  isOpen: boolean;
  onClose: () => void;
};

export function BusinessDialog({
  business,
  isOpen,
  onClose,
}: BusinessDialogProps) {
  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={business ? "Edit business" : "Add business"}
    >
      <BusinessForm
        businessId={business?.id}
        initialValues={business}
        onSuccess={onClose}
        variant="dialog"
      />
    </DraggableDialog>
  );
}

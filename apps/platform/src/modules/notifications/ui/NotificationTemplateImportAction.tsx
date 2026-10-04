"use client";

import { FileUp } from "lucide-react";
import { useState } from "react";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import { NotificationTemplateImportForm } from "./NotificationTemplateImportForm";

export function NotificationTemplateImportAction({
  channelCode,
  defaultSubjectTemplate,
  targetId,
}: {
  channelCode: string;
  defaultSubjectTemplate: string;
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <GeneralButton onClick={() => setOpen(true)} variant="navy">
        <FileUp aria-hidden="true" className="size-4" />
        Import Version
      </GeneralButton>
      <DraggableDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        size="lg"
        title="Import template version"
      >
        <NotificationTemplateImportForm
          channelCode={channelCode}
          defaultSubjectTemplate={defaultSubjectTemplate}
          onImported={() => setOpen(false)}
          targetId={targetId}
        />
      </DraggableDialog>
    </>
  );
}

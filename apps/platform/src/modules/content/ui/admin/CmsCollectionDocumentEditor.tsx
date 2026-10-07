"use client";

import { useDocumentDrawer } from "@payloadcms/ui";
import type { Data } from "payload";

import { GeneralButton } from "@/components/ui/button";

export function CmsCollectionDocumentEditor({
  collectionSlug,
  id,
  initialData,
  label,
  onSave,
}: {
  collectionSlug: "pages" | "eligibility-content" | "faqs";
  id?: number;
  initialData?: Data;
  label: string;
  onSave: () => void;
}) {
  const [DocumentDrawer, , { openDrawer }] = useDocumentDrawer({ collectionSlug, id });

  return (
    <>
      <GeneralButton
        className="max-w-full whitespace-normal text-left"
        onClick={openDrawer}
        type="button"
        variant="outline"
      >
        {label}
      </GeneralButton>
      <DocumentDrawer initialData={initialData} onSave={onSave} onDelete={onSave} />
    </>
  );
}

"use client";

import { useForm, useFormFields } from "@payloadcms/ui";
import type { ArrayFieldClientProps } from "payload";

import { GeneralButton } from "@/components/ui/button";
import { CmsCardListField } from "./CmsCardListField";
import { useHomeImpactPreview } from "./useHomeImpactPreview";

export function CmsHomeStatisticsField(props: ArrayFieldClientProps) {
  const { field, path = field.name, schemaPath = field.name, readOnly } = props;
  const rows = useFormFields(([fields]) => fields[path]?.rows ?? []);
  const { addFieldRow, disabled, getDataByPath } = useForm();
  const { items, statisticsLoading, statisticsError } = useHomeImpactPreview();
  const canCopy = !readOnly && !disabled && !statisticsLoading && !statisticsError;

  function copyDisplayedStatistics() {
    const currentItems = getDataByPath(path);
    if (!canCopy || (Array.isArray(currentItems) && currentItems.length)) {
      return;
    }

    items.forEach((item, rowIndex) => {
      addFieldRow({
        path,
        schemaPath,
        rowIndex,
        subFieldState: {
          value: { value: item.value, initialValue: item.value, valid: true },
          label: { value: item.label, initialValue: item.label, valid: true },
        },
      });
    });
  }

  return (
    <div>
      {rows.length === 0 ? (
        <div className="mb-4 rounded-xl border border-brand-navy/15 p-4">
          <GeneralButton
            disabled={!canCopy || !items.length}
            onClick={copyDisplayedStatistics}
            type="button"
          >
            {statisticsLoading ? "Loading statistics…" : "Edit displayed statistics"}
          </GeneralButton>
        </div>
      ) : null}
      <CmsCardListField {...props} />
    </div>
  );
}

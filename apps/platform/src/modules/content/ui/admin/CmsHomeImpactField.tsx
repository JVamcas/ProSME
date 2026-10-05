"use client";

import { RenderFields, useField, useForm } from "@payloadcms/ui";
import type { BlocksFieldClientProps, Validate } from "payload";
import { useCallback } from "react";

import { GeneralButton } from "@/components/ui/button";

const impactFieldNames = new Set([
  "heading",
  "summary",
  "backgroundImage",
  "campaignMessage",
  "items",
]);

export function CmsHomeImpactField({
  field,
  path = field.name,
  schemaPath = field.name,
  permissions,
  readOnly,
  validate,
}: BlocksFieldClientProps) {
  const { addFieldRow } = useForm();
  const validator = useCallback<Validate>(
    (value, options) => validate?.(value, {
      ...options,
      maxRows: field.maxRows,
      minRows: field.minRows,
      required: field.required,
    } as Parameters<NonNullable<typeof validate>>[1]) ?? true,
    [validate, field.maxRows, field.minRows, field.required],
  );
  const { rows = [], disabled } = useField({
    hasRows: true,
    potentiallyStalePath: path,
    validate: validator,
  });
  const index = rows.findIndex((row) => row.blockType === "statistics");
  const block = field.blocks.find((entry) => entry.slug === "statistics");
  let fieldPermissions = permissions ?? {};
  if (permissions === true || permissions?.blocks === true) {
    fieldPermissions = true;
  } else {
    const blockPermissions = permissions?.blocks?.statistics;
    if (blockPermissions === true) {
      fieldPermissions = true;
    } else if (blockPermissions?.fields) {
      fieldPermissions = blockPermissions.fields;
    }
  }

  if (!block) return null;

  if (index < 0) {
    return (
      <div>
        <p>The homepage does not have an impact banner yet.</p>
        <GeneralButton
          disabled={readOnly || disabled}
          onClick={() => addFieldRow({
            blockType: "statistics",
            path,
            rowIndex: rows.length - 1,
            schemaPath,
          })}
          type="button"
        >
          Add impact banner
        </GeneralButton>
      </div>
    );
  }

  return (
    <RenderFields
      fields={block.fields.filter(
        (entry) => "name" in entry && impactFieldNames.has(entry.name),
      )}
      parentIndexPath=""
      parentPath={`${path}.${index}`}
      parentSchemaPath={`${schemaPath}${block.slug}`}
      permissions={fieldPermissions}
      readOnly={readOnly || disabled}
    />
  );
}

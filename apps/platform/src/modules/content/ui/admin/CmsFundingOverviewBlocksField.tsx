"use client";

import { BlocksField, RenderFields, useField, useForm, useFormFields } from "@payloadcms/ui";
import type { BlocksFieldClientProps, Validate } from "payload";
import { useCallback } from "react";

import { GeneralButton } from "@/components/ui/button";
import { fundingOverviewSection } from "../../FundingOverviewSections";

export default function CmsFundingOverviewBlocksField(props: BlocksFieldClientProps) {
  const slug = useFormFields(([fields]) => fields.slug?.value);
  const section = fundingOverviewSection(slug);
  if (!section) {
    return <BlocksField {...props} />;
  }
  return <OverviewBlocks {...props} blockType={section.blockType} />;
}

function OverviewBlocks({
  field,
  path = field.name,
  schemaPath = field.name,
  permissions,
  readOnly,
  validate,
  blockType,
}: BlocksFieldClientProps & { blockType: string }) {
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
  const block = field.blocks.find((entry) => entry.slug === blockType);
  if (!block) return null;
  const index = rows.findIndex((row) => row.blockType === blockType);
  let fieldPermissions = permissions ?? {};
  if (permissions === true || permissions?.blocks === true) {
    fieldPermissions = true;
  } else {
    const blockPermissions = permissions?.blocks?.[blockType];
    if (blockPermissions === true) {
      fieldPermissions = true;
    } else if (blockPermissions?.fields) {
      fieldPermissions = blockPermissions.fields;
    }
  }
  const label = sectionLabel(blockType);

  return (
    <section className="min-w-0">
      <h3 className="text-xl font-semibold">{label}</h3>
      {index < 0 ? (
        <GeneralButton
          disabled={readOnly || disabled}
          onClick={() => {
            addFieldRow({
              blockType,
              path,
              rowIndex: rows.length - 1,
              schemaPath,
            });
          }}
          type="button"
        >
          Add {label.toLowerCase()}
        </GeneralButton>
      ) : (
        <RenderFields
          fields={block.fields}
          parentIndexPath=""
          parentPath={`${path}.${index}`}
          parentSchemaPath={`${schemaPath}${block.slug}`}
          permissions={fieldPermissions}
          readOnly={readOnly || disabled}
        />
      )}
    </section>
  );
}

function sectionLabel(blockType: string) {
  if (blockType === "fundingSupport") return "What the fund supports";
  if (blockType === "fundingPriorities") return "Priority applicants";
  return "Focus sectors";
}

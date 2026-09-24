"use client";

import { FormField } from "@/components/ui/form-field";
import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import { FormMultiSelect } from "@/shared/ui/FormMultiSelect";

type Props = {
  disabled: boolean;
  fields: readonly ConditionFieldDefinition[];
  isPending: boolean;
  onChange: (keys: string[]) => void;
  selectedKeys: readonly string[];
};

export function WorkflowContextFieldConfiguration({
  disabled,
  fields,
  isPending,
  onChange,
  selectedKeys,
}: Props) {
  const items = fields.map((field) => ({
    label: `${field.label} · ${field.key}`,
    value: field.key,
  }));
  const placeholder = isPending
    ? "Loading available context fields…"
    : items.length
      ? "Select runtime context fields"
      : "No context fields are available";

  return (
    <fieldset className="space-y-3 rounded-xl border border-brand-navy/15 p-4">
      <div>
        <legend className="text-sm font-bold text-brand-navy">
          Read-only runtime context
        </legend>
        <p className="mt-1 text-xs text-brand-navy/55">
          Select the application, Funding Call, workflow, Stage or Task values
          exposed to this form.
        </p>
      </div>
      <FormField
        htmlFor="workflow-context-fields"
        label="Available context fields"
      >
        <FormMultiSelect
          disabled={disabled || isPending || items.length === 0}
          id="workflow-context-fields"
          items={items}
          onChange={onChange}
          placeholder={placeholder}
          value={selectedKeys}
        />
      </FormField>
    </fieldset>
  );
}

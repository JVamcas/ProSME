"use client";

import { GeneralButton } from "@/components/ui/button";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { ConditionBuilder } from "@/modules/conditions/ui/builder";
import { formVisibilityConditionFields } from "@/modules/forms/engine/FormVisibility";
import type { FormField } from "@/modules/forms/FormTypes";

function emptyConditionGroup(): ConditionGroup {
  return {
    id: crypto.randomUUID(),
    kind: "GROUP",
    combinator: "AND",
    children: [],
  };
}

export function FormVisibilityConditionEditor({
  fields,
  onChange,
  value,
}: {
  fields: readonly FormField[];
  onChange: (value: ConditionGroup | null) => void;
  value?: ConditionGroup | null;
}) {
  const conditionFields = formVisibilityConditionFields(fields);
  return (
    <fieldset className="space-y-3 rounded-xl border border-brand-navy/15 p-4">
      <legend className="px-2 text-sm font-bold text-brand-navy">
        Visibility condition
      </legend>
      {value ? (
        <>
          <ConditionBuilder
            fields={conditionFields}
            onChange={onChange}
            value={value}
          />
          <GeneralButton
            onClick={() => onChange(null)}
            type="button"
            variant="outline"
          >
            Always show
          </GeneralButton>
        </>
      ) : (
        <GeneralButton
          disabled={conditionFields.length === 0}
          onClick={() => onChange(emptyConditionGroup())}
          type="button"
          variant="outline"
        >
          Add visibility condition
        </GeneralButton>
      )}
      {conditionFields.length === 0 ? (
        <p className="text-sm text-brand-navy/55">
          Add a supported form field before configuring visibility.
        </p>
      ) : null}
    </fieldset>
  );
}

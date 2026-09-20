"use client";

import { DeleteButton } from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { ConditionBuilder } from "@/modules/conditions/ui/builder";

function emptyConditionGroup(): ConditionGroup {
  return {
    children: [],
    combinator: "AND",
    id: crypto.randomUUID(),
    kind: "GROUP",
  };
}

export function WorkflowConditionEditor({
  disabled = false,
  fields,
  isPending,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  fields: readonly ConditionFieldDefinition[];
  isPending: boolean;
  label: string;
  onChange: (value: ConditionGroup | null) => void;
  value: ConditionGroup | null;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-brand-navy/15 p-4">
      <legend className="px-2 text-sm font-bold text-brand-navy">
        {label}
      </legend>
      {isPending ? (
        <p className="text-sm text-brand-navy/55">
          Loading bound form fields…
        </p>
      ) : value ? (
        <>
          <ConditionBuilder
            disabled={disabled}
            fields={fields}
            onChange={onChange}
            value={value}
          />
          <DeleteButton
          disabled={disabled}
            onClick={() => onChange(null)}
            title="Remove condition"
          />
        </>
      ) : (
        <GeneralButton
          disabled={disabled || fields.length === 0}
          onClick={() => onChange(emptyConditionGroup())}
          type="button"
          variant="outline"
          size={"compact"}
        >
          Add condition
        </GeneralButton>
      )}
      {!isPending && fields.length === 0 ? (
        <p className="text-sm text-brand-navy/55">
          Bind a published form or typed runtime context field before adding a
          condition.
        </p>
      ) : null}
    </fieldset>
  );
}

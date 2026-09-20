import type {
  ActionProps,
  ValueEditorProps,
  ValueSelectorProps,
} from "react-querybuilder";

import { GeneralButton } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-fields";

import type { ConditionFieldType } from "../../domain/ConditionConfiguration";

function selectItems(options: ValueSelectorProps["options"]) {
  return options.flatMap((option) => {
    const nested = (option as { options?: unknown }).options;
    const items = Array.isArray(nested) ? nested : [option];
    return items.map((item) => {
      const normalized = item as {
        disabled?: boolean;
        label: unknown;
        value: number | string;
      };
      return {
        disabled: normalized.disabled,
        label: String(normalized.label),
        value: normalized.value,
      };
    });
  });
}

export function ConditionValueSelector({
  disabled,
  handleOnChange,
  options,
  title,
  value,
}: ValueSelectorProps) {
  const label = title ?? "Select value";
  return (
    <FormSelect
      aria-label={label}
      containerClassName="min-w-36"
      disabled={disabled}
      items={selectItems(options)}
      label={label}
      labelClassName="sr-only"
      onChange={(event) => handleOnChange(event.target.value)}
      value={value}
    />
  );
}

function parseScalar(value: string, fieldType: ConditionFieldType) {
  return fieldType === "NUMBER" ? Number(value) : value;
}

function ScalarValueEditor({
  disabled,
  fieldType,
  label,
  onChange,
  value,
}: {
  disabled?: boolean;
  fieldType: ConditionFieldType;
  label: string;
  onChange: (value: boolean | number | string) => void;
  value: unknown;
}) {
  if (fieldType === "BOOLEAN") {
    return (
      <FormSelect
        aria-label={label}
        disabled={disabled}
        items={[
          { label: "True", value: "true" },
          { label: "False", value: "false" },
        ]}
        label={label}
        labelClassName="sr-only"
        onChange={(event) => onChange(event.target.value === "true")}
        value={String(value)}
      />
    );
  }
  return (
    <FormInput
      aria-label={label}
      disabled={disabled}
      label={label}
      labelClassName="sr-only"
      onChange={(event) => onChange(parseScalar(event.target.value, fieldType))}
      type={fieldType === "NUMBER" ? "number" : fieldType === "DATE" ? "date" : "text"}
      value={typeof value === "number" || typeof value === "string" ? value : ""}
    />
  );
}

export function ConditionValueInput({
  disabled,
  fieldData,
  handleOnChange,
  operator,
  value,
}: ValueEditorProps) {
  const configuredFieldType = fieldData.conditionType as ConditionFieldType;
  const fieldType = operator === "WITHIN_LAST_N_MONTHS"
    ? "NUMBER"
    : configuredFieldType;
  if (operator === "IN" || operator === "NOT_IN") {
    const list = Array.isArray(value) ? value : [];
    return (
      <FormInput
        aria-label="Value list"
        disabled={disabled}
        label="Value"
        labelClassName="sr-only"
        onChange={(event) => handleOnChange(
          event.target.value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => parseScalar(item, fieldType)),
        )}
        placeholder="Comma-separated values"
        value={list.join(", ")}
      />
    );
  }
  if (operator === "BETWEEN") {
    const values = Array.isArray(value) ? value : ["", ""];
    return (
      <div className="grid min-w-60 grid-cols-2 gap-2">
        <ScalarValueEditor
          disabled={disabled}
          fieldType={fieldType}
          label="From value"
          onChange={(next) => handleOnChange([next, values[1] ?? ""])}
          value={values[0]}
        />
        <ScalarValueEditor
          disabled={disabled}
          fieldType={fieldType}
          label="To value"
          onChange={(next) => handleOnChange([values[0] ?? "", next])}
          value={values[1]}
        />
      </div>
    );
  }
  return (
    <ScalarValueEditor
      disabled={disabled}
      fieldType={fieldType}
      label="Value"
      onChange={handleOnChange}
      value={value}
    />
  );
}

export function ConditionActionButton({
  disabled,
  handleOnClick,
  label,
  title,
}: ActionProps) {
  const isRemove = title?.toLowerCase().includes("remove");
  return (
    <GeneralButton
      aria-label={title}
      disabled={disabled}
      onClick={(event) => handleOnClick(event)}
      size="compact"
      title={title}
      variant={isRemove ? "ghost" : "outlineOrange"}
    >
      {label}
    </GeneralButton>
  );
}

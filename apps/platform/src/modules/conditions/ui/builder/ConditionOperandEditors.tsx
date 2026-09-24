"use client";

import { FormInput, FormSelect } from "@/components/ui/form-fields";
import type {
  ConditionFieldDefinition,
  ConditionFieldType,
} from "../../domain/ConditionConfiguration";
import {
  computedOperandOperations,
  type ComputedOperand,
  type DirectOperand,
  type JsonValue,
  type Operand,
} from "../../domain/Operand";

const operationLabels = {
  ADD: "Add",
  DIVIDE: "Divide",
  MULTIPLY: "Multiply",
  SUBTRACT: "Subtract",
} as const;

export function operandType(
  operand: Operand,
  fields: readonly ConditionFieldDefinition[],
): ConditionFieldType | undefined {
  if (operand.kind === "COMPUTED") return "NUMBER";
  if (operand.kind === "FIELD") {
    return fields.find((field) => field.key === operand.key)?.type;
  }
  if (typeof operand.value === "boolean") return "BOOLEAN";
  if (typeof operand.value === "number") return "NUMBER";
  if (typeof operand.value === "string") return "TEXT";
  return undefined;
}

function constantValue(value: string, type: ConditionFieldType): JsonValue {
  if (type === "NUMBER") return value === "" ? 0 : Number(value);
  if (type === "BOOLEAN") return value === "true";
  return value;
}

function defaultConstant(type: ConditionFieldType): JsonValue {
  if (type === "NUMBER") return 0;
  if (type === "BOOLEAN") return false;
  return "";
}

function defaultField(
  fields: readonly ConditionFieldDefinition[],
  type?: ConditionFieldType,
): DirectOperand {
  const field = fields.find((candidate) => !type || candidate.type === type);
  return field
    ? { key: field.key, kind: "FIELD" }
    : { kind: "CONSTANT", value: defaultConstant(type ?? "NUMBER") };
}

function defaultComputed(
  fields: readonly ConditionFieldDefinition[],
): ComputedOperand {
  return {
    kind: "COMPUTED",
    leftOperand: defaultField(fields, "NUMBER"),
    operation: "ADD",
    rightOperand: { kind: "CONSTANT", value: 0 },
  };
}

function fieldItems(
  fields: readonly ConditionFieldDefinition[],
  type?: ConditionFieldType,
) {
  return fields
    .filter((field) => !type || field.type === type)
    .map((field) => ({ label: field.label, value: field.key }));
}

function ConstantEditor({
  disabled,
  label,
  onChange,
  type,
  value,
}: {
  disabled?: boolean;
  label: string;
  onChange: (value: JsonValue) => void;
  type: ConditionFieldType;
  value: JsonValue;
}) {
  if (type === "BOOLEAN") {
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
        size="compact"
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
      onChange={(event) => onChange(constantValue(event.target.value, type))}
      size="compact"
      type={type === "NUMBER" ? "number" : type === "DATE" ? "date" : "text"}
      value={typeof value === "number" || typeof value === "string" ? value : ""}
    />
  );
}

function DirectOperandEditor({
  disabled,
  fields,
  label,
  onChange,
  operand,
  type,
}: {
  disabled?: boolean;
  fields: readonly ConditionFieldDefinition[];
  label: string;
  onChange: (operand: DirectOperand) => void;
  operand: DirectOperand;
  type: ConditionFieldType;
}) {
  return (
    <div className="flex min-w-64 flex-1 flex-wrap gap-2">
      <FormSelect
        aria-label={`${label} source`}
        disabled={disabled}
        items={[
          { label: "Value", value: "CONSTANT" },
          { label: "Field", value: "FIELD" },
        ]}
        label={`${label} source`}
        labelClassName="sr-only"
        onChange={(event) => onChange(
          event.target.value === "FIELD"
            ? defaultField(fields, type)
            : { kind: "CONSTANT", value: defaultConstant(type) },
        )}
        size="compact"
        value={operand.kind}
      />
      {operand.kind === "FIELD" ? (
        <FormSelect
          aria-label={label}
          disabled={disabled}
          items={fieldItems(fields, type)}
          label={label}
          labelClassName="sr-only"
          onChange={(event) => onChange({
            key: event.target.value,
            kind: "FIELD",
          })}
          size="compact"
          value={operand.key}
        />
      ) : (
        <ConstantEditor
          disabled={disabled}
          label={label}
          onChange={(value) => onChange({ kind: "CONSTANT", value })}
          type={type}
          value={operand.value}
        />
      )}
    </div>
  );
}

function ComputedOperandEditor({
  disabled,
  fields,
  onChange,
  operand,
}: {
  disabled?: boolean;
  fields: readonly ConditionFieldDefinition[];
  onChange: (operand: ComputedOperand) => void;
  operand: ComputedOperand;
}) {
  return (
    <div className="flex min-w-full flex-wrap items-center gap-2 rounded-lg border border-brand-navy/10 bg-brand-cream/30 p-2">
      <DirectOperandEditor
        disabled={disabled}
        fields={fields}
        label="First numeric operand"
        onChange={(leftOperand) => onChange({ ...operand, leftOperand })}
        operand={operand.leftOperand}
        type="NUMBER"
      />
      <FormSelect
        aria-label="Calculation"
        disabled={disabled}
        items={computedOperandOperations.map((operation) => ({
          label: operationLabels[operation],
          value: operation,
        }))}
        label="Calculation"
        labelClassName="sr-only"
        onChange={(event) => onChange({
          ...operand,
          operation: event.target.value as ComputedOperand["operation"],
        })}
        size="compact"
        value={operand.operation}
      />
      <DirectOperandEditor
        disabled={disabled}
        fields={fields}
        label="Second numeric operand"
        onChange={(rightOperand) => onChange({ ...operand, rightOperand })}
        operand={operand.rightOperand}
        type="NUMBER"
      />
    </div>
  );
}

export function OperandEditor({
  allFieldTypes = false,
  allowConstant,
  disabled,
  fields,
  label,
  onChange,
  operand,
  type,
}: {
  allFieldTypes?: boolean;
  allowConstant: boolean;
  disabled?: boolean;
  fields: readonly ConditionFieldDefinition[];
  label: string;
  onChange: (operand: Operand) => void;
  operand: Operand;
  type: ConditionFieldType;
}) {
  const sources = [
    ...(allowConstant ? [{ label: "Value", value: "CONSTANT" }] : []),
    { label: "Field", value: "FIELD" },
    ...(allFieldTypes || type === "NUMBER"
      ? [{ label: "Calculation", value: "COMPUTED" }]
      : []),
  ];
  return (
    <div className="flex min-w-64 flex-1 flex-wrap gap-2">
      <FormSelect
        aria-label={`${label} type`}
        disabled={disabled}
        items={sources}
        label={`${label} type`}
        labelClassName="sr-only"
        onChange={(event) => {
          const kind = event.target.value;
          if (kind === "COMPUTED") onChange(defaultComputed(fields));
          if (kind === "FIELD") {
            onChange(defaultField(fields, allFieldTypes ? undefined : type));
          }
          if (kind === "CONSTANT") {
            onChange({ kind: "CONSTANT", value: defaultConstant(type) });
          }
        }}
        size="compact"
        value={operand.kind}
      />
      {operand.kind === "COMPUTED" ? (
        <ComputedOperandEditor
          disabled={disabled}
          fields={fields}
          onChange={onChange}
          operand={operand}
        />
      ) : operand.kind === "FIELD" ? (
        <FormSelect
          aria-label={label}
          disabled={disabled}
          items={fieldItems(fields, allFieldTypes ? undefined : type)}
          label={label}
          labelClassName="sr-only"
          onChange={(event) => onChange({
            key: event.target.value,
            kind: "FIELD",
          })}
          size="compact"
          value={operand.key}
        />
      ) : (
        <ConstantEditor
          disabled={disabled}
          label={label}
          onChange={(value) => onChange({ kind: "CONSTANT", value })}
          type={type}
          value={operand.value}
        />
      )}
    </div>
  );
}

export function CollectionValueEditor({
  disabled,
  onChange,
  shape,
  type,
  value,
}: {
  disabled?: boolean;
  onChange: (value: JsonValue[]) => void;
  shape: "LIST" | "RANGE";
  type: ConditionFieldType;
  value: JsonValue;
}) {
  const values = Array.isArray(value) ? value : [];
  if (shape === "LIST") {
    return (
      <FormInput
        aria-label="Value list"
        disabled={disabled}
        label="Value list"
        labelClassName="sr-only"
        onChange={(event) => onChange(
          event.target.value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => constantValue(item, type)),
        )}
        placeholder="Comma-separated values"
        size="compact"
        value={values.join(", ")}
      />
    );
  }
  return (
    <div className="grid min-w-60 grid-cols-2 gap-2">
      <ConstantEditor
        disabled={disabled}
        label="From value"
        onChange={(next) => onChange([next, values[1] ?? defaultConstant(type)])}
        type={type}
        value={values[0] ?? defaultConstant(type)}
      />
      <ConstantEditor
        disabled={disabled}
        label="To value"
        onChange={(next) => onChange([values[0] ?? defaultConstant(type), next])}
        type={type}
        value={values[1] ?? defaultConstant(type)}
      />
    </div>
  );
}

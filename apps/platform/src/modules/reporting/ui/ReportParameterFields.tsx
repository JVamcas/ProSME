"use client";
import { Controller, useFormContext } from "react-hook-form";
import { CheckboxField } from "@/components/ui/form-field";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import { FormDateInput } from "@/shared/ui/FormDateInput";
import type { ReportParameterDefinition } from "../domain/ReportParameters";

export function ReportParameterField({
  definition,
  path,
  disabled = false,
}: {
  definition: ReportParameterDefinition;
  path: string;
  disabled?: boolean;
}) {
  const { control } = useFormContext();
  return (
    <Controller
      control={control}
      name={path}
      defaultValue={
        definition.defaultValue ?? (definition.nullable ? null : undefined)
      }
      render={({ field, fieldState }) => {
        const common = {
          label: definition.name,
          disabled,
          error: fieldState.error?.message,
          onBlur: field.onBlur,
        };
        const isNull = field.value === null;
        const nullable = definition.nullable ? (
          <CheckboxField
            label={`${definition.name}: use no value`}
            checked={isNull}
            disabled={disabled}
            onChange={(event) =>
              field.onChange(
                event.target.checked ? null : (definition.defaultValue ?? ""),
              )
            }
          />
        ) : null;
        let input;
        if (definition.type === "date") {
          input = (
            <FormDateInput
              {...common}
              value={isNull ? "" : String(field.value ?? "")}
              disabled={disabled || isNull}
              onChangeValue={field.onChange}
            />
          );
        } else if (definition.type === "boolean") {
          input = (
            <FormSelect
              {...common}
              value={String(field.value ?? "")}
              disabled={disabled || isNull}
              items={[
                { value: "true", label: "Yes" },
                { value: "false", label: "No" },
              ]}
              placeholder="Select a value"
              onChange={(event) =>
                field.onChange(event.target.value === "true")
              }
            />
          );
        } else if (definition.type.endsWith("-array")) {
          input = (
            <FormTextarea
              {...common}
              value={Array.isArray(field.value) ? field.value.join("\n") : ""}
              disabled={disabled || isNull}
              placeholder="One value per line"
              onChange={(event) =>
                field.onChange(
                  event.target.value
                    .split("\n")
                    .filter((value) => value.length > 0),
                )
              }
            />
          );
        } else {
          input = (
            <FormInput
              {...common}
              value={isNull ? "" : String(field.value ?? "")}
              disabled={disabled || isNull}
              type={definition.type === "integer" ? "number" : "text"}
              onChange={(event) =>
                field.onChange(
                  definition.type === "integer" && event.target.value !== ""
                    ? Number(event.target.value)
                    : event.target.value,
                )
              }
            />
          );
        }
        return (
          <div className="space-y-2">
            {nullable}
            {input}
          </div>
        );
      }}
    />
  );
}
export function ReportParameterFields({
  definitions,
  prefix = "values",
  disabled = false,
}: {
  definitions: ReportParameterDefinition[];
  prefix?: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {definitions
        .filter((definition) => definition.binding === "value")
        .map((definition) => (
          <ReportParameterField
            key={definition.name}
            definition={definition}
            path={`${prefix}.${definition.name}`}
            disabled={disabled}
          />
        ))}
    </div>
  );
}

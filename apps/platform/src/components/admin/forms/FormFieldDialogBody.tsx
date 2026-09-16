"use client";

import { GeneralButton } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-fields";

const inputTypes = [
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "MONEY",
  "DATE",
  "SELECT",
  "RADIO",
  "CHECKBOX",
] as const;

const dataTypes = [
  "TEXT",
  "INTEGER",
  "DECIMAL",
  "MONEY",
  "DATE",
  "BOOLEAN",
] as const;

function OptionEditor({
  fields,
  remove,
}: {
  fields: { id: string }[];
  remove: (index: number) => void;
}) {
  return (
    <>
      {fields.map((option, index) => (
        <div
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          key={option.id}
        >
          <FormInput label="Code" name={`options.${index}.code`} />
          <FormInput label="Label" name={`options.${index}.label`} />
          <GeneralButton
            onClick={() => remove(index)}
            type="button"
            variant="outline"
          >
            Remove
          </GeneralButton>
        </div>
      ))}
    </>
  );
}

function OptionsEditor({
  append,
  fields,
  remove,
}: {
  append: (value: { code: string; label: string; position: number }) => void;
  fields: { id: string }[];
  remove: (index: number) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-brand-navy/15 p-4">
      <legend className="px-2 text-sm font-bold text-brand-navy">
        Options
      </legend>
      <OptionEditor fields={fields} remove={remove} />
      <GeneralButton
        onClick={() =>
          append({
            code: `OPTION_${fields.length + 1}`,
            label: "Option",
            position: fields.length + 1,
          })
        }
        type="button"
        variant="outline"
      >
        Add option
      </GeneralButton>
    </fieldset>
  );
}

function ValidationFields({ inputType }: { inputType: string }) {
  if (inputType === "TEXT" || inputType === "TEXTAREA") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput label="Minimum length" name="validation.minLength" type="number" />
        <FormInput label="Maximum length" name="validation.maxLength" type="number" />
      </div>
    );
  }
  if (inputType !== "NUMBER" && inputType !== "MONEY") return null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormInput label="Minimum value" name="validation.min" type="number" />
      <FormInput label="Maximum value" name="validation.max" type="number" />
    </div>
  );
}

export function FormFieldDialogBody({
  append,
  fields,
  inputType,
  remove,
}: {
  append: (value: { code: string; label: string; position: number }) => void;
  fields: { id: string }[];
  inputType: string;
  remove: (index: number) => void;
}) {
  return (
    <>
      <FormInput label="Label" name="label" />
      <FormInput label="Field code" name="code" />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          items={inputTypes.map((value) => ({ label: value, value }))}
          label="Input type"
          name="inputType"
        />
        <FormSelect
          items={dataTypes.map((value) => ({ label: value, value }))}
          label="Data type"
          name="dataType"
        />
        <FormInput label="Row" name="rowIndex" type="number" />
        <FormSelect
          items={[
            { label: "Column 1", value: 1 },
            { label: "Column 2", value: 2 },
          ]}
          label="Column"
          name="columnIndex"
        />
        <FormSelect
          items={[
            { label: "One column", value: 1 },
            { label: "Two columns", value: 2 },
          ]}
          label="Span"
          name="columnSpan"
        />
      </div>
      <FormInput label="Placeholder" name="placeholder" />
      <FormTextarea label="Help text" name="helpText" />
      <ValidationFields inputType={inputType} />
      <CheckboxField label="Required" name="required" />
      {inputType === "SELECT" || inputType === "RADIO" ? (
        <OptionsEditor append={append} fields={fields} remove={remove} />
      ) : null}
    </>
  );
}

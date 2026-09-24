import { Input } from "@/components/ui/form-controls";
import { FormField } from "@/components/ui/form-field";

export type FormRadioOption<T extends string | number | boolean> = {
  disabled?: boolean;
  label: string;
  value: T;
};

export function FormRadioGroup<T extends string | number | boolean>({
  disabled = false,
  error,
  helpText,
  id,
  label,
  name,
  onBlur,
  onFocus,
  onValueChange,
  options,
  readOnly = false,
  required = false,
  value,
}: {
  disabled?: boolean;
  error?: string;
  helpText?: string;
  id: string;
  label: string;
  name: string;
  onBlur?: (value: T) => void;
  onFocus?: (value: T) => void;
  onValueChange: (value: T) => void;
  options: readonly FormRadioOption<T>[];
  readOnly?: boolean;
  required?: boolean;
  value?: T;
}) {
  const errorId = error ? `${id}-error` : undefined;
  const helpId = helpText ? `${id}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <FormField
        error={error}
        errorId={errorId}
        label={label}
        required={required}
      >
        <div
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          aria-label={label}
          className="mt-2 flex flex-wrap gap-5"
          id={id}
          role="radiogroup"
        >
          {options.map((option, index) => (
            <label
              className="flex items-center gap-2 text-sm text-brand-navy"
              key={`${String(option.value)}-${index}`}
            >
              <Input
                checked={Object.is(value, option.value)}
                className="size-4"
                disabled={disabled || readOnly || option.disabled}
                id={`${id}-${index}`}
                name={name}
                onBlur={() => onBlur?.(option.value)}
                onChange={() => onValueChange(option.value)}
                onFocus={() => onFocus?.(option.value)}
                required={required}
                type="radio"
                value={index}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </FormField>
      {helpText ? (
        <p className="mt-1 text-xs text-brand-navy/60" id={helpId}>
          {helpText}
        </p>
      ) : null}
    </div>
  );
}

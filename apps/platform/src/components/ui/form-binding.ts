import {
  get,
  useFormContext,
  type FieldValues,
  type RegisterOptions,
  type UseFormReturn,
} from "react-hook-form";

export type FormFieldError = string | { message?: unknown };

export type FormBindingProps = {
  error?: FormFieldError;
  name?: string;
  registrationOptions?: RegisterOptions<FieldValues>;
};

function errorMessage(error?: FormFieldError) {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  return typeof error.message === "string" ? error.message : undefined;
}

export function useFormBinding({ error, name, registrationOptions }: FormBindingProps) {
  const context = useFormContext() as UseFormReturn<FieldValues> | null;
  const registration = context && name
    ? context.register(name, registrationOptions)
    : undefined;
  const contextError = context && name
    ? get(context.formState.errors, name) as FormFieldError | undefined
    : undefined;

  return {
    error: errorMessage(error ?? contextError),
    name: registration?.name ?? name,
    registration,
  };
}

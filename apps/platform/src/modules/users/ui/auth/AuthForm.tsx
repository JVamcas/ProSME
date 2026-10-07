"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import {
  FormProvider,
  type FieldValues,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form";

function subscribe() {
  return () => {};
}

function clientSnapshot() {
  return true;
}

function serverSnapshot() {
  return false;
}

type AuthFormProps<Values extends FieldValues> = {
  children: ReactNode;
  form: UseFormReturn<Values>;
  onSubmit: SubmitHandler<Values>;
};

export function AuthForm<Values extends FieldValues>({
  children,
  form,
  onSubmit,
}: AuthFormProps<Values>) {
  const ready = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );

  return (
    <FormProvider {...form}>
      {/* Native submission must never serialize credentials into a URL. */}
      <form method="post" noValidate onSubmit={form.handleSubmit(onSubmit)}>
        <fieldset className="min-w-0 space-y-5" disabled={!ready}>
          {children}
        </fieldset>
      </form>
    </FormProvider>
  );
}

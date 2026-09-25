"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import type { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { FieldError } from "@/shared/ui/FormPrimitives";
import { usePromoteUser } from "@/modules/users/UserAccessHooks";
import { promoteUserSchema } from "@/modules/users/UserAccessSchemas";
import type { RoleAccessRow, UserAccessRow } from "@/modules/users/UserAccessTypes";

type FormInput = z.input<typeof promoteUserSchema>;

export function UserPromotionForm({
  onDone,
  roles,
  user,
}: {
  onDone: () => void;
  roles: RoleAccessRow[];
  user: UserAccessRow;
}) {
  const mutation = usePromoteUser();
  const form = useForm<FormInput>({
    defaultValues: { roleCodes: [] },
    resolver: zodResolver(promoteUserSchema),
  });
  const submit = form.handleSubmit(async (input) => {
    await mutation.mutateAsync({ input, userId: user.id });
    onDone();
  });
  return (
    <FormProvider {...form}>
      <form className="grid gap-3" onSubmit={submit}>
        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((role) => (
            <label className="flex gap-2 text-sm text-brand-navy" key={role.id}>
              <input
                className="mt-1 accent-brand-orange"
                type="checkbox"
                value={role.code}
                {...form.register("roleCodes")}
              />
              {role.name}
            </label>
          ))}
        </div>
        <FieldError message={form.formState.errors.roleCodes?.message} />
        <GeneralButton disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Promoting…" : "Promote as staff"}
        </GeneralButton>
        {mutation.error ? (
          <p className="text-sm text-red-700" role="alert">
            {mutation.error.message}
          </p>
        ) : null}
      </form>
    </FormProvider>
  );
}

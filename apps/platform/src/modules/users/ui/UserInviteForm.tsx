"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import type { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/shared/ui/FormPrimitives";
import { useInviteUser } from "@/modules/users/UserAccessHooks";
import { inviteUserSchema } from "@/modules/users/UserAccessSchemas";
import type { RoleAccessRow } from "@/modules/users/UserAccessTypes";

type FormInput = z.input<typeof inviteUserSchema>;

export function UserInviteForm({ roles }: { roles: RoleAccessRow[] }) {
  const mutation = useInviteUser();
  const form = useForm<FormInput>({
    defaultValues: { displayName: "", email: "", roleCodes: [] },
    resolver: zodResolver(inviteUserSchema),
  });
  const submit = form.handleSubmit(async (input) => {
    await mutation.mutateAsync(input);
    form.reset();
  });
  const roleError = form.formState.errors.roleCodes?.message;

  return (
    <FormProvider {...form}>
      <form className="grid gap-4" onSubmit={submit}>
        <div>
          <Label htmlFor="invite-name">Name</Label>
          <Input id="invite-name" {...form.register("displayName")} />
          <FieldError message={form.formState.errors.displayName?.message} />
        </div>
        <div>
          <Label htmlFor="invite-email">Verified Firebase email</Label>
          <Input
            autoComplete="email"
            id="invite-email"
            type="email"
            {...form.register("email")}
          />
          <FieldError message={form.formState.errors.email?.message} />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-brand-navy">
            Initial roles
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((role) => (
              <label className="flex gap-2 text-sm text-brand-navy" key={role.id}>
                <input
                  className="mt-1 accent-brand-orange"
                  type="checkbox"
                  value={role.code}
                  {...form.register("roleCodes")}
                />
                <span>{role.name}</span>
              </label>
            ))}
          </div>
          <FieldError message={roleError} />
        </fieldset>
        <p className="text-xs leading-5 text-brand-navy/60">
          This creates an invited staff record. The staff member must complete
          Firebase verification before access can be activated.
        </p>
        <GeneralButton disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Staging invitation…" : "Stage invitation"}
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

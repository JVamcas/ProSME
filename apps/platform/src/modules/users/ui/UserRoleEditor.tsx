"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { isPermissionCode } from "@/auth/authorization/permissions";
import { GeneralButton } from "@/components/ui/button";
import {
  Checkbox,
  FieldError,
  Input,
  Label,
  Textarea,
} from "@/shared/ui/FormPrimitives";
import { useUpdateRole } from "@/modules/users/UserAccessHooks";
import { updateRoleSchema } from "@/modules/users/UserAccessSchemas";
import type {
  CapabilityRow,
  RoleAccessRow,
} from "@/modules/users/UserAccessTypes";

const editorSchema = updateRoleSchema.extend({
  permissionSearch: z.string(),
});
type FormInput = z.infer<typeof editorSchema>;

export function UserRoleEditor({
  capabilities,
  onDone,
  role,
}: {
  capabilities: CapabilityRow[];
  onDone?: () => void;
  role: RoleAccessRow;
}) {
  const mutation = useUpdateRole();
  const form = useForm<FormInput>({
    defaultValues: {
      capabilityCodes: role.capabilityCodes.filter(isPermissionCode),
      description: role.description ?? "",
      name: role.name,
      permissionSearch: "",
    },
    resolver: zodResolver(editorSchema),
  });
  const search = useWatch({
    control: form.control,
    name: "permissionSearch",
  })
    .trim()
    .toLowerCase();
  const matchingCodes = new Set(
    capabilities
      .filter((capability) =>
        `${capability.code} ${capability.description ?? ""}`
          .toLowerCase()
          .includes(search),
      )
      .map((capability) => capability.code),
  );
  const submit = form.handleSubmit(
    async ({ capabilityCodes, description, name }) => {
      const input = { capabilityCodes, description, name };
      await mutation.mutateAsync({ input, roleId: role.id });
      onDone?.();
    },
  );

  return (
    <FormProvider {...form}>
      <form className="grid gap-4" onSubmit={submit}>
        <div>
          <Label htmlFor={`role-name-${role.id}`}>Role name</Label>
          <Input id={`role-name-${role.id}`} {...form.register("name")} />
          <FieldError message={form.formState.errors.name?.message} />
        </div>
        <div>
          <Label htmlFor={`role-description-${role.id}`}>Description</Label>
          <Textarea
            id={`role-description-${role.id}`}
            rows={2}
            {...form.register("description")}
          />
          <FieldError message={form.formState.errors.description?.message} />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-brand-navy">
            Permissions
          </legend>
          <Label
            className="sr-only"
            htmlFor={`role-permission-search-${role.id}`}
          >
            Search permissions
          </Label>
          <Input
            autoComplete="off"
            id={`role-permission-search-${role.id}`}
            placeholder="Search codes or descriptions"
            type="search"
            {...form.register("permissionSearch")}
          />
          <p className="my-2 text-xs text-brand-navy/55" role="status">
            {matchingCodes.size} of {capabilities.length} permissions
          </p>
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-brand-navy/10 p-3">
            {matchingCodes.size === 0 ? (
              <p className="text-sm text-brand-navy/55">
                No permissions match your search.
              </p>
            ) : null}
            {capabilities.map((capability) => (
              <label
                className={
                  matchingCodes.has(capability.code)
                    ? "flex gap-2 text-xs text-brand-navy"
                    : "hidden"
                }
                key={capability.code}
              >
                <Checkbox
                  className="mt-0.5"
                  value={capability.code}
                  {...form.register("capabilityCodes")}
                />
                <span>
                  <strong>{capability.code}</strong>
                  {capability.description ? (
                    <span className="ml-1 text-brand-navy/55">
                      — {capability.description}
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          <FieldError
            message={form.formState.errors.capabilityCodes?.message}
          />
        </fieldset>
        <GeneralButton
          variant="primary"
          disabled={mutation.isPending}
          type="submit"
        >
          {mutation.isPending ? "Saving…" : "Save"}
        </GeneralButton>
      </form>
    </FormProvider>
  );
}

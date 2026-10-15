"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import type { z } from "zod";
import { FormField } from "@/shared/ui/FormField";
import { Select, Textarea } from "@/shared/ui/FormPrimitives";
import { GeneralButton } from "@/shared/ui/Button";
import {
  appealAssignmentSchema,
  appealResolutionSchema,
} from "../../api/ApplicationAppealSchemas";
import type { ApplicationAppeal } from "../../domain/ApplicationAppeal";
import {
  useAppealAssignees,
  useAssignApplicationAppeal,
  useResolveApplicationAppeal,
} from "./useApplicationAppeals";
export function AppealAssignmentForm({
  appeal,
}: {
  appeal: ApplicationAppeal;
}) {
  const form = useForm<z.infer<typeof appealAssignmentSchema>>({
    resolver: zodResolver(appealAssignmentSchema),
    defaultValues: {
      assignedTo: appeal.assignedTo,
      expectedRowVersion: appeal.rowVersion,
    },
  });
  const staff = useAppealAssignees();
  const mutation = useAssignApplicationAppeal();
  const submit = form.handleSubmit((values) =>
    mutation.mutateAsync({ id: appeal.id, values }).catch(() => undefined),
  );
  return (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField
          label="Assigned to"
          htmlFor="appeal-assignee"
          error={form.formState.errors.assignedTo?.message}
        >
          <Select
            id="appeal-assignee"
            {...form.register("assignedTo", {
              setValueAs: (value: string) => value || null,
            })}
            disabled={staff.isPending || staff.isError}
          >
            <option value="">Unassigned</option>
            {(staff.data ?? []).map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} ({person.email})
              </option>
            ))}
          </Select>
        </FormField>
        <GeneralButton
          type="submit"
          disabled={mutation.isPending || staff.isPending || staff.isError}
        >
          Save assignment
        </GeneralButton>
      </form>
    </FormProvider>
  );
}
export function AppealResolutionForm({
  appeal,
}: {
  appeal: ApplicationAppeal;
}) {
  const form = useForm<z.infer<typeof appealResolutionSchema>>({
    resolver: zodResolver(appealResolutionSchema),
    defaultValues: {
      resolutionNote: "",
      expectedRowVersion: appeal.rowVersion,
    },
  });
  const mutation = useResolveApplicationAppeal();
  const submit = form.handleSubmit((values) =>
    mutation.mutateAsync({ id: appeal.id, values }).catch(() => undefined),
  );
  return (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField
          label="Resolution note"
          htmlFor="appeal-resolution"
          error={form.formState.errors.resolutionNote?.message}
        >
          <Textarea
            id="appeal-resolution"
            {...form.register("resolutionNote")}
            maxLength={2000}
          />
        </FormField>
        <GeneralButton type="submit" disabled={mutation.isPending}>
          Resolve appeal
        </GeneralButton>
      </form>
    </FormProvider>
  );
}

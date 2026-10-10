"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";
import { GeneralButton } from "@/shared/ui/Button";
import { FormField } from "@/shared/ui/FormField";
import { Select, Textarea } from "@/shared/ui/FormPrimitives";
import {
  chatbotCaseAssignmentSchema,
  chatbotCaseUpdateSchema,
} from "../../api/ChatbotConversationSchemas";
import type { ChatbotCase } from "../../domain/ChatbotCase";
import {
  useAssignChatbotCase,
  useChatbotCaseAssignees,
  useUpdateChatbotCase,
} from "./useChatbotCases";

export function ChatbotCaseStateForm({
  supportCase,
}: {
  supportCase: ChatbotCase;
}) {
  const form = useForm<
    z.input<typeof chatbotCaseUpdateSchema>,
    unknown,
    z.output<typeof chatbotCaseUpdateSchema>
  >({
    resolver: zodResolver(chatbotCaseUpdateSchema),
    defaultValues: {
      state: supportCase.state,
      resolutionNote: supportCase.resolutionNote ?? "",
      expectedRowVersion: supportCase.rowVersion,
    },
  });
  const mutation = useUpdateChatbotCase();
  const submit = form.handleSubmit((values) =>
    mutation.mutateAsync({ id: supportCase.id, values }).catch(() => undefined),
  );
  return (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField
          label="Case state"
          htmlFor="case-state"
          error={form.formState.errors.state?.message}
        >
          <Select id="case-state" {...form.register("state")}>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
          </Select>
        </FormField>
        <FormField
          label="Resolution note"
          htmlFor="resolution-note"
          error={form.formState.errors.resolutionNote?.message}
        >
          <Textarea id="resolution-note" {...form.register("resolutionNote")} />
        </FormField>
        <GeneralButton type="submit" disabled={mutation.isPending}>
          Save case state
        </GeneralButton>
      </form>
    </FormProvider>
  );
}
export function ChatbotCaseAssignmentForm({
  supportCase,
}: {
  supportCase: ChatbotCase;
}) {
  const form = useForm<z.infer<typeof chatbotCaseAssignmentSchema>>({
    resolver: zodResolver(chatbotCaseAssignmentSchema),
    defaultValues: {
      assignedTo: supportCase.assignedTo,
      expectedRowVersion: supportCase.rowVersion,
    },
  });
  const mutation = useAssignChatbotCase();
  const staff = useChatbotCaseAssignees(true);
  const submit = form.handleSubmit((values) =>
    mutation.mutateAsync({ id: supportCase.id, values }).catch(() => undefined),
  );
  return (
    <FormProvider {...form}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField
          label="Assigned staff member"
          htmlFor="case-assignee"
          error={form.formState.errors.assignedTo?.message}
        >
          <Select
            id="case-assignee"
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

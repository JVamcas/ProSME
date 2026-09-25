"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/form-field";
import { FormTextarea } from "@/components/ui/form-fields";
import { useCompleteWorkflowTask } from "@/modules/work-queue/WorkQueueHooks";
import type { TaskDetail } from "@/modules/work-queue/TaskTypes";

const checklistFormSchema = z.object({
  comments: z.array(z.object({
    key: z.string(),
    value: z.string().trim().max(4000),
  })),
  items: z.array(z.object({
    accepted: z.boolean(),
    code: z.string(),
    comment: z.string().trim().max(1000).optional(),
  })),
});

type ChecklistFormValues = z.infer<typeof checklistFormSchema>;

function defaultValues(task: TaskDetail): ChecklistFormValues {
  const prior = new Map(task.resultItems.map((item) => [item.code, item]));
  const priorComments = new Map(
    task.resultComments.map((item) => [item.key, item.value]),
  );
  return {
    comments: task.commentFields.map((field) => ({
      key: field.key,
      value: priorComments.get(field.key) ?? "",
    })),
    items: task.checklistItems.map((item) => ({
      accepted: prior.get(item.code)?.accepted ?? false,
      code: item.code,
      comment: prior.get(item.code)?.comment ?? "",
    })),
  };
}

export function ChecklistTaskForm({ task }: { task: TaskDetail }) {
  const router = useRouter();
  const completion = useCompleteWorkflowTask(task.taskInstanceId);
  const form = useForm<ChecklistFormValues>({
    defaultValues: defaultValues(task),
    resolver: zodResolver(checklistFormSchema),
  });
  const submit = form.handleSubmit((values) => {
    completion.mutate(
      {
        expectedRowVersion: task.rowVersion,
        items: values.items,
        comments: values.comments,
      },
      {
        onSuccess: (result) => {
          toast.success(
            result.nextStageName
              ? `Task completed. Application advanced to ${result.nextStageName}.`
              : result.taskStatus === "COMPLETED"
                ? "Task completed."
                : "Review responses saved. Finish the remaining task work.",
          );
          router.push("/admin/work-queue");
        },
      },
    );
  });

  return (
    <FormProvider {...form}>
      <form className="space-y-5" onSubmit={submit}>
        <div className="space-y-4">
          {task.checklistItems.map((item, index) => (
            <section
              className="rounded-xl border border-brand-navy/10 bg-white p-5"
              key={item.code}
            >
              <input type="hidden" {...form.register(`items.${index}.code`)} />
              <CheckboxField
                containerClassName="font-semibold text-brand-navy"
                label={(
                  <span>
                    {item.label}
                    {item.required ? (
                      <span className="ml-1 text-brand-orange">*</span>
                    ) : null}
                  </span>
                )}
                name={`items.${index}.accepted`}
              />
              <FormTextarea
                className="min-h-20"
                containerClassName="mt-4"
                label="Reviewer note (optional)"
                name={`items.${index}.comment`}
                placeholder="Record evidence or a concise review note"
              />
            </section>
          ))}
        </div>
        {task.commentFields.length ? (
          <section className="space-y-4 rounded-xl border border-brand-navy/10 bg-white p-5">
            <h2 className="font-semibold text-brand-navy">
              Comments & Recommendations
            </h2>
            {task.commentFields.map((field, index) => (
              <div key={field.key}>
                <input
                  type="hidden"
                  {...form.register(`comments.${index}.key`)}
                />
                <FormTextarea
                  className="min-h-24"
                  label={field.label}
                  name={`comments.${index}.value`}
                  required={field.mandatory}
                />
                {field.helpText ? (
                  <p className="mt-1 text-xs text-brand-navy/60">
                    {field.helpText}
                  </p>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}
        {completion.isError ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
            {completion.error.message}
          </p>
        ) : null}
        <div className="flex flex-wrap justify-between gap-3">
          <GeneralButton asChild type="button" variant="outline">
            <Link href="/admin/work-queue">
              <ArrowLeft aria-hidden="true" className="size-4" /> Back to queue
            </Link>
          </GeneralButton>
        </div>
        {task.taskStatus !== "COMPLETED"
          && (!task.hasChecklist || !task.checklistCompleted)
          && (!task.commentFields.length || !task.commentCompleted) ? (
          <div className="flex justify-end">
            <GeneralButton
              disabled={completion.isPending || task.taskStatus === "COMPLETED"}
              type="submit"
            >
              {completion.isPending ? "Completing…" : "Submit review"}
            </GeneralButton>
          </div>
        ) : null}
      </form>
    </FormProvider>
  );
}

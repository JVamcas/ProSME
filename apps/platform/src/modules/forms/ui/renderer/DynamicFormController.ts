"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useForm, type FieldPath, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import {
  useCompleteTaskForm,
  useSaveTaskForm,
} from "@/modules/forms/FormHooks";
import type { FormRuntimeSchema, FormSubmission } from "@/modules/forms/FormTypes";
import {
  buildDynamicFormSchema,
  type DynamicFormValues,
} from "./DynamicFormSchema";

export type TaskFormData = {
  schema: FormRuntimeSchema;
  submission: FormSubmission | null;
  taskRowVersion: number;
};

function setCompletionErrors(
  form: UseFormReturn<DynamicFormValues>,
  issues: { message: string; path: PropertyKey[] }[],
) {
  issues.forEach((issue) => {
    const key = issue.path[0];
    if (typeof key === "string") {
      form.setError(key as FieldPath<DynamicFormValues>, {
        message: issue.message,
      });
    }
  });
}

function completeValues({
  completionSchema,
  complete,
  data,
  form,
  router,
  values,
}: {
  completionSchema: ReturnType<typeof buildDynamicFormSchema>;
  complete: ReturnType<typeof useCompleteTaskForm>;
  data: TaskFormData;
  form: UseFormReturn<DynamicFormValues>;
  router: ReturnType<typeof useRouter>;
  values: DynamicFormValues;
}) {
  const parsed = completionSchema.safeParse(values);
  if (!parsed.success) {
    setCompletionErrors(form, parsed.error.issues);
    return;
  }
  complete.mutate(
    {
      expectedSubmissionRowVersion: data.submission?.rowVersion,
      expectedTaskRowVersion: data.taskRowVersion,
      values: parsed.data,
    },
    {
      onSuccess: (result) => {
        toast.success(
          result.nextStageName
            ? `Task completed. Application advanced to ${result.nextStageName}.`
            : "Task completed.",
        );
        router.push("/admin/work-queue");
      },
    },
  );
}

export function useDynamicFormController(taskId: string, data: TaskFormData) {
  const router = useRouter();
  const save = useSaveTaskForm(taskId);
  const complete = useCompleteTaskForm(taskId);
  const draftSchema = useMemo(
    () => buildDynamicFormSchema(data.schema.fields, false),
    [data.schema.fields],
  );
  const completionSchema = useMemo(
    () => buildDynamicFormSchema(data.schema.fields, true),
    [data.schema.fields],
  );
  const form = useForm<DynamicFormValues>({
    defaultValues: data.submission?.values ?? {},
    resolver: zodResolver(draftSchema),
  });

  useEffect(() => {
    form.reset(data.submission?.values ?? {});
  }, [data.submission?.values, form]);

  const saveDraftValues = (values: DynamicFormValues) => {
    save.mutate({
      expectedSubmissionRowVersion: data.submission?.rowVersion,
      expectedTaskRowVersion: data.taskRowVersion,
      values,
    });
  };
  const completeFormValues = (values: DynamicFormValues) => {
    completeValues({ completionSchema, complete, data, form, router, values });
  };
  return {
    complete,
    completeFormValues,
    form,
    save,
    saveDraftValues,
  };
}

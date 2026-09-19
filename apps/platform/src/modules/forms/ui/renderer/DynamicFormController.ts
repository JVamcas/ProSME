"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  useCompleteTaskForm,
  useSaveTaskForm,
} from "@/modules/forms/FormHooks";
import type { FormRuntimeSchema, FormSubmission } from "@/modules/forms/FormTypes";
import type { DynamicFormValues } from "./FormRenderer";

export type TaskFormData = {
  schema: FormRuntimeSchema;
  submission: FormSubmission | null;
  taskRowVersion: number;
};

export function useDynamicFormController(taskId: string, data: TaskFormData) {
  const router = useRouter();
  const save = useSaveTaskForm(taskId);
  const complete = useCompleteTaskForm(taskId);
  const [values, setValues] = useState<DynamicFormValues>(
    data.submission?.values ?? {},
  );

  const saveDraftValues = () => {
    save.mutate({
      expectedSubmissionRowVersion: data.submission?.rowVersion,
      expectedTaskRowVersion: data.taskRowVersion,
      values,
    });
  };
  const completeFormValues = (completedValues: DynamicFormValues) => {
    complete.mutate(
      {
        expectedSubmissionRowVersion: data.submission?.rowVersion,
        expectedTaskRowVersion: data.taskRowVersion,
        values: completedValues,
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
  };

  return {
    complete,
    completeFormValues,
    save,
    saveDraftValues,
    setValues,
    values,
  };
}

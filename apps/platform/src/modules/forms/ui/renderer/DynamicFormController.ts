"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  useCompleteTaskForm,
  useSaveTaskForm,
} from "@/modules/forms/FormHooks";
import type { TaskFormData } from "@/modules/forms/FormTypes";
import type { DynamicFormValues } from "./FormRenderer";

export const formDraftAutosaveDelayMs = 800;

export function useDynamicFormController(taskId: string, data: TaskFormData) {
  const router = useRouter();
  const save = useSaveTaskForm(taskId);
  const complete = useCompleteTaskForm(taskId);
  const [values, setValues] = useState<DynamicFormValues>(
    data.submission?.values ?? {},
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const revision = useRef(0);
  const lastAutosaveRevision = useRef(0);

  const changeValues = useCallback((nextValues: DynamicFormValues) => {
    revision.current += 1;
    setHasUnsavedChanges(true);
    setValues(nextValues);
  }, []);

  const saveDraftValues = useCallback(() => {
    if (save.isPending || complete.isPending) return;

    const savingRevision = revision.current;
    save.mutate(
      {
        expectedSubmissionRowVersion: data.submission?.rowVersion,
        expectedTaskRowVersion: data.taskRowVersion,
        values,
      },
      {
        onSuccess: () => {
          if (revision.current === savingRevision) {
            setHasUnsavedChanges(false);
          }
        },
      },
    );
  }, [complete.isPending, data, save, values]);

  useEffect(() => {
    if (
      !hasUnsavedChanges
      || save.isPending
      || complete.isPending
      || lastAutosaveRevision.current === revision.current
    ) {
      return;
    }

    const autosaveRevision = revision.current;
    const timer = window.setTimeout(() => {
      lastAutosaveRevision.current = autosaveRevision;
      saveDraftValues();
    }, formDraftAutosaveDelayMs);

    return () => window.clearTimeout(timer);
  }, [complete.isPending, hasUnsavedChanges, save.isPending, saveDraftValues]);

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
    hasUnsavedChanges,
    save,
    saveDraftValues,
    setValues: changeValues,
    values,
  };
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { usePendingNavigationGuard } from "@/shared/ui/usePendingNavigationGuard";
import {
  useSaveTaskReviewDraft,
  useUploadWorkflowTaskDocument,
} from "@/modules/work-queue/WorkQueueHooks";
import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { WorkflowTaskWorkSections } from "@/modules/workflows/ui/WorkflowTaskWorkSections";

const reviewAutosaveDelayMs = 800;

const checklistFormSchema = z.object({
  comments: z.array(z.object({
    key: z.string(),
    value: z.string().trim().max(4000),
  })),
  documents: z.array(z.object({
    category: z.string(),
    comment: z.string().trim().max(1000).optional(),
    outcome: z.enum(["VERIFIED", "REJECTED", ""]),
  })),
  items: z.array(z.object({
    accepted: z.boolean(),
    code: z.string(),
    comment: z.string().trim().max(1000).optional(),
  })),
  scores: z.array(z.object({
    comment: z.string().trim().max(1000).optional(),
    criterion: z.string(),
    score: z.number().nullable(),
  })),
});

type ChecklistFormValues = z.infer<typeof checklistFormSchema>;

export type ReviewDraftState = {
  pending: boolean;
  ready: boolean;
};

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
    documents: task.documentRequirements.map((requirement) => {
      const saved = task.resultDocuments.find(
        (item) => item.category === requirement.stableKey,
      );
      return {
        category: requirement.stableKey,
        comment: saved?.comment ?? "",
        outcome: saved?.outcome ?? "",
      };
    }),
    items: task.checklistItems.map((item) => ({
      accepted: prior.get(item.code)?.accepted ?? false,
      code: item.code,
      comment: prior.get(item.code)?.comment ?? "",
    })),
    scores: (task.scoring?.criteria ?? []).map((criterion) => {
      const saved = task.resultScores.find(
        (item) => item.criterion === criterion.stableKey,
      );
      return {
        comment: saved?.comment ?? "",
        criterion: criterion.stableKey,
        score: saved?.score ?? null,
      };
    }),
  };
}

function reviewIsReady(task: TaskDetail, values: ChecklistFormValues) {
  return task.checklistItems.every((item) => {
    const answer = values.items.find((value) => value.code === item.code);
    return Boolean(answer && (!item.required || answer.accepted));
  }) && task.documentRequirements.every(
    (requirement) => !requirement.mandatory || Boolean(requirement.document),
  ) && (task.scoring?.criteria ?? []).every((criterion) => {
    const answer = values.scores.find(
      (value) => value.criterion === criterion.stableKey,
    );
    return Boolean(answer && answer.score !== null
      && answer.score >= criterion.scaleMinimum
      && answer.score <= criterion.scaleMaximum
      && (!criterion.mandatoryComment || answer.comment?.trim()));
  }) && task.commentFields.every((field) => {
    const answer = values.comments.find((value) => value.key === field.key);
    return Boolean(answer && (!field.mandatory || answer.value.trim()));
  });
}

export function ChecklistTaskForm({
  finalActions,
  formContent,
  onStateChange,
  task,
}: {
  finalActions?: ReactNode;
  formContent?: ReactNode;
  onStateChange: (state: ReviewDraftState) => void;
  task: TaskDetail;
}) {
  const save = useSaveTaskReviewDraft(task.taskInstanceId);
  const upload = useUploadWorkflowTaskDocument(task.taskInstanceId);
  const form = useForm<ChecklistFormValues>({
    defaultValues: defaultValues(task),
    resolver: zodResolver(checklistFormSchema),
  });
  const [revision, setRevision] = useState(() => {
    const initial = defaultValues(task);
    const missingSavedReview = (task.hasChecklist && !task.checklistCompleted)
      || (task.commentFields.length > 0 && !task.commentCompleted)
      || (task.documentRequirements.length > 0 && !task.documentsCompleted)
      || (Boolean(task.scoring?.criteria.length) && !task.scoringCompleted);
    return missingSavedReview && reviewIsReady(task, initial) ? 1 : 0;
  });
  const [savedRevision, setSavedRevision] = useState(0);
  const lastAttemptedRevision = useRef(0);
  const values = useWatch({ control: form.control }) as ChecklistFormValues;
  const serializedValues = JSON.stringify(values);
  const previousValues = useRef(serializedValues);
  const pending = revision !== savedRevision || save.isPending;
  const navigation = usePendingNavigationGuard(pending);
  const ready = reviewIsReady(task, values);
  const invalid = !checklistFormSchema.safeParse(values).success;
  const hasSavedReview = savedRevision > 0
    || task.checklistCompleted || task.commentCompleted
    || task.documentsCompleted || task.scoringCompleted;

  useEffect(() => {
    if (previousValues.current === serializedValues) return;
    previousValues.current = serializedValues;
    setRevision((current) => current + 1);
  }, [serializedValues]);

  useEffect(() => {
    onStateChange({ pending, ready });
  }, [onStateChange, pending, ready]);

  useEffect(() => {
    if (!revision || !pending || save.isPending
      || lastAttemptedRevision.current === revision) return;
    const timer = window.setTimeout(() => {
      lastAttemptedRevision.current = revision;
      const parsed = checklistFormSchema.safeParse(form.getValues());
      if (!parsed.success) {
        void form.trigger();
        return;
      }
      save.mutate(parsed.data, {
        onSuccess: () => setSavedRevision(revision),
      });
    }, reviewAutosaveDelayMs);
    return () => window.clearTimeout(timer);
  }, [form, pending, revision, save]);

  function retrySave() {
    const parsed = checklistFormSchema.safeParse(form.getValues());
    if (!parsed.success) return;
    save.mutate(parsed.data, {
      onSuccess: () => setSavedRevision(revision),
    });
  }

  return (
    <FormProvider {...form}>
      <div className="space-y-5">
        <WorkflowTaskWorkSections
          checklistItems={task.checklistItems}
          commentFields={task.commentFields}
          disabled={task.taskStatus === "COMPLETED"}
          documentUpload={{
            error: upload.isError ? upload.error.message : undefined,
            onFile: (requirementId, file) => {
              upload.mutate({ file, requirementId });
            },
            pendingRequirementId: upload.isPending
              ? upload.variables?.requirementId
              : undefined,
            taskId: task.taskInstanceId,
          }}
          displayMode={task.displayMode}
          documentRequirements={task.documentRequirements}
          finalActions={finalActions}
          form={formContent ? {
            content: formContent,
            title: task.formName ?? "Form",
          } : undefined}
          scoring={task.scoring}
          status={{
            checklist: task.checklistCompleted ? "Completed" : "Required",
            comments: task.commentCompleted ? "Completed" : "Required",
            documents: task.documentsCompleted ? "Completed" : "Required",
            form: task.formCompleted ? "Completed" : "Required",
            scoring: task.scoringCompleted ? "Completed" : "Required",
          }}
        />
        {task.taskStatus !== "COMPLETED" ? (
          <div className="flex items-center gap-3 text-sm text-brand-navy/65">
            <span aria-live="polite">
              {invalid ? "Correct review fields before saving"
                : save.isError ? "Review save failed" : save.isPending
                  ? "Saving review…" : pending ? "Autosave pending"
                    : hasSavedReview ? "Review saved" : "No review changes yet"}
            </span>
            {save.isError ? (
              <GeneralButton onClick={retrySave} type="button" variant="outline">
                Retry save
              </GeneralButton>
            ) : null}
          </div>
        ) : null}
        {save.isError ? (
          <p className="text-sm text-red-700" role="alert">{save.error.message}</p>
        ) : null}
      </div>
      <ConfirmationDialog
        confirmText="Leave page"
        isOpen={Boolean(navigation.pendingNavigationHref)}
        message="Your latest review changes have not finished saving. Leave this page?"
        onCancel={navigation.cancelNavigation}
        onConfirm={navigation.confirmNavigation}
        title="Leave with unsaved changes?"
      />
    </FormProvider>
  );
}

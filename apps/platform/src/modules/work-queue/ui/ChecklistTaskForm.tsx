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
import type {
  SaveTaskReviewDraftInput,
  TaskDetail,
} from "@/modules/work-queue/TaskTypes";
import { WorkflowTaskWorkSections } from "@/modules/workflows/ui/WorkflowTaskWorkSections";
import {
  createReviewDraftPatch,
  mergeReviewDraftPatches,
  reviewDraftPatchIsEmpty,
} from "./ReviewAutosavePatch";

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

function initialAutosavePatch(
  task: TaskDetail,
  values: ChecklistFormValues,
): SaveTaskReviewDraftInput {
  const commentFields = new Map(
    task.commentFields.map((field) => [field.key, field]),
  );
  const checklistItems = new Map(
    task.checklistItems.map((item) => [item.code, item]),
  );
  const documentRequirements = new Map(
    task.documentRequirements.map((item) => [item.stableKey, item]),
  );
  const savedComments = new Set(task.resultComments.map((item) => item.key));
  const savedDocuments = new Set(
    task.resultDocuments.map((item) => item.category),
  );
  const savedItems = new Set(task.resultItems.map((item) => item.code));
  const savedScores = new Set(task.resultScores.map((item) => item.criterion));
  const comments = values.comments.filter(
    (item) => !savedComments.has(item.key)
      && (!commentFields.get(item.key)?.mandatory || item.value.trim()),
  );
  const documents = values.documents.filter(
    (item) => !savedDocuments.has(item.category)
      && Boolean(documentRequirements.get(item.category)?.document),
  );
  const items = values.items.filter(
    (item) => !savedItems.has(item.code)
      && (!checklistItems.get(item.code)?.required
        || item.accepted
        || item.comment?.trim()),
  );
  const scores = values.scores.filter(
    (item) => !savedScores.has(item.criterion)
      && (item.score !== null || item.comment?.trim()),
  );
  return {
    ...(comments.length ? { comments } : {}),
    ...(documents.length ? { documents } : {}),
    ...(items.length ? { items } : {}),
    ...(scores.length ? { scores } : {}),
  };
}

export function ChecklistTaskForm({
  finalActions,
  formContent,
  formSectionComplete,
  onStateChange,
  task,
}: {
  finalActions?: ReactNode;
  formContent?: ReactNode;
  formSectionComplete: boolean;
  onStateChange: (state: ReviewDraftState) => void;
  task: TaskDetail;
}) {
  const save = useSaveTaskReviewDraft(task.taskInstanceId);
  const upload = useUploadWorkflowTaskDocument(task.taskInstanceId);
  const [{ initialPatch, initialValues }] = useState(() => {
    const values = defaultValues(task);
    return {
      initialPatch: initialAutosavePatch(task, values),
      initialValues: values,
    };
  });
  const form = useForm<ChecklistFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(checklistFormSchema),
  });
  const [revision, setRevision] = useState(
    reviewDraftPatchIsEmpty(initialPatch) ? 0 : 1,
  );
  const [savedRevision, setSavedRevision] = useState(0);
  const lastAttemptedRevision = useRef(0);
  const pendingPatch = useRef<SaveTaskReviewDraftInput>(initialPatch);
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
    const previous = JSON.parse(previousValues.current) as ChecklistFormValues;
    previousValues.current = serializedValues;
    const patch = createReviewDraftPatch(previous, values);
    if (reviewDraftPatchIsEmpty(patch)) return;
    pendingPatch.current = mergeReviewDraftPatches(
      pendingPatch.current,
      patch,
    );
    setRevision((current) => current + 1);
  }, [serializedValues, values]);

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
      const patch = pendingPatch.current;
      if (reviewDraftPatchIsEmpty(patch)) return;
      pendingPatch.current = {};
      save.mutate(patch, {
        onError: () => {
          pendingPatch.current = mergeReviewDraftPatches(
            patch,
            pendingPatch.current,
          );
        },
        onSuccess: () => setSavedRevision((current) =>
          Math.max(current, revision)),
      });
    }, reviewAutosaveDelayMs);
    return () => window.clearTimeout(timer);
  }, [form, pending, revision, save]);

  function retrySave() {
    const parsed = checklistFormSchema.safeParse(form.getValues());
    if (!parsed.success) return;
    const patch = pendingPatch.current;
    if (reviewDraftPatchIsEmpty(patch)) return;
    lastAttemptedRevision.current = revision;
    pendingPatch.current = {};
    save.mutate(patch, {
      onError: () => {
        pendingPatch.current = mergeReviewDraftPatches(
          patch,
          pendingPatch.current,
        );
      },
      onSuccess: () => setSavedRevision((current) =>
        Math.max(current, revision)),
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
              upload.mutate({ file, requirementId }, {
                onSuccess: (updatedTask) => {
                  const requirement = updatedTask.documentRequirements.find(
                    (item) => item.id === requirementId,
                  );
                  if (!requirement) return;
                  const existing = values.documents.find(
                    (item) => item.category === requirement.stableKey,
                  );
                  const patch = {
                    documents: [existing ?? {
                      category: requirement.stableKey,
                      comment: "",
                      outcome: "" as const,
                    }],
                  };
                  pendingPatch.current = mergeReviewDraftPatches(
                    pendingPatch.current,
                    patch,
                  );
                  setRevision((current) => current + 1);
                },
              });
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
            form: formSectionComplete ? "Completed" : "Required",
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

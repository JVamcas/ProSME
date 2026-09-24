"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import { FormSelect } from "@/components/ui/form-fields";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import { WorkflowStageTabHeader } from "./WorkflowStageTabHeader";
import type { WorkflowStageScoringCriterion } from "@/modules/workflows/domain/definitions/WorkflowStageScoringDefinition";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  scoringAggregationItems,
  workflowStageAggregationFormSchema,
  type WorkflowStageAggregationFormValues,
} from "./WorkflowStageScoringFormSchema";

type Props = {
  canEdit: boolean;
  editor: WorkflowEditorView;
  onAdd: () => void;
  onDelete: (criterion: WorkflowStageScoringCriterion) => void;
  onEdit: (criterion: WorkflowStageScoringCriterion) => void;
  stage: WorkflowStageInput;
};

function scoringColumns(
  canEdit: boolean,
  onDelete: (criterion: WorkflowStageScoringCriterion) => void,
  onEdit: (criterion: WorkflowStageScoringCriterion) => void,
): DataTableColumn<WorkflowStageScoringCriterion>[] {
  return [
    {
      accessorKey: "criterion",
      header: "Criterion",
      cell: ({ row }) => (
        <span className="font-semibold text-brand-navy">
          {row.original.criterion}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => row.original.description || "—",
    },
    {
      accessorKey: "weight",
      header: "Weight",
    },
    {
      id: "scale",
      header: "Scale",
      cell: ({ row }) =>
        `${row.original.scaleMinimum}–${row.original.scaleMaximum}`,
    },
    {
      accessorKey: "threshold",
      header: "Threshold",
    },
    {
      accessorKey: "mandatoryComment",
      header: "Mandatory comment",
      cell: ({ row }) => (row.original.mandatoryComment ? "Yes" : "No"),
    },
    {
      id: "controls",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-start gap-1">
          <EditButton
            disabled={!canEdit}
            onClick={() => onEdit(row.original)}
            title={`Edit ${row.original.criterion}`}
          />
          <DeleteButton
            disabled={!canEdit}
            onClick={() => onDelete(row.original)}
            title={`Delete ${row.original.criterion}`}
          />
        </div>
      ),
    },
  ];
}

export function WorkflowStageScoringTable({
  canEdit,
  editor,
  onAdd,
  onDelete,
  onEdit,
  stage,
}: Props) {
  const mutation = useSaveWorkflowGraph(editor);
  const form = useForm<WorkflowStageAggregationFormValues>({
    defaultValues: {
      aggregation: stage.scoring?.aggregation ?? "WEIGHTED_AVERAGE",
    },
    resolver: zodResolver(workflowStageAggregationFormSchema),
  });

  useEffect(() => {
    form.reset({
      aggregation: stage.scoring?.aggregation ?? "WEIGHTED_AVERAGE",
    });
  }, [form, stage.scoring?.aggregation, stage.stableKey]);

  const submitAggregation = form.handleSubmit(async ({ aggregation }) => {
    await mutation.mutateAsync({
      stages: editor.graph.stages.map((item) =>
        item.stableKey === stage.stableKey
          ? {
              ...item,
              scoring: {
                aggregation,
                criteria: item.scoring?.criteria ?? [],
              },
            }
          : item,
      ),
      transitions: editor.graph.transitions,
    });
  });
  const criteria = stage.scoring?.criteria ?? [];

  return (
    <section className="mt-5">
      <WorkflowStageTabHeader
        action={
          <GeneralButton
            disabled={!canEdit}
            onClick={onAdd}
            size="compact"
            type="button"
            variant="primary"
          >
            <Plus className="size-4" /> Add scoring criterion
          </GeneralButton>
        }
        count={criteria.length}
        description="Define the criteria and aggregation method used to score this stage."
        title="Scoring criteria"
      />
      <FormProvider {...form}>
        <form
          className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-brand-navy/10 p-4"
          onSubmit={submitAggregation}
        >
          <FormSelect
            containerClassName="min-w-60 flex-1"
            disabled={!canEdit}
            items={scoringAggregationItems}
            label="Score Aggregation Method"
            name="aggregation"
            required
          />
          <GeneralButton
            disabled={!canEdit || mutation.isPending}
            type="submit"
            variant="primary"
          >
            {mutation.isPending ? "Saving…" : "Save"}
          </GeneralButton>
        </form>
      </FormProvider>
      <DataTable
        columns={scoringColumns(canEdit, onDelete, onEdit)}
        data={criteria}
        emptyMessage="No scoring criteria have been added to this stage."
        minWidth={980}
      />
      {mutation.error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {mutation.error.message}
        </p>
      ) : null}
    </section>
  );
}

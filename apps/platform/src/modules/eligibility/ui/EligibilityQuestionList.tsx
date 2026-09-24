"use client";

import { useState } from "react";

import { EditButton } from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { DataTablePagination } from "@/shared/ui/DataTablePagination";
import type { EligibilityQuestionInput } from "../api/EligibilityQuestionSchemas";
import type { EligibilityQuestionSummary } from "../api/EligibilityQuestionTransport";
import {
  useCreateEligibilityQuestion,
  useEligibilityQuestions,
  useUpdateEligibilityQuestion,
} from "../EligibilityQuestionHooks";
import { EligibilityQuestionForm } from "./EligibilityQuestionForm";

const typeLabels = {
  BOOLEAN: "Yes / No",
  DATE: "Date",
  NUMBER: "Number",
  PERCENTAGE: "Percentage",
  TEXT: "Text",
  YES_NO_NA: "Yes / No / Not applicable",
} as const;

function columns(
  canUpdate: boolean,
  onEdit: (question: EligibilityQuestionSummary) => void,
): DataTableColumn<EligibilityQuestionSummary>[] {
  return [
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-semibold text-brand-navy">{row.original.code}</span>
      ),
    },
    { accessorKey: "applicantLabel", header: "Applicant label" },
    { accessorKey: "reviewerLabel", header: "Reviewer label" },
    {
      accessorKey: "inputType",
      header: "Input type",
      cell: ({ row }) => typeLabels[row.original.inputType],
    },
    { accessorKey: "bindingCount", header: "Rulesets" },
    {
      accessorKey: "updatedAt",
      header: "Updated",
      cell: ({ row }) => formatLocalDateTime24(row.original.updatedAt),
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <EditButton
          disabled={!canUpdate}
          onClick={() => onEdit(row.original)}
          title={`Edit ${row.original.code}`}
        />
      ),
    },
  ];
}

function questionValues(question: EligibilityQuestionSummary): EligibilityQuestionInput {
  return {
    applicantLabel: question.applicantLabel,
    code: question.code,
    inputType: question.inputType,
    reviewerLabel: question.reviewerLabel,
  };
}

export function EligibilityQuestionList({
  canCreate,
  canUpdate,
}: {
  canCreate: boolean;
  canUpdate: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<EligibilityQuestionSummary>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const query = useEligibilityQuestions(page, pageSize);
  const create = useCreateEligibilityQuestion();
  const update = useUpdateEligibilityQuestion(editing?.id);
  const mutation = editing ? update : create;
  async function save(input: EligibilityQuestionInput) {
    if (editing) {
      return update.mutateAsync({
        ...input,
        expectedRowVersion: editing.rowVersion,
      });
    }
    return create.mutateAsync(input);
  }
  function close() {
    setCreating(false);
    setEditing(undefined);
    create.reset();
    update.reset();
  }
  return (
    <>
      <DataTable
        columns={columns(canUpdate, setEditing)}
        data={query.data?.items ?? []}
        emptyMessage={query.isPending
          ? "Loading eligibility questions…"
          : (query.error?.message ?? "No eligibility questions configured.")}
        footer={(
          <DataTablePagination
            disabled={query.isFetching}
            onPageChange={setPage}
            onPageSizeChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
            page={query.data?.page ?? page}
            pageSize={query.data?.pageSize ?? pageSize}
            total={query.data?.total ?? 0}
            totalPages={query.data?.totalPages ?? 0}
          />
        )}
        rowKey={(question) => question.id}
        toolbar={{
          actions: (
            <GeneralButton disabled={!canCreate} onClick={() => setCreating(true)}>
              Create question
            </GeneralButton>
          ),
        }}
      />
      <DraggableDialog
        isOpen={(creating && canCreate) || Boolean(editing && canUpdate)}
        onClose={close}
        title={editing ? "Edit eligibility question" : "Create eligibility question"}
      >
        <EligibilityQuestionForm
          error={mutation.error}
          initialValues={editing ? questionValues(editing) : undefined}
          key={editing?.id ?? "create"}
          onSaved={close}
          pending={mutation.isPending}
          save={save}
        />
      </DraggableDialog>
    </>
  );
}

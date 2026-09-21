"use client";

import { FlaskConical, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { GeneralButton, GeneralButtonLink } from "@/components/ui/button";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  conditionBuilderOperators,
  formatConditionGroupPreview,
} from "@/modules/conditions/ui/builder";
import type { EligibilityBuilderRule } from "../api/EligibilityRuleSetTransport";
import { eligibilityConditionFields } from "../domain/EligibilityConditionFields";
import {
  useEligibilityRuleSetBuilder,
  useEligibilityRuleSetLifecycle,
  useUpdateEligibilityRuleSet,
} from "../EligibilityRuleSetHooks";
import { EligibilityRuleDialog } from "./EligibilityRuleDialog";

const failureLabels = {
  HARD_FAIL: "Hard Fail",
  SOFT_FAIL: "Soft Fail",
  WARNING: "Warning",
} as const;

const executionLabels = {
  BOTH: "Self Check and Screening",
  SCREENING: "Screening",
  SELF_CHECK: "Self Check",
} as const;

function ruleColumns({
  editable,
  onDelete,
  onEdit,
}: {
  editable: boolean;
  onDelete: (rule: EligibilityBuilderRule) => void;
  onEdit: (rule: EligibilityBuilderRule) => void;
}): DataTableColumn<EligibilityBuilderRule>[] {
  const columns: DataTableColumn<EligibilityBuilderRule>[] = [
    {
      accessorKey: "reasonCode",
      header: "Reason code",
      cell: ({ row }) => (
        <span className="font-semibold text-brand-navy">
          {row.original.reasonCode}
        </span>
      ),
    },
    {
      accessorKey: "applicantMessage",
      header: "Applicant message",
    },
    {
      accessorKey: "failureType",
      header: "Failure type",
      cell: ({ row }) => (
        <span className="rounded-full bg-brand-orange/10 px-2.5 py-1 text-xs font-semibold text-brand-orange">
          {failureLabels[row.original.failureType]}
        </span>
      ),
    },
    {
      accessorKey: "executionMode",
      header: "Execution",
      cell: ({ row }) => (
        <span className="rounded-full bg-brand-blue/15 px-2.5 py-1 text-xs font-semibold text-brand-navy">
          {executionLabels[row.original.executionMode]}
        </span>
      ),
    },
    {
      id: "condition",
      header: "Condition",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="block min-w-72">
          {formatConditionGroupPreview(
            row.original.condition,
            eligibilityConditionFields,
            conditionBuilderOperators,
          )}
        </span>
      ),
    },
  ];

  if (editable) {
    columns.push({
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-1">
          <EditButton
            onClick={() => onEdit(row.original)}
            title={`Edit ${row.original.reasonCode}`}
          />
          <DeleteButton
            onClick={() => onDelete(row.original)}
            title={`Delete ${row.original.reasonCode}`}
          />
        </div>
      ),
    });
  }

  return columns;
}

function lifecycleLabel(status: "DRAFT" | "PUBLISHED" | "RETIRED") {
  if (status === "DRAFT") return "Publish version";
  if (status === "PUBLISHED") return "Retire version";
  return "Create new draft";
}

export function EligibilityRuleSetEditor({
  canPublish,
  canRetire,
  canUpdate,
  id,
}: {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  id: string;
}) {
  const query = useEligibilityRuleSetBuilder(id);
  const update = useUpdateEligibilityRuleSet(id);
  const lifecycle = useEligibilityRuleSetLifecycle(id);
  const [editing, setEditing] = useState<EligibilityBuilderRule | "new">();
  const editor = query.data;
  if (query.isPending) return <p>Loading eligibility ruleset…</p>;
  if (query.isError || !editor) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {query.error?.message ?? "Eligibility ruleset unavailable."}
      </p>
    );
  }
  const currentEditor = editor;

  const isDraft = currentEditor.version.status === "DRAFT";
  const editable = isDraft && canUpdate;

  async function saveRules(rules: EligibilityBuilderRule[]) {
    try {
      await update.mutateAsync({
        expectedRowVersion: currentEditor.version.rowVersion,
        rules,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save rules.",
      );
      throw error;
    }
  }

  async function runLifecycle() {
    try {
      if (currentEditor.version.status === "DRAFT") {
        await lifecycle.mutateAsync({
          action: "PUBLISH",
          expectedRowVersion: currentEditor.version.rowVersion,
          versionId: currentEditor.version.id,
        });
      } else if (currentEditor.version.status === "PUBLISHED") {
        await lifecycle.mutateAsync({
          action: "RETIRE",
          expectedRowVersion: currentEditor.version.rowVersion,
          versionId: currentEditor.version.id,
        });
      } else {
        await lifecycle.mutateAsync({
          action: "CLONE",
          sourceVersionId: currentEditor.version.id,
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update the version.",
      );
    }
  }

  const canRunLifecycle =
    currentEditor.version.status === "DRAFT"
      ? canPublish
      : currentEditor.version.status === "PUBLISHED"
        ? canRetire
        : canUpdate;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-brand-navy/15 bg-white p-5 shadow-sm">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold text-brand-navy">
              {currentEditor.definition.name}
            </h2>
            <StatusBadge status={currentEditor.version.status} />
          </div>
          <p className="mt-1 text-sm text-brand-navy/65">
            {currentEditor.definition.code} · Version{" "}
            {currentEditor.version.versionNumber}
          </p>
          <p className="mt-2 text-sm text-brand-navy/75">
            {currentEditor.definition.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GeneralButtonLink
            href={`/admin/settings/eligibility-rulesets/${id}/test`}
            variant="outline"
          >
            <FlaskConical className="size-4" />
            Test ruleset
          </GeneralButtonLink>
          {editable ? (
            <GeneralButton onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              Add rule
            </GeneralButton>
          ) : null}
          <GeneralButton
            disabled={!canRunLifecycle || lifecycle.isPending}
            onClick={runLifecycle}
            variant="outline"
          >
            {lifecycle.isPending
              ? "Working…"
              : lifecycleLabel(currentEditor.version.status)}
          </GeneralButton>
        </div>
      </header>

      {!isDraft ? (
        <p className="rounded-xl border border-brand-blue/20 bg-brand-blue/10 px-4 py-3 text-sm text-brand-navy">
          This version is read-only. Create a new Draft to change its rules.
        </p>
      ) : null}
      {lifecycle.error ? (
        <p className="text-sm text-red-700" role="alert">
          {lifecycle.error.message}
        </p>
      ) : null}

      <section className="space-y-3" aria-labelledby="eligibility-rules-heading">
        <h2
          className="text-lg font-bold text-brand-navy"
          id="eligibility-rules-heading"
        >
          Eligibility rules
        </h2>
        <DataTable
          columns={ruleColumns({
            editable,
            onDelete: (rule) => {
              const remaining = currentEditor.rules
                .filter((item) => item.id !== rule.id)
                .map((item, index) => ({ ...item, order: index + 1 }));
              void saveRules(remaining).catch(() => undefined);
            },
            onEdit: setEditing,
          })}
          data={currentEditor.rules}
          emptyMessage="No eligibility rules configured."
          minWidth={1180}
          rowKey={(rule) => rule.id}
        />
      </section>

      <DraggableDialog
        isOpen={Boolean(editing) && editable}
        onClose={() => setEditing(undefined)}
        size="2xl"
        title={
          editing === "new" ? "Add eligibility rule" : "Edit eligibility rule"
        }
      >
        <EligibilityRuleDialog
          initialRule={editing === "new" ? undefined : editing}
          nextOrder={currentEditor.rules.length + 1}
          onCancel={() => setEditing(undefined)}
          onSave={async (rule) => {
            const rules =
              editing === "new"
                ? [...currentEditor.rules, rule]
                : currentEditor.rules.map((item) =>
                    item.id === rule.id ? rule : item,
                  );
            await saveRules(rules);
            setEditing(undefined);
          }}
          saving={update.isPending}
        />
      </DraggableDialog>
    </div>
  );
}

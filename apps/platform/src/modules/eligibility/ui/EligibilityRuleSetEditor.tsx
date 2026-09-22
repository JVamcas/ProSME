"use client";

import { FlaskConical, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  CloneButton,
  DeleteButton,
  EditButton,
  PublishButton,
  RetireButton,
} from "@/components/ui/action-buttons";
import { GeneralButton, GeneralButtonLink } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  conditionBuilderOperators,
  formatConditionGroupPreview,
} from "@/modules/conditions/ui/builder";
import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { EligibilityBuilderRule } from "../api/EligibilityRuleSetTransport";
import {
  useEligibilityRuleSetBuilder,
  useEligibilityRuleSetLifecycle,
  useUpdateEligibilityRuleSet,
} from "../EligibilityRuleSetHooks";
import { EligibilityRuleDialog } from "./EligibilityRuleDialog";
import {
  EligibilityPublicationValidation,
  validateEligibilityPublicationPreview,
} from "./EligibilityPublicationValidation";

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
  fields,
  onDelete,
  onEdit,
}: {
  editable: boolean;
  fields: readonly ConditionFieldDefinition[];
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
      header: "Execution Mode",
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
            fields,
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

export function EligibilityRuleSetEditor({
  canPublish,
  canRetire,
  canUpdate,
  id,
  versionId,
}: {
  canPublish: boolean;
  canRetire: boolean;
  canUpdate: boolean;
  id: string;
  versionId?: string;
}) {
  const query = useEligibilityRuleSetBuilder(id, versionId);
  const update = useUpdateEligibilityRuleSet(id, versionId);
  const lifecycle = useEligibilityRuleSetLifecycle(id);
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  const [deleting, setDeleting] = useState<EligibilityBuilderRule>();
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
  const hasContext = currentEditor.conditionFields.length > 0;
  const publicationValidation = validateEligibilityPublicationPreview({
    fields: currentEditor.conditionFields,
    registryIssues: currentEditor.registryIssues,
    rules: currentEditor.rules,
  });

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

  async function runLifecycle(action: "CLONE" | "PUBLISH" | "RETIRE") {
    try {
      if (action === "PUBLISH") {
        await lifecycle.mutateAsync({
          action: "PUBLISH",
          expectedRowVersion: currentEditor.version.rowVersion,
          versionId: currentEditor.version.id,
        });
        setConfirmingPublish(false);
      } else if (action === "RETIRE") {
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
        error instanceof Error
          ? error.message
          : "Unable to update the version.",
      );
    }
  }

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
          <EditButton
            disabled={!editable}
            onClick={() => document.getElementById("eligibility-rules")
              ?.scrollIntoView({ behavior: "smooth" })}
            title="Edit eligibility rules"
          />
          <CloneButton
            disabled={isDraft || !canUpdate}
            isLoading={lifecycle.isPending}
            onClick={() => void runLifecycle("CLONE")}
            title="Clone ruleset version"
          />
          <PublishButton
            disabled={!isDraft || !canPublish || !publicationValidation.ready}
            isLoading={lifecycle.isPending}
            onClick={() => setConfirmingPublish(true)}
            title="Publish ruleset version"
          />
          {currentEditor.version.status === "PUBLISHED" ? (
            <RetireButton
              disabled={!canRetire}
              isLoading={lifecycle.isPending}
              onClick={() => void runLifecycle("RETIRE")}
              title="Retire ruleset version"
            />
          ) : null}
          <GeneralButtonLink
            href={versionId
              ? `/admin/settings/eligibility-rulesets/${id}/test?versionId=${versionId}`
              : `/admin/settings/eligibility-rulesets/${id}/test`}
            variant="outlineOrange"
            size={"compact"}
          >
            <FlaskConical className="size-4" />
            Test ruleset
          </GeneralButtonLink>
        </div>
      </header>

      {!isDraft ? (
        <p className="rounded-xl border border-brand-blue/20 bg-brand-blue/10 px-4 py-3 text-sm text-brand-navy">
          This version is read-only. Create a new Draft to change its rules.
        </p>
      ) : null}

      {isDraft && !hasContext ? (
        <p className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-brand-navy">
          Bind this draft ruleset to a draft funding call before adding rules.
        </p>
      ) : null}

      {lifecycle.error ? (
        <p className="text-sm text-red-700" role="alert">
          {lifecycle.error.message}
        </p>
      ) : null}

      <EligibilityPublicationValidation result={publicationValidation} />

      <section aria-label="Eligibility rules" id="eligibility-rules">
        <DataTable
          columns={ruleColumns({
            editable,
            fields: currentEditor.conditionFields,
            onDelete: setDeleting,
            onEdit: setEditing,
          })}
          data={currentEditor.rules}
          emptyMessage="No eligibility rules configured."
          minWidth={1180}
          rowKey={(rule) => rule.id}
          toolbar={{
            actions:
              editable ? (
                <GeneralButton
                  disabled={!hasContext}
                  onClick={() => setEditing("new")}
                  size="compact"
                  title={
                    hasContext
                      ? "Add eligibility rule"
                      : "Bind this ruleset to a funding call before adding rules"
                  }
                  variant={"primary"}
                >
                  <Plus className="size-4" />
                  Add rule
                </GeneralButton>
              ) : undefined,
            title: "Eligibility rules",
          }}
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
          fields={currentEditor.conditionFields}
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
          sources={currentEditor.screeningSources}
        />
      </DraggableDialog>
      <ConfirmationDialog
        confirmText="Publish version"
        errorMessage={lifecycle.error?.message}
        isLoading={lifecycle.isPending}
        isOpen={confirmingPublish}
        loadingText="Publishing…"
        message={`Publish ${currentEditor.definition.name} version ${currentEditor.version.versionNumber}? It will become available for use by its funding call.`}
        onCancel={() => setConfirmingPublish(false)}
        onConfirm={() => void runLifecycle("PUBLISH")}
        title="Publish eligibility ruleset"
      />
      <ConfirmationDialog
        confirmText="Delete rule"
        isDangerous
        isLoading={update.isPending}
        isOpen={Boolean(deleting) && editable}
        loadingText="Deleting…"
        message={
          `Delete ${deleting?.reasonCode ?? "this eligibility rule"}? This only changes the mutable draft.`
        }
        onCancel={() => setDeleting(undefined)}
        onConfirm={() => {
          if (!deleting) return;
          const remaining = currentEditor.rules
            .filter((item) => item.id !== deleting.id)
            .map((item, index) => ({ ...item, order: index + 1 }));
          void saveRules(remaining)
            .then(() => setDeleting(undefined))
            .catch(() => undefined);
        }}
        title="Delete eligibility rule"
      />
    </div>
  );
}

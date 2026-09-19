import type {
  WorkflowDefinitionSummary,
  WorkflowEditorView,
  WorkflowGraphInput,
  WorkflowOpportunityAssignment,
  WorkflowValidation,
  WorkflowStatus,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";

export function toWorkflowSummaries(
  rows: Awaited<
    ReturnType<
      typeof import("@/modules/workflows/infrastructure/WorkflowRepository").listWorkflowDefinitions
    >
  >,
): WorkflowDefinitionSummary[] {
  const seen = new Set<string>();
  return rows.flatMap((row) => {
    if (seen.has(row.id)) return [];
    seen.add(row.id);
    return [
      {
        ...row,
        updatedAt: row.updatedAt.toISOString(),
      },
    ];
  });
}

export function toWorkflowEditor(
  record: {
    definition: { id: string; code: string; name: string; description: string };
    graph: WorkflowGraphInput;
    version: {
      id: string;
      versionNumber: number;
      status: WorkflowStatus;
      createdAt: Date;
      publishedAt: Date | null;
      retiredAt: Date | null;
      rowVersion: number;
    };
  },
  validation: WorkflowValidation,
): WorkflowEditorView {
  const status = record.version.status;
  return {
    definition: record.definition,
    version: {
      id: record.version.id,
      number: record.version.versionNumber,
      status,
      createdAt: record.version.createdAt.toISOString(),
      publishedAt: record.version.publishedAt?.toISOString() ?? null,
      retiredAt: record.version.retiredAt?.toISOString() ?? null,
      rowVersion: record.version.rowVersion,
    },
    graph: record.graph,
    validation,
    allowedActions: {
      DRAFT: ["UPDATE", "VALIDATE", "PREVIEW", "SUBMIT"],
      PENDING_APPROVAL: ["PREVIEW", "RETURN", "APPROVE"],
      APPROVED: ["PREVIEW", "PUBLISH"],
      PUBLISHED: ["PREVIEW", "CLONE", "RETIRE", "ASSIGN"],
      RETIRED: ["PREVIEW", "CLONE"],
    }[status],
  };
}

export function toWorkflowAssignment(record: {
  assignedAt: Date;
  fundingOpportunityId: number;
  fundingOpportunityTitle: string;
  rowVersion: number;
  versionNumber: number;
  workflowName: string;
  workflowVersionId: string;
}): WorkflowOpportunityAssignment {
  return { ...record, assignedAt: record.assignedAt.toISOString() };
}

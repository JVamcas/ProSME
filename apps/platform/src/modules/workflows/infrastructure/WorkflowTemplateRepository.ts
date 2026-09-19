import "server-only";

import type {
  WorkflowTemplate,
  WorkflowTemplateVersion,
} from "../domain/definitions/WorkflowTemplate";

import { and, asc, desc, eq, or } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  workflowDefinitions,
  workflowDefinitionVersions,
} from "./workflow.schema";
import { workflowAuditEntries } from "./workflow-audit.schema";

export async function listCurrentWorkflowTemplates() {
  return getDatabase()
    .selectDistinctOn([workflowDefinitions.id], {
      currentVersionId: workflowDefinitionVersions.id,
      currentVersionNumber: workflowDefinitionVersions.versionNumber,
      currentVersionStatus: workflowDefinitionVersions.status,
      id: workflowDefinitions.id,
      metadata: workflowDefinitionVersions.metadata,
      updatedAt: workflowDefinitionVersions.updatedAt,
    })
    .from(workflowDefinitions)
    .innerJoin(
      workflowDefinitionVersions,
      eq(workflowDefinitionVersions.definitionId, workflowDefinitions.id),
    )
    .orderBy(
      workflowDefinitions.id,
      desc(workflowDefinitionVersions.versionNumber),
    );
}

export async function findWorkflowTemplateVersion(
  templateId: string,
  versionId: string,
): Promise<{
  template: WorkflowTemplate;
  version: WorkflowTemplateVersion;
} | null> {
  const [record] = await getDatabase()
    .select({
      template: workflowDefinitions,
      version: workflowDefinitionVersions,
    })
    .from(workflowDefinitionVersions)
    .innerJoin(
      workflowDefinitions,
      eq(workflowDefinitions.id, workflowDefinitionVersions.definitionId),
    )
    .where(
      and(
        eq(workflowDefinitions.id, templateId),
        eq(workflowDefinitionVersions.id, versionId),
      ),
    );
  return record ?? null;
}

export async function findWorkflowTemplateByVersion(versionId: string) {
  const [version] = await getDatabase()
    .select()
    .from(workflowDefinitionVersions)
    .where(eq(workflowDefinitionVersions.id, versionId));
  return version ?? null;
}

export async function listWorkflowTemplateVersions(templateId: string) {
  return getDatabase()
    .select()
    .from(workflowDefinitionVersions)
    .where(eq(workflowDefinitionVersions.definitionId, templateId))
    .orderBy(asc(workflowDefinitionVersions.versionNumber));
}

export async function listWorkflowTemplateAudit(
  templateId: string,
  versionId: string,
) {
  return getDatabase()
    .select()
    .from(workflowAuditEntries)
    .where(
      or(
        and(
          eq(workflowAuditEntries.targetType, "WORKFLOW_DEFINITION"),
          eq(workflowAuditEntries.targetId, templateId),
        ),
        and(
          eq(workflowAuditEntries.targetType, "WORKFLOW_VERSION"),
          eq(workflowAuditEntries.targetId, versionId),
        ),
      ),
    )
    .orderBy(asc(workflowAuditEntries.createdAt), asc(workflowAuditEntries.id));
}

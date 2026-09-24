import "server-only";

import type {
  WorkflowTemplate,
  WorkflowTemplateVersion,
} from "../domain/definitions/WorkflowTemplate";

import { and, asc, count, desc, eq, or, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  workflowDefinitions,
  workflowDefinitionVersions,
} from "./workflow.schema";
import { workflowAuditEntries } from "./workflow-audit.schema";

export async function listWorkflowTemplatePage(page: number, pageSize: number) {
  const database = getDatabase();
  const [items, [summary]] = await Promise.all([
    database
      .select({
        currentVersionId: workflowDefinitionVersions.id,
        currentVersionNumber: workflowDefinitionVersions.versionNumber,
        currentVersionRowVersion: workflowDefinitionVersions.rowVersion,
        currentVersionStatus: workflowDefinitionVersions.status,
        id: workflowDefinitions.id,
        metadata: workflowDefinitionVersions.metadata,
        updatedAt: workflowDefinitionVersions.updatedAt,
        isLatest: sql<boolean>`${workflowDefinitionVersions.versionNumber} = max(${workflowDefinitionVersions.versionNumber}) over (partition by ${workflowDefinitions.id})`,
      })
      .from(workflowDefinitions)
      .innerJoin(
        workflowDefinitionVersions,
        eq(workflowDefinitionVersions.definitionId, workflowDefinitions.id),
      )
      .where(eq(workflowDefinitions.active, true))
      .orderBy(
        sql`lower(${workflowDefinitionVersions.metadata}->>'name')`,
        workflowDefinitions.id,
        desc(workflowDefinitionVersions.versionNumber),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    database
      .select({ total: count() })
      .from(workflowDefinitionVersions)
      .innerJoin(
        workflowDefinitions,
        eq(workflowDefinitions.id, workflowDefinitionVersions.definitionId),
      )
      .where(eq(workflowDefinitions.active, true)),
  ]);
  return { items, total: summary.total };
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

import "server-only";

import type {
  WorkflowTemplate,
  WorkflowTemplateDetails,
  WorkflowTemplateVersion,
} from "../domain/definitions/WorkflowTemplate";

import { and, asc, count, desc, eq, exists, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDatabase } from "@/db/client";
import {
  workflowDefinitions,
  workflowDefinitionVersions,
} from "./workflow.schema";
import { workflowAuditEntries } from "./workflow-audit.schema";

const versionSelection = {
  currentVersionId: workflowDefinitionVersions.id,
  currentVersionNumber: workflowDefinitionVersions.versionNumber,
  currentVersionRowVersion: workflowDefinitionVersions.rowVersion,
  currentVersionStatus: workflowDefinitionVersions.status,
  id: workflowDefinitions.id,
  metadata: workflowDefinitionVersions.metadata,
  updatedAt: workflowDefinitionVersions.updatedAt,
  isLatest: sql<boolean>`${workflowDefinitionVersions.versionNumber} = max(${workflowDefinitionVersions.versionNumber}) over (partition by ${workflowDefinitions.id})`,
};

export async function listWorkflowTemplatePage(page: number, pageSize: number) {
  const database = getDatabase();
  const latest = alias(workflowDefinitionVersions, "latest_template_version");
  const latestNumber = database
    .select({ number: sql<number>`max(${latest.versionNumber})` })
    .from(latest)
    .where(eq(latest.definitionId, workflowDefinitions.id));
  const visible = and(
    eq(workflowDefinitions.active, true),
    exists(
      database
        .select({ id: latest.id })
        .from(latest)
        .where(eq(latest.definitionId, workflowDefinitions.id)),
    ),
  );
  const [items, [summary]] = await Promise.all([
    database
      .select({
        ...versionSelection,
        metadata: sql<WorkflowTemplateDetails>`jsonb_build_object('code', ${workflowDefinitions.code}, 'name', ${workflowDefinitions.name}, 'description', ${workflowDefinitions.description})`,
        updatedAt: workflowDefinitions.updatedAt,
        isLatest: sql<boolean>`true`,
      })
      .from(workflowDefinitions)
      .innerJoin(
        workflowDefinitionVersions,
        and(
          eq(workflowDefinitionVersions.definitionId, workflowDefinitions.id),
          eq(workflowDefinitionVersions.versionNumber, latestNumber),
        ),
      )
      .where(eq(workflowDefinitions.active, true))
      .orderBy(sql`lower(${workflowDefinitions.name})`, workflowDefinitions.id)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    database
      .select({ total: count() })
      .from(workflowDefinitions)
      .where(visible),
  ]);
  return { items, total: summary.total };
}

export async function listWorkflowTemplateVersionPage(
  templateId: string,
  page: number,
  pageSize: number,
) {
  const database = getDatabase();
  const scope = and(
    eq(workflowDefinitions.id, templateId),
    eq(workflowDefinitions.active, true),
  );
  const [items, [summary]] = await Promise.all([
    database
      .select(versionSelection)
      .from(workflowDefinitions)
      .innerJoin(
        workflowDefinitionVersions,
        eq(workflowDefinitionVersions.definitionId, workflowDefinitions.id),
      )
      .where(scope)
      .orderBy(desc(workflowDefinitionVersions.versionNumber))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    database
      .select({ total: count() })
      .from(workflowDefinitions)
      .innerJoin(
        workflowDefinitionVersions,
        eq(workflowDefinitionVersions.definitionId, workflowDefinitions.id),
      )
      .where(scope),
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

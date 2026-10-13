import { taskHasLegacyWork } from "../domain/definitions/WorkflowTaskFormWork";
import { normalizeLegacyTaskScoring } from "../engine/migration/LegacyTaskScoring";
import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import {
  ensureSystemSeedPrincipal,
  systemSeedUserId,
} from "@/platform/database/SystemSeedPrincipal";
import {
  readMigrationForms,
  insertConvertedTaskForm,
} from "@/modules/forms/infrastructure/FormMigrationRepository";
import { formPublicationErrors } from "@/modules/forms/FormDefinitionValidation";
import { convertTaskForm } from "../engine/migration/TaskFormConversion";
import {
  addTaskFormConditionMappings,
  convertTaskFormConditionReferences,
} from "../engine/migration/TaskFormConditionConversion";
import { findWorkflowGraph } from "./WorkflowGraphRepository";
import {
  workflowDefinitions,
  workflowDefinitionVersions,
} from "./workflow.schema";
import { workflowAuditEntries } from "./workflow-audit.schema";
import { insertWorkflowGraph } from "./WorkflowGraphWriteRepository";
import type { WorkflowTaskInput } from "../domain/definitions/WorkflowTypes";

export async function listWorkflowFormMigrationSources() {
  const result = await getDatabase().execute<{ id: string }>(sql`
    SELECT version.id FROM app_workflow_definition_versions version
    WHERE version.status IN ('DRAFT', 'PUBLISHED')
      AND NOT EXISTS (SELECT 1 FROM app_workflow_form_migrations migration
        WHERE migration.source_version_id = version.id OR migration.target_version_id = version.id)
      AND (version.status = 'DRAFT' OR NOT EXISTS (
        SELECT 1 FROM app_workflow_definition_versions newer
        WHERE newer.definition_id = version.definition_id
          AND newer.version_number > version.version_number
          AND newer.status IN ('DRAFT', 'PUBLISHED')
      ))
    ORDER BY version.definition_id, version.version_number
    LIMIT 100
  `);
  return result.rows;
}

function convertedConfig(task: WorkflowTaskInput) {
  const config =
    task.config && typeof task.config === "object"
      ? ({ ...task.config } as Record<string, unknown>)
      : {};
  delete config.items;
  delete config.commentFields;
  delete config.criteria;
  return {
    ...config,
    workFormVersion: 1,
    formPurpose: "APPLICATION_REVIEW",
    sectionOrder: ["form"],
  };
}

export async function migrateWorkflowFormVersion(
  sourceVersionId: string,
  dryRun = false,
) {
  const source = await findWorkflowGraph(sourceVersionId);
  if (!source) throw new Error("Workflow source version not found.");
  return getDatabase().transaction(async (transaction) => {
    await transaction
      .select({ id: workflowDefinitions.id })
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.id, source.definition.id))
      .for("update");
    const prior = await transaction.execute<{ target: string }>(sql`
      SELECT target_version_id AS target FROM app_workflow_form_migrations WHERE source_version_id = ${sourceVersionId}::uuid
    `);
    if (prior.rows[0])
      return {
        sourceVersionId,
        targetVersionId: prior.rows[0].target,
        skipped: true,
        forms: 0,
      };
    const locked = await transaction
      .select({ id: workflowDefinitionVersions.id })
      .from(workflowDefinitionVersions)
      .where(
        and(
          eq(workflowDefinitionVersions.id, sourceVersionId),
          eq(workflowDefinitionVersions.rowVersion, source.version.rowVersion),
        ),
      )
      .for("share");
    if (!locked.length)
      throw new Error("Workflow source changed during migration. Retry.");
    const versionIds = [
      ...new Set(
        source.graph.stages.flatMap((stage) =>
          stage.tasks.flatMap((task) =>
            task.formBinding ? [task.formBinding.formVersionId] : [],
          ),
        ),
      ),
    ];
    const forms = await readMigrationForms(transaction, versionIds);
    const mappings = new Map<string, Set<string>>();
    const graph = {
      ...structuredClone(source.graph),
      stages: source.graph.stages.map(normalizeLegacyTaskScoring),
    };
    const records: {
      stageKey: string;
      taskKey: string;
      sourceFormVersionId: string | null;
      formVersionId: string;
      fieldKeys: Record<string, string>;
    }[] = [];
    if (!dryRun) await ensureSystemSeedPrincipal(transaction);
    for (const stage of graph.stages) {
      for (const task of stage.tasks) {
        if (!taskHasLegacyWork(stage, task)) continue;
        const config = task.config as Record<string, unknown> | null;
        if (config?.formPurpose === "ELIGIBILITY_VERIFICATION") {
          throw new Error(
            `${task.name}: inherited eligibility form requires explicit conversion before migration.`,
          );
        }
        const original = task.formBinding
          ? forms.get(task.formBinding.formVersionId)
          : undefined;
        if (task.formBinding && !original)
          throw new Error(`${task.name}: bound form was not found.`);
        const content = convertTaskForm(stage, task, original);
        const errors = formPublicationErrors(
          content.fields,
          content.sections,
          original?.submitLabel ?? "Complete task",
        );
        if (errors.length) throw new Error(`${task.name}: ${errors.join(" ")}`);
        addTaskFormConditionMappings(mappings, stage, task, content.sourceKeys);
        const result = dryRun
          ? { versionId: crypto.randomUUID() }
          : await insertConvertedTaskForm(transaction, {
              code: `TASK_${crypto.randomUUID().replaceAll("-", "").toUpperCase()}`,
              name: `${stage.name} — ${task.name}`.slice(0, 160),
              source: original,
              content,
            });
        records.push({
          stageKey: stage.stableKey,
          taskKey: task.stableKey,
          sourceFormVersionId: task.formBinding?.formVersionId ?? null,
          formVersionId: result.versionId,
          fieldKeys: content.sourceKeys,
        });
        task.formBinding = {
          formVersionId: result.versionId,
          contextFields: task.formBinding?.contextFields ?? [],
        };
        task.config = convertedConfig(task);
      }
      const converted = new Set(
        records
          .filter((record) => record.stageKey === stage.stableKey)
          .map((record) => record.taskKey),
      );
      stage.checklistItems = stage.checklistItems.filter(
        (item) => !converted.has(item.taskStableKey),
      );
      stage.commentFields = (stage.commentFields ?? []).filter(
        (item) => !converted.has(item.taskStableKey),
      );
      stage.scoring = (stage.scoring ?? []).filter(
        (item) => !converted.has(item.taskStableKey),
      );
    }
    const convertedGraph = convertTaskFormConditionReferences(graph, mappings);
    if (dryRun || !records.length)
      return {
        sourceVersionId,
        targetVersionId: null,
        skipped: !records.length,
        forms: records.length,
      };
    const latest = await transaction.execute<{ number: number }>(sql`
      SELECT coalesce(max(version_number), 0) + 1 AS number FROM app_workflow_definition_versions
      WHERE definition_id = ${source.definition.id}::uuid
    `);
    const [target] = await transaction
      .insert(workflowDefinitionVersions)
      .values({
        definitionId: source.definition.id,
        sourceVersionId,
        createdBy: systemSeedUserId,
        versionNumber: latest.rows[0].number,
        metadata: source.version.metadata,
      })
      .returning({ id: workflowDefinitionVersions.id });
    await insertWorkflowGraph(transaction, target.id, convertedGraph);
    await transaction.execute(sql`
      INSERT INTO app_workflow_form_migrations (source_version_id, target_version_id, mapping)
      VALUES (${sourceVersionId}::uuid, ${target.id}::uuid, ${JSON.stringify(records)}::jsonb)
    `);
    await transaction.insert(workflowAuditEntries).values({
      action: "WORKFLOW_TASK_FORMS_MIGRATED",
      actorId: systemSeedUserId,
      correlationId: crypto.randomUUID(),
      targetId: target.id,
      targetType: "WORKFLOW_VERSION",
      before: { sourceVersionId },
      after: { forms: records.length, sourceVersionId },
    });
    return {
      sourceVersionId,
      targetVersionId: target.id,
      skipped: false,
      forms: records.length,
    };
  });
}

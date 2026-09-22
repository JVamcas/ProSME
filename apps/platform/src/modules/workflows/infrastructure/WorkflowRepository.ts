import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  formFields as formFieldRecords,
  formVersions,
  roles,
  users,
  workflowDefinitionVersions,
  workflowDefinitions,
} from "@/db/schema";
import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowConditionFormField } from "@/modules/workflows/engine/WorkflowConditionFields";

export async function listWorkflowDefinitions() {
  return getDatabase()
    .select({
      active: workflowDefinitions.active,
      code: workflowDefinitions.code,
      description: workflowDefinitions.description,
      id: workflowDefinitions.id,
      latestStatus: workflowDefinitionVersions.status,
      latestVersion: workflowDefinitionVersions.versionNumber,
      name: workflowDefinitions.name,
      updatedAt: workflowDefinitions.updatedAt,
    })
    .from(workflowDefinitions)
    .innerJoin(
      workflowDefinitionVersions,
      eq(workflowDefinitionVersions.definitionId, workflowDefinitions.id),
    )
    .orderBy(
      asc(workflowDefinitions.name),
      desc(workflowDefinitionVersions.versionNumber),
    );
}

export async function listPublishedWorkflowVersions() {
  return getDatabase()
    .select({
      definitionId: workflowDefinitions.id,
      name: workflowDefinitions.name,
      versionId: workflowDefinitionVersions.id,
      versionNumber: workflowDefinitionVersions.versionNumber,
    })
    .from(workflowDefinitionVersions)
    .innerJoin(
      workflowDefinitions,
      eq(workflowDefinitions.id, workflowDefinitionVersions.definitionId),
    )
    .where(eq(workflowDefinitionVersions.status, "PUBLISHED"))
    .orderBy(
      asc(workflowDefinitions.name),
      desc(workflowDefinitionVersions.versionNumber),
    );
}

export async function listBindableWorkflowVersions() {
  return getDatabase()
    .select({
      definitionId: workflowDefinitions.id,
      name: workflowDefinitions.name,
      status: workflowDefinitionVersions.status,
      versionId: workflowDefinitionVersions.id,
      versionNumber: workflowDefinitionVersions.versionNumber,
    })
    .from(workflowDefinitionVersions)
    .innerJoin(
      workflowDefinitions,
      eq(workflowDefinitions.id, workflowDefinitionVersions.definitionId),
    )
    .where(inArray(workflowDefinitionVersions.status, ["DRAFT", "PUBLISHED"]))
    .orderBy(
      asc(workflowDefinitions.name),
      desc(workflowDefinitionVersions.versionNumber),
    );
}

export async function findWorkflowVersion(versionId: string) {
  const [record] = await getDatabase()
    .select({
      id: workflowDefinitionVersions.id,
      status: workflowDefinitionVersions.status,
    })
    .from(workflowDefinitionVersions)
    .where(eq(workflowDefinitionVersions.id, versionId))
    .limit(1);
  return record ?? null;
}

export async function workflowTemplateVersionIsPublished(versionId: string) {
  const [record] = await getDatabase()
    .select({ id: workflowDefinitionVersions.id })
    .from(workflowDefinitionVersions)
    .where(
      and(
        eq(workflowDefinitionVersions.id, versionId),
        eq(workflowDefinitionVersions.status, "PUBLISHED"),
      ),
    )
    .limit(1);
  return Boolean(record);
}

export async function workflowTemplateVersionIsBindable(versionId: string) {
  const [record] = await getDatabase()
    .select({ id: workflowDefinitionVersions.id })
    .from(workflowDefinitionVersions)
    .where(
      and(
        eq(workflowDefinitionVersions.id, versionId),
        inArray(workflowDefinitionVersions.status, ["DRAFT", "PUBLISHED"]),
      ),
    )
    .limit(1);
  return Boolean(record);
}

export async function findLatestWorkflowVersionId(definitionId: string) {
  const [record] = await getDatabase()
    .select({ id: workflowDefinitionVersions.id })
    .from(workflowDefinitionVersions)
    .where(eq(workflowDefinitionVersions.definitionId, definitionId))
    .orderBy(desc(workflowDefinitionVersions.versionNumber))
    .limit(1);
  return record?.id ?? null;
}

export async function findDraftByDefinition(
  definitionId: string,
): Promise<string | null> {
  const [draft] = await getDatabase()
    .select({ id: workflowDefinitionVersions.id })
    .from(workflowDefinitionVersions)
    .where(
      and(
        eq(workflowDefinitionVersions.definitionId, definitionId),
        eq(workflowDefinitionVersions.status, "DRAFT"),
      ),
    )
    .limit(1);
  return draft?.id ?? null;
}

export async function findConfigurationReferences(
  graph: WorkflowGraphInput,
): Promise<{
  formFields: Map<string, WorkflowConditionFormField[]>;
  roles: Set<string>;
  users: Map<string, string>;
  forms: Map<string, string>;
}> {
  const references = collectConfigurationReferences(graph);
  const [foundUsers, foundRoles, foundForms, fieldsByVersion] =
    await Promise.all([
      references.userIds.length
        ? getDatabase()
            .select({ id: users.id, status: users.status })
            .from(users)
            .where(inArray(users.id, references.userIds))
        : [],
      references.roleIds.length
        ? getDatabase()
            .select({ id: roles.id })
            .from(roles)
            .where(inArray(roles.id, references.roleIds))
        : [],
      references.formVersionIds.length
        ? getDatabase()
            .select({ id: formVersions.id, status: formVersions.status })
            .from(formVersions)
            .where(inArray(formVersions.id, references.formVersionIds))
        : [],
      findWorkflowConditionFormFields(graph),
    ]);
  return {
    formFields: fieldsByVersion,
    roles: new Set(foundRoles.map((item) => item.id)),
    users: new Map(foundUsers.map((item) => [item.id, item.status])),
    forms: new Map(foundForms.map((item) => [item.id, item.status])),
  };
}

export async function findWorkflowConditionFormFields(
  graph: WorkflowGraphInput,
) {
  const versionIds = collectConfigurationReferences(graph).formVersionIds;
  if (!versionIds.length) {
    return new Map<string, WorkflowConditionFormField[]>();
  }
  const records = await getDatabase()
    .select({
      key: formFieldRecords.key,
      label: formFieldRecords.label,
      type: formFieldRecords.type,
      versionId: formFieldRecords.formVersionId,
    })
    .from(formFieldRecords)
    .where(inArray(formFieldRecords.formVersionId, versionIds));
  const fieldsByVersion = new Map<string, WorkflowConditionFormField[]>();
  for (const field of records) {
    const fields = fieldsByVersion.get(field.versionId) ?? [];
    fields.push({ key: field.key, label: field.label, type: field.type });
    fieldsByVersion.set(field.versionId, fields);
  }
  return fieldsByVersion;
}

function collectConfigurationReferences(graph: WorkflowGraphInput) {
  const userIds = uniqueTaskValues(graph, "namedUserOverrideId");
  const roleIds = uniqueTaskValues(graph, "roleId");
  graph.stages.forEach((stage) => {
    stage.actions.forEach((action) => {
      if (action.actionType !== "ESCALATE") return;
      const targets =
        action.configuration.targetType === "ROLE" ? roleIds : userIds;
      targets.push(action.configuration.targetId);
    });
  });
  const formVersionIds = [
    ...new Set(
      graph.stages.flatMap((stage) =>
        stage.tasks.flatMap((task) =>
          task.formBinding ? [task.formBinding.formVersionId] : [],
        ),
      ),
    ),
  ];
  return {
    formVersionIds,
    roleIds: [...new Set(roleIds)],
    userIds: [...new Set(userIds)],
  };
}

function uniqueTaskValues(
  graph: WorkflowGraphInput,
  key: "namedUserOverrideId" | "roleId",
) {
  return [
    ...new Set(
      graph.stages
        .flatMap((stage) => stage.tasks.map((task) => task[key]))
        .filter(Boolean),
    ),
  ] as string[];
}

export async function listWorkflowAssignmentOptions() {
  const [roleRecords, userRecords] = await Promise.all([
    getDatabase()
      .select({ id: roles.id, label: roles.name })
      .from(roles)
      .orderBy(asc(roles.name)),
    getDatabase()
      .select({
        displayName: users.displayName,
        email: users.email,
        id: users.id,
      })
      .from(users)
      .where(and(eq(users.status, "active"), eq(users.userType, "staff")))
      .orderBy(asc(users.displayName), asc(users.email)),
  ]);
  return {
    roles: roleRecords,
    users: userRecords.map((user) => ({
      id: user.id,
      label: `${user.displayName} (${user.email})`,
    })),
  };
}

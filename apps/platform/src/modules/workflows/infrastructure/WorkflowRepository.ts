import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  capabilities as capabilityRecords,
  formVersions,
  roles,
  users,
  workflowDefinitionVersions,
  workflowDefinitions,
} from "@/db/schema";
import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";

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
  capabilities: Set<string>;
  roles: Set<string>;
  users: Map<string, string>;
  forms?: Map<string, string>;
}> {
  const references = collectConfigurationReferences(graph);
  const [foundCapabilities, foundUsers, foundRoles, foundForms] =
    await Promise.all([
      getDatabase()
        .select({ code: capabilityRecords.code })
        .from(capabilityRecords)
        .where(inArray(capabilityRecords.code, references.capabilityCodes)),
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
    ]);
  return {
    capabilities: new Set(foundCapabilities.map((item) => item.code)),
    roles: new Set(foundRoles.map((item) => item.id)),
    users: new Map(foundUsers.map((item) => [item.id, item.status])),
    forms: new Map(foundForms.map((item) => [item.id, item.status])),
  };
}

function collectConfigurationReferences(graph: WorkflowGraphInput) {
  const capabilityCodes = [
    ...new Set(graph.transitions.map((item) => item.requiredCapability)),
  ];
  const userIds = uniqueTaskValues(graph, "namedUserOverrideId");
  const roleIds = uniqueTaskValues(graph, "roleId");
  const formVersionIds = uniqueTaskValues(graph, "formVersionId");
  return { capabilityCodes, formVersionIds, roleIds, userIds };
}

function uniqueTaskValues(
  graph: WorkflowGraphInput,
  key: "namedUserOverrideId" | "roleId" | "formVersionId",
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

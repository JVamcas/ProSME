import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import {
  capabilities,
  roleCapabilities,
  roles,
} from "@/db/schema";
import { getDatabase } from "@/db/client";
import { permissionCodes } from "@/auth/authorization/permissions/PermissionCodes";
import {
  formDefinitions,
  formVersions,
} from "@/modules/forms/infrastructure/form.schema";
import { standardFormPurpose } from "@/modules/forms/domain/FormPurpose";
import type { StandardWorkflowDraft } from "@/modules/workflows/domain/standard/StandardWorkflowTypes";
import {
  standardWorkflowCode,
  standardWorkflowFormCodes,
  type StandardWorkflowDependencies,
  type StandardWorkflowFormCode,
  type StandardWorkflowRoleCode,
} from "@/modules/workflows/domain/standard/StandardWorkflowTypes";
import {
  ensureSystemSeedPrincipal,
  systemSeedUserId,
} from "@/platform/database/SystemSeedPrincipal";
import { createWorkflowDefinition } from "./WorkflowTemplateWriteRepository";
import { workflowDefinitions } from "./workflow.schema";

const standardRoles: Array<{
  code: StandardWorkflowRoleCode;
  description: string;
  name: string;
}> = [
  {
    code: "programme_officer",
    description: "Administers screening, notifications and programme operations.",
    name: "Programme Administrator",
  },
  {
    code: "sector_specialist",
    description: "Performs technical or scientific application assessment.",
    name: "Technical Reviewer",
  },
  {
    code: "financial_reviewer",
    description: "Performs financial, budget and disbursement review.",
    name: "Financial Reviewer",
  },
  {
    code: "due_diligence_officer",
    description: "Performs due diligence and risk assessment.",
    name: "Due Diligence Officer",
  },
  {
    code: "panel_moderator",
    description: "Chairs moderation and consolidates assessment outcomes.",
    name: "Panel Chair / Moderator",
  },
  {
    code: "approval_panel_member",
    description: "Participates in committee or adjudication decisions.",
    name: "Committee Member",
  },
  {
    code: "committee_secretariat",
    description: "Administers committee packs, attendance and resolutions.",
    name: "Committee Secretariat",
  },
  {
    code: "delegated_approver",
    description: "Approves awards within a configured authority value band.",
    name: "Delegated Approver",
  },
  {
    code: "contracts_officer",
    description: "Manages contracting and conditions precedent.",
    name: "Contracts Officer",
  },
  {
    code: "grant_me_officer",
    description: "Manages grant monitoring, evaluation and close-out.",
    name: "Grant or M&E Officer",
  },
];

const taskPermissionCodes = [
  permissionCodes.workflowTaskAssignedRead,
  permissionCodes.workflowTaskAssignedProcess,
  permissionCodes.workflowTaskAssignedDecide,
] as const;

export type StandardWorkflowSeedDependencies = StandardWorkflowDependencies & {
  formVersionStatuses: Partial<
    Record<StandardWorkflowFormCode, "DRAFT" | "PUBLISHED">
  >;
  unresolvedFormCodes: StandardWorkflowFormCode[];
};

async function ensureRolesAndPermissions(
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
) {
  await transaction.insert(roles).values(standardRoles).onConflictDoNothing();
  const roleRows = await transaction
    .select({ code: roles.code, id: roles.id })
    .from(roles)
    .where(inArray(roles.code, standardRoles.map((role) => role.code)));
  const roleIds = new Map(roleRows.map((role) => [role.code, role.id]));
  const missingRoles = standardRoles.filter((role) => !roleIds.has(role.code));
  if (missingRoles.length) {
    throw new Error(
      `Standard workflow roles are unavailable: ${missingRoles.map((role) => role.code).join(", ")}`,
    );
  }
  const capabilityRows = await transaction
    .select({ code: capabilities.code, id: capabilities.id })
    .from(capabilities)
    .where(inArray(capabilities.code, [...taskPermissionCodes]));
  const capabilityIds = new Map(
    capabilityRows.map((capability) => [capability.code, capability.id]),
  );
  const missingCapabilities = taskPermissionCodes.filter(
    (code) => !capabilityIds.has(code),
  );
  if (missingCapabilities.length) {
    throw new Error(
      `Standard workflow permissions are unavailable: ${missingCapabilities.join(", ")}`,
    );
  }
  await transaction.insert(roleCapabilities).values(
    roleRows.flatMap((role) => taskPermissionCodes.map((code) => ({
      capabilityId: capabilityIds.get(code)!,
      roleId: role.id,
    }))),
  ).onConflictDoNothing();
  return Object.fromEntries(roleIds) as Record<StandardWorkflowRoleCode, string>;
}

async function bindableFormVersions(
  transaction: Parameters<
    Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
  >[0],
) {
  const rows = await transaction
    .select({
      code: formDefinitions.code,
      id: formVersions.id,
      purpose: formDefinitions.purpose,
      versionNumber: formVersions.versionNumber,
    })
    .from(formDefinitions)
    .innerJoin(
      formVersions,
      eq(formVersions.formDefinitionId, formDefinitions.id),
    )
    .where(and(
      inArray(formDefinitions.code, [...standardWorkflowFormCodes]),
      eq(formVersions.status, "PUBLISHED"),
    ))
    .orderBy(desc(formVersions.versionNumber));
  const formVersionIds: Partial<Record<StandardWorkflowFormCode, string>> = {};
  const formVersionStatuses: StandardWorkflowSeedDependencies["formVersionStatuses"] = {};
  for (const row of rows) {
    const code = row.code as StandardWorkflowFormCode;
    if (!standardWorkflowFormCodes.includes(code)) continue;
    if (row.purpose !== standardFormPurpose(code)) continue;
    if (formVersionIds[code]) continue;
    formVersionIds[code] = row.id;
    formVersionStatuses[code] = "PUBLISHED";
  }
  return { formVersionIds, formVersionStatuses };
}

export async function prepareStandardWorkflowSeedDependencies(): Promise<
  StandardWorkflowSeedDependencies
> {
  return getDatabase().transaction(async (transaction) => {
    await ensureSystemSeedPrincipal(transaction);
    const roleIds = await ensureRolesAndPermissions(transaction);
    const { formVersionIds, formVersionStatuses } = await bindableFormVersions(
      transaction,
    );
    return {
      formVersionIds,
      formVersionStatuses,
      roleIds,
      unresolvedFormCodes: standardWorkflowFormCodes.filter(
        (code) => !formVersionIds[code],
      ),
    };
  });
}

export async function insertMissingStandardWorkflowDraft(
  draft: StandardWorkflowDraft,
) {
  const [existing] = await getDatabase()
    .select({ id: workflowDefinitions.id })
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.code, standardWorkflowCode))
    .limit(1);
  if (existing) {
    return {
      bindingsAdded: 0,
      created: false,
      definitionId: existing.id,
      versionId: undefined,
    };
  }
  const versionId = await createWorkflowDefinition({
    ...draft,
    actorId: systemSeedUserId,
    correlationId: crypto.randomUUID(),
  });
  const [created] = await getDatabase()
    .select({ id: workflowDefinitions.id })
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.code, standardWorkflowCode))
    .limit(1);
  return {
    created: true,
    definitionId: created!.id,
    bindingsAdded: draft.graph.stages.reduce(
      (total, stage) => total + stage.tasks.filter(
        (task) => task.formBinding,
      ).length,
      0,
    ),
    versionId,
  };
}

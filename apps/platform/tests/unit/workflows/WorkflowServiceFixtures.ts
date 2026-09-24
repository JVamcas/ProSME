import type { AuthenticatedUser } from "@/auth/types";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

export const actor: AuthenticatedUser = {
  id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  capabilities: new Set(),
  createdAt: new Date(),
  displayName: "System Admin",
  email: "admin@example.test",
  identitySubject: "firebase-admin",
  lastLoginAt: null,
  roleCodes: new Set(["system_administrator"]),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};
export const userWith = (...grants: string[]): AuthenticatedUser => ({
  ...actor,
  capabilities: new Set(grants),
});

const assignedReferenceWorkflow = structuredClone(referenceWorkflow);
for (const stage of assignedReferenceWorkflow.stages) {
  for (const task of stage.tasks) {
    task.assignmentMode = "NAMED_USER";
    task.namedUserOverrideId = actor.id;
  }
}
export const record = {
  definition: {
    id: "definition-id",
    code: "REFERENCE",
    name: "Reference",
    description: "",
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  graph: assignedReferenceWorkflow,
  version: {
    id: "version-id",
    definitionId: "definition-id",
    versionNumber: 1,
    status: "APPROVED" as const,
    metadata: { code: "REFERENCE", name: "Reference", description: "" },
    rowVersion: 1,
    createdBy: actor.id,
    publishedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
    retiredAt: null,
  },
};

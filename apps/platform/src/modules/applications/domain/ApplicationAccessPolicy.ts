import type { ApplicationAggregate } from "./Application";

export type ApplicationResourceScope =
  | { kind: "applicant"; representedBusinessIds: ReadonlySet<string> }
  | { kind: "assigned"; assignedApplicationIds: ReadonlySet<string> }
  | { kind: "all" };

export function applicationIsInScope(
  application: ApplicationAggregate,
  actorUserId: string,
  scope: ApplicationResourceScope,
) {
  if (scope.kind === "all") return true;
  if (scope.kind === "assigned") {
    return scope.assignedApplicationIds.has(application.id);
  }
  if (application.ownerApplicantUserId !== actorUserId) return false;
  return (
    application.businessId === null
    || scope.representedBusinessIds.has(application.businessId)
  );
}

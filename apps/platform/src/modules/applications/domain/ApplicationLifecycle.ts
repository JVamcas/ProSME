import type {
  ApplicationAggregate,
  ApplicationLifecycleStatus,
  ApplicationWorkflowLink,
} from "./Application";

export type SubmitApplicationTransition = {
  occurredAt: Date;
  reference: string;
  submissionSnapshotId: string | null;
  targetStatus: "submitted";
  workflow: ApplicationWorkflowLink;
};

export type WithdrawApplicationTransition = {
  occurredAt: Date;
  targetStatus: "withdrawn";
};

export type ApplicationLifecycleTransition =
  | SubmitApplicationTransition
  | WithdrawApplicationTransition;

export class InvalidApplicationLifecycleTransitionError extends Error {
  readonly sourceStatus: ApplicationLifecycleStatus;
  readonly targetStatus: ApplicationLifecycleStatus;

  constructor(
    sourceStatus: ApplicationLifecycleStatus,
    targetStatus: ApplicationLifecycleStatus,
  ) {
    super(`Application cannot transition from ${sourceStatus} to ${targetStatus}.`);
    this.name = "InvalidApplicationLifecycleTransitionError";
    this.sourceStatus = sourceStatus;
    this.targetStatus = targetStatus;
  }
}

export function canTransitionApplication(
  source: ApplicationLifecycleStatus,
  target: ApplicationLifecycleStatus,
) {
  return (
    (source === "draft" && target === "submitted")
    || (source === "submitted" && target === "withdrawn")
  );
}

export function transitionApplicationLifecycle(
  application: ApplicationAggregate,
  transition: ApplicationLifecycleTransition,
): ApplicationAggregate {
  if (!canTransitionApplication(application.status, transition.targetStatus)) {
    throw new InvalidApplicationLifecycleTransitionError(
      application.status,
      transition.targetStatus,
    );
  }

  if (transition.targetStatus === "submitted") {
    return {
      ...application,
      reference: transition.reference,
      rowVersion: application.rowVersion + 1,
      status: "submitted",
      submissionSnapshotId: transition.submissionSnapshotId,
      submittedAt: transition.occurredAt,
      updatedAt: transition.occurredAt,
      workflow: transition.workflow,
    };
  }

  return {
    ...application,
    rowVersion: application.rowVersion + 1,
    status: "withdrawn",
    updatedAt: transition.occurredAt,
    withdrawnAt: transition.occurredAt,
  };
}

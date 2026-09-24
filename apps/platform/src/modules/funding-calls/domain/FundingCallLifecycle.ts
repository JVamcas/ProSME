import type {
  FundingCallPublishedStatus,
  FundingCallStatus,
} from "./FundingCall";

export const fundingCallLifecycleCommands = [
  "SUBMIT_FOR_APPROVAL",
  "RETURN_FOR_AMENDMENT",
  "WITHDRAW_APPROVAL_REQUEST",
  "APPROVE",
  "PUBLISH",
  "OPEN",
  "SUSPEND",
  "RESUME",
  "CLOSE",
  "WITHDRAW",
  "ARCHIVE",
] as const;

export type FundingCallLifecycleCommand =
  (typeof fundingCallLifecycleCommands)[number];

type LifecycleSource = Pick<
  FundingCallLifecycleSource,
  "closesAt" | "opensAt" | "status" | "suspendedFromStatus"
>;

export type FundingCallLifecycleSource = {
  closesAt: Date;
  opensAt: Date;
  status: FundingCallStatus;
  suspendedFromStatus: FundingCallPublishedStatus | null;
};

export type FundingCallTransition = {
  sourceStatus: FundingCallStatus;
  suspendedFromStatus: FundingCallPublishedStatus | null;
  targetStatus: FundingCallStatus;
};

export class FundingCallTransitionDeniedError extends Error {
  constructor(command: FundingCallLifecycleCommand, status: FundingCallStatus) {
    super(`The ${command} command is not permitted from ${status}.`);
    this.name = "FundingCallTransitionDeniedError";
  }
}

const fixedTransitions: Partial<
  Record<
    FundingCallLifecycleCommand,
    Partial<Record<FundingCallStatus, FundingCallStatus>>
  >
> = {
  APPROVE: { APPROVAL_PENDING: "APPROVED" },
  ARCHIVE: { CLOSED: "ARCHIVED", WITHDRAWN: "ARCHIVED" },
  CLOSE: {
    LIVE: "CLOSED",
    SCHEDULED: "CLOSED",
    SUSPENDED: "CLOSED",
  },
  OPEN: { SCHEDULED: "LIVE" },
  RETURN_FOR_AMENDMENT: { APPROVAL_PENDING: "DRAFT" },
  SUBMIT_FOR_APPROVAL: { DRAFT: "APPROVAL_PENDING" },
  WITHDRAW_APPROVAL_REQUEST: { APPROVAL_PENDING: "DRAFT" },
  SUSPEND: { LIVE: "SUSPENDED", SCHEDULED: "SUSPENDED" },
  WITHDRAW: {
    APPROVED: "WITHDRAWN",
    LIVE: "WITHDRAWN",
    SCHEDULED: "WITHDRAWN",
    SUSPENDED: "WITHDRAWN",
  },
};

function publishTarget(source: LifecycleSource, now: Date) {
  if (source.status !== "DRAFT" || now >= source.closesAt) return null;
  return now < source.opensAt ? "SCHEDULED" : "LIVE";
}

function resumeTarget(source: LifecycleSource, now: Date) {
  if (source.status !== "SUSPENDED" || !source.suspendedFromStatus) return null;
  if (now >= source.closesAt) return "CLOSED";
  return now < source.opensAt ? "SCHEDULED" : "LIVE";
}

function validateTimeBoundary(
  command: FundingCallLifecycleCommand,
  source: LifecycleSource,
  now: Date,
) {
  if (command === "OPEN") {
    return now >= source.opensAt && now < source.closesAt;
  }
  if (command === "CLOSE") return now >= source.closesAt;
  if (command === "SUSPEND") return now < source.closesAt;
  return true;
}

export function resolveFundingCallTransition(
  source: LifecycleSource,
  command: FundingCallLifecycleCommand,
  now: Date,
): FundingCallTransition {
  let targetStatus: FundingCallStatus | null = null;
  if (command === "PUBLISH") targetStatus = publishTarget(source, now);
  else if (command === "RESUME") targetStatus = resumeTarget(source, now);
  else targetStatus = fixedTransitions[command]?.[source.status] ?? null;

  if (!targetStatus || !validateTimeBoundary(command, source, now)) {
    throw new FundingCallTransitionDeniedError(command, source.status);
  }

  return {
    sourceStatus: source.status,
    suspendedFromStatus: command === "SUSPEND"
      ? source.status as FundingCallPublishedStatus
      : targetStatus === "SUSPENDED"
        ? source.suspendedFromStatus
        : null,
    targetStatus,
  };
}

export function isFundingCallEffectivelyOpen(
  source: Pick<FundingCallLifecycleSource, "closesAt" | "opensAt" | "status">,
  now: Date,
) {
  return (
    (source.status === "SCHEDULED" || source.status === "LIVE")
    && source.opensAt <= now
    && now < source.closesAt
  );
}

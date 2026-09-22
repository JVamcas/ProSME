import { describe, expect, it } from "vitest";

import { fundingCallStatuses } from "@/modules/funding-calls/domain/FundingCall";
import {
  fundingCallLifecycleCommands,
  FundingCallTransitionDeniedError,
  isFundingCallEffectivelyOpen,
  resolveFundingCallTransition,
} from "@/modules/funding-calls/domain/FundingCallLifecycle";

const opensAt = new Date("2026-10-01T08:00:00.000Z");
const closesAt = new Date("2026-10-31T16:00:00.000Z");
const insideWindow = new Date("2026-10-15T12:00:00.000Z");

function source(
  status: (typeof fundingCallStatuses)[number],
  suspendedFromStatus: "SCHEDULED" | "LIVE" | null = null,
) {
  return { closesAt, opensAt, status, suspendedFromStatus };
}

describe("funding call lifecycle", () => {
  it.each([
    ["DRAFT", "SUBMIT_FOR_APPROVAL", "APPROVAL_PENDING"],
    ["APPROVAL_PENDING", "RETURN_FOR_AMENDMENT", "DRAFT"],
    ["APPROVAL_PENDING", "WITHDRAW_APPROVAL_REQUEST", "DRAFT"],
    ["APPROVAL_PENDING", "APPROVE", "APPROVED"],
    ["APPROVED", "PUBLISH", "LIVE"],
    ["APPROVED", "WITHDRAW", "WITHDRAWN"],
    ["SCHEDULED", "OPEN", "LIVE"],
    ["SCHEDULED", "SUSPEND", "SUSPENDED"],
    ["SCHEDULED", "WITHDRAW", "WITHDRAWN"],
    ["LIVE", "SUSPEND", "SUSPENDED"],
    ["LIVE", "WITHDRAW", "WITHDRAWN"],
    ["SUSPENDED", "RESUME", "LIVE"],
    ["SUSPENDED", "WITHDRAW", "WITHDRAWN"],
    ["CLOSED", "ARCHIVE", "ARCHIVED"],
    ["WITHDRAWN", "ARCHIVE", "ARCHIVED"],
  ] as const)("permits %s -> %s -> %s", (status, command, target) => {
    const prior = status === "SUSPENDED" ? "LIVE" : null;
    expect(
      resolveFundingCallTransition(
        source(status, prior),
        command,
        insideWindow,
      ).targetStatus,
    ).toBe(target);
  });

  it("denies every unlisted transition", () => {
    const allowed = new Set([
      "DRAFT:SUBMIT_FOR_APPROVAL",
      "APPROVAL_PENDING:RETURN_FOR_AMENDMENT",
      "APPROVAL_PENDING:WITHDRAW_APPROVAL_REQUEST",
      "APPROVAL_PENDING:APPROVE",
      "APPROVED:PUBLISH",
      "APPROVED:WITHDRAW",
      "SCHEDULED:OPEN",
      "SCHEDULED:SUSPEND",
      "SCHEDULED:WITHDRAW",
      "LIVE:SUSPEND",
      "LIVE:WITHDRAW",
      "SUSPENDED:RESUME",
      "SUSPENDED:WITHDRAW",
      "CLOSED:ARCHIVE",
      "WITHDRAWN:ARCHIVE",
    ]);

    for (const status of fundingCallStatuses) {
      for (const command of fundingCallLifecycleCommands) {
        if (allowed.has(`${status}:${command}`)) continue;
        expect(() => resolveFundingCallTransition(
          source(status, status === "SUSPENDED" ? "LIVE" : null),
          command,
          insideWindow,
        )).toThrow(FundingCallTransitionDeniedError);
      }
    }
  });

  it("publishes to Scheduled before opening and denies expired publication", () => {
    expect(resolveFundingCallTransition(
      source("APPROVED"),
      "PUBLISH",
      new Date("2026-09-30T23:59:59.000Z"),
    ).targetStatus).toBe("SCHEDULED");
    expect(() => resolveFundingCallTransition(
      source("APPROVED"),
      "PUBLISH",
      closesAt,
    )).toThrow(FundingCallTransitionDeniedError);
  });

  it("closes published and suspended calls only at the exclusive boundary", () => {
    for (const status of ["SCHEDULED", "LIVE", "SUSPENDED"] as const) {
      const prior = status === "SUSPENDED" ? "LIVE" : null;
      expect(resolveFundingCallTransition(
        source(status, prior),
        "CLOSE",
        closesAt,
      ).targetStatus).toBe("CLOSED");
      expect(() => resolveFundingCallTransition(
        source(status, prior),
        "CLOSE",
        new Date(closesAt.getTime() - 1),
      )).toThrow(FundingCallTransitionDeniedError);
    }
  });

  it("remembers suspension origin and resumes according to current time", () => {
    expect(resolveFundingCallTransition(
      source("SCHEDULED"),
      "SUSPEND",
      new Date(opensAt.getTime() - 1),
    ).suspendedFromStatus).toBe("SCHEDULED");
    expect(resolveFundingCallTransition(
      source("SUSPENDED", "SCHEDULED"),
      "RESUME",
      new Date(opensAt.getTime() - 1),
    ).targetStatus).toBe("SCHEDULED");
    expect(resolveFundingCallTransition(
      source("SUSPENDED", "SCHEDULED"),
      "RESUME",
      closesAt,
    ).targetStatus).toBe("CLOSED");
  });

  it("uses inclusive opening and exclusive closing for effective availability", () => {
    const scheduled = source("SCHEDULED");
    expect(isFundingCallEffectivelyOpen(
      scheduled,
      new Date(opensAt.getTime() - 1),
    )).toBe(false);
    expect(isFundingCallEffectivelyOpen(scheduled, opensAt)).toBe(true);
    expect(isFundingCallEffectivelyOpen(
      scheduled,
      new Date(closesAt.getTime() - 1),
    )).toBe(true);
    expect(isFundingCallEffectivelyOpen(scheduled, closesAt)).toBe(false);
    expect(isFundingCallEffectivelyOpen(source("SUSPENDED", "LIVE"), insideWindow))
      .toBe(false);
  });
});

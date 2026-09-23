import { describe, expect, it } from "vitest";

import { applicationIsInScope } from "@/modules/applications/domain/ApplicationAccessPolicy";
import type { ApplicationAggregate } from "@/modules/applications/domain/Application";
import {
  InvalidApplicationLifecycleTransitionError,
  transitionApplicationLifecycle,
} from "@/modules/applications/domain/ApplicationLifecycle";

const applicantId = "10000000-0000-4000-8000-000000000001";
const businessId = "20000000-0000-4000-8000-000000000001";
const occurredAt = new Date("2026-09-23T08:00:00.000Z");

function draft(): ApplicationAggregate {
  return {
    businessId,
    createdAt: new Date("2026-09-22T08:00:00.000Z"),
    eligibilityRuleSetVersionId: "30000000-0000-4000-8000-000000000001",
    formVersionId: "40000000-0000-4000-8000-000000000001",
    fundingCallId: "50000000-0000-4000-8000-000000000001",
    id: "60000000-0000-4000-8000-000000000001",
    latestDraftResponseId: "70000000-0000-4000-8000-000000000001",
    ownerApplicantUserId: applicantId,
    reference: null,
    rowVersion: 3,
    status: "draft",
    submissionSnapshotId: null,
    submittedAt: null,
    updatedAt: new Date("2026-09-22T08:00:00.000Z"),
    withdrawnAt: null,
    workflow: null,
  };
}

describe("application lifecycle", () => {
  it("submits with one separate, version-pinned workflow link", () => {
    const application = draft();
    const submitted = transitionApplicationLifecycle(application, {
      occurredAt,
      reference: "SMEF-2026-000001",
      submissionSnapshotId: "80000000-0000-4000-8000-000000000001",
      targetStatus: "submitted",
      workflow: {
        workflowInstanceId: "90000000-0000-4000-8000-000000000001",
        workflowTemplateVersionId: "a0000000-0000-4000-8000-000000000001",
      },
    });

    expect(submitted).toMatchObject({
      rowVersion: 4,
      status: "submitted",
      submittedAt: occurredAt,
      withdrawnAt: null,
    });
    expect(submitted.workflow?.workflowTemplateVersionId).toBe(
      "a0000000-0000-4000-8000-000000000001",
    );
    expect(application).toMatchObject({ rowVersion: 3, status: "draft" });
  });

  it("allows submitted to withdrawn without changing lodged identity", () => {
    const submitted = transitionApplicationLifecycle(draft(), {
      occurredAt,
      reference: "SMEF-2026-000001",
      submissionSnapshotId: null,
      targetStatus: "submitted",
      workflow: {
        workflowInstanceId: "90000000-0000-4000-8000-000000000001",
        workflowTemplateVersionId: "a0000000-0000-4000-8000-000000000001",
      },
    });
    const withdrawnAt = new Date("2026-09-24T08:00:00.000Z");

    const withdrawn = transitionApplicationLifecycle(submitted, {
      occurredAt: withdrawnAt,
      targetStatus: "withdrawn",
    });

    expect(withdrawn).toMatchObject({
      reference: submitted.reference,
      status: "withdrawn",
      submissionSnapshotId: submitted.submissionSnapshotId,
      submittedAt: submitted.submittedAt,
      withdrawnAt,
      workflow: submitted.workflow,
    });
  });

  it("rejects every unconfigured transition without mutating the aggregate", () => {
    const application = draft();

    expect(() => transitionApplicationLifecycle(application, {
      occurredAt,
      targetStatus: "withdrawn",
    })).toThrow(InvalidApplicationLifecycleTransitionError);
    expect(application).toEqual(draft());
  });
});

describe("application resource scope", () => {
  it("requires both applicant ownership and represented-business context", () => {
    const application = draft();

    expect(applicationIsInScope(application, applicantId, {
      kind: "applicant",
      representedBusinessIds: new Set([businessId]),
    })).toBe(true);
    expect(applicationIsInScope(application, applicantId, {
      kind: "applicant",
      representedBusinessIds: new Set(),
    })).toBe(false);
  });

  it("enforces assigned staff scope independently from route ownership", () => {
    const application = draft();

    expect(applicationIsInScope(application, "staff-id", {
      assignedApplicationIds: new Set([application.id]),
      kind: "assigned",
    })).toBe(true);
    expect(applicationIsInScope(application, "staff-id", {
      assignedApplicationIds: new Set(),
      kind: "assigned",
    })).toBe(false);
  });
});

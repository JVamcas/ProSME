import { describe, expect, it } from "vitest";

import { projectApplicantStatus } from "@/modules/applications/domain/ApplicantStatusProjection";

describe("applicant status projection", () => {
  it("selects the configured applicant action across parallel stages", () => {
    const projected = projectApplicantStatus({
      lifecycleStatus: "submitted",
      workflowStatus: "ACTIVE",
      terminalPublicStatus: null,
      hasOpenRfi: false,
      activeStageStatuses: [
        {
          status: "UNDER_REVIEW",
          label: "Under review",
          description: "We are reviewing your application.",
        },
        {
          status: "ACTION_REQUIRED",
          label: "Your response is needed",
          description: "Please respond to the information request.",
        },
      ],
    });
    expect(projected).toEqual({
      actionRequired: true,
      status: "ACTION_REQUIRED",
      label: "Your response is needed",
      description: "Please respond to the information request.",
    });
    expect(JSON.stringify(projected)).not.toContain("reviewer");
  });

  it("does not reveal unreleased terminal outcomes", () => {
    expect(projectApplicantStatus({
      lifecycleStatus: "submitted",
      workflowStatus: "REJECTED",
      terminalPublicStatus: null,
      hasOpenRfi: false,
      activeStageStatuses: [{
        status: "UNDER_REVIEW",
        label: "Under review",
        description: "Review continues.",
      }],
    })).toEqual({
      actionRequired: false,
      status: "CLOSED",
      label: "Closed",
      description: "Processing of this application has ended.",
    });
  });

  it("keeps withdrawal and draft lifecycle status authoritative", () => {
    const source = {
      workflowStatus: "ACTIVE",
      terminalPublicStatus: null,
      hasOpenRfi: false,
      activeStageStatuses: [{
        status: "UNDER_REVIEW" as const,
        label: "Under review",
        description: "Review continues.",
      }],
    };
    expect(projectApplicantStatus({
      ...source,
      lifecycleStatus: "draft",
    }).status).toBe("DRAFT");
    expect(projectApplicantStatus({
      ...source,
      lifecycleStatus: "withdrawn",
    }).status).toBe("WITHDRAWN");
  });

  it("projects an open RFI as action required without changing lifecycle state", () => {
    const projected = projectApplicantStatus({
      lifecycleStatus: "submitted",
      workflowStatus: "ACTIVE",
      terminalPublicStatus: null,
      hasOpenRfi: true,
      activeStageStatuses: [{
        status: "UNDER_REVIEW",
        label: "Under review",
        description: "Review continues.",
      }],
    });

    expect(projected).toEqual({
      actionRequired: true,
      status: "ACTION_REQUIRED",
      label: "Information requested",
      description: "Please respond to the request for information by the deadline.",
    });
  });

  it("does not let an open RFI override authoritative lifecycle states", () => {
    const source = {
      workflowStatus: "ACTIVE",
      terminalPublicStatus: null,
      hasOpenRfi: true,
      activeStageStatuses: [],
    };

    expect(projectApplicantStatus({
      ...source,
      lifecycleStatus: "draft",
    }).status).toBe("DRAFT");
    expect(projectApplicantStatus({
      ...source,
      lifecycleStatus: "withdrawn",
    }).status).toBe("WITHDRAWN");
  });
});

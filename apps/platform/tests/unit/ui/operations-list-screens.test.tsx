import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/applications/ApplicationHooks", () => ({
  useAdminApplications: () => ({
    data: {
      items: [{
        activeStageName: "Completeness screening",
        activeTaskCount: 1,
        applicantName: "Applicant from database",
        applicantStatus: "UNDER_REVIEW",
        applicationId: "1695f976-2acd-44ff-b30b-39c9c5ff6c27",
        assignedRoleName: "Programme Officer",
        assignedUserName: null,
        businessName: "Database Business",
        dueAt: "2026-09-18T08:00:00.000Z",
        fundingCallTitle: "Published opportunity",
        internalStatus: "Completeness screening",
        priority: null,
        reference: "SMEF-2026-000123",
        requestedAmount: 75000,
        rowVersion: 2,
        submittedAt: "2026-09-15T08:00:00.000Z",
      }],
      nextCursor: null,
      total: 1,
    },
    isError: false,
    isPending: false,
  }),
}));

import { ApplicationsTable } from "@/components/admin/applications/ApplicationsTable";
import { ApplicationReview } from "@/components/admin/applications/ApplicationReview";
import { WorkQueueTable } from "@/components/admin/work-queue/WorkQueueTable";
import { CapabilityProvider } from "@/components/layout/capability-context";
import { capabilities } from "@/auth/authorization/capabilities";

const task = {
  applicantName: "Applicant from database",
  applicationId: "1695f976-2acd-44ff-b30b-39c9c5ff6c27",
  assignedRoleId: "2695f976-2acd-44ff-b30b-39c9c5ff6c27",
  assignedRoleName: "Programme Officer",
  assignedUserId: null,
  assignedUserName: null,
  businessName: "Database Business",
  claimedAt: null,
  dueAt: "2026-09-18T08:00:00.000Z",
  priority: null,
  reference: "SMEF-2026-000123",
  rowVersion: 1,
  stageName: "Completeness screening",
  taskDefinitionCode: "COMPLETENESS",
  taskInstanceId: "3695f976-2acd-44ff-b30b-39c9c5ff6c27",
  taskName: "Check completeness",
  taskStatus: "READY",
  taskType: "CHECKLIST",
} as const;

function context(capabilityCodes: string[]) {
  return {
    availableSpaces: ["operations" as const],
    capabilityCodes,
    defaultSpace: "operations" as const,
    displayName: "Operations User",
    email: "operations@example.test",
    roleCodes: ["programme_officer"],
    status: "active" as const,
    userId: "4695f976-2acd-44ff-b30b-39c9c5ff6c27",
  };
}

describe("operations list screens", () => {
  it("renders a database-backed application overview and workflow timeline", () => {
    const markup = renderToStaticMarkup(
      <ApplicationReview
        application={{
          applicantName: "Applicant from database",
          applicationId: "1695f976-2acd-44ff-b30b-39c9c5ff6c27",
          businessName: "Database Business",
          businessType: "Close corporation",
          coFunding: 15000,
          currentStageName: "Completeness screening",
          industry: "Technology",
          location: "Khomas",
          opportunityTitle: "Published opportunity",
          priority: null,
          reference: "SMEF-2026-000123",
          requestedAmount: 75000,
          stages: [
            {
              endedAt: null,
              name: "Completeness screening",
              startedAt: "2026-09-15T08:00:00.000Z",
              status: "ACTIVE",
            },
            {
              endedAt: null,
              name: "Technical assessment",
              startedAt: null,
              status: "NOT_STARTED",
            },
          ],
          submittedAt: "2026-09-15T08:00:00.000Z",
        }}
      />,
    );

    expect(markup).toContain("Application Overview");
    expect(markup).toContain("SMEF-2026-000123");
    expect(markup).toContain("Completeness screening");
    expect(markup).toContain("Technical assessment");
  });

  it("renders the real application projection fields", () => {
    const markup = renderToStaticMarkup(<ApplicationsTable />);
    expect(markup).toContain("SMEF-2026-000123");
    expect(markup).toContain("Database Business");
    expect(markup).toContain("Published opportunity");
    expect(markup).toContain("Application filters");
  });

  it("shows claim only when role assignment and capability allow it", () => {
    const markup = renderToStaticMarkup(
      <CapabilityProvider value={context([capabilities.workflowTaskClaim])}>
        <WorkQueueTable
          claimingId={null}
          emptyMessage="No tasks"
          items={[task]}
          onClaim={vi.fn()}
        />
      </CapabilityProvider>,
    );
    expect(markup).toContain("Check completeness");
    expect(markup).toContain("Programme Officer");
    expect(markup).toContain("Claim");
  });

  it("hides the claim action without server-matching capability", () => {
    const markup = renderToStaticMarkup(
      <CapabilityProvider value={context([])}>
        <WorkQueueTable
          claimingId={null}
          emptyMessage="No tasks"
          items={[task]}
          onClaim={vi.fn()}
        />
      </CapabilityProvider>,
    );
    expect(markup).not.toContain(">Claim<");
  });
});

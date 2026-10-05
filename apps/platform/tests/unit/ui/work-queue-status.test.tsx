import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorkQueueRow } from "@/modules/work-queue/WorkQueueTypes";
import { WorkQueueTable } from "@/modules/work-queue/ui/WorkQueueTable";

const task: WorkQueueRow = {
  applicantName: "Applicant",
  applicationId: "application-1",
  assignedRoleId: null,
  assignedRoleName: null,
  assignedUserId: null,
  assignedUserName: null,
  businessName: null,
  claimedAt: null,
  createdAt: "2026-10-01T08:00:00.000Z",
  dueAt: null,
  fundingCallTitle: "Funding call",
  priority: null,
  reference: "SMEF-2026-000123",
  rowVersion: 1,
  stageName: "Screening",
  taskBlockedReason: null,
  taskDefinitionCode: "SCREENING",
  taskInstanceId: "task-1",
  taskName: "Check completeness",
  taskStatus: "IN_PROGRESS",
  taskType: "CONTRIBUTING",
};

const request = {
  id: "request-1",
  status: "OPEN" as const,
  createdAt: "2026-10-02T08:00:00.000Z",
  deadlineAt: "2026-10-05T08:00:00.000Z",
  respondedAt: null,
};

function renderStatus(overrides: Partial<WorkQueueRow> = {}) {
  const markup = renderToStaticMarkup(
    <WorkQueueTable emptyMessage="No tasks" items={[{ ...task, ...overrides }]} />,
  );
  const cells = [...markup.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)];
  return { markup, status: cells[4]?.[1] ?? "" };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("work queue status context", () => {
  it("shows the lifecycle and applicant waiting state with the request deadline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-03T08:00:00.000Z"));
    const { status } = renderStatus({ informationRequest: request });

    expect(status).toContain("In Progress");
    expect(status).toContain("Information requested");
    expect(status).toContain("Awaiting applicant response");
    expect(status).toContain("Requested ");
    expect(status).toContain("Due ");
    expect(status).toContain("Task SLA paused");
  });

  it("marks an unanswered request overdue at the deadline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(request.deadlineAt));
    const { status } = renderStatus({ informationRequest: request });

    expect(status).toContain("Information requested");
    expect(status).toContain("Applicant response overdue");
    expect(status).toContain("Overdue since ");
    expect(status).toContain("text-red-800");
    expect(status).not.toContain("Task SLA paused");
  });

  it("shows a received response without treating its past deadline as overdue", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T08:00:00.000Z"));
    const { status } = renderStatus({
      informationRequest: {
        ...request,
        status: "RESPONDED",
        respondedAt: "2026-10-04T08:00:00.000Z",
      },
    });

    expect(status).toContain("Information request responded");
    expect(status).toContain("Applicant response received ");
    expect(status).not.toContain("overdue");
    expect(status).not.toContain("Awaiting applicant response");
  });

  it.each([
    ["CLOSED", "Information request closed"],
    ["EXPIRED", "Information request expired"],
  ] as const)("shows the %s request state", (requestStatus, label) => {
    const { status } = renderStatus({
      informationRequest: { ...request, status: requestStatus },
    });

    expect(status).toContain(label);
    expect(status).not.toContain("Awaiting applicant response");
    expect(status).not.toContain("Task SLA paused");
  });

  it.each([
    "On hold. Open the task to review or resume it.",
    "Deferred. Open the task to review its continuation.",
    "Blocked pending escalation resolution.",
    "Meet the required contributing review thresholds before making the stage decision.",
  ])("puts the blocking context in the status cell: %s", (reason) => {
    const { status, markup } = renderStatus({ taskBlockedReason: reason });

    expect(status).toContain("In Progress");
    expect(status).toContain(reason);
    expect(markup).toContain("/admin/tasks/task-1");
  });

  it("keeps information-request tasks accessible while displaying hold context", () => {
    const { status, markup } = renderStatus({
      taskBlockedReason: "On hold. Open the task to review or resume it.",
      informationRequest: request,
    });

    expect(status).toContain("On hold.");
    expect(status).toContain("Information requested");
    expect(markup).toContain("/admin/tasks/task-1");
  });

  it("shows only the lifecycle when there is no request or blocking context", () => {
    const { status } = renderStatus();

    expect(status).toContain("In Progress");
    expect(status).not.toContain("Information request");
    expect(status).not.toContain("On hold");
  });
});

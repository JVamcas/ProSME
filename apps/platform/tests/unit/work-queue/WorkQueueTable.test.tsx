import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkQueueTable } from "@/modules/work-queue/ui/WorkQueueTable";
import type { WorkQueueRow } from "@/modules/work-queue/WorkQueueTypes";

const task: WorkQueueRow = {
  applicantName: "COI declaration required",
  reference: "COI declaration required",
  applicationId: null,
  assignedRoleId: null,
  assignedRoleName: null,
  assignedUserId: "reviewer",
  assignedUserName: "Reviewer",
  businessName: null,
  fundingCallTitle: null,
  claimedAt: null,
  createdAt: "2026-10-05T10:00:00Z",
  dueAt: null,
  priority: null,
  rowVersion: 1,
  stageName: "Assessment",
  taskBlockedReason:
    "Meet the required contributing review thresholds before making the stage decision.",
  taskDefinitionCode: "DECISION",
  taskInstanceId: "assigned-task",
  taskName: "Assessment decision",
  taskStatus: "PENDING",
  taskType: "STAGE_DECISION",
};

describe("assigned task navigation", () => {
  it("opens a COI-gated task even while decision prerequisites are blocked", () => {
    const markup = renderToStaticMarkup(
      <WorkQueueTable items={[task]} emptyMessage="No tasks" />,
    );
    expect(markup).toContain('href="/admin/tasks/assigned-task"');
    expect(markup).not.toContain("/admin/applications/null");
    expect(markup).toContain(task.taskBlockedReason);
  });
});

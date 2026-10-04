import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import type { WorkQueueRow } from "@/modules/work-queue/WorkQueueTypes";
import { WorkQueueTable } from "@/modules/work-queue/ui/WorkQueueTable";

vi.mock("@/shared/ui/DataTable", () => ({
  DataTable: ({
    columns,
    data,
  }: {
    columns: {
      accessorKey?: string;
      cell?: (input: { row: { original: WorkQueueRow } }) => ReactNode;
    }[];
    data: WorkQueueRow[];
  }) => (
    <>
      {data.map((item) => (
        <div key={item.taskInstanceId}>
          {columns.find((column) => column.accessorKey === "taskName")!.cell!({
            row: { original: item },
          })}
        </div>
      ))}
    </>
  ),
}));

const task = {
  applicationId: "11111111-1111-4111-8111-111111111111",
  taskInstanceId: "22222222-2222-4222-8222-222222222222",
  taskName: "Review application",
  stageName: "Screening",
  taskBlockedReason: null,
} as unknown as WorkQueueRow;

it.each([false, true])(
  "links to application Workflow Progress with task context; information request: %s",
  (informationRequest) => {
    const row = informationRequest
      ? ({
          ...task,
          taskBlockedReason: "On hold",
          informationRequest: {
            id: "request",
            status: "OPEN",
            createdAt: "2026-10-01T00:00:00.000Z",
            deadlineAt: "2026-10-05T00:00:00.000Z",
            respondedAt: null,
          },
        } as WorkQueueRow)
      : task;
    const markup = renderToStaticMarkup(
      <WorkQueueTable items={[row]} emptyMessage="No work" />,
    );
    expect(markup).toContain(
      `/admin/applications/${task.applicationId}?tab=workflow-progress&amp;taskId=${task.taskInstanceId}`,
    );
    expect(markup).toContain("Review application");
  },
);

it("preserves the disabled task name when blocked without an information request", () => {
  const markup = renderToStaticMarkup(
    <WorkQueueTable
      items={[{ ...task, taskBlockedReason: "Waiting for contributing tasks" }]}
      emptyMessage="No work"
    />,
  );
  expect(markup).not.toContain("href=");
  expect(markup).toContain('aria-disabled="true"');
});

// @vitest-environment happy-dom

import { QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

vi.mock("@/modules/applications/ClientApplicationService", () => ({
  clientApplicationService: {
    submitApplication: vi.fn(),
    withdrawApplication: vi.fn(),
  },
}));
vi.mock("@/modules/work-queue/ClientWorkQueueService", () => ({
  clientWorkQueueService: { executeAction: vi.fn() },
}));
vi.mock("@/modules/workflows/ClientWorkflowRfiService", () => ({
  clientWorkflowRfiService: { respond: vi.fn() },
}));

import {
  useSubmitApplication,
  useWithdrawApplication,
} from "@/modules/applications/ui/useApplications";
import { useExecuteWorkflowTaskAction } from "@/modules/work-queue/ui/useWorkQueue";
import { useRespondToWorkflowRfi } from "@/modules/workflows/ui/rfi/useWorkflowRfi";
import { createQueryClient } from "@/shared/utils/createQueryClient";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it.each(["submit", "withdraw", "workflow", "rfi"])(
  "invalidates detail, sections, lists and dashboard caches after %s",
  async (operation) => {
    const client = createQueryClient();
    const keys = [
      ["portal", "applications", "app", "read-view"],
      ["portal", "applications", "app", "requests"],
      ["portal", "applications", "list", {}],
      ["admin", "applications", "detail", "app"],
      ["admin", "applications", "detail", "app", "requests"],
      ["admin", "applications", {}],
      ["admin", "work-queue", "workflow-progress", "app", "task"],
      ["dashboard", "staff", "30"],
      ["dashboard", "applicant"],
    ];
    keys.forEach((key) => client.setQueryData(key, { loaded: true }));
    client.setQueryData(["unrelated", "settings"], { loaded: true });
    function Mutation() {
      const submit = useSubmitApplication("app", "funding-call");
      const withdraw = useWithdrawApplication();
      const workflow = useExecuteWorkflowTaskAction("task");
      const rfi = useRespondToWorkflowRfi("app", "request");
      return (
        <button
          onClick={() => {
            const commands = {
              submit: () => submit.mutate({} as never),
              withdraw: () =>
                withdraw.mutate({
                  id: "app",
                  idempotencyKey: "key",
                  input: {} as never,
                }),
              workflow: () =>
                workflow.mutate({
                  actionKey: "complete",
                  workflowInstanceId: "instance",
                  input: {} as never,
                }),
              rfi: () => rfi.mutate({} as never),
            };
            commands[operation as keyof typeof commands]();
          }}
        >
          Mutate
        </button>
      );
    }
    const container = document.createElement("div");
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Mutation />
        </QueryClientProvider>,
      ),
    );
    await act(async () => {
      container.querySelector("button")!.click();
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    for (const key of keys)
      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
    expect(client.getQueryState(["unrelated", "settings"])?.isInvalidated).toBe(
      false,
    );
    await act(async () => root.unmount());
    client.clear();
  },
);

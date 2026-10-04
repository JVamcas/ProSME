// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEligibilityTerminationConfirmation } from "@/modules/eligibility/ui/screening/useEligibilityTerminationConfirmation";

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), completed: vi.fn() }));
vi.mock("@/modules/work-queue/ui/useWorkQueue", () => ({
  useEvaluateAuthoritativeEligibility: () => ({
    error: null,
    isPending: false,
    mutateAsync: mocks.mutate,
  }),
}));

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

const input = { expectedRowVersion: 2, values: { registered: false } };
const result = { terminalStatus: "INELIGIBLE", hardFailureCount: 1 };
let root: Root;

function Harness({ taskId = "task-id" }: { taskId?: string }) {
  const evaluation = useEligibilityTerminationConfirmation(taskId);
  return (
    <>
      <button
        disabled={evaluation.isPending}
        onClick={() => {
          void evaluation.mutateAsync(input).then(mocks.completed);
        }}
      >
        Run eligibility
      </button>
      {evaluation.confirmationDialog}
    </>
  );
}

async function click(label: string) {
  const button = Array.from(document.querySelectorAll("button")).find(
    (element) => element.textContent === label,
  );
  expect(button).toBeDefined();
  await act(async () => button?.click());
}

beforeEach(async () => {
  vi.useFakeTimers();
  input.values.registered = false;
  mocks.mutate.mockReset();
  mocks.completed.mockReset();
  mocks.mutate.mockResolvedValueOnce({ confirmationRequired: true });
  mocks.mutate.mockResolvedValue(result);
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<Harness />));
  await click("Run eligibility");
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe("eligibility termination confirmation", () => {
  it("counts down for 30 seconds and then confirms exactly once", async () => {
    expect(document.body.textContent).toContain("terminated in 30 seconds");
    await act(async () => vi.advanceTimersByTime(1000));
    expect(document.body.textContent).toContain("terminated in 29 seconds");
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTime(29_000));
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
    expect(mocks.mutate).toHaveBeenLastCalledWith({
      ...input,
      confirmHardFailure: true,
    });
    expect(mocks.completed).toHaveBeenCalledWith(result);
    await act(async () => vi.advanceTimersByTime(60_000));
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
  });

  it("Continue confirms immediately and clears the timer", async () => {
    await click("Continue");
    expect(mocks.mutate).toHaveBeenLastCalledWith({
      ...input,
      confirmHardFailure: true,
    });
    expect(mocks.completed).toHaveBeenCalledWith(result);
    await act(async () => vi.advanceTimersByTime(30_000));
    expect(mocks.mutate).toHaveBeenCalledTimes(2);
  });

  it("Cancel stops termination and lets the reviewer run corrected answers", async () => {
    await click("Cancel");
    expect(mocks.completed).toHaveBeenCalledWith(null);
    await act(async () => vi.advanceTimersByTime(30_000));
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    input.values.registered = true;
    mocks.mutate.mockResolvedValueOnce({ hardFailureCount: 0 });
    await click("Run eligibility");
    expect(mocks.mutate).toHaveBeenLastCalledWith(input);
    expect(mocks.completed).toHaveBeenLastCalledWith({ hardFailureCount: 0 });
    input.values.registered = false;
  });

  it("confirms the answer snapshot that produced the warning", async () => {
    input.values.registered = true;
    await click("Continue");
    expect(mocks.mutate).toHaveBeenLastCalledWith({
      expectedRowVersion: 2,
      values: { registered: false },
      confirmHardFailure: true,
    });
  });

  it("changing tasks closes the previous warning and cancels its countdown", async () => {
    await act(async () => root.render(<Harness taskId="another-task" />));
    expect(document.body.textContent).not.toContain(
      "Confirm application termination",
    );
    await act(async () => vi.advanceTimersByTime(30_000));
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.completed).toHaveBeenCalledWith(null);
  });

  it("unmounting the task cancels its pending countdown", async () => {
    await act(async () => root.render(<div>Another task</div>));
    await act(async () => vi.advanceTimersByTime(30_000));
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.completed).toHaveBeenCalledWith(null);
  });
});

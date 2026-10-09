// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportScheduleForm } from "@/modules/reporting/ui/reports/ReportScheduleForm";

const state = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/modules/reporting/ui/reports/useReportAutomation", () => ({
  useSaveReportSchedule: () => ({ mutateAsync: state.save, isPending: false }),
}));
vi.mock("@/shared/ui/Toast", () => ({ toast: { error: vi.fn() } }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("report schedule anchor and frequency form", () => {
  it.each([14, 30, 7])(
    "saves an arbitrary anchor and frequency of %i days through existing fields",
    async (frequencyDays) => {
      vi.setSystemTime(new Date("2026-10-09T12:00:00Z"));
      state.save.mockResolvedValue({ id: "saved" });
      const onSaved = vi.fn();
      const container = document.createElement("div");
      document.body.append(container);
      root = createRoot(container);
      await act(async () =>
        root?.render(
          <ReportScheduleForm
            reportId="report"
            timezone="Africa/Windhoek"
            onSaved={onSaved}
          />,
        ),
      );
      const labels = [...container.querySelectorAll("label")].map((label) =>
        label.textContent?.trim(),
      );
      expect(labels[0]).toContain("Anchor date");
      expect(labels[1]).toContain("Frequency (days)");
      expect(container.textContent).not.toContain("Period rule");
      expect(container.textContent).not.toContain("Finalization delay");

      const dateInput = container.querySelector<HTMLInputElement>("#anchor")!;
      await act(async () => dateInput.click());
      const day = document.querySelector<HTMLElement>(
        '[title="2026-10-09"] .ant-picker-cell-inner',
      );
      expect(day).not.toBeNull();
      await act(async () => day!.click());
      const frequency = container.querySelector<HTMLInputElement>(
        '[name="frequencyDays"]',
      )!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(frequency, String(frequencyDays));
        frequency.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () =>
        container
          .querySelector("form")!
          .dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          ),
      );
      expect(state.save).toHaveBeenCalledWith({
        input: {
          anchor: "2026-10-09",
          frequencyDays,
          timezone: "Africa/Windhoek",
          sendTime: "09:00",
          enabled: false,
        },
        scheduleId: undefined,
      });
      expect(onSaved).toHaveBeenCalledOnce();
    },
  );
});

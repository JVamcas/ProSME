// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicationFinancialForm } from "@/components/applicant/applications/ApplicationFinancialForm";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.replaceChildren();
});

describe("application financial form", () => {
  it("continues when the financial information is valid", async () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ApplicationFinancialForm
          error={false}
          initial={{
            amountRequested: 4_000,
            applicantContribution: 1_000,
            budgetBreakdown: [
              {
                amount: 5_000,
                category: "Equipment",
                description: "Project equipment",
              },
            ],
            totalProjectCost: 5_000,
          }}
          onContinue={onContinue}
          onSave={() => Promise.resolve()}
          pending={false}
        />,
      );
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
      await Promise.resolve();
    });

    expect(onContinue).toHaveBeenCalledOnce();
    await act(async () => root.unmount());
  });

  it("explains why an invalid budget cannot continue", async () => {
    const onContinue = vi.fn().mockResolvedValue(undefined);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ApplicationFinancialForm
          error={false}
          initial={{
            amountRequested: 454,
            applicantContribution: 6_999,
            budgetBreakdown: [
              {
                amount: 55_555_555,
                category: "Equipment",
                description: "Project equipment",
              },
            ],
            totalProjectCost: 4_555,
          }}
          onContinue={onContinue}
          onSave={() => Promise.resolve()}
          pending={false}
        />,
      );
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[type="submit"]')?.click();
      await Promise.resolve();
    });

    expect(onContinue).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      "Budget items cannot exceed total project cost",
    );
    expect(
      container.querySelector("fieldset")?.getAttribute("aria-describedby"),
    ).toBe("budget-breakdown-error");
    await act(async () => root.unmount());
  });
});

// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock(
  "@/components/applicant/applications/ApplicationSectionForm",
  () => ({
    ApplicationSectionForm: ({ section, save }: {
      section: string;
      save: (input: unknown) => Promise<unknown>;
    }) => (
      <div>
        <output data-testid="active-section">{section}</output>
        <button
          onClick={() => {
            void save({
              data: {},
              expectedRowVersion: 1,
              intent: "continue",
              section,
            });
          }}
          type="button"
        >
          Continue fixture
        </button>
      </div>
    ),
  }),
);
vi.mock("@/components/applicant/applications/ApplicationFeedback", () => ({
  ApplicationFeedback: () => null,
}));
vi.mock("@/components/applicant/applications/ApplicationReview", () => ({
  ApplicationReview: () => <output data-testid="review">review</output>,
}));
vi.mock("@/components/applicant/profile/ProfilePageHeader", () => ({
  ProfilePageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

import { ApplicationWorkspace } from "@/components/applicant/applications/ApplicationWorkspace";
import type { ApplicationView } from "@/modules/applications/ApplicationTypes";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

const application: ApplicationView = {
  businessName: null,
  businessSection: {},
  createdAt: "2026-09-14T08:00:00.000Z",
  currentSection: "business",
  declarationsSection: {},
  financialSection: {},
  fundingOpportunityId: 42,
  fundingOpportunityTitle: "Growth Fund",
  id: "99e20de0-3558-4d63-90a4-8c9f5125df07",
  progressPercent: 0,
  projectSection: {},
  rowVersion: 1,
  sectionCompletion: {
    business: false,
    declarations: false,
    documents: false,
    financial: false,
    project: false,
  },
  status: "draft",
  updatedAt: "2026-09-14T08:00:00.000Z",
};

afterEach(() => {
  document.body.replaceChildren();
});

describe("application workspace navigation", () => {
  it("shows the next section returned by a successful continue save", async () => {
    const save = vi.fn().mockResolvedValue({
      ...application,
      currentSection: "project",
    });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ApplicationWorkspace
          application={application}
          onReload={() => undefined}
          pending={false}
          save={save}
        />,
      );
    });

    expect(container.querySelector("output")?.textContent).toBe("business");
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label^="Project details"]',
      )?.disabled,
    ).toBe(true);
    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        "button:not([aria-label])",
      )?.click();
      await Promise.resolve();
    });

    expect(save).toHaveBeenCalledOnce();
    expect(container.querySelector("output")?.textContent).toBe("project");
    await act(async () => root.unmount());
  });

  it("opens review after the declarations are completed", async () => {
    const declarationsApplication: ApplicationView = {
      ...application,
      currentSection: "declarations",
      sectionCompletion: {
        business: true,
        declarations: false,
        documents: true,
        financial: true,
        project: true,
      },
    };
    const save = vi.fn().mockResolvedValue({
      ...declarationsApplication,
      sectionCompletion: {
        ...declarationsApplication.sectionCompletion,
        declarations: true,
      },
    });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ApplicationWorkspace
          application={declarationsApplication}
          onReload={() => undefined}
          pending={false}
          save={save}
        />,
      );
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        "button:not([aria-label])",
      )?.click();
      await Promise.resolve();
    });

    expect(container.querySelector('[data-testid="review"]')).not.toBeNull();
    await act(async () => root.unmount());
  });
});

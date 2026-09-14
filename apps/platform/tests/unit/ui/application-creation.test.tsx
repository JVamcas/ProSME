import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const useBusinesses = vi.hoisted(() => vi.fn());
vi.mock("@/modules/businesses/BusinessHooks", () => ({ useBusinesses }));

import {
  applicationSteps,
  completedApplicationStepIds,
} from "@/components/applicant/applications/ApplicationStepConfig";
import { ApplicationBusinessForm } from "@/components/applicant/applications/ApplicationBusinessForm";
import { ApplicationProjectForm } from "@/components/applicant/applications/ApplicationProjectForm";
import { ApplicationsTable } from "@/components/applicant/applications/ApplicationTable";
import { StepProgress } from "@/components/ui/step-progress";

describe("application creation UI", () => {
  it("shows the three P3.2 sections and later disabled steps", () => {
    const markup = renderToStaticMarkup(
      <StepProgress
        ariaLabel="Application sections"
        completedStepIds={completedApplicationStepIds({
          business: true,
          financial: false,
          project: false,
        })}
        currentStepId="project"
        onStepChange={() => undefined}
        steps={applicationSteps}
      />,
    );
    expect(markup).toContain("Business");
    expect(markup).toContain("Project details");
    expect(markup).toContain("Financial information");
    expect(markup).toContain("Documents");
    expect(markup).toContain("Declarations");
    expect(markup).toContain("Review");
    expect(markup).toContain('aria-current="step"');
  });

  it("selects an existing business instead of duplicating its details", () => {
    useBusinesses.mockReturnValue({
      data: [
        {
          id: "89e20de0-3558-4d63-90a4-8c9f5125df07",
          legalName: "Anna Trading CC",
          registrationNumber: "CC/2020/1",
        },
      ],
      isError: false,
      isPending: false,
    });
    const markup = renderToStaticMarkup(
      <ApplicationBusinessForm
        error={false}
        initial={{}}
        onContinue={() => Promise.resolve()}
        onSave={() => Promise.resolve()}
        pending={false}
      />,
    );

    expect(markup).toContain("Select a business");
    expect(markup).toContain("Anna Trading CC · CC/2020/1");
    expect(markup).not.toContain("Industry sector");
  });

  it("directs applicants without a business to My Businesses", () => {
    useBusinesses.mockReturnValue({
      data: [],
      isError: false,
      isPending: false,
    });
    const markup = renderToStaticMarkup(
      <ApplicationBusinessForm
        error={false}
        initial={{}}
        onContinue={() => Promise.resolve()}
        onSave={() => Promise.resolve()}
        pending={false}
      />,
    );

    expect(markup).toContain("Add a business first");
    expect(markup).toContain('href="/portal/businesses"');
    expect(markup).toContain("Go to My Businesses");
  });

  it("renders project validation fields and draft actions", () => {
    const markup = renderToStaticMarkup(
      <ApplicationProjectForm
        initial={{}}
        onContinue={() => Promise.resolve()}
        onSave={() => Promise.resolve()}
        error={false}
        pending={false}
      />,
    );
    expect(markup).toContain("Project title");
    expect(markup).toContain("Project summary");
    expect(markup).toContain("Project start date");
    expect(markup).toContain("Save draft");
    expect(markup).toContain("Save and continue");
  });

  it("renders application records through the shared data table", () => {
    const markup = renderToStaticMarkup(
      <ApplicationsTable
        items={[
          {
            createdAt: "2026-09-01T08:00:00.000Z",
            currentSection: "project",
            fundingOpportunityId: 42,
            fundingOpportunityTitle: "Growth Fund",
            id: "99e20de0-3558-4d63-90a4-8c9f5125df07",
            progressPercent: 33,
            status: "draft",
            updatedAt: "2026-09-14T08:00:00.000Z",
          },
        ]}
        renderAction={() => <a href="#resume">Continue</a>}
      />,
    );

    expect(markup).toContain("Growth Fund");
    expect(markup).toContain("Application completion");
    expect(markup).toContain("aria-sort");
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
const useApplicationBusinesses = vi.hoisted(() => vi.fn());
const useBusiness = vi.hoisted(() => vi.fn());
const useApplicationDocuments = vi.hoisted(() => vi.fn());
vi.mock("@/modules/businesses/BusinessHooks", () => ({
  useBusiness,
  useApplicationBusinesses,
}));
vi.mock("@/modules/applications/ui/useApplicationDocuments", () => ({
  useApplicationDocuments,
}));
vi.mock("@/modules/applications/ApplicationHooks", () => ({
  useDeleteApplicationDraft: () => ({
    error: null,
    isPending: false,
    mutate: vi.fn(),
    reset: vi.fn(),
  }),
}));

import {
  applicationSteps,
  completedApplicationStepIds,
} from "@/components/applicant/applications/ApplicationStepConfig";
import { ApplicationBusinessForm } from "@/components/applicant/applications/ApplicationBusinessForm";
import { ApplicationDeclarationsForm } from "@/components/applicant/applications/ApplicationDeclarationsForm";
import { ApplicationProjectForm } from "@/components/applicant/applications/ApplicationProjectForm";
import { ApplicationReview } from "@/components/applicant/applications/ApplicationReview";
import { ApplicationsTable } from "@/components/applicant/applications/ApplicationTable";
import { ApplicationListContent } from "@/components/applicant/applications/ApplicationListContent";
import { StepProgress } from "@/components/ui/step-progress";
import type { ApplicationView } from "@/modules/applications/ApplicationTypes";

const draftPublicStatus = {
  status: "DRAFT",
  label: "Draft",
  description: "Complete and submit your application.",
  actionRequired: false,
} as const;

const completedApplication: ApplicationView = {
  reference: null,
  submittedAt: null,
  publicStatus: draftPublicStatus,
  businessName: "JM Technologies",
  businessSection: {
    businessId: "89e20de0-3558-4d63-90a4-8c9f5125df07",
  },
  createdAt: "2026-09-14T08:00:00.000Z",
  currentSection: "declarations",
  declarationsSection: {
    compliance: true,
    falseInformation: true,
    informationAccuracy: true,
    privacyConsent: true,
    terms: true,
  },
  financialSection: { amountRequested: 500000 },
  eligibilityRuleSetVersionId: "30000000-0000-4000-8000-000000000001",
  formVersionId: "20000000-0000-4000-8000-000000000001",
  fundingOpportunityId: "00000000-0000-4000-8000-000000000042",
  fundingOpportunityTitle: "Growth Fund",
  id: "99e20de0-3558-4d63-90a4-8c9f5125df07",
  progressPercent: 100,
  projectSection: { projectTitle: "Solar-powered cold storage" },
  rowVersion: 6,
  sectionCompletion: {
    business: true,
    declarations: true,
    documents: true,
    financial: true,
    project: true,
  },
  status: "draft",
  updatedAt: "2026-09-14T08:00:00.000Z",
};

describe("application creation UI", () => {
  useApplicationDocuments.mockReturnValue({
    data: {
      documents: [],
      requirements: [],
    },
    error: null,
    isError: false,
    isPending: false,
  });

  it("shows the three P3.2 sections and later disabled steps", () => {
    const markup = renderToStaticMarkup(
      <StepProgress
        ariaLabel="Application sections"
        completedStepIds={completedApplicationStepIds({
          business: true,
          declarations: false,
          documents: false,
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
    useApplicationBusinesses.mockReturnValue({
      data: [
        {
          alreadyApplied: false,
          id: "89e20de0-3558-4d63-90a4-8c9f5125df07",
          legalName: "Anna Trading CC",
          registrationNumber: "CC/2020/1",
        },
        {
          alreadyApplied: true,
          id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
          legalName: "Applied Business",
          registrationNumber: "CC/2020/2",
        },
      ],
      isError: false,
      isPending: false,
    });
    const markup = renderToStaticMarkup(
      <ApplicationBusinessForm
        applicationId={completedApplication.id}
        error={false}
        fundingOpportunityId={completedApplication.fundingOpportunityId}
        initial={{}}
        onContinue={() => Promise.resolve()}
        onSave={() => Promise.resolve()}
        pending={false}
      />,
    );

    expect(markup).toContain("Select a business");
    expect(markup).toContain("Anna Trading CC · CC/2020/1");
    expect(markup).toContain("Applied Business · CC/2020/2 · Already applied");
    expect(markup).toContain('value="79e20de0-3558-4d63-90a4-8c9f5125df07" disabled');
    expect(markup).toContain(
      '<span aria-hidden="true" class="ml-1 text-brand-orange">*</span>',
    );
    expect(markup).not.toContain("Industry sector");
  });

  it("directs applicants without a business to My Businesses", () => {
    useApplicationBusinesses.mockReturnValue({
      data: [],
      isError: false,
      isPending: false,
    });
    const markup = renderToStaticMarkup(
      <ApplicationBusinessForm
        applicationId={completedApplication.id}
        error={false}
        fundingOpportunityId={completedApplication.fundingOpportunityId}
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
        onBack={() => undefined}
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
    expect(markup).toContain("Back");
  });

  it("renders all versioned declarations and consent actions", () => {
    const markup = renderToStaticMarkup(
      <ApplicationDeclarationsForm
        error={false}
        initial={{}}
        onContinue={() => Promise.resolve()}
        onSave={() => Promise.resolve()}
        pending={false}
      />,
    );
    expect(markup).toContain("all information provided is true and correct");
    expect(markup).toContain("processing of my personal and business information");
    expect(markup).toContain("View terms and conditions");
  });

  it("renders the validated review and submit form", () => {
    useBusiness.mockReturnValue({
      data: { legalName: "JM Technologies (Pty) Ltd" },
    });
    useApplicationDocuments.mockReturnValue({
      data: {
        documents: [{}, {}, {}, {}],
        requirements: [],
      },
    });
    const markup = renderToStaticMarkup(
      <ApplicationReview
        application={completedApplication}
        onBack={() => undefined}
        onEdit={() => undefined}
      />,
    );

    expect(markup).toContain("JM Technologies (Pty) Ltd");
    expect(markup).toContain("Solar-powered cold storage");
    expect(markup).toContain("N$ 500,000 requested");
    expect(markup).toContain("4 documents uploaded");
    expect(markup).toContain("All declarations accepted");
    expect(markup).toContain("Submit application");
    expect(markup).toMatch(
      /disabled=""[^>]*type="submit"|type="submit"[^>]*disabled=""/,
    );
  });

  it("renders application records through the shared data table", () => {
    const markup = renderToStaticMarkup(
      <ApplicationsTable
        items={[
          {
            ...completedApplication,
            businessName: "JM Technologies",
            createdAt: "2026-09-01T08:00:00.000Z",
            currentSection: "project",
            fundingOpportunityId: "00000000-0000-4000-8000-000000000042",
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
    expect(markup).toContain("Business");
    expect(markup).toContain("JM Technologies");
    expect(markup).toMatch(/Last updated[\s\S]*\d{1,2}:\d{2}/);
    expect(markup).toContain("Application completion");
    expect(markup).toContain("aria-sort");
  });

  it("hides the continue action for non-draft applications", () => {
    const markup = renderToStaticMarkup(
      <ApplicationListContent
        canDeleteDraft={false}
        items={[
          {
            ...completedApplication,
            businessName: "JM Technologies",
            createdAt: "2026-09-01T08:00:00.000Z",
            currentSection: "declarations",
            fundingOpportunityId: "00000000-0000-4000-8000-000000000042",
            fundingOpportunityTitle: "Growth Fund",
            id: "99e20de0-3558-4d63-90a4-8c9f5125df07",
            progressPercent: 100,
            status: "submitted",
            updatedAt: "2026-09-14T08:00:00.000Z",
          },
        ]}
      />,
    );

    expect(markup).not.toContain("Continue");
  });
});

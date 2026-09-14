import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { WorkflowStageFlow } from "@/components/admin/workflows/WorkflowStageFlow";
import { WorkflowDefinitionCreateForm } from "@/components/admin/workflows/WorkflowDefinitionCreateForm";
import { WorkflowDefinitionDetailsCard } from "@/components/admin/workflows/WorkflowDefinitionDetailsCard";
import { WorkflowDefinitionsWorkspace } from "@/components/admin/workflows/WorkflowDefinitionsWorkspace";
import { WorkflowDefinitionsTable } from "@/components/admin/workflows/WorkflowDefinitionsTable";
import { referenceWorkflow } from "@/modules/workflows/ReferenceWorkflow";
import { workflowQueryKeys } from "@/modules/workflows/WorkflowHooks";

describe("workflow configuration UI", () => {
  it("previews ordered stages, registered tasks and applicant-safe labels", () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <WorkflowStageFlow
          canEdit
          editor={{
            allowedActions: ["PREVIEW"],
            definition: {
              id: "definition",
              code: "REFERENCE",
              name: "Reference",
              description: "",
            },
            graph: referenceWorkflow,
            validation: { valid: true, errors: [], warnings: [] },
            version: {
              id: "version",
              number: 1,
              status: "DRAFT",
              rowVersion: 1,
              createdAt: "2026-09-14T00:00:00.000Z",
              publishedAt: null,
              retiredAt: null,
            },
          }}
        />
      </QueryClientProvider>,
    );
    expect(markup).toContain("Submission and automated pre-screening");
    expect(markup).toContain("Outcome communication");
    expect(markup).toContain("Build the approval flow");
    expect(markup).toContain("Visual flow");
    expect(markup).toContain("Stage details");
    expect(markup).toContain("Tasks (1)");
    expect(markup).toContain("Add Workflow stage");
    expect(markup).toContain("Assignee");
    expect(markup).toContain("Add task");
    expect(markup).toContain("Edit Automated pre-screening");
    expect(markup).toContain("Delete Automated pre-screening");
    expect(markup).not.toContain("Approver");
    expect(markup).not.toContain("Conditional routes");
    expect(markup).not.toContain("Committee score assigned");
  });

  it("shows the workflow definition metadata in a details card", () => {
    const markup = renderToStaticMarkup(
      <WorkflowDefinitionDetailsCard
        editor={{
          allowedActions: ["PREVIEW"],
          definition: {
            id: "definition",
            code: "REFERENCE",
            name: "Reference",
            description: "Reference funding workflow",
          },
          graph: referenceWorkflow,
          validation: { valid: true, errors: [], warnings: [] },
          version: {
            id: "version",
            number: 4,
            status: "DRAFT",
            rowVersion: 2,
            createdAt: "2026-09-14T00:00:00.000Z",
            publishedAt: null,
            retiredAt: null,
          },
        }}
      />,
    );

    expect(markup).toContain("Workflow definition details");
    expect(markup).toContain("REFERENCE");
    expect(markup).toContain("Reference funding workflow");
    expect(markup).toContain("v4");
    expect(markup).toContain("Revision");
    expect(markup).toContain("Reference funding workflow");
  });

  it("opens workflow creation from a dialog trigger instead of inline fields", () => {
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <WorkflowDefinitionsWorkspace
          canCreate
          canPublish
          canRetire
          canUpdate
        />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Create workflow");
    expect(markup).not.toContain("SME_STANDARD_GRANT");
    expect(markup).not.toContain("<details");
  });

  it("uses the workflow dialog form with existing details in edit mode", () => {
    const client = new QueryClient();
    client.setQueryData(workflowQueryKeys.detail("definition"), {
      allowedActions: ["UPDATE"],
      definition: {
        id: "definition",
        code: "REFERENCE",
        description: "Reference funding workflow",
        name: "Reference",
      },
      graph: referenceWorkflow,
      validation: { valid: true, errors: [], warnings: [] },
      version: {
        id: "version",
        number: 1,
        status: "DRAFT",
        rowVersion: 1,
        createdAt: "2026-09-14T00:00:00.000Z",
        publishedAt: null,
        retiredAt: null,
      },
    });
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <WorkflowDefinitionCreateForm
          workflow={{
            active: true,
            code: "REFERENCE",
            description: "Reference funding workflow",
            id: "definition",
            latestStatus: "DRAFT",
            latestVersion: 1,
            name: "Reference",
            updatedAt: "2026-09-14T00:00:00.000Z",
          }}
        />
      </QueryClientProvider>,
    );
    expect(markup).toContain("Workflow code");
    expect(markup).toContain("Workflow name");
    expect(markup).toContain("Save changes");
    expect(markup).not.toContain("TOR-aligned reference workflow");
  });

  it("shows lifecycle actions only for supported workflow states", () => {
    const baseWorkflow = {
      active: true,
      code: "REFERENCE",
      description: "Reference workflow",
      latestVersion: 1,
      name: "Reference",
      updatedAt: "2026-09-14T00:00:00.000Z",
    };
    const markup = renderToStaticMarkup(
      <WorkflowDefinitionsTable
        assignments={[
          {
            assignedAt: "2026-09-14T08:00:00.000Z",
            fundingOpportunityId: 42,
            fundingOpportunityTitle: "Growth Fund",
            rowVersion: 1,
            versionNumber: 1,
            workflowName: "Reference",
            workflowVersionId: "89e20de0-3558-4d63-90a4-8c9f5125df07",
          },
        ]}
        canCreate
        canPublish
        canRetire
        canUpdate
        emptyMessage="No workflows"
        items={[
          { ...baseWorkflow, id: "draft", latestStatus: "DRAFT" },
          { ...baseWorkflow, id: "published", latestStatus: "PUBLISHED" },
        ]}
        onActivate={() => undefined}
        onAssign={() => undefined}
        onCreate={() => undefined}
        onDeactivate={() => undefined}
        onEdit={() => undefined}
        opportunities={[
          {
            closesAt: "2026-12-31T00:00:00.000Z",
            id: 42,
            opensAt: "2026-09-01T00:00:00.000Z",
            slug: "growth-fund",
            status: "open",
            summary: "Growth funding",
            title: "Growth Fund",
          },
        ]}
        publishedWorkflows={[
          {
            definitionId: "published",
            name: "Reference",
            versionId: "89e20de0-3558-4d63-90a4-8c9f5125df07",
            versionNumber: 1,
          },
        ]}
      />,
    );

    expect(markup).toContain('aria-label="Edit Reference"');
    expect(markup).toContain('aria-label="Activate Reference"');
    expect(markup).toContain('aria-label="Deactivate Reference"');
    expect(markup).toContain('aria-label="Assign funding to Reference"');
    expect(markup).toContain("Assigned funding");
    expect(markup).toContain('href="/funding/growth-fund"');
    expect(markup).toContain("Updated");
  });
});

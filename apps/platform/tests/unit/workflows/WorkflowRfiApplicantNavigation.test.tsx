// @vitest-environment happy-dom

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { workflowRfiDetail } from "../../support/WorkflowRfiViewFixture";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  owned: vi.fn(),
  respond: vi.fn(),
}));
vi.mock("@/platform/auth/ServerAuthNavigation", () => ({
  getAuthenticatedPageUser: mocks.user,
}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService",
  () => ({ getOwnedWorkflowRfi: mocks.owned }),
);
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("redirected");
  },
  notFound: () => {
    throw new Error("not found");
  },
}));
vi.mock("@/modules/workflows/ui/rfi/useWorkflowRfi", () => ({
  useOwnedWorkflowRfi: (_app: string, _id: string, detail: unknown) => ({
    data: detail,
  }),
  useRespondToWorkflowRfi: () => ({
    mutateAsync: mocks.respond,
    isPending: false,
  }),
  useUploadWorkflowRfiDocument: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/modules/forms/ui/renderer/FormRenderer", () => ({
  FormRenderer: (props: {
    formData: Record<string, unknown>;
    onChange: (values: Record<string, unknown>) => void;
    onSubmit: (values: Record<string, unknown>) => void;
    children: ReactNode;
  }) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit(props.formData);
      }}
    >
      <input
        aria-label="Budget clarification"
        value={String(props.formData.BUDGET_CLARIFICATION ?? "")}
        onChange={(event) =>
          props.onChange({ BUDGET_CLARIFICATION: event.target.value })
        }
      />
      {props.children}
    </form>
  ),
}));

import WorkflowRfiPage from "@/app/(portal)/portal/applications/[id]/requests/[requestId]/page";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  StaffApplicationRfiTimeline,
  WorkflowRfiSummaryList,
} from "@/modules/workflows/ui/rfi/WorkflowRfiPresentation";
import { ApplicantWorkflowRfiWorkspace } from "@/modules/workflows/ui/rfi/ApplicantWorkflowRfiWorkspace";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const request = workflowRfiDetail();
let root: Root | undefined;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({
    status: "active",
    capabilities: new Set([
      permissionCodes.fundingApplicationAllRead,
      permissionCodes.fundingApplicationInformationRequestOwnRead,
      permissionCodes.fundingApplicationInformationRequestOwnRespond,
    ]),
  });
  mocks.owned.mockResolvedValue(request);
  mocks.respond.mockResolvedValue({ status: "RESPONDED" });
});
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

describe("RFI applicant and reviewer destinations", () => {
  it("sends a staff user who owns the request to the applicant response page", () => {
    const markup = renderToStaticMarkup(
      <StaffApplicationRfiTimeline
        requests={[{ ...request, applicantAccess: "RESPOND" }]}
      />,
    );
    expect(markup).toContain(
      "/portal/applications/" +
        request.applicationId +
        "/requests/" +
        request.id,
    );
    expect(markup).toContain("Respond now");
    expect(markup).not.toContain("/admin/tasks/");
  });

  it("retains the reviewer destination for someone else's application", () => {
    const markup = renderToStaticMarkup(
      <StaffApplicationRfiTimeline
        requests={[{ ...request, applicantAccess: null }]}
      />,
    );
    expect(markup).toContain(
      "/admin/tasks/" + request.taskId + "?requestId=" + request.id,
    );
    expect(markup).not.toContain("Respond now");
  });

  it.each(["READ", "RESPOND"] as const)(
    "keeps closed owner requests viewable with %s access",
    (access) => {
      const markup = renderToStaticMarkup(
        <StaffApplicationRfiTimeline
          requests={[{ ...request, applicantAccess: access, status: "CLOSED" }]}
        />,
      );
      expect(markup).toContain(
        "/portal/applications/" +
          request.applicationId +
          "/requests/" +
          request.id,
      );
      expect(markup).toContain("View request");
      expect(markup).not.toContain("Respond now");
    },
  );

  it("retains the existing applicant-portal response link", () => {
    const markup = renderToStaticMarkup(
      <WorkflowRfiSummaryList
        applicationId={request.applicationId}
        requests={[request]}
      />,
    );
    expect(markup).toContain(
      "/portal/applications/" +
        request.applicationId +
        "/requests/" +
        request.id,
    );
    expect(markup).toContain("Respond now");
  });

  it.each([false, true])(
    "submits the owned request with uploaded evidence=%s",
    async (withEvidence) => {
      const evidenceVersionId = "40000000-0000-4000-8000-000000000004";
      if (withEvidence) {
        mocks.owned.mockResolvedValue(
          workflowRfiDetail({
            requestedDocuments: [
              {
                acceptedFileTypes: ["PDF"],
                maximumSizeMb: 5,
                name: "Budget evidence",
                requirementId: "50000000-0000-4000-8000-000000000005",
                evidence: {
                  fileName: "budget.pdf",
                  sizeBytes: 100,
                  uploadedAt: request.createdAt,
                  versionId: evidenceVersionId,
                  versionNumber: 1,
                },
              },
            ],
          }),
        );
      }
      const page = await WorkflowRfiPage({
        params: Promise.resolve({
          id: request.applicationId,
          requestId: request.id,
        }),
      });
      expect(page.type).toBe(ApplicantWorkflowRfiWorkspace);
      expect(page.props.canRespond).toBe(true);
      expect(mocks.owned).toHaveBeenCalledWith(
        await mocks.user.mock.results[0].value,
        request.applicationId,
        request.id,
      );
      const container = document.createElement("div");
      document.body.append(container);
      root = createRoot(container);
      await act(async () => root?.render(page));
      expect(container.textContent).toContain(request.question);
      if (withEvidence) expect(container.textContent).toContain("budget.pdf");
      const input = container.querySelector<HTMLInputElement>(
        '[aria-label="Budget clarification"]',
      )!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(input, "The budget includes equipment.");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await act(async () =>
        container
          .querySelector("form")!
          .dispatchEvent(
            new Event("submit", { bubbles: true, cancelable: true }),
          ),
      );
      expect(mocks.respond).toHaveBeenCalledWith({
        expectedRowVersion: request.rowVersion,
        evidenceVersionIds: withEvidence ? [evidenceVersionId] : [],
        fieldValues: { BUDGET_CLARIFICATION: "The budget includes equipment." },
      });
    },
  );

  it("does not offer response controls to a read-only applicant", async () => {
    mocks.user.mockResolvedValue({
      status: "active",
      capabilities: new Set([
        permissionCodes.fundingApplicationInformationRequestOwnRead,
      ]),
    });
    const page = await WorkflowRfiPage({
      params: Promise.resolve({
        id: request.applicationId,
        requestId: request.id,
      }),
    });
    expect(page.props.canRespond).toBe(false);
    const markup = renderToStaticMarkup(page);
    expect(markup).toContain("read-only access");
    expect(markup).not.toContain("Submit response");
  });
});

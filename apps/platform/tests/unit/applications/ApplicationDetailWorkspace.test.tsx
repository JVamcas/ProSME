// @vitest-environment happy-dom

import { QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/applications/ClientApplicationService", () => ({
  clientApplicationService: {
    getAdminApplicationDetail: vi.fn(),
    getOwnApplicationReadView: vi.fn(),
  },
}));
vi.mock("@/modules/workflows/ClientWorkflowRfiService", () => ({
  clientWorkflowRfiService: { listContextual: vi.fn(), listOwned: vi.fn() },
}));
vi.mock("@/modules/workflows/ClientWorkflowProgressService", () => ({
  clientWorkflowProgressService: { get: vi.fn() },
}));
vi.mock("@/modules/applications/ui/ApplicationDetailView", () => ({
  ApplicationDetailView: (props: {
    model: { title: string };
    requests: ReactNode;
    workflowProgress: ReactNode;
    actions: ReactNode;
  }) => (
    <section>
      <h1>{props.model.title}</h1>
      {props.actions}
      {props.requests}
      {props.workflowProgress}
    </section>
  ),
}));
vi.mock("@/modules/applications/ui/ApplicantApplicationDetail", () => ({
  ApplicantApplicationDetail: (props: {
    data: { summary: { fundingOpportunityTitle: string } };
    requestsPanel: ReactNode;
  }) => (
    <section>
      <h1>{props.data.summary.fundingOpportunityTitle}</h1>
      {props.requestsPanel}
    </section>
  ),
}));
vi.mock("@/modules/workflows/ui/rfi/WorkflowRfiPresentation", () => ({
  StaffApplicationRfiTimeline: () => <p>Loaded requests</p>,
  WorkflowRfiSummaryList: () => <p>Loaded requests</p>,
}));
vi.mock("@/modules/workflows/ui/WorkflowProgressPanel", () => ({
  WorkflowProgressPanel: () => <p>Loaded progress</p>,
}));

import { clientApplicationService } from "@/modules/applications/ClientApplicationService";
import { StaffApplicationDetailWorkspace } from "@/modules/applications/ui/StaffApplicationDetailWorkspace";
import { ApplicantApplicationDetailWorkspace } from "@/modules/applications/ui/ApplicantApplicationDetailWorkspace";
import { applicationQueryKeys } from "@/modules/applications/ui/ApplicationQueryKeys";
import { staffApplicationDetailQuery } from "@/modules/applications/ui/ApplicationDetailQueries";
import { clientWorkflowRfiService } from "@/modules/workflows/ClientWorkflowRfiService";
import { clientWorkflowProgressService } from "@/modules/workflows/ClientWorkflowProgressService";
import { createQueryClient } from "@/shared/utils/createQueryClient";
import { ClientRequestError } from "@/lib/client-http";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
let client: ReturnType<typeof createQueryClient>;
let container: HTMLDivElement;
let root: Root;
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}
async function render(view: ReactNode) {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>{view}</QueryClientProvider>,
    ),
  );
  await settle();
}
function staff(id = "application-a") {
  return (
    <StaffApplicationDetailWorkspace
      applicationId={id}
      canReadWorkflow
      initialTab="overview"
      taskId="assigned-task"
    />
  );
}
const detail = { title: "Protected application A" } as never;
beforeEach(() => {
  vi.resetAllMocks();
  client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false, staleTime: 30_000 } });
  container = document.createElement("div");
  root = createRoot(container);
  vi.mocked(clientWorkflowRfiService.listContextual).mockResolvedValue([]);
  vi.mocked(clientWorkflowRfiService.listOwned).mockResolvedValue([]);
  vi.mocked(clientWorkflowProgressService.get).mockResolvedValue(null);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
});

describe("application detail query dependencies", () => {
  it("waits for the primary access check, then starts RFI and task-scoped progress independently", async () => {
    const primary = deferred<never>();
    const requests = deferred<never>();
    const progress = deferred<null>();
    vi.mocked(
      clientApplicationService.getAdminApplicationDetail,
    ).mockReturnValue(primary.promise);
    vi.mocked(clientWorkflowRfiService.listContextual).mockReturnValue(
      requests.promise,
    );
    vi.mocked(clientWorkflowProgressService.get).mockReturnValue(
      progress.promise,
    );
    await render(staff());
    expect(container.querySelector("[data-page-loading]")).not.toBeNull();
    expect(container.textContent).not.toContain("Protected application");
    expect(clientWorkflowRfiService.listContextual).not.toHaveBeenCalled();
    expect(clientWorkflowProgressService.get).not.toHaveBeenCalled();
    await act(async () => primary.resolve(detail));
    await settle();
    expect(container.textContent).toContain("Protected application A");
    expect(clientWorkflowRfiService.listContextual).toHaveBeenCalledOnce();
    expect(clientWorkflowProgressService.get).toHaveBeenCalledWith(
      "application-a",
      "assigned-task",
      expect.any(AbortSignal),
    );
    expect(container.querySelectorAll("[data-section-loading]")).toHaveLength(
      2,
    );
    await act(async () =>
      requests.reject(new ClientRequestError("RFI unavailable", 503)),
    );
    await settle();
    expect(container.textContent).toContain(
      "Unable to load information requests",
    );
    expect(container.textContent).toContain("Protected application A");
    vi.mocked(clientWorkflowRfiService.listContextual).mockResolvedValue([]);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[role="alert"] button')!
        .click(),
    );
    await settle();
    expect(container.textContent).toContain("Loaded requests");
    await act(async () => progress.resolve(null));
    await settle();
    expect(container.textContent).toContain("Loaded progress");
    expect(
      clientApplicationService.getAdminApplicationDetail,
    ).toHaveBeenCalledOnce();
  });

  it.each([401, 403, 404])(
    "erases primary and related cached record data after a %s denial",
    async (status) => {
      vi.mocked(
        clientApplicationService.getAdminApplicationDetail,
      ).mockResolvedValue(detail);
      await render(staff());
      const key = applicationQueryKeys.adminDetail("application-a");
      expect(container.textContent).toContain("Protected application A");
      vi.mocked(
        clientApplicationService.getAdminApplicationDetail,
      ).mockRejectedValue(new ClientRequestError("Access lost", status));
      await act(async () => {
        await client.refetchQueries({ queryKey: key, exact: true });
      });
      await settle();
      expect(container.textContent).not.toContain("Protected application A");
      expect(container.textContent).not.toContain("Loaded requests");
      expect(client.getQueryData(key)).toBeUndefined();
      expect(client.getQueryData([...key, "requests"])).toBeUndefined();
      expect(
        client.getQueryData([
          "admin",
          "work-queue",
          "workflow-progress",
          "application-a",
          "assigned-task",
        ]),
      ).toBeUndefined();
    },
  );

  it("never shows the previous application's cached payload when changing record ids", async () => {
    vi.mocked(
      clientApplicationService.getAdminApplicationDetail,
    ).mockResolvedValueOnce(detail);
    await render(staff());
    vi.mocked(
      clientApplicationService.getAdminApplicationDetail,
    ).mockReturnValue(deferred<never>().promise);
    await render(staff("application-b"));
    expect(container.textContent).not.toContain("Protected application A");
    expect(container.querySelector("[data-page-loading]")).not.toBeNull();
  });

  it("reuses an in-flight selected-link request without a second audited primary read", async () => {
    const primary = deferred<never>();
    vi.mocked(
      clientApplicationService.getAdminApplicationDetail,
    ).mockReturnValue(primary.promise);
    const preload = client.prefetchQuery(
      staffApplicationDetailQuery("application-a"),
    );
    await render(staff());
    await act(async () => primary.resolve(detail));
    await preload;
    await settle();
    expect(
      clientApplicationService.getAdminApplicationDetail,
    ).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("Protected application A");
  });

  it("does not mount applicant information requests without the confirmed grant", async () => {
    vi.mocked(
      clientApplicationService.getOwnApplicationReadView,
    ).mockResolvedValue({
      summary: { fundingOpportunityTitle: "Owned application" },
    } as never);
    await render(
      <ApplicantApplicationDetailWorkspace
        applicationId="application-a"
        canDeleteDraft={false}
        canWithdraw={false}
        canReadInformationRequests={false}
      />,
    );
    expect(container.textContent).toContain("Owned application");
    expect(clientWorkflowRfiService.listOwned).not.toHaveBeenCalled();
    expect(clientWorkflowProgressService.get).not.toHaveBeenCalled();
  });
});

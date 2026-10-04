// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { publicCall } from "../funding-calls/PublicFundingCallFixture";

const mocks = vi.hoisted(() => ({
  businesses: vi.fn(),
  create: vi.fn(),
  detail: vi.fn(),
  list: vi.fn(),
  mutateAsync: vi.fn(),
  push: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/modules/businesses/BusinessHooks", () => ({
  useBusinesses: mocks.businesses,
}));
vi.mock("@/modules/businesses/ui/BusinessDialog", () => ({
  BusinessDialog: () => null,
}));
vi.mock("@/modules/funding-calls/FundingOpportunityHooks", () => ({
  useFundingOpportunity: mocks.detail,
}));
vi.mock("@/modules/applications/ui/useApplications", () => ({
  useCreateApplication: mocks.create,
}));
vi.mock("@/modules/applications/ui/useApplicationOpportunityChooser", () => ({
  opportunityChooserPageSize: 10,
  useApplicationOpportunityChooser: mocks.list,
}));

import { NewApplicationChooser } from "@/modules/applications/ui/NewApplicationChooser";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const businessId = "00000000-0000-4000-8000-000000000011";
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.businesses.mockReturnValue({
    data: [{ id: businessId, legalName: "Example business", tradingName: "" }],
    isError: false,
    isPending: false,
  });
  mocks.detail.mockReturnValue({
    data: publicCall(),
    isError: false,
    isPending: false,
    refetch: mocks.refetch,
  });
  mocks.create.mockReturnValue({
    isError: false,
    isPending: false,
    mutateAsync: mocks.mutateAsync,
  });
  mocks.mutateAsync.mockResolvedValue({ id: "existing-or-new-draft" });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
});

async function renderSelected() {
  await act(async () => root.render(
    <NewApplicationChooser fundingOpportunityId={publicCall().id} />,
  ));
}

async function selectBusiness() {
  const select = container.querySelector<HTMLSelectElement>('select[name="businessId"]');
  expect(select).not.toBeNull();
  await act(async () => {
    select!.value = businessId;
    select!.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function submit() {
  await act(async () => {
    container.querySelector("form")!.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  });
}

describe("starting an application for a selected funding call", () => {
  it("shows the selected call and starts or resumes the draft for the chosen business", async () => {
    await renderSelected();
    expect(mocks.detail).toHaveBeenCalledWith(publicCall().id);
    expect(mocks.list).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Growth Fund");
    expect(container.textContent).not.toContain("Search opportunities");
    expect(container.querySelectorAll("select")).toHaveLength(1);
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled)
      .toBe(true);

    await selectBusiness();
    expect(container.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled)
      .toBe(false);
    await submit();

    expect(mocks.mutateAsync).toHaveBeenCalledExactlyOnceWith({
      businessId,
      fundingCallIdOrSlug: publicCall().id,
    });
    expect(mocks.push).toHaveBeenCalledWith(
      "/portal/applications/existing-or-new-draft/edit",
    );
  });

  it("validates the business before creating an application", async () => {
    await renderSelected();
    await submit();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Select a business to represent.");
  });

  it("does not fall back to other calls when the selected call is unavailable", async () => {
    mocks.detail.mockReturnValue({
      isError: true,
      isPending: false,
      error: new Error("Funding call not found."),
      refetch: mocks.refetch,
    });
    await renderSelected();
    expect(container.textContent).toContain("Funding call not found.");
    expect(mocks.list).not.toHaveBeenCalled();
    expect(container.querySelector("form")).toBeNull();
    await act(async () => container.querySelector("button")!.click());
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("blocks starting applications for calls that are no longer open", async () => {
    mocks.detail.mockReturnValue({
      data: publicCall({ applicationsOpen: false, status: "closed" }),
      isError: false,
      isPending: false,
    });
    await renderSelected();
    expect(container.textContent).toContain("not currently accepting applications");
    expect(container.querySelector("form")).toBeNull();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("retains the selected call when the applicant needs to add a business", async () => {
    mocks.businesses.mockReturnValue({ data: [], isError: false, isPending: false });
    await renderSelected();
    expect(container.textContent).toContain("Growth Fund");
    expect(container.textContent).toContain("Add a business");
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("shows creation errors and stays on the selected call", async () => {
    mocks.mutateAsync.mockRejectedValue(new Error("Business is unavailable."));
    mocks.create.mockReturnValue({
      isError: true,
      isPending: false,
      error: new Error("Business is unavailable."),
      mutateAsync: mocks.mutateAsync,
    });
    await renderSelected();
    await selectBusiness();
    await submit();
    expect(container.querySelector('[role="alert"]')?.textContent)
      .toContain("Business is unavailable.");
    expect(mocks.push).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Growth Fund");
  });
});

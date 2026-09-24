// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const business = {
  businessType: "Close corporation",
  createdAt: "2026-09-13T00:00:00.000Z",
  employeeCount: "4",
  establishedYear: "2020",
  id: "99e20de0-3558-4d63-90a4-8c9f5125df07",
  legalName: "Anna Trading CC",
  physicalAddress: "1 Independence Avenue",
  region: "Khomas",
  registrationNumber: "CC/2026/1",
  sector: "Retail",
  tradingName: "Anna Trading",
  updatedAt: "2026-09-13T00:00:00.000Z",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/modules/businesses/BusinessHooks", () => ({
  useBusinesses: () => ({
    data: [business],
    isError: false,
    isPending: false,
  }),
  useBusiness: (id?: string) => ({
    data: id ? business : undefined,
    isError: false,
    isPending: false,
  }),
  useCreateBusiness: () => ({
    isError: false,
    isPending: false,
    mutateAsync: vi.fn(),
  }),
  useDeleteBusiness: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
  useUpdateBusiness: () => ({
    isError: false,
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

import { BusinessesTable } from "@/components/applicant/businesses/BusinessesTable";

afterEach(() => {
  document.body.replaceChildren();
});

describe("my businesses table", () => {
  it("uses the shared data table for owned business actions", () => {
    const markup = renderToStaticMarkup(<BusinessesTable canUpdate />);

    expect(markup).toContain("Anna Trading CC");
    expect(markup).toContain("Registration number");
    expect(markup).toContain("Business type");
    expect(markup).toContain(">Add business</button>");
    expect(markup).not.toContain('href="/portal/businesses/new"');
    expect(markup).toContain('aria-label="Edit Anna Trading CC"');
    expect(markup).not.toContain(
      "/portal/businesses/99e20de0-3558-4d63-90a4-8c9f5125df07/edit",
    );
    expect(markup).toContain('aria-label="Delete Anna Trading CC"');
  });

  it("opens the new business form in the shared dialog", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<BusinessesTable canUpdate />);
    });
    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Add business"))
        ?.click();
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain("Add business");
    expect(
      dialog?.querySelector<HTMLInputElement>('[name="legalName"]')?.value,
    ).toBe("");

    await act(async () => root.unmount());
  });

  it("opens the edit form in a dialog without leaving the list", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<BusinessesTable canUpdate />);
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Edit Anna Trading CC"]',
      )?.click();
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain("Edit business");
    expect(
      dialog?.querySelector<HTMLInputElement>('[name="legalName"]')?.value,
    ).toBe("Anna Trading CC");
    expect(window.location.pathname).not.toContain("/edit");

    await act(async () => root.unmount());
  });
});

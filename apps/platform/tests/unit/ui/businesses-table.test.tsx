import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/businesses/BusinessHooks", () => ({
  useBusinesses: () => ({
    data: [
      {
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
      },
    ],
    isError: false,
    isPending: false,
  }),
  useDeleteBusiness: () => ({ mutate: vi.fn() }),
}));

import { BusinessesTable } from "@/components/applicant/businesses/BusinessesTable";

describe("my businesses table", () => {
  it("uses the shared data table for owned business actions", () => {
    const markup = renderToStaticMarkup(<BusinessesTable canUpdate />);

    expect(markup).toContain("Anna Trading CC");
    expect(markup).toContain("Registration number");
    expect(markup).toContain("Business type");
    expect(markup).toContain('href="/portal/businesses/new"');
    expect(markup).toContain(
      'href="/portal/businesses/99e20de0-3558-4d63-90a4-8c9f5125df07/edit"',
    );
    expect(markup).toContain('aria-label="Delete Anna Trading CC"');
  });
});

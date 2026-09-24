import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readEligibilityReadinessVersion } from "@/modules/eligibility/infrastructure/EligibilityReadinessRepository";
import { readFormReadinessProjection } from "@/modules/forms/infrastructure/FormReadinessRepository";
import {
  readFundingCallIdentifierConflicts,
  readFundingCallReadinessDocuments,
} from "@/modules/funding-calls/infrastructure/FundingCallReadinessRepository";

function formDatabase(rows: unknown[]) {
  const query = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    leftJoin: vi.fn(),
    where: vi.fn().mockResolvedValue(rows),
  };
  query.from.mockReturnValue(query);
  query.innerJoin.mockReturnValue(query);
  query.leftJoin.mockReturnValue(query);
  return { select: vi.fn(() => query) };
}

function eligibilityDatabase(rows: unknown[]) {
  const query = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    limit: vi.fn().mockResolvedValue(rows),
    where: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.innerJoin.mockReturnValue(query);
  query.where.mockReturnValue(query);
  return { select: vi.fn(() => query) };
}

function orderedDatabase(rows: unknown[]) {
  const query = {
    from: vi.fn(),
    orderBy: vi.fn().mockResolvedValue(rows),
    where: vi.fn(),
  };
  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  return { select: vi.fn(() => query) };
}

function filteredDatabase(rows: unknown[]) {
  const query = {
    from: vi.fn(),
    where: vi.fn().mockResolvedValue(rows),
  };
  query.from.mockReturnValue(query);
  return { select: vi.fn(() => query) };
}

beforeEach(() => vi.clearAllMocks());

describe("publication readiness repository projections", () => {
  it("returns only readiness form metadata and field columns", async () => {
    vi.mocked(getDatabase).mockReturnValue(formDatabase([
      {
        active: true,
        fieldKey: "registrationDocument",
        fieldLabel: "Registration document",
        fieldRequired: true,
        fieldType: "DOCUMENT",
        status: "PUBLISHED",
        versionId: "10000000-0000-4000-8000-000000000001",
      },
      {
        active: true,
        fieldKey: "turnover",
        fieldLabel: "Annual turnover",
        fieldRequired: true,
        fieldType: "CURRENCY",
        status: "PUBLISHED",
        versionId: "10000000-0000-4000-8000-000000000001",
      },
    ]) as never);

    await expect(readFormReadinessProjection(
      "10000000-0000-4000-8000-000000000001",
    )).resolves.toEqual({
      active: true,
      fields: [
        {
          key: "registrationDocument",
          label: "Registration document",
          required: true,
          type: "DOCUMENT",
        },
        {
          key: "turnover",
          label: "Annual turnover",
          required: true,
          type: "CURRENCY",
        },
      ],
      status: "PUBLISHED",
      versionId: "10000000-0000-4000-8000-000000000001",
    });
  });

  it("returns exact eligibility version status and owning scope activity", async () => {
    vi.mocked(getDatabase).mockReturnValue(eligibilityDatabase([{
      active: false,
      status: "RETIRED",
      versionId: "20000000-0000-4000-8000-000000000001",
    }]) as never);

    await expect(readEligibilityReadinessVersion(
      "20000000-0000-4000-8000-000000000001",
    )).resolves.toEqual({
      active: false,
      status: "RETIRED",
      versionId: "20000000-0000-4000-8000-000000000001",
    });
  });

  it("projects document publication safety and identifier conflicts", async () => {
    const document = {
      finalized: true,
      id: "30000000-0000-4000-8000-000000000001",
      label: "Guidelines",
      markedForPublication: true,
      publishedAt: new Date("2026-10-01T00:00:00.000Z"),
      securityCleared: true,
      url: "/documents/guidelines.pdf",
    };
    vi.mocked(getDatabase)
      .mockReturnValueOnce(orderedDatabase([document]) as never)
      .mockReturnValueOnce(filteredDatabase([
        { reference: "OTHER", slug: "growth-fund" },
      ]) as never);

    await expect(readFundingCallReadinessDocuments(
      "00000000-0000-4000-8000-000000000001",
    )).resolves.toEqual([document]);
    await expect(readFundingCallIdentifierConflicts({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "SME-2027-01",
      slug: "growth-fund",
    })).resolves.toEqual({ reference: false, slug: true });
  });
});

import type { PublicFundingCallDetail } from "@/modules/funding-calls/api/PublicFundingCallTransport";

export function publicCall(
  overrides: Partial<PublicFundingCallDetail> = {},
): PublicFundingCallDetail {
  return {
    applicationsOpen: true,
    closesAt: "2026-10-31T21:59:59.000Z",
    description: "<p>Support for growing businesses.</p>",
    eligibilitySummary: "<p>Registered Namibian businesses.</p>",
    fundingInstrument: "Grant",
    id: "00000000-0000-4000-8000-000000000042",
    maximumAmount: 200000,
    minimumAmount: 50000,
    opensAt: "2026-09-01T00:00:00.000Z",
    publicContact: { email: null, name: null, phone: null },
    publicDocuments: [],
    reference: "GROWTH-2026",
    selfCheckAvailable: true,
    slug: "growth-fund",
    status: "open",
    summary: "Support for growing Namibian businesses.",
    thematicArea: "Growth",
    title: "Growth Fund",
    totalFundingAmount: 1000000,
    ...overrides,
  };
}

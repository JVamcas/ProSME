import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseState = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({
  getDatabase: () => databaseState.current,
}));

import type { FundingCallCreationProgressValues } from "@/modules/funding-calls/api/FundingCallSchemas";
import {
  readFundingCallCreationProgress,
  saveFundingCallCreationProgress,
} from "@/modules/funding-calls/infrastructure/FundingCallCreationProgressRepository";
import { insertFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const draftValues: FundingCallCreationProgressValues = {
  applicationDuplicatePolicy: "one_per_business",
  closesAt: "",
  description: "",
  eligibilityRuleSetVersionId: "",
  eligibilitySummary: "",
  formVersionId: "",
  fundingInstrument: "",
  maximumGrantAmount: "",
  minimumGrantAmount: "",
  opensAt: "",
  publicContactEmail: "",
  publicContactName: "",
  publicContactPhone: "",
  thematicArea: "",
  title: "Started",
  totalBudgetEnvelope: "",
  workflowTemplateVersionId: "",
};
const storedDraft = {
  createdAt: new Date("2026-09-29T08:00:00.000Z"),
  currentStep: "basics" as const,
  id: "20000000-0000-4000-8000-000000000001",
  ownerId: actorId,
  rowVersion: 1,
  updatedAt: new Date("2026-09-29T08:00:00.000Z"),
  values: draftValues,
};

beforeEach(() => {
  vi.clearAllMocks();
  databaseState.current = {};
});

describe("funding-call creation draft repository", () => {
  it("reads the narrow owner-scoped draft projection", async () => {
    const limit = vi.fn(async () => [storedDraft]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    databaseState.current = { select };

    await expect(readFundingCallCreationProgress(actorId)).resolves.toEqual(
      storedDraft,
    );
    expect(select).toHaveBeenCalledWith(expect.objectContaining({
      currentStep: expect.anything(),
      rowVersion: expect.anything(),
      values: expect.anything(),
    }));
    expect(where).toHaveBeenCalledOnce();
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("inserts the first draft without overwriting another session", async () => {
    const returning = vi.fn(async () => [storedDraft]);
    const onConflictDoNothing = vi.fn(() => ({ returning }));
    const values = vi.fn(() => ({ onConflictDoNothing }));
    const insert = vi.fn(() => ({ values }));
    databaseState.current = { insert };

    const result = await saveFundingCallCreationProgress(actorId, {
      currentStep: "basics",
      expectedRowVersion: null,
      values: draftValues,
    });

    expect(result).toEqual(storedDraft);
    expect(values).toHaveBeenCalledWith({
      currentStep: "basics",
      ownerId: actorId,
      values: draftValues,
    });
    expect(onConflictDoNothing).toHaveBeenCalledOnce();
  });

  it("increments the row version on a matching update", async () => {
    const returning = vi.fn(async () => [{ ...storedDraft, rowVersion: 2 }]);
    const where = vi.fn(() => ({ returning }));
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));
    databaseState.current = { update };

    const result = await saveFundingCallCreationProgress(actorId, {
      currentStep: "funding",
      expectedRowVersion: 1,
      values: draftValues,
    });

    expect(result?.rowVersion).toBe(2);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      currentStep: "funding",
      rowVersion: 2,
      values: draftValues,
    }));
    expect(where).toHaveBeenCalledOnce();
  });

  it("atomically removes creation progress after creating the domain draft", async () => {
    const createdCall = {
      applicationDuplicatePolicy: "one_per_business" as const,
      closesAt: new Date("2027-03-31T15:00:00.000Z"),
      createdAt: new Date("2026-09-29T08:00:00.000Z"),
      createdBy: actorId,
      description: "Growth funding.",
      eligibilityRuleSetVersionId: null,
      eligibilitySummary: null,
      formVersionId: null,
      fundingInstrument: null,
      id: "30000000-0000-4000-8000-000000000001",
      maximumGrantAmount: "100000.00",
      minimumGrantAmount: "50000.00",
      opensAt: new Date("2027-02-01T06:00:00.000Z"),
      publicContactEmail: null,
      publicContactName: null,
      publicContactPhone: null,
      reference: "SME Fund-2027-01",
      rowVersion: 1,
      slug: "sme-2027-01",
      status: "DRAFT" as const,
      suspendedFromStatus: null,
      thematicArea: null,
      title: "SME Fund 2027",
      totalBudgetEnvelope: "1000000.00",
      updatedAt: new Date("2026-09-29T08:00:00.000Z"),
      updatedBy: actorId,
      workflowTemplateVersionId: null,
    };
    const returning = vi.fn(async () => [createdCall]);
    const insertValues = vi.fn(() => ({ returning }));
    const deleteWhere = vi.fn(async () => undefined);
    const transactionClient = {
      delete: vi.fn(() => ({ where: deleteWhere })),
      insert: vi.fn(() => ({ values: insertValues })),
    };
    const transaction = vi.fn(async (work: (client: unknown) => unknown) =>
      work(transactionClient));
    databaseState.current = { transaction };

    const result = await insertFundingCall(actorId, {
      applicationDuplicatePolicy: "one_per_business",
      closesAt: "2027-03-31T15:00:00.000Z",
      description: "Growth funding.",
      eligibilityRuleSetVersionId: null,
      eligibilitySummary: null,
      formVersionId: null,
      fundingInstrument: null,
      maximumGrantAmount: "100000.00",
      minimumGrantAmount: "50000.00",
      opensAt: "2027-02-01T06:00:00.000Z",
      publicContactEmail: null,
      publicContactName: null,
      publicContactPhone: null,
      reference: "SME Fund-2027-01",
      slug: "sme-2027-01",
      thematicArea: null,
      title: "SME Fund 2027",
      totalBudgetEnvelope: "1000000.00",
      workflowTemplateVersionId: null,
    });

    expect(result.id).toBe(createdCall.id);
    expect(transaction).toHaveBeenCalledOnce();
    expect(deleteWhere).toHaveBeenCalledOnce();
  });
});

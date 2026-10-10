import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/funding-calls/application/ServerFundingCallKnowledgeService",
  () => ({
    readFundingCallKnowledgeSources: vi.fn(),
    listFundingCallKnowledgeSources: vi.fn(),
  }),
);
vi.mock("@/modules/content/application/ServerFaqKnowledgeService", () => ({
  readFaqKnowledgeSources: vi.fn(),
  listFaqKnowledgeSources: vi.fn(),
}));
vi.mock(
  "@/modules/eligibility/application/ServerEligibilityKnowledgeService",
  () => ({ readEligibilityKnowledgeSources: vi.fn() }),
);
vi.mock("@/modules/chatbot/infrastructure/ChatbotKnowledgeRepository", () => ({
  knowledgeTransaction: vi.fn(async (operation) =>
    operation({ marker: "transaction" }),
  ),
  readKnowledgeRelease: vi.fn(),
  readActiveKnowledgeRecords: vi.fn(),
  readKnowledgeWorkspace: vi.fn(),
  insertPreparedKnowledge: vi.fn(),
  insertKnowledgeApproval: vi.fn(),
}));
import { permissionCodes } from "@/auth/authorization/permissions";
import { readFundingCallKnowledgeSources } from "@/modules/funding-calls/application/ServerFundingCallKnowledgeService";
import { readFaqKnowledgeSources } from "@/modules/content/application/ServerFaqKnowledgeService";
import { readEligibilityKnowledgeSources } from "@/modules/eligibility/application/ServerEligibilityKnowledgeService";
import * as repository from "@/modules/chatbot/infrastructure/ChatbotKnowledgeRepository";
import {
  approveChatbotKnowledgeRelease,
  prepareChatbotKnowledgeRelease,
  getChatbotKnowledgeWorkspace,
} from "@/modules/chatbot/application/ServerChatbotKnowledgeService";
import { prepareChatbotKnowledge } from "@/modules/chatbot/application/PrepareChatbotKnowledge";
import { knowledgeFingerprint } from "@/modules/chatbot/infrastructure/KnowledgeFingerprint";
import type { KnowledgeRelease } from "@/modules/chatbot/domain/ChatbotKnowledge";
import {
  chatbotActor,
  chatbotId,
  chatbotSourceFixture,
} from "../../support/ChatbotKnowledgeFixture";

let data: ReturnType<typeof chatbotSourceFixture>;
let release: KnowledgeRelease;
beforeEach(() => {
  vi.clearAllMocks();
  data = chatbotSourceFixture();
  const snapshot = prepareChatbotKnowledge(
    { fundingCallIds: [chatbotId(10)], faqIds: ["1"] },
    data,
  );
  release = {
    id: chatbotId(80),
    snapshot,
    contentHash: knowledgeFingerprint(snapshot),
    status: "PREPARED",
    preparedAt: "2026-10-10T10:00:00Z",
    approvedAt: null,
  };
  vi.mocked(readFundingCallKnowledgeSources).mockImplementation(
    async () => data.calls,
  );
  vi.mocked(readFaqKnowledgeSources).mockImplementation(async () => data.faqs);
  vi.mocked(readEligibilityKnowledgeSources).mockImplementation(
    async () => data.eligibility,
  );
  vi.mocked(repository.readKnowledgeRelease).mockImplementation(
    async () => release,
  );
  vi.mocked(repository.insertKnowledgeApproval).mockImplementation(
    async () => ({ ...release, status: "APPROVED" }),
  );
});

describe("exact knowledge approval and authorization", () => {
  it("denies reads, preparation and approval before any persistence/source access", async () => {
    const denied = chatbotActor([]);
    await expect(getChatbotKnowledgeWorkspace(denied)).rejects.toThrow(
      /capability/,
    );
    await expect(
      prepareChatbotKnowledgeRelease(denied, release.snapshot.selection),
    ).rejects.toThrow(/capability/);
    await expect(
      approveChatbotKnowledgeRelease(denied, release.id, {
        contentHash: release.contentHash,
      }),
    ).rejects.toThrow(/capability/);
    expect(repository.knowledgeTransaction).not.toHaveBeenCalled();
    expect(repository.readKnowledgeWorkspace).not.toHaveBeenCalled();
    expect(readFundingCallKnowledgeSources).not.toHaveBeenCalled();
  });

  it("does not let preparation, publication or transcript permissions approve knowledge", async () => {
    for (const permission of [
      permissionCodes.chatbotKnowledgePrepareAll,
      permissionCodes.chatbotKnowledgePublishAll,
      permissionCodes.chatbotEscalationReadAll,
    ]) {
      const user = chatbotActor([
        permissionCodes.chatbotKnowledgeReadAll,
        permission,
      ]);
      await expect(
        approveChatbotKnowledgeRelease(user, release.id, {
          contentHash: release.contentHash,
        }),
      ).rejects.toThrow(/capability/);
    }
    expect(repository.knowledgeTransaction).not.toHaveBeenCalled();
  });

  it("rejects inactive actors and preview hash mismatch", async () => {
    const inactive = { ...chatbotActor(), status: "disabled" as const };
    await expect(
      approveChatbotKnowledgeRelease(inactive, release.id, {
        contentHash: release.contentHash,
      }),
    ).rejects.toThrow(/capability/);
    await expect(
      approveChatbotKnowledgeRelease(chatbotActor(), release.id, {
        contentHash: "a".repeat(64),
      }),
    ).rejects.toThrow(/exact preview/);
    expect(readFundingCallKnowledgeSources).not.toHaveBeenCalled();
    expect(repository.insertKnowledgeApproval).not.toHaveBeenCalled();
  });

  it("approves the saved snapshot, with source checks on the same locked transaction", async () => {
    const result = await approveChatbotKnowledgeRelease(
      chatbotActor(),
      release.id,
      { contentHash: release.contentHash },
    );
    expect(result.status).toBe("APPROVED");
    const transaction = { marker: "transaction" };
    expect(repository.readKnowledgeRelease).toHaveBeenCalledWith(
      release.id,
      transaction,
      true,
    );
    expect(readEligibilityKnowledgeSources).toHaveBeenCalledWith(
      [chatbotId(20)],
      transaction,
    );
    expect(repository.insertKnowledgeApproval).toHaveBeenCalledWith(
      transaction,
      chatbotActor().id,
      release,
    );
  });

  it.each(["publication", "dependency", "faq", "withdrawal"])(
    "rejects a %s change after preview",
    async (kind) => {
      if (kind === "publication") data.calls[0].revisionId = chatbotId(77);
      if (kind === "dependency")
        data.eligibility.inputs[0].selfCheck.prompt = "Changed question";
      if (kind === "faq") data.faqs[0].question = "Changed published question";
      if (kind === "withdrawal") data.calls = [];
      await expect(
        approveChatbotKnowledgeRelease(chatbotActor(), release.id, {
          contentHash: release.contentHash,
        }),
      ).rejects.toThrow(/changed/);
      expect(repository.insertKnowledgeApproval).not.toHaveBeenCalled();
    },
  );

  it("blocks unresolved issues and returns an idempotent approval on retry", async () => {
    release.snapshot.issues.push({
      recordId: "faq:1",
      code: "MISSING_DATA",
      message: "Missing answer",
    });
    release.contentHash = knowledgeFingerprint(release.snapshot);
    await expect(
      approveChatbotKnowledgeRelease(chatbotActor(), release.id, {
        contentHash: release.contentHash,
      }),
    ).rejects.toThrow(/every preparation issue/);
    expect(readFundingCallKnowledgeSources).not.toHaveBeenCalled();
    release.snapshot.issues = [];
    release.contentHash = knowledgeFingerprint(release.snapshot);
    release.status = "APPROVED";
    await expect(
      approveChatbotKnowledgeRelease(chatbotActor(), release.id, {
        contentHash: release.contentHash,
      }),
    ).resolves.toEqual(release);
    expect(repository.insertKnowledgeApproval).not.toHaveBeenCalled();
  });
});

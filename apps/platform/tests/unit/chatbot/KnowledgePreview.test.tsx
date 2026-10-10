// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const approval = vi.hoisted(() => ({
  mutateAsync: vi.fn().mockResolvedValue({}),
  isPending: false,
}));
vi.mock("@/modules/chatbot/ui/operations/useChatbotKnowledge", () => ({
  useApproveChatbotKnowledge: () => approval,
}));
import { KnowledgeReleasePreview } from "@/modules/chatbot/ui/operations/KnowledgeReleasePreview";
import { prepareChatbotKnowledge } from "@/modules/chatbot/application/PrepareChatbotKnowledge";
import { knowledgeFingerprint } from "@/modules/chatbot/infrastructure/KnowledgeFingerprint";
import { knowledgeDiff } from "@/modules/chatbot/engine/KnowledgeDiff";
import type { KnowledgeRelease } from "@/modules/chatbot/domain/ChatbotKnowledge";
import {
  chatbotId,
  chatbotSourceFixture,
} from "../../support/ChatbotKnowledgeFixture";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.replaceChildren();
  vi.clearAllMocks();
});

function releaseFixture(): KnowledgeRelease {
  const snapshot = prepareChatbotKnowledge(
    { fundingCallIds: [chatbotId(10)], faqIds: ["1"] },
    chatbotSourceFixture(),
  );
  return {
    id: chatbotId(80),
    snapshot,
    contentHash: knowledgeFingerprint(snapshot),
    status: "PREPARED",
    preparedAt: "2026-10-10T10:00:00Z",
    approvedAt: null,
  };
}

async function render(release = releaseFixture(), canApprove = true) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root!.render(
      <KnowledgeReleasePreview
        release={release}
        changes={knowledgeDiff([], release.snapshot.records)}
        canApprove={canApprove}
      />,
    ),
  );
  return container;
}

describe("readable staff knowledge preview", () => {
  it("shows call facts, logical eligibility, complete FAQ answers and public source links", async () => {
    const container = await render();
    expect(container.textContent).toContain("Minimum funding amount");
    expect(container.textContent).toContain("1000.50");
    expect(container.textContent).toContain("Mandatory");
    expect(container.textContent).toContain("All of:");
    expect(container.textContent).toContain("Employee count is at most 50");
    expect(container.textContent).toContain("Public answer 1.");
    expect(container.querySelector('a[href="/faq"]')).not.toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.textContent).not.toContain('"schemaVersion"');
  });

  it("approves the exact preview hash and hides approval without its specific grant", async () => {
    const release = releaseFixture();
    const container = await render(release);
    const button = container.querySelector("button")!;
    await act(async () => button.click());
    expect(approval.mutateAsync).toHaveBeenCalledWith(release);
    expect(approval.mutateAsync.mock.calls[0][0].contentHash).toBe(
      release.contentHash,
    );
    await act(async () =>
      root!.render(
        <KnowledgeReleasePreview
          release={release}
          changes={[]}
          canApprove={false}
        />,
      ),
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("shows inline issues and blocks approval until sources are corrected", async () => {
    const release = releaseFixture();
    release.snapshot.issues.push({
      recordId: "faq:1",
      code: "MISSING_DATA",
      message: "Correct the public answer.",
    });
    const container = await render(release);
    expect(container.querySelector("article [role=alert]")?.textContent).toBe(
      "Correct the public answer.",
    );
    expect(container.querySelector<HTMLButtonElement>("button")?.disabled).toBe(
      true,
    );
  });

  it("renders readable changed, added and removed passages against the active release", async () => {
    const release = releaseFixture();
    const old = release.snapshot.records.map((record) => ({ ...record }));
    old[0] = { ...old[0], text: "Previously active guidance." };
    old.push({ ...old[0], id: "removed-record", title: "Retired passage" });
    const changes = knowledgeDiff(old, [
      ...release.snapshot.records,
      { ...old[0], id: "new-record", title: "New passage" },
    ]);
    const container = await render(release);
    await act(async () =>
      root!.render(
        <KnowledgeReleasePreview
          release={release}
          changes={changes}
          canApprove
        />,
      ),
    );
    expect(container.textContent).toContain("Previously active guidance.");
    expect(container.textContent).toContain("removed: Retired passage");
    expect(container.textContent).toContain("added: New passage");
    expect(container.textContent).toContain("changed:");
  });
});

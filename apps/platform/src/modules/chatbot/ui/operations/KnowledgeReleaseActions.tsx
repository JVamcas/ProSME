"use client";
import { GeneralButton } from "@/shared/ui/Button";
import { permissionCodes } from "@/auth/authorization/permissions";
import { useCapabilities } from "@/shared/ui/portal/capability-context";
import type {
  KnowledgeRelease,
  KnowledgeWorkspace,
} from "../../domain/ChatbotKnowledge";
import {
  usePublishChatbotKnowledge,
  useWithdrawChatbotKnowledge,
} from "./useChatbotKnowledge";

export function KnowledgeReleaseActions({
  release,
  workspace,
}: {
  release: KnowledgeRelease;
  workspace: KnowledgeWorkspace;
}) {
  const grants = useCapabilities();
  const publication = usePublishChatbotKnowledge();
  const withdrawal = useWithdrawChatbotKnowledge();
  const active = release.id === workspace.activeReleaseId;
  const withdrawn = workspace.releases.find(
    (item) => item.id === release.id,
  )?.withdrawn;
  let message =
    "Publication verifies the artifacts and current sources before activating this exact approved content.";
  if (active) {
    message =
      "This release is active. Answers still verify its sources on every request.";
  }
  if (withdrawn) {
    message =
      "This release was withdrawn and cannot be published again. Prepare and approve a replacement.";
  }
  return (
    <section aria-label="Knowledge publication" className="space-y-3">
      <p>{message}</p>
      {release.status === "APPROVED" &&
      !withdrawn &&
      !active &&
      grants.has(permissionCodes.chatbotKnowledgePublishAll) ? (
        <GeneralButton
          disabled={publication.isPending}
          onClick={() =>
            void publication
              .mutateAsync({
                id: release.id,
                contentHash: release.contentHash,
                expectedEpoch: workspace.epoch,
              })
              .catch(() => undefined)
          }
        >
          {publication.isPending
            ? "Verifying and publishing…"
            : "Publish approved knowledge"}
        </GeneralButton>
      ) : null}
      {!withdrawn && grants.has(permissionCodes.chatbotKnowledgeWithdrawAll) ? (
        <GeneralButton
          variant="outline"
          disabled={withdrawal.isPending}
          onClick={() =>
            void withdrawal.mutateAsync(release.id).catch(() => undefined)
          }
        >
          Withdraw this release
        </GeneralButton>
      ) : null}
    </section>
  );
}

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({
    PAYLOAD_SECRET: "synthetic-version-test-token-secret",
  }),
}));
vi.mock(
  "@/modules/notifications/application/ServerNotificationOccurrenceService",
  () => ({
    captureNotificationOccurrence: vi.fn(),
  }),
);
vi.mock(
  "@/modules/funding-calls/infrastructure/FundingCallNotificationRepository",
  () => ({
    captureFundingCallNotification: vi.fn(),
  }),
);

import {
  enabled,
  pool,
  command,
  publishInitialCall,
  approveReplacement,
  createDraft,
} from "../support/FundingCallVersionDatabaseHarness";
import {
  readFundingCallById,
  readEffectiveFundingCallById,
  updateDraftFundingCall,
} from "@/modules/funding-calls/infrastructure/FundingCallRepository";
import {
  createFundingCallReplacement,
  listFundingCallVersions,
  readHistoricalFundingCall,
} from "@/modules/funding-calls/infrastructure/FundingCallVersionRepository";
import { publishApprovedFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallPublicationRepository";
import { transitionFundingCall } from "@/modules/funding-calls/infrastructure/FundingCallLifecycleRepository";
import { readPublicFundingCallById } from "@/modules/funding-calls/infrastructure/PublicFundingCallRepository";
import { versionActorId } from "../support/FundingCallVersionDatabaseFixture";

(enabled ? describe : describe.skip)(
  "versioned funding-call replacement persistence",
  () => {
    it("keeps the published call public and operational through draft editing and approval", async () => {
      const { callId } = await publishInitialCall();
      const initial = (await readFundingCallById(callId))!;
      const draft = (await createFundingCallReplacement(
        versionActorId,
        callId,
        initial.rowVersion,
      ))!;
      expect(draft.status).toBe("DRAFT");
      expect(draft.effectiveStatus).toBe("LIVE");
      expect(
        (await publishApprovedFundingCall(command(callId, draft.rowVersion)))
          .kind,
      ).toBe("conflict");
      expect(
        (
          await createFundingCallReplacement(
            versionActorId,
            callId,
            draft.rowVersion,
          )
        )?.draftVersionId,
      ).toBe(draft.draftVersionId);
      const updated = await updateDraftFundingCall(versionActorId, callId, {
        ...draft,
        title: "Replacement version",
        opensAt: "2050-01-01T00:00:00Z",
        closesAt: "2101-01-01T00:00:00Z",
        expectedRowVersion: draft.rowVersion,
      });
      expect(updated?.title).toBe("Replacement version");
      expect(await readPublicFundingCallById(callId)).toMatchObject({
        title: "Original version",
        status: "LIVE",
      });
      expect(
        (await readEffectiveFundingCallById(callId))?.opensAt.getUTCFullYear(),
      ).toBe(2000);
      const approved = await approveReplacement(callId);
      expect(await readPublicFundingCallById(callId)).toMatchObject({
        title: "Original version",
        status: "LIVE",
      });
      const result = await publishApprovedFundingCall(
        command(callId, approved.rowVersion),
      );
      expect(result.kind).toBe("published");
      expect(await readPublicFundingCallById(callId)).toMatchObject({
        title: "Replacement version",
        status: "SCHEDULED",
      });
      const history = await listFundingCallVersions(callId, 1);
      expect(history.items.map((item) => item.current)).toEqual([true, false]);
      expect(await listFundingCallVersions(callId, 2)).toMatchObject({
        items: [],
        total: 2,
      });
      expect(
        await readHistoricalFundingCall(
          callId,
          initial.currentPublishedVersionId!,
        ),
      ).toMatchObject({ title: "Original version" });
      const other = await publishInitialCall();
      expect(
        await readHistoricalFundingCall(
          other.callId,
          initial.currentPublishedVersionId!,
        ),
      ).toBeNull();
      expect(history.items.map((item) => item.title)).toEqual([
        "Replacement version",
        "Original version",
      ]);
      expect((await readFundingCallById(callId))?.reference).toBe(
        initial.reference,
      );
      expect((await readFundingCallById(callId))?.slug).toBe(initial.slug);
    });

    it("preserves suspension across publication and denies publication after withdrawal", async () => {
      const { callId } = await publishInitialCall();
      let call = (await readFundingCallById(callId))!;
      await createFundingCallReplacement(
        versionActorId,
        callId,
        call.rowVersion,
      );
      call = await approveReplacement(callId);
      expect(
        (
          await transitionFundingCall({
            ...command(callId, call.rowVersion),
            command: "SUSPEND",
            reason: "Synthetic suspension",
          })
        ).kind,
      ).toBe("transitioned");
      call = (await readFundingCallById(callId))!;
      expect(
        (await publishApprovedFundingCall(command(callId, call.rowVersion)))
          .kind,
      ).toBe("published");
      expect((await readEffectiveFundingCallById(callId))?.status).toBe(
        "SUSPENDED",
      );
      expect((await createDraft(callId)).kind).toBe("unavailable");
      call = (await readFundingCallById(callId))!;
      await createFundingCallReplacement(
        versionActorId,
        callId,
        call.rowVersion,
      );
      call = await approveReplacement(callId);
      await transitionFundingCall({
        ...command(callId, call.rowVersion),
        command: "WITHDRAW",
        reason: "Synthetic withdrawal",
      });
      call = (await readFundingCallById(callId))!;
      expect(
        (await publishApprovedFundingCall(command(callId, call.rowVersion)))
          .kind,
      ).toBe("conflict");
    });

    it("serializes simultaneous publication, preserves immutable history, and rejects rebinding applications", async () => {
      const { callId } = await publishInitialCall();
      const first = await createDraft(callId);
      if (!("applicationId" in first)) throw new Error("Draft not created");
      let call = (await readFundingCallById(callId))!;
      await createFundingCallReplacement(
        versionActorId,
        callId,
        call.rowVersion,
      );
      call = await approveReplacement(callId);
      const results = await Promise.all([
        publishApprovedFundingCall(command(callId, call.rowVersion)),
        publishApprovedFundingCall(command(callId, call.rowVersion)),
      ]);
      expect(results.map((result) => result.kind).sort()).toEqual([
        "conflict",
        "published",
      ]);
      await expect(
        pool!.query(
          "UPDATE app_applications SET funding_call_version_id = NULL WHERE id = $1",
          [first.applicationId],
        ),
      ).rejects.toThrow("immutable");
      await expect(
        pool!.query(
          "UPDATE app_funding_calls SET title = 'unpublished edit' WHERE id = $1",
          [callId],
        ),
      ).rejects.toThrow("only through publication");
      await expect(
        pool!.query(
          "UPDATE app_funding_call_publication_revisions SET snapshot = '{}' WHERE funding_call_id = $1",
          [callId],
        ),
      ).rejects.toThrow("immutable");
      expect((await listFundingCallVersions(callId, 1)).items).toHaveLength(2);
    });
  },
);

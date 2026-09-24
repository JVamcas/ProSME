import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readOwnedApplicationStatusHistory } from "@/modules/applications/infrastructure/ApplicationStatusHistoryRepository";

const applicationId = "4bd687b3-f197-44b3-8f70-dfcd9889cf30";
const ownerUserId = "efc27190-a97c-4821-8236-824ca4d2be5e";
const occurredAt = "2026-09-24T06:28:42.000Z";

beforeEach(() => vi.clearAllMocks());

describe("application status history repository", () => {
  it.each([occurredAt, new Date(occurredAt)])(
    "normalizes database timestamp %s to Date",
    async (databaseTimestamp) => {
      const execute = vi.fn().mockResolvedValue({
        rows: [{
          eventId: applicationId,
          occurredAt: databaseTimestamp,
          status: "under_review",
          label: "Under review",
          description: "Your application is being reviewed.",
        }],
      });
      vi.mocked(getDatabase).mockReturnValue({ execute } as never);

      const rows = await readOwnedApplicationStatusHistory({
        applicationId,
        limit: 20,
        ownerUserId,
      });

      expect(rows[0]?.occurredAt).toBeInstanceOf(Date);
      expect(rows[0]?.occurredAt.toISOString()).toBe(occurredAt);
      expect(execute).toHaveBeenCalledOnce();
    },
  );
});

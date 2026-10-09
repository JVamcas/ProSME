import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { getDatabase } from "@/platform/database/client";
import type { AuthenticatedUser } from "@/auth/types";
import {
  GET as schedulesGET,
  POST as schedulesPOST,
} from "@/app/api/reporting/reports/[reportId]/schedules/route";
import { PUT as schedulePUT } from "@/app/api/reporting/reports/[reportId]/schedules/[scheduleId]/route";
import { GET as deliveryGET } from "@/app/api/reporting/reports/[reportId]/delivery/route";
import { PUT as deliveryPUT } from "@/app/api/reporting/reports/[reportId]/delivery/[eventKey]/route";
import { GET as historyGET } from "@/app/api/reporting/reports/[reportId]/delivery/history/route";
import { POST as deliveryRetryPOST } from "@/app/api/reporting/reports/[reportId]/delivery/history/[deliveryId]/retry/route";
import { POST as generationRetryPOST } from "@/app/api/reporting/reports/[reportId]/runs/[runId]/retry/route";

const context = {
  params: Promise.resolve({
    reportId: crypto.randomUUID(),
    scheduleId: crypto.randomUUID(),
    runId: crypto.randomUUID(),
    deliveryId: crypto.randomUUID(),
    eventKey: "reporting.generation.completed",
  }),
};
const deniedActor: AuthenticatedUser = {
  id: crypto.randomUUID(),
  status: "active",
  capabilities: new Set(),
  email: "automation@example.test",
  displayName: "Automation fixture",
  userType: "staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  roleCodes: new Set(),
  identitySubject: "automation-fixture",
};
const operations = [
  schedulesGET,
  schedulesPOST,
  schedulePUT,
  deliveryGET,
  deliveryPUT,
  historyGET,
  deliveryRetryPOST,
  generationRetryPOST,
];
beforeEach(() => vi.clearAllMocks());

describe("protected report automation transport", () => {
  it.each([
    { user: null, status: 401 },
    { user: deniedActor, status: 403 },
  ])(
    "denies automation operations with status $status before database access",
    async ({ user, status }) => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(user);
      for (const operation of operations) {
        const response = await operation(
          new Request("http://localhost/api/reporting/reports/automation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          }),
          context,
        );
        expect(response.status).toBe(status);
        expect(response.headers.get("cache-control")).toBe("no-store");
      }
      expect(getDatabase).not.toHaveBeenCalled();
    },
  );

  it("returns a validation response for malformed JSON before schedule writes", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(deniedActor);
    const response = await schedulesPOST(
      new Request("http://localhost/api/reporting/reports/automation", {
        method: "POST",
        body: "{",
      }),
      context,
    );
    expect(response.status).toBe(400);
    expect(getDatabase).not.toHaveBeenCalled();
  });
});

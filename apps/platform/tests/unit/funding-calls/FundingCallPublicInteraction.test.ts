import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/funding-calls/infrastructure/FundingCallPublicInteractionRepository",
  () => ({ updateFundingCallPublicInteraction: vi.fn() }),
);
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/integrations/monitoring/logger", () => ({
  logger: { error: vi.fn() },
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { ResourceConflictError } from "@/lib/resource-errors";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { setFundingCallPublicInteraction } from "@/modules/funding-calls/application/ServerFundingCallPublicInteractionService";
import { updateFundingCallPublicInteraction } from "@/modules/funding-calls/infrastructure/FundingCallPublicInteractionRepository";
import { PATCH } from "@/app/api/admin/funding-calls/[id]/public-interaction/route";
import { callId, user } from "../../support/FundingCallServiceFixture";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(updateFundingCallPublicInteraction).mockResolvedValue({
    id: callId,
    publicInteractionEnabled: false,
    rowVersion: 2,
  });
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(user([]));
});

describe("funding call public interaction authorization", () => {
  it.each([true, false])(
    "requires the exact contextual action permission for enabled=%s",
    async (enabled) => {
      const permission = enabled
        ? permissionCodes.fundingCallPublicInteractionEnableAll
        : permissionCodes.fundingCallPublicInteractionDisableAll;
      const input = { enabled, expectedRowVersion: 1 };
      await setFundingCallPublicInteraction(user([permission]), callId, input);
      expect(updateFundingCallPublicInteraction).toHaveBeenCalledWith(
        expect.any(String),
        callId,
        input,
      );
      vi.mocked(updateFundingCallPublicInteraction).mockClear();
      const opposite = enabled
        ? permissionCodes.fundingCallPublicInteractionDisableAll
        : permissionCodes.fundingCallPublicInteractionEnableAll;
      await expect(
        setFundingCallPublicInteraction(
          user([opposite, permissionCodes.fundingCallEditDraft]),
          callId,
          input,
        ),
      ).rejects.toBeInstanceOf(PermissionDeniedError);
      expect(updateFundingCallPublicInteraction).not.toHaveBeenCalled();
    },
  );

  it("rejects stale writes", async () => {
    vi.mocked(updateFundingCallPublicInteraction).mockResolvedValue(null);
    await expect(
      setFundingCallPublicInteraction(
        user([permissionCodes.fundingCallPublicInteractionDisableAll]),
        callId,
        { enabled: false, expectedRowVersion: 1 },
      ),
    ).rejects.toBeInstanceOf(ResourceConflictError);
  });

  it("enforces permissions at the protected route and validates transport input", async () => {
    const request = (body: unknown) =>
      new Request(
        "http://localhost/api/admin/funding-calls/call/public-interaction",
        { method: "PATCH", body: JSON.stringify(body) },
      );
    const context = { params: Promise.resolve({ id: callId }) };
    expect(
      (await PATCH(request({ enabled: false, expectedRowVersion: 1 }), context))
        .status,
    ).toBe(403);
    expect(updateFundingCallPublicInteraction).not.toHaveBeenCalled();
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      user([permissionCodes.fundingCallPublicInteractionDisableAll]),
    );
    expect(
      (
        await PATCH(
          request({ enabled: "false", expectedRowVersion: 1 }),
          context,
        )
      ).status,
    ).toBe(400);
    expect(
      (await PATCH(request({ enabled: false, expectedRowVersion: 1 }), context))
        .status,
    ).toBe(200);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/integrations/monitoring/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock(
  "@/modules/funding-calls/application/ServerFundingCallLifecycleService",
  () => ({ reconcileFundingCallLifecycle: vi.fn() }),
);

import { POST } from "@/app/api/internal/funding-calls/reconcile/route";
import { reconcileFundingCallLifecycle } from "@/modules/funding-calls/application/ServerFundingCallLifecycleService";

const secret = "funding-call-processor-secret-32-characters";
const result = {
  closing: { attempted: 1, failed: 0, transitioned: 1 },
  opening: { attempted: 2, failed: 0, transitioned: 2 },
};

function request(authorization?: string) {
  return new Request("http://localhost/api/internal/funding-calls/reconcile", {
    headers: authorization ? { authorization } : {},
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.FUNDING_CALL_LIFECYCLE_PROCESSOR_SECRET = secret;
  vi.mocked(reconcileFundingCallLifecycle).mockResolvedValue(result);
});

describe("funding call lifecycle processor route", () => {
  it.each([
    ["missing", undefined],
    ["ordinary user bearer", "Bearer firebase-session-token"],
    ["invalid service bearer", "Bearer invalid-processor-secret"],
  ])("denies %s authentication", async (_, authorization) => {
    const response = await POST(request(authorization));

    expect(response.status).toBe(401);
    expect(reconcileFundingCallLifecycle).not.toHaveBeenCalled();
  });

  it("runs one bounded lifecycle reconciliation", async () => {
    const response = await POST(request(`Bearer ${secret}`));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: result });
    expect(reconcileFundingCallLifecycle).toHaveBeenCalledTimes(1);
  });

  it("redacts internal processing failures", async () => {
    vi.mocked(reconcileFundingCallLifecycle).mockRejectedValue(
      new Error("database-password-sensitive-value"),
    );
    const response = await POST(request(`Bearer ${secret}`));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("database-password-sensitive-value");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/integrations/monitoring/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/modules/notifications/application/ServerNotificationDispatchService", () => ({
  processConfiguredNotificationBatch: vi.fn(),
}));

import { POST } from "@/app/api/internal/notifications/process/route";
import { logger } from "@/integrations/monitoring/logger";
import { processConfiguredNotificationBatch } from "@/modules/notifications/application/ServerNotificationDispatchService";

const secret = "processor-route-test-secret-32-characters";

function request(authorization?: string) {
  return new Request("http://localhost/api/internal/notifications/process", {
    headers: authorization ? { authorization } : {},
    method: "POST",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NOTIFICATION_PROCESSOR_SECRET = secret;
  vi.mocked(processConfiguredNotificationBatch).mockResolvedValue({
    claimed: 1,
    failed: 0,
    processed: 1,
    retrying: 0,
    sent: 1,
  });
});

describe("notification processor route", () => {
  it.each([
    ["missing", undefined],
    ["ordinary user bearer", "Bearer firebase-session-token"],
    ["invalid service bearer", "Bearer invalid-processor-secret"],
  ])("denies %s authentication", async (_, authorization) => {
    const response = await POST(request(authorization));
    expect(response.status).toBe(401);
    expect(processConfiguredNotificationBatch).not.toHaveBeenCalled();
  });

  it("processes one bounded batch and returns only safe counts", async () => {
    const response = await POST(request(`Bearer ${secret}`));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(processConfiguredNotificationBatch).toHaveBeenCalledTimes(1);
    expect(body).toEqual({
      data: {
        claimed: 1,
        failed: 0,
        processed: 1,
        retrying: 0,
        sent: 1,
      },
    });
    expect(JSON.stringify(body)).not.toMatch(/recipient|subject|html|plainText/i);
    expect(logger.info).toHaveBeenCalledWith(
      "notification.processor.completed",
      expect.objectContaining({ claimed: 1, sent: 1 }),
    );
  });

  it("does not log a completion event for an idle poll", async () => {
    vi.mocked(processConfiguredNotificationBatch).mockResolvedValue({
      claimed: 0,
      failed: 0,
      processed: 0,
      retrying: 0,
      sent: 0,
    });

    const response = await POST(request(`Bearer ${secret}`));

    expect(response.status).toBe(200);
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("redacts internal processor failures", async () => {
    vi.mocked(processConfiguredNotificationBatch).mockRejectedValue(
      new Error("recipient@example.com gmail-application-password"),
    );
    const response = await POST(request(`Bearer ${secret}`));
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("recipient@example.com");
    expect(JSON.stringify(body)).not.toContain("gmail-application-password");
    expect(logger.error).toHaveBeenCalledWith(
      "notification.processor.failed",
      expect.objectContaining({ errorType: "Error" }),
    );
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionActivityController } from "@/platform/auth/ui/SessionActivityController";
import { sessionIdleMilliseconds } from "@/platform/auth/SessionPolicy";

const controllers: SessionActivityController[] = [];

function setup() {
  let expiresAt = Date.now() + sessionIdleMilliseconds;
  const actions = {
    read: vi.fn(async () => {
      if (Date.now() >= expiresAt) throw "unauthorized";
      return { expiresAt };
    }),
    renew: vi.fn(async (lastActivityAt: number) => {
      expiresAt = Math.max(expiresAt, lastActivityAt + sessionIdleMilliseconds);
      return { expiresAt };
    }),
    expired: vi.fn(),
    renewed: vi.fn(),
    isUnauthorized: (error: unknown) => error === "unauthorized",
  };
  const controller = new SessionActivityController(actions);
  controller.accept({ expiresAt: Date.now() + sessionIdleMilliseconds });
  controllers.push(controller);
  return { controller, actions };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-08T10:00:00Z"));
});
afterEach(() => {
  controllers.splice(0).forEach((controller) => controller.stop());
  vi.useRealTimers();
});

describe("session activity", () => {
  it("keeps active users signed in beyond five minutes and expires five minutes after their last interaction", async () => {
    const { controller, actions } = setup();
    expect(sessionIdleMilliseconds).toBe(300_000);

    for (let minute = 0; minute < 12; minute += 1) {
      controller.activity();
      await vi.advanceTimersByTimeAsync(60_000);
      expect(actions.expired).not.toHaveBeenCalled();
    }

    expect(actions.renew).toHaveBeenCalledTimes(12);
    await vi.advanceTimersByTimeAsync(sessionIdleMilliseconds - 60_000 - 1);
    expect(actions.expired).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(actions.expired).toHaveBeenCalledOnce();
  });

  it("cannot extend inactivity through repeated failed renewal retries", async () => {
    const { controller, actions } = setup();
    const activityAt = Date.now();
    actions.renew.mockRejectedValue(new Error("Network unavailable"));
    controller.activity();
    await vi.advanceTimersByTimeAsync(sessionIdleMilliseconds);

    expect(actions.expired).toHaveBeenCalledOnce();
    expect(actions.renew).toHaveBeenCalledTimes(5);
    expect(
      actions.renew.mock.calls.every(([timestamp]) => timestamp === activityAt),
    ).toBe(true);
  });

  it("retries recorded activity after a temporary renewal failure", async () => {
    const { controller, actions } = setup();
    const activityAt = Date.now();
    actions.renew.mockRejectedValueOnce(new Error("Network unavailable"));
    controller.activity();
    await vi.advanceTimersByTimeAsync(119_999);

    expect(actions.renew).toHaveBeenCalledTimes(2);
    expect(actions.renew.mock.calls[1]).toEqual([activityAt]);
    expect(actions.expired).not.toHaveBeenCalled();
  });

  it("renews the first interaction before a nearly expired inherited session times out", async () => {
    const actions = {
      read: vi.fn(),
      renew: vi.fn(async () => ({ expiresAt: Date.now() + sessionIdleMilliseconds })),
      expired: vi.fn(),
      renewed: vi.fn(),
      isUnauthorized: () => false,
    };
    const controller = new SessionActivityController(actions);
    controllers.push(controller);
    controller.accept({ expiresAt: Date.now() + 30_000 });
    controller.activity();
    await vi.advanceTimersByTimeAsync(30_000);

    expect(actions.renew).toHaveBeenCalledOnce();
    expect(actions.read).not.toHaveBeenCalled();
    expect(actions.expired).not.toHaveBeenCalled();
  });

  it("never renews an unattended open tab and expires it at five minutes", async () => {
    const { controller, actions } = setup();
    actions.read.mockRejectedValue("unauthorized");
    await vi.advanceTimersByTimeAsync(sessionIdleMilliseconds);
    expect(actions.read).toHaveBeenCalledOnce();
    expect(actions.renew).not.toHaveBeenCalled();
    expect(actions.expired).toHaveBeenCalledOnce();
    controller.activity();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(actions.renew).not.toHaveBeenCalled();
  });

  it("renews while typing or moving, with a bounded trailing activity request", async () => {
    const { controller, actions } = setup();
    for (let index = 0; index < 20; index += 1) {
      controller.activity();
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(actions.renew).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(40_000);
    expect(actions.renew).toHaveBeenCalledTimes(2);
    expect(actions.renewed).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(actions.renew).toHaveBeenCalledTimes(2);
  });

  it("checks focus without renewal and respects another tab's active session", async () => {
    const { controller, actions } = setup();
    await controller.check();
    expect(actions.read).toHaveBeenCalledOnce();
    expect(actions.renew).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    controller.accept({ expiresAt: Date.now() + sessionIdleMilliseconds });
    await vi.advanceTimersByTimeAsync(3 * 60_000);
    expect(actions.read).toHaveBeenCalledOnce();
    expect(actions.expired).not.toHaveBeenCalled();
  });

  it("does not extend expiry when a cached status is applied again", async () => {
    const { controller, actions } = setup();
    const cached = { expiresAt: Date.now() + sessionIdleMilliseconds };
    await vi.advanceTimersByTimeAsync(2 * 60_000);
    controller.accept(cached);
    actions.read.mockRejectedValue("unauthorized");
    await vi.advanceTimersByTimeAsync(3 * 60_000);
    expect(actions.expired).toHaveBeenCalledOnce();
  });

  it("expires on rejected renewal and ignores a response after unmount", async () => {
    const { controller, actions } = setup();
    actions.renew.mockRejectedValueOnce("unauthorized");
    controller.activity();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(actions.expired).toHaveBeenCalledOnce();

    const other = setup();
    let resolve!: (value: { expiresAt: number }) => void;
    other.actions.renew.mockImplementationOnce(
      () => new Promise((done) => {
        resolve = done;
      }),
    );
    other.controller.activity();
    await vi.advanceTimersByTimeAsync(60_000);
    other.controller.stop();
    resolve({ expiresAt: Date.now() + sessionIdleMilliseconds });
    await Promise.resolve();
    expect(other.actions.renewed).not.toHaveBeenCalled();
    expect(other.actions.expired).not.toHaveBeenCalled();
  });

  it("does not revive an expired session on activity after sleep", async () => {
    const { controller, actions } = setup();
    vi.setSystemTime(Date.now() + sessionIdleMilliseconds + 1);
    actions.read.mockRejectedValue("unauthorized");
    controller.activity();
    await Promise.resolve();
    await Promise.resolve();
    expect(actions.renew).not.toHaveBeenCalled();
    expect(actions.expired).toHaveBeenCalledOnce();
  });
});

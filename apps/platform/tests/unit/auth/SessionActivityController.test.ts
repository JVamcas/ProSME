import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SessionActivityController } from "@/platform/auth/ui/SessionActivityController";
import { sessionIdleMilliseconds } from "@/platform/auth/SessionPolicy";

const controllers: SessionActivityController[] = [];

function setup() {
  const actions = {
    read: vi.fn(async () => ({ expiresAt: Date.now() + sessionIdleMilliseconds })),
    renew: vi.fn(async () => ({ expiresAt: Date.now() + sessionIdleMilliseconds })),
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
  it("never renews an unattended open tab and expires it at thirty minutes", async () => {
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
    expect(actions.renew).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(40_000);
    expect(actions.renew).toHaveBeenCalledOnce();
    expect(actions.renewed).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(actions.renew).toHaveBeenCalledOnce();
  });

  it("checks focus without renewal and respects another tab's active session", async () => {
    const { controller, actions } = setup();
    await controller.check();
    expect(actions.read).toHaveBeenCalledOnce();
    expect(actions.renew).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(20 * 60_000);
    controller.accept({ expiresAt: Date.now() + sessionIdleMilliseconds });
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(actions.read).toHaveBeenCalledOnce();
    expect(actions.expired).not.toHaveBeenCalled();
  });

  it("does not extend expiry when a cached status is applied again", async () => {
    const { controller, actions } = setup();
    const cached = { expiresAt: Date.now() + sessionIdleMilliseconds };
    await vi.advanceTimersByTimeAsync(20 * 60_000);
    controller.accept(cached);
    actions.read.mockRejectedValue("unauthorized");
    await vi.advanceTimersByTimeAsync(10 * 60_000);
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
    other.actions.renew.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
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

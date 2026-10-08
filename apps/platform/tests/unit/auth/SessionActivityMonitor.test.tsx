// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("@/platform/auth/ClientSessionService", () => ({
  clientSessionService: { read: vi.fn(), renew: vi.fn() },
}));

import { ClientRequestError } from "@/lib/client-http";
import { clientSessionService } from "@/platform/auth/ClientSessionService";
import { sessionIdleMilliseconds } from "@/platform/auth/SessionPolicy";
import { SessionActivityMonitor } from "@/platform/auth/ui/SessionActivity";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root;
let client: QueryClient;
const channels: FakeChannel[] = [];

class FakeChannel extends EventTarget {
  postMessage = vi.fn();
  close = vi.fn();

  constructor() {
    super();
    channels.push(this);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-08T10:00:00Z"));
  vi.stubGlobal("BroadcastChannel", FakeChannel);
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  window.history.replaceState(null, "", "/portal/applications?tab=drafts");
  vi.spyOn(window.location, "replace").mockImplementation(() => {});
  vi.mocked(clientSessionService.read).mockImplementation(async () => ({
    expiresAt: Date.now() + sessionIdleMilliseconds,
  }));
  vi.mocked(clientSessionService.renew).mockImplementation(async () => ({
    expiresAt: Date.now() + sessionIdleMilliseconds,
  }));
  root = createRoot(document.createElement("div"));
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  channels.splice(0);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function mount() {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <SessionActivityMonitor />
      </QueryClientProvider>,
    );
  });
  await act(async () => vi.advanceTimersByTimeAsync(1));
}

function interaction(trusted: boolean) {
  const event = new Event("keydown");
  Object.defineProperty(event, "isTrusted", { value: trusted });
  window.dispatchEvent(event);
}

it.each(["scroll", "keydown"])(
  "renews for %s inside a panel even when the event does not reach the bubble listener",
  async (eventName) => {
    await mount();
    const panel = document.createElement("div");
    document.body.append(panel);
    panel.addEventListener(eventName, (event) => event.stopPropagation());
    const event = new Event(eventName, { bubbles: eventName !== "scroll" });
    Object.defineProperty(event, "isTrusted", { value: true });

    try {
      await act(async () => panel.dispatchEvent(event));
      await act(async () => vi.advanceTimersByTimeAsync(60_000));
      expect(clientSessionService.renew).toHaveBeenCalledOnce();
    } finally {
      panel.remove();
    }
  },
);

it("ignores synthetic and hidden-tab events, and does not renew for focus", async () => {
  await mount();
  await act(async () => interaction(false));
  await act(async () => vi.advanceTimersByTimeAsync(60_000));
  expect(clientSessionService.renew).not.toHaveBeenCalled();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  await act(async () => interaction(true));
  await act(async () => vi.advanceTimersByTimeAsync(60_000));
  expect(clientSessionService.renew).not.toHaveBeenCalled();
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(clientSessionService.read).toHaveBeenCalledTimes(2);
  expect(clientSessionService.renew).not.toHaveBeenCalled();
});

it("renews for real visible activity and broadcasts only the deadline", async () => {
  await mount();
  const activityAt = Date.now();
  await act(async () => interaction(true));
  await act(async () => vi.advanceTimersByTimeAsync(60_000));
  expect(clientSessionService.renew).toHaveBeenCalledExactlyOnceWith(
    activityAt,
    expect.any(Object),
  );
  expect(channels[0].postMessage).toHaveBeenCalledWith({
    expiresAt: expect.any(Number),
  });
});

it("clears private caches and preserves the return destination when renewal is denied", async () => {
  await mount();
  client.setQueryData(["private-application"], { private: true });
  vi.mocked(clientSessionService.renew).mockRejectedValueOnce(
    new ClientRequestError("Expired", 401),
  );
  await act(async () => interaction(true));
  await act(async () => vi.advanceTimersByTimeAsync(60_000));
  expect(client.getQueryData(["private-application"])).toBeUndefined();
  expect(window.location.replace).toHaveBeenCalledWith(
    "/sign-in?returnTo=%2Fportal%2Fapplications%3Ftab%3Ddrafts",
  );
});

it("ends the local session on another tab's logout and cleans up its channel", async () => {
  await mount();
  client.setQueryData(["private-application"], { private: true });
  await act(async () => {
    channels[0].dispatchEvent(new MessageEvent("message", { data: { ended: true } }));
  });
  expect(client.getQueryData(["private-application"])).toBeUndefined();
  expect(window.location.replace).toHaveBeenCalled();
  await act(async () => interaction(true));
  await act(async () => vi.advanceTimersByTimeAsync(60_000));
  expect(clientSessionService.renew).not.toHaveBeenCalled();
});

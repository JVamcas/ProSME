"use client";

import { requestJson } from "@/lib/client-http";

import type { SessionActivityView } from "./SessionPolicy";

type SessionActivityResponse = SessionActivityView & { serverNow: number };

function localDeadline(response: SessionActivityResponse): SessionActivityView {
  return {
    expiresAt: Date.now() + Math.max(0, response.expiresAt - response.serverNow),
  };
}

async function read(signal?: AbortSignal) {
  const response = await requestJson<SessionActivityResponse>("/api/auth/session/activity", {
    cache: "no-store",
    signal,
  });
  return localDeadline(response);
}

async function renew(lastActivityAt: number) {
  const response = await requestJson<SessionActivityResponse>("/api/auth/session/activity", {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "x-session-activity": "1",
    },
    body: JSON.stringify({
      idleForMilliseconds: Math.max(0, Date.now() - lastActivityAt),
    }),
    method: "POST",
  });
  return localDeadline(response);
}

function announceEnded() {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel("smefund:session-activity");
  channel.postMessage({ ended: true });
  channel.close();
}

export const clientSessionService = { announceEnded, read, renew };

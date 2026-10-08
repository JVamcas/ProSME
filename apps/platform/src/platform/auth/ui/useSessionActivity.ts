"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { ClientRequestError } from "@/lib/client-http";
import { authNavigationHref } from "../AuthNavigation";
import { clientSessionService } from "../ClientSessionService";
import type { SessionActivityView } from "../SessionPolicy";
import { SessionActivityController } from "./SessionActivityController";

const sessionActivityKey = ["auth", "session-activity"] as const;
const activityEvents = [
  "pointerdown",
  "pointermove",
  "keydown",
  "scroll",
  "touchstart",
];

function isUnauthorized(error: unknown) {
  return error instanceof ClientRequestError && error.status === 401;
}

function isProtectedPath() {
  return /^\/(portal|admin|cms)(\/|$)/.test(window.location.pathname);
}

function expireClientSession(queryClient: QueryClient) {
  void queryClient.cancelQueries();
  queryClient.clear();
  if (isProtectedPath()) {
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.replace(authNavigationHref("/sign-in", returnTo));
  }
}

export function useSessionActivity() {
  const queryClient = useQueryClient();
  const controller = useRef<SessionActivityController | null>(null);
  const session = useQuery({
    queryKey: sessionActivityKey,
    queryFn: ({ signal }) => clientSessionService.read(signal),
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const { mutateAsync: renewSession } = useMutation({
    mutationFn: clientSessionService.renew,
    retry: false,
    onSuccess: (data) => queryClient.setQueryData(sessionActivityKey, data),
  });

  useEffect(() => {
    let disposed = false;
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel("smefund:session-activity");
    function expire() {
      if (disposed) return;
      expireClientSession(queryClient);
    }
    const activity = new SessionActivityController({
      read: async () => {
        const data = await clientSessionService.read();
        if (!disposed) queryClient.setQueryData(sessionActivityKey, data);
        return data;
      },
      renew: (lastActivityAt) => renewSession(lastActivityAt),
      isUnauthorized,
      expired: expire,
      renewed: (data) => channel?.postMessage(data),
    });
    controller.current = activity;

    function observe(event: Event) {
      if (event.isTrusted && document.visibilityState === "visible") {
        activity.activity();
      }
    }
    function checkVisibility() {
      if (document.visibilityState === "visible") void activity.check();
    }
    function receive(event: MessageEvent<SessionActivityView | { ended: true }>) {
      const data = event.data;
      if (data && "ended" in data && data.ended) {
        activity.stop();
        expire();
      } else if (data && "expiresAt" in data && Number.isFinite(data.expiresAt)) {
        activity.accept(data);
        queryClient.setQueryData(sessionActivityKey, data);
      }
    }
    activityEvents.forEach((event) => {
      // Capture includes nested scrolling and controls that stop propagation.
      window.addEventListener(event, observe, { capture: true, passive: true });
    });
    document.addEventListener("visibilitychange", checkVisibility);
    window.addEventListener("focus", checkVisibility);
    channel?.addEventListener("message", receive);
    return () => {
      disposed = true;
      activity.stop();
      controller.current = null;
      activityEvents.forEach((event) => {
        window.removeEventListener(event, observe, { capture: true });
      });
      document.removeEventListener("visibilitychange", checkVisibility);
      window.removeEventListener("focus", checkVisibility);
      channel?.close();
    };
  }, [queryClient, renewSession]);

  useEffect(() => {
    if (session.data) controller.current?.accept(session.data);
    if (isUnauthorized(session.error) && isProtectedPath()) {
      expireClientSession(queryClient);
    }
  }, [session.data, session.error, queryClient]);
}

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const refreshIntervalMs = 30_000;
const minimumRefreshGapMs = 5_000;

export function PublicContentRefresh() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let lastRefresh = Number.NEGATIVE_INFINITY;

    function refresh() {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefresh < minimumRefreshGapMs) return;
      lastRefresh = now;
      router.refresh();
    }

    // Refresh retained layouts and pages restored from the browser router cache.
    refresh();
    const interval = window.setInterval(refresh, refreshIntervalMs);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname, router]);

  return null;
}

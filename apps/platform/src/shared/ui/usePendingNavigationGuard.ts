"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function usePendingNavigationGuard(pending: boolean) {
  const router = useRouter();
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);
  const allowExternalNavigation = useRef(false);

  useEffect(() => {
    if (!pending) return;

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (allowExternalNavigation.current) return;
      event.preventDefault();
      event.returnValue = "";
    }

    function warnBeforeNavigation(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0
        || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.hasAttribute("download")
        || (link.target && link.target !== "_self")) return;
      if (link.href === window.location.href) return;
      event.preventDefault();
      setPendingNavigationHref(link.href);
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", warnBeforeNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", warnBeforeNavigation, true);
    };
  }, [pending]);

  function confirmNavigation() {
    if (!pendingNavigationHref) return;
    const destination = new URL(pendingNavigationHref);
    setPendingNavigationHref(null);
    if (destination.origin === window.location.origin) {
      router.push(`${destination.pathname}${destination.search}${destination.hash}`);
      return;
    }
    allowExternalNavigation.current = true;
    window.location.assign(destination.href);
  }

  return {
    cancelNavigation: () => setPendingNavigationHref(null),
    confirmNavigation,
    pendingNavigationHref,
  };
}

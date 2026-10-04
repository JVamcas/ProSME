"use client";

import { LoaderCircle } from "lucide-react";
import { useLinkStatus } from "next/link";

export function NavigationPendingIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span aria-busy="true" className="shrink-0" role="status">
      <LoaderCircle
        aria-hidden="true"
        className="size-4 animate-spin motion-reduce:animate-none"
      />
      <span className="sr-only">Opening page</span>
    </span>
  );
}

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { IconButton } from "@/components/ui/button";

export function PublicFundingCallRail({ children }: { children: ReactNode }) {
  const railRef = useRef<HTMLDivElement>(null);

  function scroll(direction: -1 | 1) {
    const rail = railRef.current;
    if (!rail) return;
    const distance = Math.min(rail.clientWidth * 0.85, 420);
    rail.scrollBy({ behavior: "smooth", left: direction * distance });
  }

  return (
    <div>
      <div className="mb-3 flex justify-end gap-2">
        <IconButton
          compact
          label="Previous funding calls"
          onClick={() => scroll(-1)}
          variant="outline"
        >
          <ChevronLeft aria-hidden className="size-4" />
        </IconButton>
        <IconButton
          compact
          label="Next funding calls"
          onClick={() => scroll(1)}
          variant="outline"
        >
          <ChevronRight aria-hidden className="size-4" />
        </IconButton>
      </div>
      <div
        aria-label="Funding calls"
        className="-mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-4 [scrollbar-color:var(--color-brand-blue)_transparent] [scrollbar-width:thin]"
        ref={railRef}
        role="region"
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}

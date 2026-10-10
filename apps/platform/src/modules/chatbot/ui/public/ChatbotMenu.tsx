"use client";

import { MoreHorizontal } from "lucide-react";
import { GeneralButton } from "@/shared/ui/Button";
import { ArrowLink } from "@/shared/ui/Links";
import { publicFundingHref } from "@/modules/funding-calls/domain/PublicFundingCallLinks";

export function ChatbotMenu({
  busy,
  onNavigate,
  onReset,
}: {
  busy: boolean;
  onNavigate: () => void;
  onReset: () => void;
}) {
  return (
    <details className="group relative">
      <summary
        aria-label="Conversation options"
        tabIndex={0}
        className="grid size-10 cursor-pointer list-none place-items-center rounded-full hover:bg-brand-cream focus-visible:outline-2 focus-visible:outline-brand-orange [&::-webkit-details-marker]:hidden"
      >
        <MoreHorizontal aria-hidden="true" className="size-5" />
      </summary>
      <nav
        aria-label="Programme help"
        className="absolute top-12 right-0 z-10 w-56 space-y-3 rounded-xl border border-brand-navy/10 bg-white p-4 shadow-lg"
      >
        <ArrowLink href={publicFundingHref} onClick={onNavigate}>
          Funding calls
        </ArrowLink>
        <ArrowLink href="/faq" onClick={onNavigate}>
          FAQs
        </ArrowLink>
        <ArrowLink href="/contact" onClick={onNavigate}>
          Contact the team
        </ArrowLink>
        <ArrowLink href="/privacy" onClick={onNavigate}>
          Privacy notice
        </ArrowLink>
        <GeneralButton
          variant="ghost"
          size="compact"
          disabled={busy}
          onClick={(event) => {
            onReset();
            event.currentTarget.closest("details")?.removeAttribute("open");
          }}
        >
          Start a new conversation
        </GeneralButton>
      </nav>
    </details>
  );
}

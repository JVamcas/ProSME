"use client";

import type { ChatbotNotice } from "../../domain/ChatbotConversation";

export function ChatbotPrivacyNotice({ notice }: { notice: ChatbotNotice }) {
  return (
    <div className="space-y-1 text-center text-[11px] leading-4 text-brand-navy/65">
      <p>AI answers may be inaccurate. Don’t share personal or application details.
      </p>
    </div>
  );
}

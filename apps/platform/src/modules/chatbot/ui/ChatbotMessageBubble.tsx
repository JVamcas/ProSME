import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./ChatbotMessageBubble.module.css";

export function ChatbotMessageBubble({
  children,
  sender,
  showAvatar = false,
  appearance = "public",
  senderLabel,
}: {
  children: ReactNode;
  sender: "assistant" | "visitor";
  showAvatar?: boolean;
  appearance?: "public" | "support";
  senderLabel?: string;
}) {
  return (
    <div className={styles.row}>
      {showAvatar ? (
        <MessageCircle
          aria-hidden="true"
          className="mt-2 size-5 shrink-0 text-brand-orange"
        />
      ) : null}
      <div
        className={cn(
          styles.bubble,
          styles[sender],
          appearance === "support" && styles.support,
        )}
        data-chat-sender={sender}
      >
        <h3 className="sr-only">
          {senderLabel ??
            (sender === "assistant" ? "Programme assistant" : "You")}
        </h3>
        {children}
      </div>
    </div>
  );
}

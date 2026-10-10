import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./ChatbotMessageBubble.module.css";

export function ChatbotMessageBubble({
  children,
  sender,
  showAvatar = false,
}: {
  children: ReactNode;
  sender: "assistant" | "visitor";
  showAvatar?: boolean;
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
        className={cn(styles.bubble, styles[sender])}
        data-chat-sender={sender}
      >
        <h3 className="sr-only">
          {sender === "assistant" ? "Programme assistant" : "You"}
        </h3>
        {children}
      </div>
    </div>
  );
}

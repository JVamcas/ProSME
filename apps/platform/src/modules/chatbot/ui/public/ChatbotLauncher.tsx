"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { GeneralButton } from "@/shared/ui/Button";
import styles from "./ChatbotLauncher.module.css";

const label = "Ask about funding";

export function ChatbotLauncher({
  open,
  onOpen,
}: {
  open: boolean;
  onOpen: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [letters, setLetters] = useState(0);

  useEffect(() => {
    if (!expanded) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let typing: ReturnType<typeof setInterval> | undefined;

    if (!motion.matches) {
      let count = 0;
      typing = setInterval(() => {
        count += 1;
        setLetters(count);
        if (count === label.length) clearInterval(typing);
      }, 65);
    }

    function motionChanged() {
      if (motion.matches) {
        clearInterval(typing);
        setLetters(label.length);
      }
    }

    motion.addEventListener("change", motionChanged);
    return () => {
      clearInterval(typing);
      motion.removeEventListener("change", motionChanged);
    };
  }, [expanded]);

  function collapse() {
    setExpanded(false);
    setLetters(0);
  }

  return (
    <GeneralButton
      className="fixed right-4 bottom-16 z-60 h-12 gap-0 px-4 shadow-lg"
      variant="navy"
      aria-label={label}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onOpen}
      onPointerEnter={(event) => {
        if (event.pointerType === "touch") return;
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        setLetters(motion.matches ? label.length : 0);
        setExpanded(true);
      }}
      onPointerLeave={collapse}
    >
      <MessageCircle aria-hidden="true" className="size-5" />
      <span
        aria-hidden="true"
        className={styles.label}
        data-expanded={expanded}
      >
        <span className={styles.content}>
          <span className={styles.measure}>{label}</span>
          <span className={styles.typed}>{label.slice(0, letters)}</span>
        </span>
      </span>
    </GeneralButton>
  );
}

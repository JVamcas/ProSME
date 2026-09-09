"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

const steps = [
  { title: "Check eligibility", text: "See if your business qualifies.", href: "/eligibility" },
  { title: "Prepare & apply", text: "Submit your application and supporting documents.", href: "/how-to-apply" },
  { title: "Assessment", text: "Applications are reviewed against set criteria.", href: "/how-to-apply" },
  { title: "Receive support", text: "Successful businesses receive funding and business development support.", href: "/funding" },
];

export function FundingProcess() {
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    const delay = completed === steps.length ? 1600 : 900;
    const timer = window.setTimeout(() => {
      setCompleted((current) => current === steps.length ? 0 : current + 1);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [completed]);

  return (
    <div className="process-sequence mt-9 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {steps.map(({ title, text, href }, index) => {
        const isComplete = index < completed;
        const isActive = index === completed;

        return (
          <Link
            href={href}
            key={title}
            className={`process-step group grid grid-cols-[44px_1fr_18px] gap-4 ${isComplete ? "is-complete" : ""} ${isActive ? "is-active" : ""}`}
          >
            <span className="process-step-badge grid size-11 place-items-center rounded-full text-lg font-bold text-white">
              {isComplete ? (
                <Check key="check" className="process-step-check size-5" strokeWidth={3} />
              ) : (
                <span key="number" className="process-step-number">{index + 1}</span>
              )}
            </span>
            <span>
              <strong className="block text-sm text-navy">{title}</strong>
              <span className="mt-1 block text-xs leading-4 text-slate-600">{text}</span>
            </span>
            <ArrowRight className="mt-3 size-4 text-[#0874b9] transition group-hover:translate-x-1" />
          </Link>
        );
      })}
    </div>
  );
}

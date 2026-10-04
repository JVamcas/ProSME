"use client";

import { TriangleAlert } from "lucide-react";

import { GeneralButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PortalErrorStateProps = {
  className?: string;
  headingLevel?: 1 | 2;
  actionLabel?: string;
  description: React.ReactNode;
  onAction?: () => void;
  title: React.ReactNode;
};

export function PortalErrorState({
  className,
  headingLevel = 1,
  actionLabel = "Try again",
  description,
  onAction,
  title,
}: PortalErrorStateProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div
      className={cn(
        "mx-auto mt-16 max-w-lg rounded-2xl bg-brand-white p-6 shadow-sm",
        className,
      )}
      role="alert"
    >
      <TriangleAlert aria-hidden="true" className="size-7 text-red-600" />
      <Heading className="mt-4 text-xl font-bold text-brand-navy">
        {title}
      </Heading>
      <p className="mt-2 text-sm leading-6 text-brand-orange">{description}</p>
      {onAction ? (
        <GeneralButton className="mt-5" onClick={onAction}>
          {actionLabel}
        </GeneralButton>
      ) : null}
    </div>
  );
}

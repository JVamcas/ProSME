"use client";

import { TriangleAlert } from "lucide-react";

import { GeneralButton } from "@/components/ui/button";

type PortalErrorStateProps = {
  actionLabel?: string;
  description: React.ReactNode;
  onAction?: () => void;
  title: React.ReactNode;
};

export function PortalErrorState({
  actionLabel = "Try again",
  description,
  onAction,
  title,
}: PortalErrorStateProps) {
  return (
    <div
      className="mx-auto mt-16 max-w-lg rounded-2xl bg-brand-cream p-6 shadow-sm"
      role="alert"
    >
      <TriangleAlert
        aria-hidden="true"
        className="size-7 text-brand-red"
      />
      <h1 className="mt-4 text-xl font-bold text-brand-navy">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-brand-navy/75">
        {description}
      </p>
      {onAction ? (
        <GeneralButton className="mt-5" onClick={onAction}>
          {actionLabel}
        </GeneralButton>
      ) : null}
    </div>
  );
}

"use client";

import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

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
      className="mx-auto mt-16 max-w-lg rounded-2xl border border-brand-navy bg-brand-cream p-6 shadow-sm"
      role="alert"
    >
      <TriangleAlert
        aria-hidden="true"
        className="size-7 text-brand-orange"
      />
      <h1 className="mt-4 text-xl font-bold text-brand-navy">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-brand-navy/75">
        {description}
      </p>
      {onAction ? (
        <Button className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

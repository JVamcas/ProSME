"use client";

import { useCapabilities } from "./capability-context";

type CapabilityGateProps = {
  all?: readonly string[];
  any?: readonly string[];
  capability?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  mode?: "fallback" | "forbidden" | "hide";
  resourceAllowed?: boolean;
};

export function isCapabilityAllowed(
  granted: ReadonlySet<string>,
  requirement: Omit<
    CapabilityGateProps,
    "children" | "fallback" | "mode"
  >,
) {
  const singleAllowed =
    !requirement.capability || granted.has(requirement.capability);
  const allAllowed =
    !requirement.all ||
    requirement.all.every((item) => granted.has(item));
  const anyAllowed =
    !requirement.any ||
    requirement.any.some((item) => granted.has(item));

  return (
    singleAllowed &&
    allAllowed &&
    anyAllowed &&
    requirement.resourceAllowed !== false
  );
}

function deniedContent(
  mode: CapabilityGateProps["mode"],
  fallback: React.ReactNode,
) {
  if (mode === "fallback") {
    return fallback;
  }

  if (mode === "forbidden") {
    return (
      fallback ?? (
        <p role="alert" className="text-sm font-semibold text-brand-navy">
          You do not have permission to view this content.
        </p>
      )
    );
  }

  return null;
}

export function CapabilityGate({
  children,
  fallback = null,
  mode = "hide",
  ...requirement
}: CapabilityGateProps) {
  const granted = useCapabilities();

  if (isCapabilityAllowed(granted, requirement)) {
    return children;
  }

  return deniedContent(mode, fallback);
}

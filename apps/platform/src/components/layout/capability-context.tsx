"use client";

import { createContext, useContext } from "react";

import type { PortalContext } from "@/modules/profiles/profile.types";

const PortalCapabilityContext = createContext<PortalContext | null>(null);

export function CapabilityProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: PortalContext;
}) {
  return (
    <PortalCapabilityContext.Provider value={value}>
      {children}
    </PortalCapabilityContext.Provider>
  );
}

export function usePortalContext() {
  const context = useContext(PortalCapabilityContext);

  if (!context) {
    throw new Error("usePortalContext must be used inside CapabilityProvider");
  }

  return context;
}

export function useCapabilities() {
  return new Set(usePortalContext().capabilityCodes);
}

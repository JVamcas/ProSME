"use client";

import { createContext, useContext, type ReactNode } from "react";

const NavigationDataContext = createContext<(href: string) => void>(() => {});

export function NavigationDataProvider({
  children,
  onNavigate,
}: {
  children: ReactNode;
  onNavigate: (href: string) => void;
}) {
  return (
    <NavigationDataContext.Provider value={onNavigate}>
      {children}
    </NavigationDataContext.Provider>
  );
}

export function useNavigationData() {
  return useContext(NavigationDataContext);
}

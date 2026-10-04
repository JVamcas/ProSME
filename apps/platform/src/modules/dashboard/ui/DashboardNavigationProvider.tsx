"use client";

import type { ReactNode } from "react";
import { NavigationDataProvider } from "@/shared/ui/portal/useNavigationData";
import { useDashboardNavigation } from "./useDashboardNavigation";

export function DashboardNavigationProvider({
  audience,
  children,
}: {
  audience: "staff" | "applicant";
  children: ReactNode;
}) {
  const onNavigate = useDashboardNavigation(audience);
  return (
    <NavigationDataProvider onNavigate={onNavigate}>
      {children}
    </NavigationDataProvider>
  );
}

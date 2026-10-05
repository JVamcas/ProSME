"use client";

import { NavigationList } from "../navigation/NavigationList";
import { useNavigationData } from "./useNavigationData";
import type { PortalRoute } from "./portal-navigation";

export function PortalNavList({
  collapsed = false,
  dark = false,
  onRequestExpand,
  routes,
}: {
  collapsed?: boolean;
  dark?: boolean;
  onRequestExpand?: () => void;
  routes: readonly PortalRoute[];
}) {
  const prepareData = useNavigationData();

  return (
    <NavigationList
      collapsed={collapsed}
      dark={dark}
      onNavigate={prepareData}
      onRequestExpand={onRequestExpand}
      routes={routes}
    />
  );
}

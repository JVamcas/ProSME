"use client";

import { Children, useEffect, useState } from "react";

import { permissionCodes } from "@/auth/authorization/permissions";
import { Tabs, type TabItem } from "@/components/ui/tabs";

export type ProfileTabId = "contact" | "password" | "personal";

type ProfileWorkspaceProps = {
  defaultTabId: ProfileTabId;
  allowedTabIds: readonly ProfileTabId[];
  children: React.ReactNode;
};

export type ProfileTabItem = {
  id: ProfileTabId;
  label: string;
  requiredCapability: string;
};

export const profileTabs: readonly ProfileTabItem[] = [
  {
    id: "personal",
    label: "Personal information",
    requiredCapability: permissionCodes.userProfileOwnRead,
  },
  {
    id: "contact",
    label: "Contact details",
    requiredCapability: permissionCodes.userProfileOwnRead,
  },
  {
    id: "password",
    label: "Change password",
    requiredCapability: permissionCodes.userProfileOwnRead,
  },
];

export function ProfileWorkspace({
  defaultTabId,
  allowedTabIds,
  children,
}: ProfileWorkspaceProps) {
  const [selectedTabId, setSelectedTabId] = useState(defaultTabId);
  const panels = Children.toArray(children);
  const items: TabItem<ProfileTabId>[] = profileTabs
    .filter((item) => allowedTabIds.includes(item.id))
    .map((item, index) => ({
      content: panels[index],
      id: item.id,
      label: item.label,
    }));

  useEffect(() => {
    const selectTabFromUrl = () => {
      const tab = new URL(window.location.href).searchParams.get("tab");

      if (allowedTabIds.includes(tab as ProfileTabId)) {
        setSelectedTabId(tab as ProfileTabId);
      }
    };

    window.addEventListener("popstate", selectTabFromUrl);
    return () => window.removeEventListener("popstate", selectTabFromUrl);
  }, [allowedTabIds]);

  function selectTab(tabId: ProfileTabId) {
    const url = new URL(window.location.href);

    url.searchParams.set("tab", tabId);
    window.history.pushState(null, "", url);
    setSelectedTabId(tabId);
  }

  return (
    <div className="mt-6">
      <Tabs
        ariaLabel="Profile sections"
        defaultSelectedId={defaultTabId}
        items={items}
        onSelectionChange={selectTab}
        selectedId={selectedTabId}
      />
    </div>
  );
}

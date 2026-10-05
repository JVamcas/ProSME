"use client";

import {
  House,
  Image,
  LayoutGrid,
  ListOrdered,
  Users,
  FilePlus2,
} from "lucide-react";
import { NavigationList } from "@/shared/ui/navigation/NavigationList";
import { homeEditorSections } from "./HomeEditorSections";

const homeSectionIcons = {
  banner: Image,
  "action-cards": LayoutGrid,
  "how-it-works": ListOrdered,
  "who-we-support": Users,
  "additional-content": FilePlus2,
};

const homeRoutes = [
  {
    id: "cms-home",
    href: "/cms/home",
    label: "Home Page",
    icon: House,
    children: Object.entries(homeSectionIcons).map(([section, icon]) => {
      const editor =
        homeEditorSections[section as keyof typeof homeEditorSections];
      return {
        id: `cms-home-${section}`,
        href: editor.href,
        label: editor.title,
        icon,
      };
    }),
  },
];

export default function CmsNavigationLinks({
  collapsed = false,
  onNavigate,
  onRequestExpand,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
  onRequestExpand?: () => void;
}) {
  return (
    <NavigationList
      collapsed={collapsed}
      dark
      label="Content management navigation"
      onNavigate={onNavigate}
      onRequestExpand={onRequestExpand}
      routes={homeRoutes}
    />
  );
}

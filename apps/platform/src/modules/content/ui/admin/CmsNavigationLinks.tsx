"use client";

import {
  House,
  Image,
  LayoutGrid,
  ListOrdered,
  Users,
  FilePlus2,
  Info,
  Library,
} from "lucide-react";
import {
  NavigationList,
  type NavigationRoute,
} from "@/shared/ui/navigation/NavigationList";
import { homeEditorSections } from "./HomeEditorSections";

const homeSectionIcons = {
  banner: Image,
  "action-cards": LayoutGrid,
  "how-it-works": ListOrdered,
  "who-we-support": Users,
  "additional-content": FilePlus2,
};

const contentRoutes: readonly NavigationRoute[] = [
  {
    id: "cms-home",
    section: "content",
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
  {
    id: "cms-about",
    section: "content",
    href: "/cms/about",
    label: "About",
    icon: Info,
  },
  {
    id: "cms-resources",
    section: "content",
    href: "/cms/collections/resources",
    label: "Resource Centre",
    icon: Library,
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
      routes={contentRoutes}
    />
  );
}

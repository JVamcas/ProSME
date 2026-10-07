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
  ClipboardList,
  Coins,
  CircleHelp,
  Mail,
} from "lucide-react";
import {
  NavigationList,
  type NavigationRoute,
} from "@/shared/ui/navigation/NavigationList";
import { homeEditorSections } from "./HomeEditorSections";
import {
  cmsFundingHref,
  cmsFundingOverviewHref,
  cmsPageEditors,
} from "../../CmsPageEditors";

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
  {
    id: "cms-funding",
    section: "content",
    href: cmsFundingHref,
    label: "Funding",
    icon: Coins,
    children: [
      {
        id: "cms-funding-overview",
        href: cmsFundingOverviewHref,
        label: "Overview",
        icon: Info,
      },
      {
        id: "cms-funding-application-guide",
        href: cmsPageEditors["how-to-apply"].href,
        label: "Application guide",
        icon: ClipboardList,
      },
    ],
  },
  {
    id: "cms-faq",
    section: "content",
    href: cmsPageEditors.faq.href,
    label: "FAQ",
    icon: CircleHelp,
  },
  {
    id: "cms-contact",
    section: "content",
    href: "/cms/contact",
    label: "Contact Us",
    icon: Mail,
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

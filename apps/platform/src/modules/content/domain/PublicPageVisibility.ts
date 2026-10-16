import { z } from "zod";

export type PublicPageNode = {
  key: string;
  label: string;
  paths?: readonly string[];
  locked?: boolean;
  children?: readonly PublicPageNode[];
};

// Stable keys describe public pages and sections, independently of CMS URLs.
export const publicPageTree: readonly PublicPageNode[] = [
  {
    key: "home",
    label: "Home Page",
    paths: ["/"],
    locked: true,
    children: [
      { key: "home.banner", label: "Banner" },
      { key: "home.action-cards", label: "Action cards" },
      { key: "home.how-it-works", label: "How it works" },
      { key: "home.who-we-support", label: "Who we support" },
      { key: "home.additional-content", label: "Additional Content" },
    ],
  },
  { key: "about", label: "About", paths: ["/about"] },
  { key: "resources", label: "Resource Centre", paths: ["/resources"] },
  { key: "events", label: "Events & Programmes", paths: ["/events"] },
  { key: "news", label: "News", paths: ["/news"] },
  {
    key: "funding",
    label: "Funding",
    paths: [
      "/funding",
      "/eligibility",
      "/how-to-apply/funding",
      "/how-to-apply/eligibility",
    ],
    children: [
      {
        key: "funding.overview",
        label: "Overview",
        children: [
          { key: "funding.overview.support", label: "What the fund supports" },
          { key: "funding.overview.priorities", label: "Priority applicants" },
          {
            key: "funding.overview.sectors",
            label: "Focus sectors",
          },
        ],
      },
      {
        key: "funding.application-guide",
        label: "Application guide",
        paths: ["/how-to-apply"],
      },
    ],
  },
  { key: "faq", label: "FAQ", paths: ["/faq"] },
  { key: "contact", label: "Contact Us", paths: ["/contact"] },
  { key: "account-creation", label: "Account creation", paths: ["/register"] },
];

function flatten(nodes: readonly PublicPageNode[]): PublicPageNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
}

export const publicPageNodes = flatten(publicPageTree);
const keys = new Set(publicPageNodes.map((node) => node.key));

export const publicPageVisibilitySchema = z
  .record(z.string(), z.boolean())
  .refine((value) => Object.keys(value).every((key) => keys.has(key)), {
    message: "Unknown public page or section.",
  })
  .refine((value) => value.home !== false, {
    message: "The home page must remain visible.",
  });

export type PublicPageVisibility = z.infer<typeof publicPageVisibilitySchema>;

export function normalizePublicPageVisibility(
  value: unknown,
): PublicPageVisibility {
  const parsed = publicPageVisibilitySchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : {};
}

export function isPublicPageVisible(
  visibility: PublicPageVisibility,
  key: string,
  nodes: readonly PublicPageNode[] = publicPageTree,
  parentVisible = true,
): boolean {
  for (const node of nodes) {
    const visible =
      parentVisible && (node.locked || visibility[node.key] !== false);
    if (node.key === key) return Boolean(visible);
    if (node.children) {
      const child = findVisibleChild(
        visibility,
        key,
        node.children,
        Boolean(visible),
      );
      if (child !== undefined) return child;
    }
  }
  return false;
}

function findVisibleChild(
  visibility: PublicPageVisibility,
  key: string,
  nodes: readonly PublicPageNode[],
  parentVisible: boolean,
): boolean | undefined {
  for (const node of nodes) {
    const visible = parentVisible && visibility[node.key] !== false;
    if (node.key === key) return visible;
    const child = findVisibleChild(
      visibility,
      key,
      node.children ?? [],
      visible,
    );
    if (child !== undefined) return child;
  }
  return undefined;
}

export function isPublicPathVisible(
  visibility: PublicPageVisibility,
  href: string,
): boolean {
  const pathname = href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  const matches = publicPageNodes.flatMap((node) =>
    (node.paths ?? [])
      .filter(
        (path) =>
          pathname === path ||
          (path !== "/" && pathname.startsWith(`${path}/`)),
      )
      .map((path) => ({ node, path })),
  );
  // A narrower child URL owns the route; its ancestors are checked recursively.
  const specific = matches.sort(
    (left, right) =>
      right.path.length - left.path.length ||
      right.node.key.length - left.node.key.length,
  )[0];
  return specific ? isPublicPageVisible(visibility, specific.node.key) : true;
}

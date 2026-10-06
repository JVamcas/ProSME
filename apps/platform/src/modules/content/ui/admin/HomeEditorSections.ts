import type { ClientField, FormState } from "payload";
import { homeBannerEditor } from "./HomeBannerEditorNavigation";
import { homeActionsEditor } from "./HomeActionsEditorNavigation";

export const homeEditorSections = {
  banner: {
    ...homeBannerEditor,
    fields: [
      "eyebrow",
      "title",
      "summary",
      "heroImage",
      "heroPanelHeading",
      "heroPanelSummary",
      "applyLabel",
      "fundingButtonLabel",
      "benefitFunding",
      "benefitCapacity",
      "benefitOpportunity",
    ],
  },
  "how-it-works": {
    title: "How it works",
    anchor: "home-how-it-works",
    href: "/cms/home/how-it-works",
    fields: ["process"],
  },
  "who-we-support": {
    title: "Who we support",
    anchor: "home-who-we-support",
    href: "/cms/home/who-we-support",
    fields: ["supportHeading", "supportIntroduction", "supportCards"],
  },
  "additional-content": {
    title: "Additional Content",
    anchor: "home-additional-content",
    href: "/cms/home/additional-content",
    fields: ["layout"],
  },
  "action-cards": {
    ...homeActionsEditor,
    fields: ["actionCards"],
  },
} as const;

export type HomeEditorSection = keyof typeof homeEditorSections;

export function homeEditorSectionForPath(
  pathname: string,
): HomeEditorSection | undefined {
  return (Object.keys(homeEditorSections) as HomeEditorSection[]).find(
    (section) => homeEditorSections[section].href === pathname,
  );
}

export function homeEditorSelect(section: HomeEditorSection) {
  return Object.fromEntries(
    [...homeEditorSections[section].fields, "_status"].map(
      (name) => [name, true as const],
    ),
  );
}

export function homeEditorFields(
  fields: ClientField[],
  section: HomeEditorSection,
): ClientField[] {
  const select = homeEditorSelect(section);
  // Keep schema indices stable: Payload keys unnamed groups by their index.
  // Removing sibling entries would resolve the wrong server-rendered group.
  return fields.map((field): ClientField => {
    if ("name" in field && field.name) {
      return select[field.name]
        ? field
        : ({
            ...field,
            admin: { ...field.admin, hidden: true },
          } as ClientField);
    }

    if ("fields" in field) {
      const children = homeEditorFields(field.fields, section);
      const visible = children.some((child) => !child.admin?.hidden);
      return {
        ...field,
        fields: children,
        admin: { ...field.admin, hidden: !visible || field.admin?.hidden },
      } as ClientField;
    }

    return { ...field, admin: { ...field.admin, hidden: true } } as ClientField;
  });
}

export function homeEditorFormState(
  state: FormState,
  section: HomeEditorSection,
): FormState {
  const select = homeEditorSelect(section);
  return Object.fromEntries(
    Object.entries(state).filter(([path, field]) => {
      // Payload's presentation fields contain rendered components rather than
      // stored values. Keep these for the native group rendering.
      return field.disableFormData || select[path.split(".")[0]];
    }),
  );
}

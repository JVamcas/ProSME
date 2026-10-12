import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { GroupFieldClientProps } from "payload";

const fixture = vi.hoisted(() => ({
  publish: true,
  fields: {
    slug: { value: "synthetic-session" },
    _status: { value: "draft" },
    reviewStatus: { value: "draft" },
  },
}));
vi.mock("@payloadcms/ui", () => ({
  GroupField: () => null,
  useFormFields: (select: (value: unknown[]) => unknown) =>
    select([fixture.fields]),
  useDocumentInfo: () => ({
    id: 42,
    versionCount: 3,
    lastUpdateTime: Date.parse("2030-11-10T12:30:00Z"),
    initialData: {
      createdAt: "2030-11-10T10:00:00Z",
      updatedAt: "2030-11-10T12:30:00Z",
    },
  }),
}));
vi.mock("@/modules/content/ui/admin/useCmsDocumentActions", () => ({
  useCmsDocumentActions: () => ({
    hasSavePermission: true,
    hasPublishPermission: fixture.publish,
    canPublish: true,
    canSaveDraft: true,
    busy: false,
    saveDraft: vi.fn(),
    publish: vi.fn(),
  }),
}));
import CmsEventContentGroupField from "@/modules/content/ui/admin/CmsEventContentGroupField";
import CmsEventPublicationField from "@/modules/content/ui/admin/CmsEventPublicationField";
import CmsEventRegistrationPanel from "@/modules/content/ui/admin/CmsEventRegistrationPanel";
import CmsEventRecordingField from "@/modules/content/ui/admin/CmsEventRecordingField";
import { withAppFormInputs } from "@/payload/fields/withAppFormInputs";

const props = {
  field: { type: "group", fields: [], label: false },
} as unknown as GroupFieldClientProps;

describe("CMS event concept composition", () => {
  it("puts Preview and Publish in the header and Save draft in the footer", () => {
    const html = renderToStaticMarkup(<CmsEventContentGroupField {...props} />);
    const header = html.slice(
      html.indexOf("<header"),
      html.indexOf("</header>"),
    );
    const footer = html.slice(html.indexOf("<footer"));
    expect(header).toContain("Edit event");
    expect(header).toContain("Preview");
    expect(header).toContain("Publish");
    expect(header).not.toContain("Submit for review");
    expect(header).not.toContain("Save draft");
    expect(footer).toContain("Editorial");
    expect(footer).toContain("Save draft");
    expect(html).toContain("/api/preview?path=%2Fevents%2Fsynthetic-session");
  });

  it("preserves separate Publication, Registration and Recording panels", () => {
    const html = renderToStaticMarkup(
      <>
        <CmsEventPublicationField {...props} />
        <CmsEventRegistrationPanel />
        <CmsEventRecordingField {...props} />
      </>,
    );
    for (const label of [
      "Publication",
      "Status",
      "Version",
      "Last saved",
      "Registration",
      "Managed in Operations",
      "Open registrations",
      "Recording",
      "Publish after the session.",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain("/admin/events/42");
  });

  it("does not show Publish without publishing permission", () => {
    fixture.publish = false;
    try {
      const html = renderToStaticMarkup(
        <CmsEventContentGroupField {...props} />,
      );
      expect(html).not.toContain(">Publish<");
      expect(html).toContain("Save draft");
    } finally {
      fixture.publish = true;
    }
  });

  it("keeps custom category/timezone controls when adapting native fields", () => {
    expect(
      withAppFormInputs({
        name: "timezone",
        type: "text",
        admin: { components: { Field: "./CustomTimezone.tsx" } },
      }).admin?.components?.Field,
    ).toBe("./CustomTimezone.tsx");
    expect(
      withAppFormInputs({ name: "title", type: "text" }).admin?.components
        ?.Field,
    ).toContain("CmsFormInput");
  });
});

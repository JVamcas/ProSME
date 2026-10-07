import type { GlobalBeforeChangeHook, GroupFieldClientProps } from "payload";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  fields: {} as Record<string, { value: unknown }>,
}));

vi.mock("@payloadcms/ui", () => ({
  GroupField: ({ readOnly }: GroupFieldClientProps) => (
    <div data-native-fields data-read-only={readOnly} />
  ),
  useFormFields: (selector: (state: unknown[]) => unknown) => selector([state.fields]),
  useEditDepth: () => 1,
  useStepNav: () => ({ stepNav: [], setStepNav: vi.fn() }),
}));

import { cmsPermissionCode } from "@/auth/authorization/permissions";
import CmsContactDetailsGroupField from "@/modules/content/ui/admin/CmsContactDetailsGroupField";
import { ContactDetailsCards } from "@/modules/content/ui/public/ContactDetailsCards";
import { ContactDetails } from "@/payload/globals/ContactDetails";

const contact = {
  email: "office@example.test",
  phone: "+264 61 555 0100",
  address: "Programme office\nWindhoek, Namibia",
  officeHours: "Monday to Friday, 08:00–17:00",
};

beforeEach(() => {
  vi.clearAllMocks();
  state.fields = Object.fromEntries(
    Object.entries(contact).map(([name, value]) => [name, { value }]),
  );
});

describe("Contact Us CMS editor", () => {
  it("preserves existing stored paths and native email validation", () => {
    expect(ContactDetails.slug).toBe("contact-details");
    expect(ContactDetails.dbName).toBe("cms_contact_details");
    expect(ContactDetails.versions).toEqual({ drafts: true, max: 50 });
    const group = ContactDetails.fields[0];
    if (!("fields" in group)) throw new Error("Missing contact group");
    expect(group).not.toHaveProperty("name");
    expect(group.fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "email", type: "email", required: true }),
      expect.objectContaining({ name: "address", type: "textarea", required: true }),
      expect.objectContaining({ name: "phone", label: "Telephone", type: "text" }),
      expect.objectContaining({ name: "officeHours", type: "text" }),
    ]));
    expect(group.fields.find((field) => "name" in field && field.name === "phone"))
      .not.toHaveProperty("defaultValue");
  });

  it("shows edits in the same public cards and retains native read-only controls", () => {
    const html = renderToStaticMarkup(
      <CmsContactDetailsGroupField {...({ readOnly: true } as GroupFieldClientProps)} />,
    );
    expect(html).toContain("Contact Us");
    expect(html).toContain("Live contact details preview");
    expect(html).toContain('href="mailto:office@example.test"');
    expect(html).toContain('href="tel:+264 61 555 0100"');
    expect(html).toContain("Telephone");
    expect(html).toContain("Programme office\nWindhoek, Namibia");
    expect(html).toContain(contact.officeHours);
    expect(html).toContain('data-read-only="true"');
  });

  it.each([null, "", "   "])("hides absent optional details: %j", (empty) => {
    const html = renderToStaticMarkup(
      <ContactDetailsCards contact={{ ...contact, phone: empty, officeHours: empty }} />,
    );
    expect(html).toContain("Email");
    expect(html).toContain("Programme office");
    expect(html).not.toContain("Telephone");
    expect(html).not.toContain('href="tel:');
    expect(html).not.toContain(contact.officeHours);
  });

  it("previews the public contact route", () => {
    const preview = ContactDetails.admin?.preview;
    if (typeof preview !== "function") throw new Error("Missing contact preview");
    expect(preview({}, {} as never)).toBe("/api/preview?path=%2Fcontact");
  });
});

describe("Contact Us native publication permissions", () => {
  async function save(permissions: string[], data: Record<string, unknown>) {
    const guard = ContactDetails.hooks?.beforeChange?.[0];
    if (!guard) throw new Error("Missing publishing guard");
    return guard({
      data,
      originalDoc: { reviewStatus: "draft" },
      req: { user: { capabilities: permissions } },
    } as unknown as Parameters<GlobalBeforeChangeHook>[0]);
  }

  it("requires site settings update permission for native writes", async () => {
    const update = ContactDetails.access?.update;
    if (!update) throw new Error("Missing contact update policy");
    const request = (capabilities: string[]) => ({
      req: { user: { capabilities } },
    }) as never;
    expect(await update(request([cmsPermissionCode("site-settings", "update")]))).toBe(true);
    expect(await update(request([cmsPermissionCode("pages", "update")]))).toBe(false);
    expect(await update(request([]))).toBe(false);
  });

  it("allows drafts and approves native Publish only with the site settings publish grant", async () => {
    await expect(save([cmsPermissionCode("site-settings", "update")], {
      _status: "draft", reviewStatus: "draft",
    })).resolves.toMatchObject({ _status: "draft", reviewStatus: "draft" });
    await expect(save([cmsPermissionCode("site-settings", "publish")], {
      _status: "published", reviewStatus: "draft",
    })).resolves.toMatchObject({ _status: "published", reviewStatus: "approved" });
    for (const grant of ["update", "read"] as const) {
      await expect(save([cmsPermissionCode("site-settings", grant)], {
        _status: "published", reviewStatus: "draft",
      })).rejects.toThrow("cms.site-settings.publish");
    }
    await expect(save([cmsPermissionCode("pages", "publish")], {
      _status: "published", reviewStatus: "draft",
    })).rejects.toThrow("cms.site-settings.publish");
  });

  it("rejects self-approval by an editor", async () => {
    await expect(save([cmsPermissionCode("site-settings", "update")], {
      _status: "draft", reviewStatus: "approved",
    })).rejects.toThrow("cms.site-settings.publish");
  });
});

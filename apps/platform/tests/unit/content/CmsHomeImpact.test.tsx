import { renderToStaticMarkup } from "react-dom/server";
import type {
  BlocksFieldClientProps,
  Field,
  FormState,
  GroupField,
  GroupFieldClientProps,
} from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

const editor = vi.hoisted(() => ({
  fields: {} as FormState,
  media: { id: 12, url: "/impact.jpg", alt: "Namibian mountains", width: 200 },
  mediaLoading: false,
  renderFields: vi.fn(),
  addFieldRow: vi.fn(),
  api: vi.fn(),
}));

vi.mock("@payloadcms/ui", () => ({
  GroupField: ({ readOnly }: GroupFieldClientProps) => (
    <div data-native-group data-read-only={readOnly} />
  ),
  RenderFields: (props: unknown) => {
    editor.renderFields(props);
    return <div data-native-fields />;
  },
  useFormFields: (selector: (state: [FormState]) => unknown) =>
    selector([editor.fields]),
  useConfig: () => ({ config: { routes: { api: "/api" } } }),
  usePayloadAPI: (url: string, options: unknown) => {
    editor.api(url, options);
    return [{
      data: url.includes("/media/")
        ? editor.media
        : { docs: [{ value: "7", label: "Funding Calls" }] },
      isError: false,
      isLoading: editor.mediaLoading,
    }];
  },
  useField: () => ({
    rows: editor.fields.layout.rows ?? [],
    disabled: false,
  }),
  useForm: () => ({ addFieldRow: editor.addFieldRow }),
}));

import { CmsHomeAdditionalGroupField } from "@/modules/content/ui/admin/CmsHomeListsGroupField";
import { CmsHomeImpactField } from "@/modules/content/ui/admin/CmsHomeImpactField";
import { useHomeImpactPreview } from "@/modules/content/ui/admin/useHomeImpactPreview";
import { homeEditorFormState } from "@/modules/content/ui/admin/HomeEditorSections";
import { homePageAdditionalFields } from "@/payload/fields/HomePageListsFields";
import { reduceFieldsToValues } from "payload/shared";

const fields = (homePageAdditionalFields[0] as GroupField).fields;
const layout = fields.find((field) => "name" in field && field.name === "layout");
const fieldProps = {
  field: layout,
  path: "layout",
  schemaPath: "homepage.layout",
  permissions: true,
} as BlocksFieldClientProps;

beforeEach(() => {
  vi.clearAllMocks();
  editor.media = {
    id: 12,
    url: "/impact.jpg",
    alt: "Namibian mountains",
    width: 200,
  };
  editor.mediaLoading = false;
  editor.fields = {
    layout: {
      value: 2,
      disableFormData: true,
      rows: [
        { id: "news", blockType: "resourceGrid" },
        { id: "impact", blockType: "statistics" },
      ],
    },
    "layout.0.id": { value: "news" },
    "layout.0.blockType": { value: "resourceGrid" },
    "layout.0.heading": { value: "Unrelated news heading" },
    "layout.1.id": { value: "impact" },
    "layout.1.blockType": { value: "statistics" },
    "layout.1.heading": { value: "Real businesses, lasting impact." },
    "layout.1.summary": { value: "Together we support MSME growth." },
    "layout.1.backgroundImage": { value: 12 },
    "layout.1.campaignMessage": { value: "Small Businesses. A Brighter Namibia" },
    "layout.1.items": { value: 1, disableFormData: true },
    "layout.1.items.0.value": { value: "200+" },
    "layout.1.items.0.label": { value: "MSMEs Targeted" },
    fundingSlogan: { value: "Existing funding slogan" },
    newsIntroduction: { value: "Existing news introduction" },
    title: { value: "Unrelated hero" },
    reviewStatus: { value: "draft" },
  } as FormState;
});

describe("Additional Content impact banner", () => {
  it("renders a live preview with all current impact copy, image and statistics", () => {
    const markup = renderToStaticMarkup(
      <CmsHomeAdditionalGroupField
        {...({ readOnly: true } as GroupFieldClientProps)}
      />,
    );
    expect(markup).toContain("Live impact banner preview");
    expect(markup).toContain("Real businesses, lasting impact.");
    expect(markup).toContain("Together we support MSME growth.");
    expect(markup).toContain("Small Businesses. A Brighter Namibia");
    expect(markup).toContain("200+");
    expect(markup).toContain("MSMEs Targeted");
    expect(markup).toContain("impact.jpg");
    expect(markup).toContain('alt="Namibian mountains"');
    expect(markup).toContain("inert");
    expect(markup).toContain('data-read-only="true"');
    expect(markup).not.toContain("Unrelated news heading");
    expect(markup).not.toContain("Existing funding slogan");
    editor.fields["layout.1.heading"].value = "Edited impact heading";
    expect(useHomeImpactPreview().heading).toBe("Edited impact heading");
  });

  it("renders only impact controls at their original native block paths", () => {
    renderToStaticMarkup(<CmsHomeImpactField {...fieldProps} readOnly />);
    const props = editor.renderFields.mock.calls[0][0];
    expect(props.parentPath).toBe("layout.1");
    expect(props.parentSchemaPath).toBe("homepage.layoutstatistics");
    expect(props.readOnly).toBe(true);
    expect(props.fields.map((field: Field) => "name" in field && field.name))
      .toEqual(["heading", "summary", "backgroundImage", "campaignMessage", "items"]);
    expect(editor.addFieldRow).not.toHaveBeenCalled();
  });

  it("keeps the other saved layout blocks intact when submitting impact edits", () => {
    const scoped = homeEditorFormState(editor.fields, "additional-content");
    expect(scoped).not.toHaveProperty("fundingSlogan");
    expect(scoped).not.toHaveProperty("newsIntroduction");
    expect(scoped).not.toHaveProperty("title");
    const values = reduceFieldsToValues(scoped, true);
    expect(values.layout).toEqual([
      { id: "news", blockType: "resourceGrid", heading: "Unrelated news heading" },
      {
        id: "impact",
        blockType: "statistics",
        heading: "Real businesses, lasting impact.",
        summary: "Together we support MSME growth.",
        backgroundImage: 12,
        campaignMessage: "Small Businesses. A Brighter Namibia",
        items: [{ value: "200+", label: "MSMEs Targeted" }],
      },
    ]);
  });

  it("uses published programme statistics when the banner has no custom items", () => {
    delete editor.fields["layout.1.items.0.value"];
    delete editor.fields["layout.1.items.0.label"];
    editor.fields["layout.1.items"].value = 0;
    expect(useHomeImpactPreview().items).toEqual([
      { value: "7", label: "Funding Calls" },
    ]);
    expect(editor.api).toHaveBeenCalledWith("/api/programme-statistics", {
      initialParams: {
        depth: 0,
        limit: 10,
        sort: "order",
        where: { _status: { equals: "published" } },
      },
    });
  });

  it("clears removed images and ignores responses for older selections", () => {
    expect(useHomeImpactPreview().backgroundImage?.url).toBe("/impact.jpg");
    editor.fields["layout.1.backgroundImage"].value = 13;
    expect(useHomeImpactPreview().backgroundImage).toBeUndefined();
    editor.fields["layout.1.backgroundImage"].value = null;
    expect(useHomeImpactPreview().backgroundImage).toBeUndefined();
  });
});

// @vitest-environment happy-dom

import type { ComponentType } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { SelectFieldClientProps, TextFieldClientProps, TextareaFieldClientProps } from "payload";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const editor = vi.hoisted(() => ({
  value: "Saved headline",
  disabled: false,
  showError: false,
  errorMessage: "Headline is required",
  setValue: vi.fn(),
  field: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@payloadcms/translations", () => ({
  getTranslation: (value: unknown) => value,
}));
vi.mock("@payloadcms/ui", () => ({
  withCondition: (component: ComponentType) => component,
  useTranslation: () => ({ i18n: {} }),
  useField: (options: { potentiallyStalePath: string }) => {
    editor.field(options);
    return { ...editor, path: options.potentiallyStalePath };
  },
  FieldDescription: ({ description }: { description?: string }) => <p>{description}</p>,
}));

import { CmsFormInput, CmsFormSelect, CmsFormTextarea } from "@/modules/content/ui/admin/CmsFormFields";
import { Homepage } from "@/payload/globals/Homepage";
import { Media } from "@/payload/collections/content/Media";
import { homePageBannerFields } from "@/payload/fields/HomePageBannerFields";
import { homePublishingFields, publishingFields } from "@/payload/fields/publishing";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const container = document.createElement("div");
let root: ReturnType<typeof createRoot>;
const textProps = {
  path: "title",
  field: {
    name: "title",
    type: "text",
    label: "Headline",
    required: true,
    maxLength: 80,
    admin: { description: "The large heading at the top of Home." },
  },
} as TextFieldClientProps;
const selectProps = {
  path: "reviewStatus",
  field: homePublishingFields[0],
} as SelectFieldClientProps;

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(editor, { value: "Saved headline", disabled: false, showError: false });
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("CMS app form controls", () => {
  it("uses the app input and sends changed values to Payload", async () => {
    await act(async () => root.render(<CmsFormInput {...textProps} />));
    const input = container.querySelector("input")!;
    expect(input.value).toBe("Saved headline");
    expect(input.className).toContain("rounded-xl");
    expect(input.required).toBe(true);
    expect(container.querySelector("label")?.htmlFor).toBe(input.id);
    expect(container.querySelector(`#${input.getAttribute("aria-describedby")}`)?.textContent)
      .toContain("The large heading");

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "New headline");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(editor.setValue).toHaveBeenCalledWith("New headline");
  });

  it("uses the app textarea for paragraph fields and displays Payload errors", async () => {
    editor.showError = true;
    const props = {
      ...textProps,
      field: { ...textProps.field, type: "textarea" },
    } as TextareaFieldClientProps;
    await act(async () => root.render(<CmsFormTextarea {...props} />));
    expect(container.querySelector("textarea")?.value).toBe("Saved headline");
    expect(container.querySelector("textarea")?.getAttribute("aria-invalid")).toBe("true");
    expect(container.textContent).toContain("Headline is required");
  });

  it("renders Review Status as the app select and keeps its persisted option values", async () => {
    editor.value = "inReview";
    await act(async () => root.render(<CmsFormSelect {...selectProps} />));
    const select = container.querySelector("select")!;
    expect(select.value).toBe("inReview");
    expect([...select.options].map((option) => option.value)).toEqual(["draft", "inReview", "approved"]);
    await act(async () => {
      select.value = "approved";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(editor.setValue).toHaveBeenCalledWith("approved");
  });

  it.each(["readOnly", "disabled"])("blocks text and select edits when %s", async (flag) => {
    editor.disabled = flag === "disabled";
    await act(async () => root.render(
      <>
        <CmsFormInput {...textProps} readOnly={flag === "readOnly"} />
        <CmsFormSelect {...selectProps} readOnly={flag === "readOnly"} />
      </>,
    ));
    expect(container.querySelector("input")?.disabled).toBe(true);
    expect(container.querySelector("select")?.disabled).toBe(true);
    const select = container.querySelector("select")!;
    await act(async () => select.dispatchEvent(new Event("change", { bubbles: true })));
    expect(editor.setValue).not.toHaveBeenCalled();
  });

  it("retains Payload validation with text constraints and select options", async () => {
    const validate = vi.fn().mockReturnValue("Validation failed");
    await act(async () => root.render(<CmsFormInput {...textProps} validate={validate} />));
    expect(await editor.field.mock.calls.at(-1)![0].validate("", {})).toBe("Validation failed");
    expect(validate).toHaveBeenLastCalledWith("", expect.objectContaining({ required: true, maxLength: 80 }));

    await act(async () => root.render(<CmsFormSelect {...selectProps} validate={validate} />));
    expect(await editor.field.mock.calls.at(-1)![0].validate("unknown", {})).toBe("Validation failed");
    expect(validate).toHaveBeenLastCalledWith("unknown", expect.objectContaining({
      required: true,
      options: selectProps.field.options,
    }));
  });

  it("removes Review Notes from Home without removing stored fields or changing other editors", () => {
    expect(Homepage.fields).toContain(homePublishingFields[1]);
    expect(homePublishingFields[1]).toMatchObject({ name: "reviewNotes", admin: { hidden: true } });
    expect(publishingFields[1]).not.toMatchObject({ admin: { hidden: true } });
    const group = homePageBannerFields[0];
    if (!("fields" in group)) throw new Error("Expected banner group");
    for (const section of group.fields) {
      if (!("fields" in section)) throw new Error("Expected banner section");
      for (const field of section.fields) {
        if (field.type === "text" || field.type === "textarea") {
          expect(field.admin?.components?.Field).toContain(field.type === "textarea"
            ? "CmsFormFields.tsx#CmsFormTextarea"
            : "CmsFormFields.tsx#CmsFormInput");
        }
      }
    }
  });

  it("uses shared controls for media Alt and Caption and the app Save button", () => {
    expect(Media.fields[0]).toMatchObject({
      name: "alt",
      required: true,
      admin: { components: { Field: "./modules/content/ui/admin/CmsFormFields.tsx#CmsFormInput" } },
    });
    expect(Media.fields[1]).toMatchObject({
      name: "caption",
      admin: { components: { Field: "./modules/content/ui/admin/CmsFormFields.tsx#CmsFormTextarea" } },
    });
    expect(Media.admin?.components?.edit?.SaveButton)
      .toBe("./modules/content/ui/admin/CmsDocumentButtons.tsx#CmsSaveButton");
  });
});

// @vitest-environment happy-dom

import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applicationAgeingTemplate } from "@/modules/reporting/application/bootstrap/ApplicationAgeingTemplate";
import { websiteAnalyticsTemplate } from "@/modules/reporting/application/bootstrap/WebsiteAnalyticsTemplate";
import { ReportTemplateActions } from "@/modules/reporting/ui/definitions/ReportTemplateActions";

const state = vi.hoisted(() => ({
  publish: vi.fn(),
  validate: vi.fn(),
  pending: false,
}));

vi.mock("@/shared/ui/Toast", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/modules/reporting/ui/definitions/useReportDefinition", () => ({
  useValidateReportTemplate: (_id: string, publish: boolean) => ({
    mutate: publish ? state.publish : state.validate,
    isPending: state.pending,
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  state.pending = false;
  vi.clearAllMocks();
});

async function renderActions(
  overrides: Partial<ComponentProps<typeof ReportTemplateActions>> = {},
) {
  const save = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <>
        <form
          id="template-form"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        />
        <ReportTemplateActions
          canEdit
          canPublish
          canValidate
          disabled={false}
          formId="template-form"
          isDirty={false}
          template={{
            ...applicationAgeingTemplate,
            id: "ageing-template",
            rowVersion: 3,
            publishedVersion: 1,
          }}
          {...overrides}
        />
      </>,
    );
  });
  return { container, save };
}

async function openMenu() {
  const trigger = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Report template actions"]',
  )!;
  await act(async () => trigger.click());
}

function menuItem(label: string) {
  const item = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')]
    .find((element) => element.textContent === label);
  expect(item).toBeDefined();
  return item!;
}

async function chooseAction(label: string) {
  const item = menuItem(label);
  await act(async () => {
    item.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
    );
    item.dispatchEvent(
      new PointerEvent("pointerup", { bubbles: true, button: 0 }),
    );
    item.click();
  });
}

describe("report template dropdown actions", () => {
  it("lists the three actions and submits the draft form from Save Draft", async () => {
    const { save } = await renderActions();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await openMenu();
    expect([...document.querySelectorAll('[role="menuitem"]')].map(
      (item) => item.textContent,
    )).toEqual(["Save Draft", "Publish", "Validate"]);
    await chooseAction("Save Draft");
    expect(save).toHaveBeenCalledOnce();
    expect(state.publish).not.toHaveBeenCalled();
  });

  it("opens the existing parameter form in the drawer and validates its values", async () => {
    const { container } = await renderActions();
    await openMenu();
    await chooseAction("Validate");
    const drawer = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(drawer).not.toBeNull();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(drawer.textContent).toContain("Validate saved draft");
    const inputs = drawer.querySelectorAll<HTMLInputElement>("input");
    expect(inputs).toHaveLength(5);
    expect([...inputs].filter((input) => input.type === "checkbox")
      .every((input) => input.checked)).toBe(true);
    expect(drawer.querySelector<HTMLInputElement>('input[type="number"]')!.value)
      .toBe("0");
    await act(async () => {
      drawer.querySelector("form")!.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(state.validate).toHaveBeenCalledWith({
      rowVersion: 3,
      values: { fundingCallId: null, stageCode: null, minimumAgeHours: 0 },
    });
    expect(state.publish).not.toHaveBeenCalled();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });

  it("publishes the saved row version with its default parameter values", async () => {
    await renderActions();
    await openMenu();
    await chooseAction("Publish");
    expect(state.publish).toHaveBeenCalledWith({
      rowVersion: 3,
      values: { fundingCallId: null, stageCode: null, minimumAgeHours: 0 },
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("opens the form when publishing requires parameter values", async () => {
    await renderActions({
      template: {
        ...websiteAnalyticsTemplate,
        id: "website-template",
        rowVersion: 2,
        publishedVersion: null,
      },
    });
    await openMenu();
    await chooseAction("Publish");
    expect(state.publish).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')!.textContent)
      .toContain("Publish version");
  });

  it("requires a saved draft for validation and publication", async () => {
    await renderActions({ template: undefined });
    await openMenu();
    expect(menuItem("Save Draft").getAttribute("aria-disabled")).toBeNull();
    expect(menuItem("Publish").getAttribute("aria-disabled")).toBe("true");
    expect(menuItem("Validate").getAttribute("aria-disabled")).toBe("true");
  });

  it("blocks publishing unsaved edits and shows the save instruction in the drawer", async () => {
    await renderActions({ isDirty: true });
    await openMenu();
    expect(menuItem("Publish").getAttribute("aria-disabled")).toBe("true");
    await chooseAction("Validate");
    const drawer = document.querySelector('[role="dialog"]')!;
    expect(drawer.textContent)
      .toContain("Save your changes before validating or publishing.");
    expect(drawer.querySelector<HTMLButtonElement>('button[type="submit"]')!
      .disabled).toBe(true);
    expect(state.validate).not.toHaveBeenCalled();
    expect(state.publish).not.toHaveBeenCalled();
  });

  it("allows readers to validate while disabling saving and publication", async () => {
    await renderActions({ canEdit: false, canPublish: false });
    await openMenu();
    expect(menuItem("Save Draft").getAttribute("aria-disabled")).toBe("true");
    expect(menuItem("Publish").getAttribute("aria-disabled")).toBe("true");
    await chooseAction("Validate");
    expect(document.querySelector('[role="dialog"]')!.textContent)
      .not.toContain("Publish version");
  });

  it("disables the dropdown while publication is pending", async () => {
    state.pending = true;
    await renderActions();
    expect(document.querySelector<HTMLButtonElement>(
      'button[aria-label="Report template actions"]',
    )!.disabled).toBe(true);
  });
});

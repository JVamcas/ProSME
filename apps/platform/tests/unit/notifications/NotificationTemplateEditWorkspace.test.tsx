// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { NotificationTemplateTargetDetail } from "@/modules/notifications/api/NotificationTemplateSchemas";

const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  publish: vi.fn(),
  publishing: false,
  detail: {} as NotificationTemplateTargetDetail,
}));
vi.mock("@/modules/notifications/ui/NotificationTemplateHooks", () => ({
  useNotificationTemplateTarget: () => ({ data: mocks.detail, isPending: false }),
  usePublishNotificationTemplate: () => ({
    mutateAsync: mocks.publish,
    isPending: mocks.publishing,
  }),
}));
vi.mock("@/modules/notifications/ui/useEditNotificationTemplate", () => ({
  useEditNotificationTemplate: () => ({ mutateAsync: mocks.save, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { NotificationTemplateWorkspace } from "@/modules/notifications/ui/NotificationTemplateWorkspace";

const version = {
  contentSha256: "hash",
  createdAt: "2026-09-30T12:00:00Z",
  id: "80000000-0000-4000-8000-000000000002",
  mediaType: "text/html",
  publishedAt: "2026-09-30T12:00:00Z",
  sourceFileName: "application-submitted.html",
  status: "PUBLISHED" as const,
  subjectTemplate: "Application submitted {{applicationReference}}",
  versionNumber: 2,
};

async function render(
  canEdit: boolean,
  canPublish = false,
  status: typeof version.status | "DRAFT" = "PUBLISHED",
) {
  mocks.detail = {
    allowedFields: ["applicationReference"],
    channelCode: "EMAIL",
    target: {
      allowedFields: ["applicationReference"],
      catalogKey: "APPLICATION",
      catalogName: "Application",
      defaultSubjectTemplate: "Application submitted",
      description: "Application submitted notification",
      eventKey: "application.submitted",
      id: "target-id",
      isEnabled: true,
      label: "Application submitted",
      lastUpdatedAt: version.createdAt,
      publishedVersionNumber: 2,
      scope: "EVENT",
      versionCount: 1,
    },
    versions: [{ ...version, status }],
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <NotificationTemplateWorkspace
        canEdit={canEdit}
        canPublish={canPublish}
        channelCode="EMAIL"
        targetId="target-id"
        initialData={mocks.detail}
      />,
    );
  });
  return { container, root };
}

async function openActions(container: HTMLElement) {
  const trigger = container.querySelector<HTMLButtonElement>(
    '[aria-label="Actions for version 2"]',
  )!;
  await act(async () => trigger.click());
}

async function selectAction(label: string) {
  const item = Array.from(document.querySelectorAll<HTMLElement>(
    '[role="menuitem"]',
  )).find((element) => element.textContent === label)!;
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

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
  mocks.publishing = false;
});

describe("template version actions", () => {
  it("publishes a draft through the menu without edit permission", async () => {
    mocks.publish.mockResolvedValue({ versionNumber: 2 });
    const { container, root } = await render(false, true, "DRAFT");
    await openActions(container);
    expect(document.body.textContent).not.toContain("Edit email subject");
    await selectAction("Publish version");
    expect(mocks.publish).toHaveBeenCalledWith(version.id);
    await act(async () => root.unmount());
  });

  it("disables publishing while a publish is pending", async () => {
    mocks.publishing = true;
    const { container, root } = await render(true, true, "DRAFT");
    await openActions(container);
    const items = Array.from(document.querySelectorAll<HTMLElement>(
      '[role="menuitem"]',
    ));
    const publishItem = items.find((item) => item.textContent === "Publish version")!;
    const editItem = items.find((item) => item.textContent === "Edit email subject")!;
    expect(publishItem.getAttribute("aria-disabled")).toBe("true");
    expect(editItem.getAttribute("aria-disabled")).not.toBe("true");
    await selectAction("Publish version");
    expect(mocks.publish).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it("has no publish action for an already published version", async () => {
    const { container, root } = await render(false, true);
    expect(container.querySelector('[aria-label="Actions for version 2"]')).toBeNull();
    await act(async () => root.unmount());
  });

  it("hides editing for users without permission", async () => {
    const { container, root } = await render(false);
    expect(container.querySelector('[aria-label="Actions for version 2"]')).toBeNull();
    expect(container.textContent).toContain("—");
    await act(async () => root.unmount());
  });

  it("prefills the selected subject and saves an edited draft", async () => {
    mocks.save.mockResolvedValue({ versionNumber: 3 });
    const { container, root } = await render(true);
    expect(container.textContent).toContain(version.subjectTemplate);
    await openActions(container);
    expect(document.body.textContent).not.toContain("Publish version");
    await selectAction("Edit email subject");
    const input = document.querySelector('input[name="subjectTemplate"]') as HTMLInputElement;
    expect(input.value).toBe(version.subjectTemplate);
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!;
      setter.call(input, "Edited subject");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const form = document.querySelector("form")!;
    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    expect(mocks.save).toHaveBeenCalledWith({
      versionId: version.id,
      input: { subjectTemplate: "Edited subject" },
    });
    expect(document.querySelector('input[name="subjectTemplate"]')).toBeNull();
    await act(async () => root.unmount());
  });
});

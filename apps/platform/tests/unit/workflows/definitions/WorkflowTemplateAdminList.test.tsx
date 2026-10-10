// @vitest-environment happy-dom
import { act } from "react";
import { describe, expect, it } from "vitest";
import {
  renderWorkspace,
  expand,
  openActions,
  chooseAction,
  menuItem,
  templateId,
  versionId,
  olderVersionId,
  templateItem,
} from "../../../support/WorkflowTemplateListUiFixture";

describe("grouped workflow template admin list", () => {
  it("shows one collapsible parent and loads exact versions only when expanded", async () => {
    const { container } = await renderWorkspace("PUBLISHED", 2, undefined, [
      templateItem("PUBLISHED"),
      {
        ...templateItem("PUBLISHED", 1),
        isLatest: false,
        currentVersion: {
          ...templateItem("PUBLISHED", 1).currentVersion,
          id: olderVersionId,
        },
      },
    ]);
    expect(container.textContent).toContain("Latest Version");
    expect(container.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(container.textContent).not.toContain("Published");
    await expand(container);
    const links = Array.from(
      container.querySelectorAll<HTMLAnchorElement>("a"),
    );
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `/admin/workflows/${templateId}?versionId=${versionId}`,
      `/admin/workflows/${templateId}?versionId=${olderVersionId}`,
    ]);
    await openActions(container, "Actions for Standard grant v1");
    expect(menuItem("Create draft version")).toBeDefined();
    expect(menuItem("Create new template (v1)")).toBeDefined();
    expect(menuItem("Clone")).toBeUndefined();
    expect(menuItem("Delete")?.getAttribute("aria-disabled")).toBe("true");
    expect(menuItem("Publish")).toBeUndefined();
  });

  it("opens parent definition editing even with a published latest version", async () => {
    const { container } = await renderWorkspace("PUBLISHED");
    await chooseAction(
      container,
      "Edit definition",
      "Actions for template Standard grant",
    );
    expect(document.body.textContent).toContain("Edit workflow template");
    expect(document.body.querySelector('input[name="code"]')).toBeNull();
    expect(document.body.textContent).toContain("Save template");
  });

  it("creates a blank template and hides creation from users without permission", async () => {
    const { container } = await renderWorkspace();
    await act(async () =>
      container.querySelector<HTMLButtonElement>("button")?.click(),
    );
    expect(document.body.textContent).toContain("Create new template (v1)");
    expect(document.body.querySelectorAll("input[required]")).toHaveLength(1);
    const readOnly = await renderWorkspace("PUBLISHED", 2, {
      canCreate: false,
      canUpdate: false,
      canPublish: false,
    });
    expect(readOnly.container.textContent).not.toContain("Create new template");
  });

  it("copies a selected version without asking for a template code", async () => {
    const { container } = await renderWorkspace("PUBLISHED", 2, undefined, [
      {
        ...templateItem("PUBLISHED", 1),
        currentVersion: {
          ...templateItem("PUBLISHED", 1).currentVersion,
          id: olderVersionId,
        },
        isLatest: false,
      },
    ]);
    await expand(container);
    await chooseAction(
      container,
      "Create new template (v1)",
      "Actions for Standard grant v1",
    );
    expect(document.body.textContent).toContain(
      "Copy configuration from Standard grant v1",
    );
    expect(document.body.querySelector('input[name="code"]')).toBeNull();
    expect(
      document.body.querySelector<HTMLInputElement>('input[name="name"]')
        ?.value,
    ).toBe("Copy of Standard grant");
  });

  it("keeps the existing protected draft-v1 deletion confirmation", async () => {
    const { container } = await renderWorkspace("DRAFT", 1);
    await expand(container);
    await chooseAction(container, "Delete", "Actions for Standard grant v1");
    expect(
      document.body.querySelector('[role="dialog"]')?.textContent,
    ).toContain("Delete Standard grant? This cannot be undone.");
  });

  it("publishes the selected eligible version through a separate confirmation", async () => {
    const { container } = await renderWorkspace("APPROVED");
    await expand(container);
    await chooseAction(container, "Publish");
    expect(
      document.body.querySelector('[role="dialog"]')?.textContent,
    ).toContain("Publish Standard grant version 2?");
  });

  it("disables version writes for readers and prevents creating another draft from a draft", async () => {
    const { container } = await renderWorkspace("DRAFT", 2, {
      canCreate: false,
      canPublish: false,
      canUpdate: false,
    });
    await expand(container);
    await openActions(container);
    for (const label of [
      "Create draft version",
      "Create new template (v1)",
      "Publish",
      "Delete",
    ]) {
      expect(menuItem(label)?.getAttribute("aria-disabled")).toBe("true");
    }
  });
});

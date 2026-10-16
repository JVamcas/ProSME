// @vitest-environment happy-dom

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import type { JSONFieldClientProps } from "payload";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CmsPublicPageVisibilityField from "@/modules/content/ui/admin/CmsPublicPageVisibilityField";

const cms = vi.hoisted(() => ({
  value: {} as Record<string, boolean>,
  submit: vi.fn(),
  setModified: vi.fn(),
}));

vi.mock("@payloadcms/ui", () => ({
  useField: () => {
    const [value, setValue] = useState(cms.value);
    return { value, setValue };
  },
  useForm: () => ({ submit: cms.submit, setModified: cms.setModified }),
  useFormProcessing: () => false,
}));
vi.mock("antd", () => ({
  Switch: ({
    checked,
    disabled,
    onChange,
    ...props
  }: {
    checked: boolean;
    disabled: boolean;
    onChange: (on: boolean) => void;
  }) => (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  ),
}));
vi.mock("@/modules/content/ui/admin/CmsPageHeader", () => ({
  CmsPageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

beforeEach(() => {
  cms.value = {};
  cms.submit.mockReset().mockResolvedValue({ res: { ok: true } });
  cms.setModified.mockReset();
});
afterEach(() => document.body.replaceChildren());

async function render(readOnly = false) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <CmsPublicPageVisibilityField
        {...({ path: "visibility", readOnly } as JSONFieldClientProps)}
      />,
    ),
  );
  const toggle = (name: string) =>
    container.querySelector<HTMLButtonElement>(
      `[role="switch"][aria-label="${name} visible on public site"]`,
    )!;
  return { container, root, toggle };
}

describe("CMS public page visibility", () => {
  it("shows account creation by default and saves its toggle", async () => {
    const { root, toggle } = await render();
    expect(toggle("Account creation").getAttribute("aria-checked")).toBe("true");
    await act(async () => toggle("Account creation").click());
    expect(cms.submit).toHaveBeenCalledWith({
      overrides: { visibility: { "account-creation": false } },
      disableSuccessStatus: true,
    });
    await act(async () => toggle("Account creation").click());
    expect(cms.submit).toHaveBeenLastCalledWith({
      overrides: { visibility: { "account-creation": true } },
      disableSuccessStatus: true,
    });
    await act(async () => root.unmount());
  });

  it("displays disabled Off switches for descendants of a hidden parent", async () => {
    cms.value = { funding: false, "funding.overview.sectors": true };
    const { root, toggle } = await render();
    expect(toggle("Funding").disabled).toBe(false);
    for (const name of [
      "Overview",
      "What the fund supports",
      "Focus sectors",
      "Application guide",
    ]) {
      expect(toggle(name).disabled).toBe(true);
      expect(toggle(name).getAttribute("aria-checked")).toBe("false");
    }
    expect(toggle("Home Page").disabled).toBe(true);
    await act(async () => root.unmount());
  });

  it("saves immediately and restores each child's setting when a parent is enabled", async () => {
    cms.value = { funding: false, "funding.overview.priorities": false };
    const { root, toggle } = await render();
    await act(async () => toggle("Funding").click());
    expect(cms.submit).toHaveBeenCalledWith({
      overrides: {
        visibility: { funding: true, "funding.overview.priorities": false },
      },
      disableSuccessStatus: true,
    });
    expect(toggle("Focus sectors").getAttribute("aria-checked")).toBe("true");
    expect(toggle("Priority applicants").getAttribute("aria-checked")).toBe(
      "false",
    );
    expect(toggle("Priority applicants").disabled).toBe(false);
    await act(async () => root.unmount());
  });

  it("rolls back a failed save and exposes an error", async () => {
    cms.submit.mockResolvedValue({ res: { ok: false } });
    const { root, container, toggle } = await render();
    await act(async () => toggle("News").click());
    expect(toggle("News").getAttribute("aria-checked")).toBe("true");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "could not be saved",
    );
    await act(async () => root.unmount());
  });

  it("disables editing for read-only users", async () => {
    const { root, toggle } = await render(true);
    expect(toggle("News").disabled).toBe(true);
    await act(async () => toggle("News").click());
    expect(cms.submit).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it("collapses and expands nested sections without changing visibility", async () => {
    const { root, container, toggle } = await render();
    const expand = () =>
      container.querySelector<HTMLButtonElement>(
        '[aria-controls="visibility-funding.overview"]',
      )!;
    await act(async () => expand().click());
    expect(toggle("Focus sectors")).toBeNull();
    await act(async () => expand().click());
    expect(toggle("Focus sectors").getAttribute("aria-checked")).toBe("true");
    expect(cms.submit).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });
});

// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatbotResourcePage } from "@/modules/chatbot/domain/ChatbotResource";
const ui = vi.hoisted(() => ({
  grants: new Set<string>(),
  save: vi.fn(),
  read: vi.fn(),
  pages: {} as Record<number, ChatbotResourcePage>,
}));
vi.mock("@/shared/ui/portal/capability-context", () => ({
  useCapabilities: () => ui.grants,
}));
vi.mock("@/modules/chatbot/ui/operations/useChatbotResources", () => ({
  useUpdateChatbotResources: () => ({ mutateAsync: ui.save, isPending: false }),
  useChatbotResources: (input: { page: number; pageSize: number }) => {
    ui.read(input);
    return { data: ui.pages[input.page], isFetching: false, isError: false };
  },
}));
import { permissionCodes } from "@/auth/authorization/permissions";
import { ChatbotKnowledgeWorkspace } from "@/modules/chatbot/ui/operations/ChatbotKnowledgeWorkspace";
import { chatbotId } from "../../support/ChatbotKnowledgeFixture";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  ui.save.mockResolvedValue({ changed: 10 });
  ui.grants = new Set([
    permissionCodes.chatbotKnowledgeReadAll,
    permissionCodes.chatbotKnowledgeActivateAll,
    permissionCodes.chatbotKnowledgeDeactivateAll,
  ]);
  ui.pages = Object.fromEntries(
    [1, 2].map((page) => [
      page,
      {
        page,
        pageSize: 10,
        total: 20,
        items: Array.from({ length: 10 }, (_, index) => {
          const id = (page - 1) * 10 + index + 1;
          return {
            key: `faq:${id}`,
            name: `FAQ question ${id}`,
            url: `/cms/collections/faqs/${id}`,
            type: "faq" as const,
            active: id === 1,
            lastUpdated: "2026-10-10T10:00:00Z",
          };
        }),
      },
    ]),
  );
  ui.pages[1].items[0] = {
    key: `funding:${chatbotId(10)}`,
    name: "Published funding call",
    url: `/how-to-apply/funding/${chatbotId(10)}`,
    type: "funding",
    active: true,
    lastUpdated: "2026-10-10T10:00:00Z",
  };
  ui.pages[1].items[1] = {
    key: `eligibility:${chatbotId(10)}`,
    name: "Call eligibility rules",
    url: `/how-to-apply/funding/${chatbotId(10)}/eligibility`,
    type: "eligibility",
    active: true,
    lastUpdated: "2026-10-10T10:00:00Z",
  };
  ui.pages[1].items[2] = {
    key: "contact:contact-details",
    name: "Contact details",
    url: "/contact",
    type: "contact",
    active: false,
    lastUpdated: "2026-10-10T10:00:00Z",
  };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
});
const render = () =>
  act(async () => root.render(<ChatbotKnowledgeWorkspace />));
const button = (label: string) =>
  [...container.querySelectorAll<HTMLButtonElement>("button")].find(
    (item) => item.textContent?.trim() === label,
  )!;

describe("simple resource table", () => {
  it("shows linked resources, all four types, status and last update without an approval flow", async () => {
    await render();
    for (const label of [
      "Resource name",
      "Type",
      "Status",
      "Last updated",
      "Funding",
      "Eligibility",
      "FAQ",
      "Contact",
      "Inactive",
      "Active",
    ])
      expect(container.textContent).toContain(label);
    expect(container.querySelector('a[href="/contact"]')?.textContent).toBe(
      "Contact details",
    );
    expect(container.querySelector('a[href="/contact"] svg')).not.toBeNull();
    expect(
      container.querySelector(
        `a[href="/how-to-apply/funding/${chatbotId(10)}/eligibility"]`,
      ),
    ).not.toBeNull();
    expect(container.textContent).not.toContain("Prepare knowledge preview");
    expect(container.textContent).not.toContain("Recent prepared releases");
  });
  it("bulk activates and deactivates checked rows using validated mutations", async () => {
    await render();
    await act(async () =>
      container
        .querySelector<HTMLInputElement>(
          '[aria-label="Select all shown resources"]',
        )!
        .click(),
    );
    await act(async () => button("Activate").click());
    expect(ui.save).toHaveBeenLastCalledWith({
      resourceKeys: ui.pages[1].items.map((item) => item.key),
      active: true,
    });
    await act(async () =>
      container
        .querySelector<HTMLInputElement>(
          '[aria-label="Select Contact details"]',
        )!
        .click(),
    );
    await act(async () => button("Deactivate").click());
    expect(ui.save).toHaveBeenLastCalledWith({
      resourceKeys: ["contact:contact-details"],
      active: false,
    });
  });
  it("requests the next server page and replaces rows and selection", async () => {
    await render();
    await act(async () =>
      container
        .querySelector<HTMLInputElement>(
          '[aria-label="Select Contact details"]',
        )!
        .click(),
    );
    await act(async () => button("Next").click());
    expect(ui.read).toHaveBeenLastCalledWith({ page: 2, pageSize: 10 });
    expect(container.textContent).toContain("FAQ question 11");
    expect(container.textContent).not.toContain("Published funding call");
    expect(container.textContent).toContain("0 selected");
    expect(container.textContent).not.toContain("Load more resources");
    expect(button("Activate").disabled).toBe(true);
  });
  it("keeps read-only users from selection or changes and denies ungranted reads", async () => {
    ui.grants = new Set([permissionCodes.chatbotKnowledgeReadAll]);
    await render();
    expect(
      container.querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .disabled,
    ).toBe(true);
    expect(
      [...container.querySelectorAll("button")].some(
        (item) => item.textContent === "Activate",
      ),
    ).toBe(false);
    ui.grants.clear();
    ui.read.mockClear();
    await render();
    expect(ui.read).not.toHaveBeenCalled();
  });
});

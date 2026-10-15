// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { NotificationChannelWorkspace } from "@/modules/notifications/ui/NotificationChannelWorkspace";
import { clientNotificationTemplateService } from "@/modules/notifications/ui/ClientNotificationTemplateService";
import type { NotificationTemplateTargetSummary } from "@/modules/notifications/api/NotificationTemplateSchemas";
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function target(
  id: string,
  scope: NotificationTemplateTargetSummary["scope"],
  name: string,
): NotificationTemplateTargetSummary {
  return {
    id,
    scope,
    label: scope === "GLOBAL" ? "Global Fallback" : name,
    catalogKey: scope === "GLOBAL" ? null : name.toUpperCase(),
    catalogName: scope === "GLOBAL" ? null : name,
    eventKey: scope === "EVENT" ? "workflow.task.assigned" : null,
    allowedFields: [],
    defaultSubjectTemplate: "Subject",
    description: "Description",
    isEnabled: true,
    lastUpdatedAt: "2026-10-15T00:00:00Z",
    publishedVersionNumber: null,
    versionCount: 0,
  };
}
const global = target("global", "GLOBAL", "Global");
const workflow = target("workflow", "CATALOG", "Workflow");
const application = target("application", "CATALOG", "Applications");
const event = {
  ...target("event", "EVENT", "Assigned"),
  catalogKey: "WORKFLOW",
};

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}
async function search(container: HTMLElement, text: string) {
  const input = container.querySelector<HTMLInputElement>('[name="search"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await settle();
}

describe("email template catalog search", () => {
  it("searches through the query service, retains global fallback and events, and clears empty results", async () => {
    const getChannel = vi
      .spyOn(clientNotificationTemplateService, "getChannel")
      .mockImplementation(async (_channel, input) => ({
        channel: {} as never,
        targets: !input?.search
          ? [global, application, workflow, event]
          : input.search === "workflow"
            ? [global, workflow, event]
            : [global],
      }));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(
          <QueryClientProvider client={client}>
            <NotificationChannelWorkspace channelCode="EMAIL" />
          </QueryClientProvider>,
        ),
      );
      await settle();
      expect(container.textContent).toContain("Applications");
      await search(container, "  workflow  ");
      expect(getChannel).toHaveBeenLastCalledWith("EMAIL", {
        search: "workflow",
      });
      expect(container.textContent).toContain("Workflow");
      expect(container.textContent).not.toContain("Applications");
      expect(container.textContent).toContain("Global Fallback");
      await act(async () =>
        [...container.querySelectorAll("button")]
          .find((button) => button.textContent === "Show Events")!
          .click(),
      );
      expect(container.textContent).toContain("Assigned");
      await search(container, "missing");
      expect(container.textContent).toContain("No catalogs match your search.");
      expect(container.textContent).toContain("Global Fallback");
      await act(async () =>
        [...container.querySelectorAll("button")]
          .find((button) => button.textContent === "Clear")!
          .click(),
      );
      await settle();
      expect(
        container.querySelector<HTMLInputElement>('[name="search"]')!.value,
      ).toBe("");
      expect(container.textContent).toContain("Applications");
      expect(container.textContent).toContain("Workflow");
    } finally {
      await act(async () => root.unmount());
      client.clear();
      container.remove();
      getChannel.mockRestore();
    }
  });
});

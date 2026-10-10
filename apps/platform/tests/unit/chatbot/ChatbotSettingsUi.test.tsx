// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ui = vi.hoisted(() => ({
  grants: new Set<string>(),
  save: vi.fn().mockResolvedValue({}),
  read: vi.fn(),
}));
vi.mock("@/shared/ui/portal/capability-context", () => ({
  useCapabilities: () => ui.grants,
}));
vi.mock("@/modules/chatbot/ui/operations/useChatbotSettings", () => ({
  useUpdateChatbotSettings: () => ({ mutateAsync: ui.save, isPending: false }),
  useChatbotSettings: () => {
    ui.read();
    return {
      data: {
        publicEnabled: false,
        modelEnabled: false,
        rowVersion: 7,
        providerReady: true,
      },
      isError: false,
    };
  },
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { ChatbotSettingsForm } from "@/modules/chatbot/ui/operations/ChatbotSettingsForm";
import { ChatbotSettingsWorkspace } from "@/modules/chatbot/ui/operations/ChatbotSettingsWorkspace";
import { chatbotPortalRoutes } from "@/shared/ui/portal/ChatbotPortalRoutes";
import { filterPortalRoutes } from "@/shared/ui/portal/portal-navigation";
import { groupNavigationRoutes } from "@/shared/ui/navigation/NavigationSections";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  ui.grants = new Set();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
});

async function renderForm(providerReady = true, modelEnabled = false) {
  await act(async () =>
    root.render(
      <ChatbotSettingsForm
        settings={{
          publicEnabled: false,
          modelEnabled,
          rowVersion: 7,
          providerReady,
        }}
      />,
    ),
  );
}

describe("chatbot settings with shared controls", () => {
  it("does not request settings without the read grant and adds Settings to the Chatbot section", async () => {
    await act(async () => root.render(<ChatbotSettingsWorkspace />));
    expect(ui.read).not.toHaveBeenCalled();
    const groups = groupNavigationRoutes(
      filterPortalRoutes(
        chatbotPortalRoutes,
        "operations",
        new Set([permissionCodes.chatbotSettingsReadAll]),
      ),
    );
    expect(groups[0].label).toBe("Chatbot");
    expect(groups[0].routes.map((route) => route.label)).toEqual(["Settings"]);
  });

  it("saves both booleans and the reviewed row version through the mutation", async () => {
    ui.grants.add(permissionCodes.chatbotSettingsUpdateAll);
    await renderForm();
    await act(async () => {
      container
        .querySelector<HTMLInputElement>('input[name="publicEnabled"]')!
        .click();
      container
        .querySelector<HTMLInputElement>('input[name="modelEnabled"]')!
        .click();
    });
    await act(async () =>
      container
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    expect(ui.save).toHaveBeenCalledWith({
      publicEnabled: true,
      modelEnabled: true,
      expectedRowVersion: 7,
    });
  });

  it("keeps AI unavailable without provider readiness while allowing the bot switch to be saved", async () => {
    ui.grants.add(permissionCodes.chatbotSettingsUpdateAll);
    await renderForm(false);
    expect(
      container.querySelector<HTMLInputElement>('input[name="modelEnabled"]')!
        .disabled,
    ).toBe(true);
    expect(container.textContent).toContain(
      "AI answers require a configured AI provider.",
    );
    expect(container.textContent).not.toContain("privacy review");
    await act(async () =>
      container
        .querySelector<HTMLInputElement>('input[name="publicEnabled"]')!
        .click(),
    );
    await act(async () =>
      container
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    expect(ui.save).toHaveBeenCalledWith({
      publicEnabled: true,
      modelEnabled: false,
      expectedRowVersion: 7,
    });
  });

  it("allows shutting off an already enabled model when provider setup is unavailable and prevents read-only edits", async () => {
    await renderForm(false, true);
    expect(container.querySelector("button")).toBeNull();
    expect(
      container.querySelector<HTMLInputElement>('input[name="modelEnabled"]')!
        .disabled,
    ).toBe(true);
    ui.grants.add(permissionCodes.chatbotSettingsUpdateAll);
    await renderForm(false, true);
    expect(
      container.querySelector<HTMLInputElement>('input[name="modelEnabled"]')!
        .disabled,
    ).toBe(false);
  });
});

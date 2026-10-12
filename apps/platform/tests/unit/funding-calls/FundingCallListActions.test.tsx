// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActionMenuItem } from "@/shared/ui/ActionMenu";
import { FundingCallListActions } from "@/modules/funding-calls/ui/FundingCallListActions";
import type { FundingCallView } from "@/modules/funding-calls/api/FundingCallTransport";

vi.mock("@/modules/funding-calls/ui/FundingCallExceptionalActions", () => ({
  FundingCallExceptionalActions: ({
    renderActions,
  }: {
    renderActions: (items: ActionMenuItem[]) => React.ReactNode;
  }) => renderActions([]),
}));

afterEach(() => document.body.replaceChildren());

describe("funding call row ActionMenu", () => {
  it.each([true, false])(
    "offers the correct interaction action for enabled=%s",
    async (enabled) => {
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      const toggle = vi.fn();
      const call = {
        id: "call",
        title: "Growth Fund",
        publicInteractionEnabled: enabled,
      } as FundingCallView;
      await act(async () =>
        root.render(
          <FundingCallListActions
            call={call}
            canClone
            canDelete
            canWithdrawForAmendment={false}
            canEnablePublicInteraction
            canDisablePublicInteraction
            onClone={vi.fn()}
            onDelete={vi.fn()}
            onToggleInteraction={toggle}
          />,
        ),
      );
      expect(container.querySelectorAll("button")).toHaveLength(1);
      await act(async () =>
        container.querySelector<HTMLButtonElement>("button")!.click(),
      );
      const label = enabled
        ? "Disable public interaction"
        : "Enable public interaction";
      const items = [
        ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      ];
      expect(items.map((item) => item.textContent)).toEqual([
        "Clone",
        label,
        "Delete",
      ]);
      await act(async () =>
        items.find((item) => item.textContent === label)!.click(),
      );
      expect(toggle).toHaveBeenCalledWith(call);
      await act(async () => root.unmount());
    },
  );
});

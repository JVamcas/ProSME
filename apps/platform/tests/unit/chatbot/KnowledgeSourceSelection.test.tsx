// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ prepare: vi.fn(), more: vi.fn() }));
vi.mock("@/modules/chatbot/ui/operations/useChatbotKnowledge", () => ({
  usePrepareChatbotKnowledge: () => ({
    mutateAsync: state.prepare,
    isPending: false,
  }),
  useChatbotKnowledgeSources: (kind: string) => ({
    data: {
      pages: [
        {
          items:
            kind === "faq"
              ? [
                  {
                    id: "1",
                    label: "What is the programme?",
                    revision: "Approved FAQ",
                  },
                  {
                    id: "51",
                    label: "Question beyond fifty?",
                    revision: "Approved FAQ",
                  },
                ]
              : [
                  {
                    id: "00000000-0000-4000-8000-000000000010",
                    label: "Published call",
                    revision: "Publication 2",
                  },
                ],
        },
      ],
    },
    isPending: false,
    isError: false,
    hasNextPage: kind === "faq",
    isFetchingNextPage: false,
    fetchNextPage: state.more,
  }),
}));
import { KnowledgeSourceSelection } from "@/modules/chatbot/ui/operations/KnowledgeSourceSelection";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.replaceChildren();
  vi.resetAllMocks();
});

async function render(disabled = false) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const onPrepared = vi.fn();
  await act(async () =>
    root!.render(
      <KnowledgeSourceSelection onPrepared={onPrepared} disabled={disabled} />,
    ),
  );
  return { container, onPrepared };
}

describe("staff source selection through shared controls", () => {
  it("requires a selection and shows its validation before preparation", async () => {
    const { container } = await render();
    await act(async () =>
      container
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    expect(state.prepare).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      "Select at least one published source.",
    );
  });

  it("keeps paginated FAQ selections in React Hook Form and prepares only chosen sources", async () => {
    state.prepare.mockResolvedValue({ id: "prepared-release" });
    const { container, onPrepared } = await render();
    await act(async () =>
      container.querySelector<HTMLButtonElement>("#faqIds")!.click(),
    );
    const options = document.querySelectorAll<HTMLInputElement>(
      '#faqIds-options input[type="checkbox"]',
    );
    expect(options).toHaveLength(2);
    await act(async () => options[1].click());
    await act(async () =>
      container
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    expect(state.prepare).toHaveBeenCalledWith({
      fundingCallIds: [],
      faqIds: ["51"],
    });
    expect(onPrepared).toHaveBeenCalledWith("prepared-release");
    const more = [
      ...container.querySelectorAll<HTMLButtonElement>("button"),
    ].find((button) => button.textContent?.includes("Load more"))!;
    await act(async () => more.click());
    expect(state.more).toHaveBeenCalledOnce();
  });

  it("disables preparation and shared source controls when selection is unavailable", async () => {
    const { container } = await render(true);
    expect(
      container.querySelector<HTMLButtonElement>("button[type=submit]")!
        .disabled,
    ).toBe(true);
    expect(
      container.querySelector<HTMLButtonElement>("#faqIds")!.disabled,
    ).toBe(true);
  });
});

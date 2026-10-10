// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { chatbotId } from "../../support/ChatbotKnowledgeFixture";
import { chatbotNoticeVersion } from "@/modules/chatbot/domain/ChatbotAnswer";
import {
  answer,
  requests,
  queryClient,
  credential,
  installVisitorUiFixture,
  cleanupVisitorUiFixture,
  setVisitorEnabled,
  failNextVisitorTurn,
  render,
  click,
  fill,
  submit,
  start,
  ask,
  settle,
} from "../../support/ChatbotVisitorUiFixture";

beforeEach(installVisitorUiFixture);
afterEach(cleanupVisitorUiFixture);

describe("visitor chatbot through real hooks and HTTP client", () => {
  it("opens with a greeting and composer, and starts only when a valid question is sent", async () => {
    setVisitorEnabled(false);
    await render();
    expect(document.body.textContent).not.toContain("Ask about funding");
    setVisitorEnabled(true);
    await act(async () => {
      await queryClient.invalidateQueries();
    });
    await settle();
    await click("Ask about funding");
    expect(document.body.textContent).toContain("Hello! I can help");
    const greeting = document.querySelector('[data-chat-sender="assistant"]')!;
    expect(greeting.textContent).toContain("Hello! I can help");
    expect(greeting.querySelector("h3")?.className).toBe("sr-only");
    expect(document.getElementById("chatbot-question")).toBeTruthy();
    expect(document.querySelector('input[name="consent"]')).toBeNull();
    expect(document.body.textContent).not.toContain("Before you start");
    expect(document.querySelector("footer form")).toBeTruthy();
    expect(document.querySelector("footer details")?.hasAttribute("open")).toBe(
      false,
    );
    expect(document.body.textContent).toContain("30 minutes");
    expect(document.body.textContent).toContain("60 days");
    await submit(document.querySelector("form")!);
    expect(requests.some((request) => request.input.consent)).toBe(false);
    expect(document.querySelector('a[href="/privacy"]')).toBeTruthy();
    await ask();
    const session = requests.find((request) => request.input.consent)!;
    expect(session.input).toEqual({
      consent: true,
      noticeVersion: chatbotNoticeVersion,
    });
    expect(
      requests.filter((request) => request.path.endsWith("/turns")),
    ).toHaveLength(1);
  });

  it("renders cited answers, traps focus, closes with Escape and keeps credentials out of storage/query data", async () => {
    await start();
    await ask();
    expect(document.body.textContent).toContain(
      "Published programme guidance.",
    );
    const visitor = document.querySelector(
      'article [data-chat-sender="visitor"]',
    )!;
    const reply = document.querySelector(
      'article [data-chat-sender="assistant"]',
    )!;
    expect(visitor.textContent).toContain("What support is published?");
    expect(reply.textContent).toContain("Published programme guidance.");
    expect(
      reply
        .querySelector('[aria-label="Answer sources"] a')
        ?.getAttribute("href"),
    ).toBe("/faq");
    expect(reply.querySelector("h3")?.className).toBe("sr-only");
    expect(
      document.querySelector('[role="log"]')?.closest("[data-heatmap-mask]"),
    ).toBeTruthy();
    const turn = requests.find((request) => request.path.endsWith("/turns"))!;
    expect(turn.headers.get("Authorization")).toBe(`Bearer ${credential}`);
    expect(turn.input).not.toHaveProperty("history");
    expect(
      JSON.stringify(
        queryClient
          .getQueryCache()
          .getAll()
          .map((query) => query.state.data),
      ),
    ).not.toContain(credential);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const focusable = [
      ...dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input, textarea, [href], summary",
      ),
    ].filter((element) => {
      const collapsed = element.closest("details:not([open])");
      return !collapsed || element === collapsed.querySelector("summary");
    });
    await act(async () => {
      focusable[focusable.length - 1].focus();
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(document.activeElement).toBe(focusable[0]);
    await act(async () =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement?.textContent).toContain("Ask about funding");
    await click("Ask about funding");
    expect(document.body.textContent).toContain(
      "Published programme guidance.",
    );
    await click("Start a new conversation");
    expect(document.querySelectorAll('[role="log"] article')).toHaveLength(0);
    expect(document.getElementById("chatbot-question")).toHaveProperty(
      "value",
      "",
    );
  });

  it.each(["button", "backdrop"])(
    "closes through the %s and reopens the saved conversation",
    async (control) => {
      await start();
      await ask();
      const selector =
        control === "button"
          ? '[data-panel-close][aria-label="Close chat"]'
          : 'button[aria-label="Close chat"]:not([data-panel-close])';
      const close = document.querySelector<HTMLButtonElement>(selector)!;
      expect(close).toBeTruthy();
      await act(async () => close.click());
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(document.activeElement?.getAttribute("aria-label")).toBe(
        "Ask about funding",
      );
      expect(document.body.style.overflow).not.toBe("hidden");
      await click("Ask about funding");
      expect(document.body.textContent).toContain(
        "Published programme guidance.",
      );
      expect(requests.filter((request) => request.input.consent)).toHaveLength(
        1,
      );
    },
  );

  it("saves unknown cases without contact and collects contact only with separate consent", async () => {
    answer.answer = {
      ...answer.answer,
      status: "UNRESOLVED",
      reason: "MISSING_EVIDENCE",
      text: "I cannot answer this question.",
      passages: [],
    };
    answer.caseId = chatbotId(702);
    answer.caseReference = "SUP-000123";
    await start();
    await ask("Unsupported programme question");
    const supportDetails = document.querySelector(
      'article [data-chat-sender="assistant"] details',
    ) as HTMLDetailsElement;
    expect(supportDetails.open).toBe(false);
    expect(supportDetails.querySelector("summary")?.textContent).toContain(
      "Support details",
    );
    await act(async () => {
      supportDetails.open = true;
    });
    expect(supportDetails.textContent).toContain("SUP-000123");
    const contactDetails = document
      .querySelector('section[aria-label="Optional staff follow-up"]')!
      .closest("details")!;
    expect(contactDetails.open).toBe(false);
    await act(async () => {
      contactDetails.open = true;
    });
    expect(document.body.textContent).toContain(
      "Your question was saved for staff follow-up.",
    );
    expect(document.body.textContent).toContain("SUP-000123");
    expect(document.body.textContent).not.toContain(answer.caseId);
    expect(document.body.textContent).not.toContain("notification");
    expect(contactDetails.textContent).toContain(
      "Optional contact details for staff follow-up.",
    );
    expect(contactDetails.textContent).not.toMatch(
      /kept for|AI requests|already been saved/,
    );
    expect(
      requests.filter((request) => request.path.endsWith("/contact")),
    ).toHaveLength(0);
    await fill("chatbot-name", "Visitor");
    await fill("chatbot-email", "visitor@example.test");
    const form = document.getElementById("chatbot-email")!.closest("form")!;
    await submit(form);
    expect(
      requests.filter((request) => request.path.endsWith("/contact")),
    ).toHaveLength(0);
    await act(async () =>
      form.querySelector<HTMLInputElement>('input[name="consent"]')!.click(),
    );
    await submit(form);
    expect(document.body.textContent).toContain("saved for staff follow-up");
    const contact = requests.find((request) =>
      request.path.endsWith("/contact"),
    )!;
    expect(contact.input).toEqual({
      name: "Visitor",
      email: "visitor@example.test",
      consent: true,
    });
    expect(
      requests.find((request) => request.path.endsWith("/turns"))!.input,
    ).not.toHaveProperty("email");
  });

  it("retries a lost response with the same turn identity and clears expired sessions", async () => {
    await start();
    failNextVisitorTurn(503);
    await ask();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      "Please try again",
    );
    expect(document.body.textContent).not.toContain("INTERNAL");
    expect(document.getElementById("chatbot-question")).toHaveProperty(
      "value",
      "What support is published?",
    );
    await ask();
    const turns = requests.filter((request) => request.path.endsWith("/turns"));
    expect(turns[0].input).toEqual(turns[1].input);
    expect(document.querySelectorAll('[role="log"] article')).toHaveLength(1);
    failNextVisitorTurn(401);
    await ask("Another question");
    expect(document.body.textContent).toContain("session has expired");
    expect(document.querySelectorAll('[role="log"] article')).toHaveLength(0);
    expect(document.querySelector("#chatbot-question")).toBeTruthy();
    await ask("A fresh question");
    expect(requests.filter((request) => request.input.consent)).toHaveLength(2);
  });

  it("keeps an ambiguous question for call selection and sends only the selected call ID", async () => {
    answer.answer = {
      ...answer.answer,
      status: "UNRESOLVED",
      reason: "AMBIGUOUS_CALL",
      passages: [],
      callChoices: [{ id: chatbotId(10), title: "Published call" }],
    };
    answer.caseId = chatbotId(702);
    answer.caseReference = "SUP-000123";
    answer.notificationQueued = true;
    await start();
    await ask("What are the criteria?");
    expect(document.body.textContent).toContain(
      "Your question was saved for staff follow-up.",
    );
    expect(document.body.textContent).not.toContain("notification");
    await fill("chatbot-call", chatbotId(10));
    answer.answer = {
      ...answer.answer,
      status: "ANSWERED",
      reason: null,
      callChoices: [],
    };
    await submit(document.getElementById("chatbot-question")!.closest("form")!);
    expect(
      requests.filter((request) => request.path.endsWith("/turns")).at(-1)!
        .input,
    ).toMatchObject({
      question: "What are the criteria?",
      fundingCallId: chatbotId(10),
    });
  });
});

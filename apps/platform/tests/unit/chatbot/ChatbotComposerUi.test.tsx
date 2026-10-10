// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  requests,
  installVisitorUiFixture,
  cleanupVisitorUiFixture,
  failNextVisitorStart,
  setVisitorNoticeVersion,
  click,
  fill,
  start,
  ask,
  settle,
} from "../../support/ChatbotVisitorUiFixture";

beforeEach(installVisitorUiFixture);
afterEach(cleanupVisitorUiFixture);

describe("chatbot message composer", () => {
  it("retains the first question when session creation fails and retries on Send", async () => {
    await start();
    failNextVisitorStart();
    await ask("My first programme question");
    expect(document.getElementById("chatbot-question")).toHaveProperty(
      "value",
      "My first programme question",
    );
    expect(
      requests.filter((request) => request.path.endsWith("/turns")),
    ).toHaveLength(0);
    await ask("My first programme question");
    expect(requests.filter((request) => request.input.consent)).toHaveLength(2);
    expect(
      requests.filter((request) => request.path.endsWith("/turns")),
    ).toHaveLength(1);
  });

  it("sends suggested questions through the same session and question flow", async () => {
    await start();
    await click("What funding is available?");
    expect(
      requests.find((request) => request.path.endsWith("/turns"))?.input,
    ).toMatchObject({ question: "What funding is available?" });
    expect(requests.filter((request) => request.input.consent)).toHaveLength(1);
  });

  it("blocks sending when the displayed notice version is unsupported", async () => {
    setVisitorNoticeVersion("new-notice");
    await start();
    expect(document.body.textContent).toContain("notice has changed");
    expect(document.getElementById("chatbot-question")).toHaveProperty(
      "disabled",
      true,
    );
    expect(requests.some((request) => request.input.consent)).toBe(false);
  });

  it("sends with Enter and leaves Shift+Enter available for a newline", async () => {
    await start();
    await fill("chatbot-question", "Keyboard question");
    const input = document.getElementById("chatbot-question")!;
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(requests.some((request) => request.input.consent)).toBe(false);
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    await settle();
    expect(
      requests.find((request) => request.path.endsWith("/turns"))?.input,
    ).toMatchObject({ question: "Keyboard question" });
  });
});

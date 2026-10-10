import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, vi } from "vitest";
import { ChatbotWidget } from "@/modules/chatbot/ui/public/ChatbotWidget";
import {
  chatbotNoticeVersion,
  chatbotPrivacyNotice,
} from "@/modules/chatbot/domain/ChatbotAnswer";
import type { ChatbotTurnResponse } from "@/modules/chatbot/domain/ChatbotConversation";
import { chatbotId } from "./ChatbotKnowledgeFixture";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root;
export let queryClient: QueryClient;
export let requests: {
  path: string;
  input: Record<string, unknown>;
  headers: Headers;
}[];
let enabled: boolean;
let failTurn: number;
let failStart: boolean;
let noticeVersion: string;
export let answer: ChatbotTurnResponse;
const sessionId = chatbotId(700);
export const credential = `${sessionId}.${"a".repeat(43)}`;

export function installVisitorUiFixture() {
  enabled = true;
  failTurn = 0;
  failStart = false;
  noticeVersion = chatbotNoticeVersion;
  requests = [];
  answer = {
    answer: {
      status: "ANSWERED",
      reason: null,
      text: "Published programme guidance.",
      passages: [
        {
          id: "faq:1",
          text: "Published programme guidance.",
          title: "Programme FAQ",
          url: "/faq",
        },
      ],
      releaseId: chatbotId(701),
      sourceIds: ["faq:1:revision"],
      callChoices: [],
    },
    caseId: null,
    caseReference: null,
    notificationQueued: false,
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string, init?: RequestInit) => {
      const input = init?.body ? JSON.parse(String(init.body)) : {};
      requests.push({ path, input, headers: new Headers(init?.headers) });
      const notice = {
        enabled,
        notice: chatbotPrivacyNotice,
        noticeVersion,
        sessionMinutes: 30,
        escalationDays: 90,
        contactDays: 60,
      };
      let data: unknown = notice;
      if (init?.method === "POST") {
        if (path.endsWith("/turns")) {
          if (failTurn) {
            const status = failTurn;
            failTurn = 0;
            return Response.json(
              {
                error: {
                  message: "INTERNAL delivery queue/configuration error",
                },
              },
              { status },
            );
          }
          data = answer;
        } else if (path.endsWith("/contact")) {
          data = { saved: true };
        } else {
          if (failStart) {
            failStart = false;
            return Response.json(
              {
                error: {
                  message: "INTERNAL delivery queue/configuration error",
                },
              },
              { status: 503 },
            );
          }
          data = { ...notice, id: sessionId, credential };
        }
      }
      return Response.json({ data, meta: { correlationId: "visitor-test" } });
    }),
  );
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
}

export async function cleanupVisitorUiFixture() {
  await act(async () => root.unmount());
  queryClient.clear();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
}

export async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}

export async function render() {
  await act(async () =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <ChatbotWidget />
      </QueryClientProvider>,
    ),
  );
  await settle();
}

export async function click(label: string) {
  if (label === "Start a new conversation") {
    document
      .querySelector('summary[aria-label="Conversation options"]')
      ?.closest("details")
      ?.setAttribute("open", "");
  }
  const button = [
    ...document.querySelectorAll<HTMLButtonElement>("button"),
  ].find(
    (item) =>
      item.getAttribute("aria-label") === label ||
      item.textContent?.includes(label),
  );
  expect(button).toBeTruthy();
  await act(async () => {
    button!.focus();
    button!.click();
  });
  await settle();
}

export async function fill(id: string, value: string) {
  const input = document.getElementById(id) as HTMLInputElement;
  await act(async () => {
    const prototype =
      input.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : input.tagName === "SELECT"
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(
      input,
      value,
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

export async function submit(form: HTMLFormElement) {
  await act(async () =>
    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    ),
  );
  await settle();
}

export async function start() {
  await render();
  await click("Ask about funding");
}

export async function ask(text = "What support is published?") {
  await fill("chatbot-question", text);
  await submit(document.getElementById("chatbot-question")!.closest("form")!);
}

export function setVisitorEnabled(value: boolean) {
  enabled = value;
}

export function failNextVisitorTurn(status: number) {
  failTurn = status;
}

export function failNextVisitorStart() {
  failStart = true;
}

export function setVisitorNoticeVersion(value: string) {
  noticeVersion = value;
}

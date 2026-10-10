import { expect, test } from "playwright/test";

// Public UI acceptance with synthetic transport data. This intentionally does
// not establish live GCP, provider, database or email delivery acceptance.
test("visitor chat, cited answers and optional support contact", async ({
  page,
}) => {
  const notice = {
    enabled: true,
    notice: "Ask about public programmes only. Avoid private information.",
    noticeVersion: "2026-10-10-v1",
    sessionMinutes: 30,
    escalationDays: 90,
    contactDays: 60,
  };
  const sessionId = "10000000-0000-4000-8000-000000000700";
  let sessions = 0;
  let questions = 0;
  let contacts = 0;
  await page.route("**/api/chatbot/sessions", async (route) => {
    const creating = route.request().method() === "POST";
    if (creating) sessions += 1;
    await route.fulfill({
      json: {
        data: creating
          ? {
              ...notice,
              id: sessionId,
              credential: `${sessionId}.${"a".repeat(43)}`,
            }
          : notice,
        meta: { correlationId: "cb6-browser" },
      },
    });
  });
  await page.route(
    `**/api/chatbot/sessions/${sessionId}/turns`,
    async (route) => {
      questions += 1;
      const unresolved = questions > 1;
      await route.fulfill({
        json: {
          data: {
            answer: {
              status: unresolved ? "UNRESOLVED" : "ANSWERED",
              reason: unresolved ? "MISSING_EVIDENCE" : null,
              text: unresolved
                ? "I cannot answer from published guidance."
                : "Read the published programme guidance.",
              passages: unresolved
                ? []
                : [
                    {
                      id: "faq:1",
                      text: "Read the published programme guidance.",
                      title: "Programme FAQ",
                      url: "/faq",
                    },
                  ],
              releaseId: null,
              sourceIds: [],
              callChoices: [],
            },
            caseId: unresolved ? "10000000-0000-4000-8000-000000000702" : null,
            caseReference: unresolved ? "SUP-000123" : null,
          },
          meta: { correlationId: "cb6-browser" },
        },
      });
    },
  );
  await page.route(
    `**/api/chatbot/sessions/${sessionId}/contact`,
    async (route) => {
      contacts += 1;
      expect(route.request().postDataJSON()).toEqual({
        name: "Synthetic visitor",
        email: "visitor@example.test",
        consent: true,
      });
      await route.fulfill({
        json: { data: { saved: true }, meta: { correlationId: "cb6-browser" } },
      });
    },
  );

  await page.goto("/");
  // Keep the independent analytics banner from obscuring the chat launcher.
  const decline = page.getByRole("button", { name: "Decline", exact: true });
  if (await decline.isVisible()) await decline.click();
  const launcher = page.getByRole("button", { name: "Ask about funding" });
  await launcher.click();
  const dialog = page.getByRole("dialog", { name: "Programme assistant" });
  await expect(dialog).toBeVisible();
  expect(sessions).toBe(0);
  await expect(dialog.getByText(/Hello! I can help/)).toBeVisible();
  await expect(dialog.getByRole("checkbox")).toHaveCount(0);
  await dialog
    .locator("summary")
    .filter({ hasText: "Privacy details" })
    .click();
  await expect(dialog.getByText(/session lasts 30 minutes/)).toBeVisible();
  await dialog
    .locator("summary")
    .filter({ hasText: "Privacy details" })
    .click();
  await dialog
    .getByLabel("Your programme question")
    .fill("What guidance is available?");
  await dialog.getByRole("button", { name: "Send question" }).click();
  await expect(
    dialog.getByRole("link", { name: "Programme FAQ" }),
  ).toHaveAttribute("href", "/faq");
  await dialog
    .getByLabel("Your programme question")
    .fill("An unsupported question");
  await dialog.getByRole("button", { name: "Send question" }).click();
  await dialog
    .locator("summary")
    .filter({ hasText: "Support details" })
    .click();
  await expect(
    dialog.getByText(/Your question was saved for staff follow-up./),
  ).toBeVisible();
  expect(contacts).toBe(0);
  await dialog
    .locator("summary")
    .filter({ hasText: "Request staff follow-up" })
    .click();
  await dialog.getByLabel("Name", { exact: true }).fill("Synthetic visitor");
  await dialog
    .getByLabel("Email", { exact: true })
    .fill("visitor@example.test");
  await dialog
    .getByRole("checkbox", {
      name: "I agree to staff using these details to follow up on my question.",
    })
    .check();
  await dialog.getByRole("button", { name: "Save contact details" }).click();
  await expect(dialog.getByRole("status")).toContainText(
    "saved for staff follow-up",
  );
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await dialog
    .locator("summary")
    .filter({ hasText: "Privacy details" })
    .focus();
  await page.keyboard.press("Tab");
  await expect(dialog.getByLabel("Conversation options")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(launcher).toBeFocused();
  expect(sessions).toBe(1);
  expect(questions).toBe(2);
  expect(contacts).toBe(1);
});

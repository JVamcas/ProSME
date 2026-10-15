import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  submission: {
    data: undefined as { message: string } | undefined,
    error: undefined as Error | undefined,
    isError: false,
    isPending: false,
    mutateAsync: vi.fn(),
  },
}));

vi.mock("@/modules/content/ServerContentQueries", () => ({
  getContactDetails: vi.fn().mockResolvedValue({
    email: "office@example.test",
    address: "Programme office\nWindhoek, Namibia",
    phone: "+264 61 555 0100",
    officeHours: "Monday to Friday, 08:00–17:00",
  }),
  getPage: vi.fn(),
}));

vi.mock("@/modules/engagement/EngagementHooks", () => ({
  useContactSubmission: () => state.submission,
}));

import ContactPage from "@/app/(public)/contact/page";
import { ContactForm } from "@/modules/engagement/ui/public/ContactForm";
import { PublicPageHeader } from "@/modules/content/ui/public/PublicPageHeader";

beforeEach(() => {
  state.submission.data = undefined;
  state.submission.error = undefined;
  state.submission.isError = false;
  state.submission.isPending = false;
});

describe("Contact page", () => {
  it("preserves the shared header's existing banner style for other public pages", () => {
    const html = renderToStaticMarkup(
      <PublicPageHeader
        eyebrow="About"
        title="About the fund"
        summary="Programme information"
      />,
    );

    expect(html).toContain('class="bg-brand-navy py-16 text-brand-white"');
    expect(html).toContain("About the fund");
    expect(html).toContain("Programme information");
  });

  it("keeps one enquiry form alongside published contact details and the appeal link", async () => {
    const html = renderToStaticMarkup(await ContactPage());

    expect(html).toContain("Let’s talk");
    expect(html).toContain("Contact details");
    expect(html).toContain("Send us a message");
    expect(html).toContain('href="mailto:office@example.test"');
    expect(html).toContain('href="tel:+264 61 555 0100"');
    expect(html).toContain("Programme office\nWindhoek, Namibia");
    expect(html).toContain("Office hours");
    expect(html).toContain("Monday to Friday, 08:00–17:00");
    expect(html).toContain('href="/contact/appeal"');
    expect(html).not.toContain("No portal account required");
    expect(html.match(/<form\b/g)).toHaveLength(1);
    for (const name of [
      "name",
      "email",
      "phone",
      "subject",
      "message",
      "consent",
    ]) {
      expect(html).toContain(`name="${name}"`);
    }
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('aria-labelledby="contact-form-heading"');
    expect(html).toMatch(/<input[^>]*tabindex="-1"[^>]*name="company"/);
  });

  it("disables sending while the existing submission is pending", () => {
    state.submission.isPending = true;
    const html = renderToStaticMarkup(<ContactForm />);

    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
    expect(html).toContain("Sending…");
  });

  it("retains the submission result in the live status region", () => {
    state.submission.data = { message: "Your enquiry has been received." };
    const html = renderToStaticMarkup(<ContactForm />);

    expect(html).toContain('id="contact-status" role="status"');
    expect(html).toContain(state.submission.data.message);
  });

  it("keeps service errors visible so the visitor can recover", () => {
    state.submission.isError = true;
    state.submission.error = new Error(
      "Please try sending your enquiry again.",
    );
    const html = renderToStaticMarkup(<ContactForm />);

    expect(html).toContain(state.submission.error.message);
    expect(html).toContain("Send message");
  });
});

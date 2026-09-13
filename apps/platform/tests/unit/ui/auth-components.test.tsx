import { QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AuthCard } from "@/components/auth/auth-card";
import { EmailVerificationPanel } from "@/components/auth/email-verification-panel";
import { RegistrationForm } from "@/components/auth/registration-form";
import { createQueryClient } from "@/lib/query-client";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("authentication components", () => {
  it("renders required registration names and password confirmation", () => {
    const queryClient = createQueryClient();
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <AuthCard title="Create account" description="Register securely">
          <RegistrationForm />
        </AuthCard>
      </QueryClientProvider>,
    );

    expect(markup).toContain('id="first-name"');
    expect(markup).toContain("First name");
    expect(markup).toContain('id="surname"');
    expect(markup).toContain("Surname");
    expect(markup).toContain('id="confirm-password"');
    expect(markup).toContain("Confirm password");
    expect(markup).toContain("text-brand-navy");
    expect(markup).toContain("text-brand-orange");
    expect(markup).toContain("bg-brand-orange");
  });

  it("provides verification resend and status controls", () => {
    const queryClient = createQueryClient();
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <EmailVerificationPanel />
      </QueryClientProvider>,
    );

    expect(markup).toContain("Resend verification link");
    expect(markup).toContain("I have verified my email");
    expect(markup).toContain("Continue to sign in");
  });
});

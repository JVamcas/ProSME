import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const visibility = vi.hoisted(() => ({ require: vi.fn(), read: vi.fn(async (): Promise<Record<string, boolean>> => ({})) }));
vi.mock("@/modules/content/application/ServerPublicPageVisibilityService", () => ({
  requirePublicPage: visibility.require,
  getPublicPageVisibility: visibility.read,
}));

vi.mock("@/modules/users/ui/auth/sign-in-form", () => ({
  SignInForm: ({ returnTo, allowRegistration }: {
    returnTo?: string;
    allowRegistration?: boolean;
  }) => <div data-return-to={returnTo} data-registration={allowRegistration} />,
}));
vi.mock("@/modules/users/ui/auth/registration-form", () => ({
  RegistrationForm: ({ returnTo }: { returnTo?: string }) => <div data-return-to={returnTo} />,
}));
vi.mock("@/modules/users/ui/auth/email-verification-panel", () => ({
  EmailVerificationPanel: ({ returnTo }: { returnTo?: string }) => <div data-return-to={returnTo} />,
}));
vi.mock("@/modules/users/ui/auth/forgot-password-form", () => ({
  ForgotPasswordForm: ({ returnTo }: { returnTo?: string }) => <div data-return-to={returnTo} />,
}));

import SignInPage from "@/app/(auth)/sign-in/page";
import RegisterPage from "@/app/(auth)/register/page";
import VerifyEmailPage from "@/app/(auth)/verify-email/page";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";

const returnTo = "/portal/businesses?page=2";

describe("authentication page destination parsing", () => {
  it("passes the account creation setting to the sign-in form", async () => {
    visibility.read.mockResolvedValueOnce({ "account-creation": false });
    const markup = renderToStaticMarkup(await SignInPage({
      searchParams: Promise.resolve({}),
    }));
    expect(markup).toContain('data-registration="false"');
  });

  it("guards account creation before rendering registration", async () => {
    visibility.require.mockRejectedValueOnce(new Error("404"));
    await expect(RegisterPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("404");
    expect(visibility.require).toHaveBeenCalledWith("account-creation");
  });

  it.each([SignInPage, RegisterPage, VerifyEmailPage, ForgotPasswordPage])(
    "passes the safe destination into %s",
    async (page) => {
      const markup = renderToStaticMarkup(await page({
        searchParams: Promise.resolve({ returnTo }),
      }));
      expect(markup).toContain(`data-return-to="${returnTo}"`);
    },
  );

  it("retains compatibility with legacy next links", async () => {
    const markup = renderToStaticMarkup(await SignInPage({
      searchParams: Promise.resolve({ next: returnTo }),
    }));
    expect(markup).toContain(`data-return-to="${returnTo}"`);
  });

  it("rejects external destinations before rendering the form", async () => {
    const markup = renderToStaticMarkup(await SignInPage({
      searchParams: Promise.resolve({ returnTo: "https://evil.invalid/" }),
    }));
    expect(markup).not.toContain("data-return-to");
  });
});

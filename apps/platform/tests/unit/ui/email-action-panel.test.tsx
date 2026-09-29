import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  parameters: new URLSearchParams(),
  error: null as Error | null,
  success: false,
  pending: false,
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => state.parameters }));
vi.mock("@/modules/users/ui/auth/use-email-action", () => ({
  useEmailAction: () => ({
    form: useForm({ defaultValues: { password: "", confirmPassword: "" } }),
    reset: {
      error: null,
      isPending: false,
      isSuccess: state.success,
      mutate: vi.fn(),
    },
    resetCode: { error: state.error, isPending: state.pending },
    verification: {
      error: state.error,
      isSuccess: state.success,
      isPending: state.pending,
      isIdle: false,
    },
  }),
}));
import { EmailActionPanel } from "@/modules/users/ui/auth/email-action-panel";

function render(
  mode: string,
  overrides: { error?: Error; success?: boolean } = {},
) {
  state.parameters = new URLSearchParams({
    mode,
    oobCode: "test-code",
    continueUrl: "https://evil.example",
  });
  state.error = overrides.error ?? null;
  state.success = overrides.success ?? false;
  state.pending = false;
  return renderToStaticMarkup(<EmailActionPanel />);
}

describe("application email action panel", () => {
  it("uses the existing password fields and button for reset", () => {
    const markup = render("resetPassword");
    expect(markup).toContain('name="password"');
    expect(markup).toContain('name="confirmPassword"');
    expect(markup).toContain('autoComplete="new-password"');
    expect(markup).toContain("Reset password");
    expect(markup).not.toContain("evil.example");
  });
  it.each(["verifyEmail", "resetPassword"])(
    "keeps %s success navigation inside the application",
    (mode) => {
      const markup = render(mode, { success: true });
      expect(markup).toContain('href="/sign-in"');
      expect(markup).not.toContain("evil.example");
    },
  );
  it.each(["auth/expired-action-code", "auth/invalid-action-code"])(
    "offers recovery for %s",
    (code) => {
      const error = Object.assign(new Error("Provider internals"), { code });
      const markup = render("resetPassword", { error });
      expect(markup).toContain("invalid or has expired");
      expect(markup).toContain('href="/forgot-password"');
      expect(markup).not.toContain("Provider internals");
    },
  );
  it("rejects unsupported modes and offers application recovery", () => {
    expect(render("recoverEmail")).toContain("incomplete or unsupported");
  });
});

// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  signIn: vi.fn(),
  register: vi.fn(),
  verification: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("@/platform/auth/firebase/ClientAuthService", () => ({
  authClientService: {
    signIn: mocks.signIn,
    registerAccount: mocks.register,
    completeEmailVerification: mocks.verification,
    getEmailVerificationStatus: async () => ({ verified: false }),
    resendVerificationEmail: vi.fn(),
  },
}));

import { useSignIn } from "@/modules/users/ui/auth/use-sign-in";
import { useRegistration } from "@/modules/users/ui/auth/use-registration";
import { useEmailVerification } from "@/modules/users/ui/auth/use-email-verification";
import { SignInForm } from "@/modules/users/ui/auth/sign-in-form";
import { RegistrationForm } from "@/modules/users/ui/auth/registration-form";
import { EmailVerificationPanel } from "@/modules/users/ui/auth/email-verification-panel";
import { ForgotPasswordForm } from "@/modules/users/ui/auth/forgot-password-form";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

const returnTo = "/admin/tasks/123?tab=history&filter=mine";
let root: Root;
let container: HTMLDivElement;
let queryClient: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signIn.mockResolvedValue({ defaultPath: "/portal" });
  mocks.register.mockResolvedValue(undefined);
  mocks.verification.mockResolvedValue(true);
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  queryClient.clear();
  document.body.replaceChildren();
});

async function mount(children: React.ReactNode) {
  await act(async () => root.render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  ));
}

async function submitSignIn(destination?: string) {
  let signIn: ReturnType<typeof useSignIn>;
  function Probe() {
    signIn = useSignIn(destination);
    return null;
  }
  await mount(<Probe />);
  await act(async () => signIn.submit({ email: "user@example.com", password: "Password123!" }));
}

describe("returnTo through authentication", () => {
  it("returns to the requested page after sign-in", async () => {
    await submitSignIn(returnTo);
    expect(mocks.replace).toHaveBeenCalledWith(returnTo);
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it.each([undefined, "https://evil.invalid", "/\\evil.invalid"])(
    "uses the session default when the destination is absent or unsafe: %s",
    async (destination) => {
      await submitSignIn(destination);
      expect(mocks.replace).toHaveBeenCalledWith("/portal");
    },
  );

  it("preserves the requested URL when email verification is required", async () => {
    mocks.signIn.mockRejectedValue(new Error("email-not-verified"));
    await submitSignIn(returnTo);
    expect(mocks.replace).toHaveBeenCalledWith(
      `/verify-email?${new URLSearchParams({ returnTo })}`,
    );
  });

  it("preserves returnTo through registration", async () => {
    let registration: ReturnType<typeof useRegistration>;
    function Probe() {
      registration = useRegistration(returnTo);
      return null;
    }
    await mount(<Probe />);
    await act(async () => registration.submit({
      firstName: "Test",
      surname: "Applicant",
      email: "user@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    }));
    expect(mocks.replace).toHaveBeenCalledWith(
      `/verify-email?${new URLSearchParams({ returnTo })}`,
    );
  });

  it("returns to sign-in with the destination after verification", async () => {
    let verification: ReturnType<typeof useEmailVerification>;
    function Probe() {
      verification = useEmailVerification(returnTo);
      return null;
    }
    await mount(<Probe />);
    await act(async () => {
      verification.checkVerification();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(mocks.replace).toHaveBeenCalledWith(
      `/sign-in?${new URLSearchParams({ returnTo })}`,
    );
  });

  it("carries returnTo on adjacent authentication links", async () => {
    await mount(
      <>
        <SignInForm returnTo={returnTo} />
        <RegistrationForm returnTo={returnTo} />
        <EmailVerificationPanel returnTo={returnTo} />
        <ForgotPasswordForm returnTo={returnTo} />
      </>,
    );
    const links = Array.from(container.querySelectorAll("a"));
    expect(links).toHaveLength(5);
    for (const link of links) {
      expect(new URL(link.href).searchParams.get("returnTo")).toBe(returnTo);
    }
  });
});

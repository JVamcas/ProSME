// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactElement } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams({
    mode: "resetPassword",
    oobCode: "test-code",
  }),
}));
vi.mock("@/platform/auth/firebase/ClientAuthService", () => ({
  authClientService: {
    signIn: mocks.signIn,
    registerAccount: vi.fn(),
    requestPasswordReset: vi.fn(),
    verifyEmailAction: vi.fn(),
    checkPasswordResetCode: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

import { SignInForm } from "@/modules/users/ui/auth/sign-in-form";
import { RegistrationForm } from "@/modules/users/ui/auth/registration-form";
import { ForgotPasswordForm } from "@/modules/users/ui/auth/forgot-password-form";
import { EmailActionPanel } from "@/modules/users/ui/auth/email-action-panel";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let container: HTMLDivElement;
let queryClient: QueryClient;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.signIn.mockResolvedValue({ defaultPath: "/portal" });
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // The reset form renders only after its code has been checked.
  queryClient.setQueryData(
    ["auth", "password-reset-code", "test-code"],
    "user@example.test",
  );
  container = document.createElement("div");
  document.body.append(container);
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = undefined;
  }
  queryClient.clear();
  container.remove();
});

function serverRender(child: ReactElement) {
  const tree = (
    <QueryClientProvider client={queryClient}>{child}</QueryClientProvider>
  );
  container.innerHTML = renderToString(tree);
  return tree;
}

function getForm() {
  return container.querySelector("form")!;
}

function enterValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("authentication form submission", () => {
  it.each([
    ["sign-in", SignInForm],
    ["registration", RegistrationForm],
    ["forgot password", ForgotPasswordForm],
    ["reset password", EmailActionPanel],
  ] as const)("protects %s before hydration and enables it afterward", async (_, FormComponent) => {
    const tree = serverRender(<FormComponent />);
    expect(getForm().method).toBe("post");
    expect(getForm().querySelector("fieldset")?.disabled).toBe(true);
    const fieldset = getForm().querySelector("fieldset")!;
    expect(fieldset.querySelector("input")).not.toBeNull();
    expect(fieldset.querySelector('button[type="submit"]')).not.toBeNull();

    await act(async () => {
      root = hydrateRoot(container, tree);
    });

    expect(getForm().querySelector("fieldset")?.disabled).toBe(false);
    expect(getForm().querySelector('button[type="submit"]:disabled')).toBeNull();
  });

  it("cancels native navigation and sends sign-in values through the client service", async () => {
    const tree = serverRender(<SignInForm />);
    await act(async () => {
      root = hydrateRoot(container, tree);
    });
    const email = getForm().querySelector<HTMLInputElement>('[name="email"]')!;
    const password = getForm().querySelector<HTMLInputElement>('[name="password"]')!;
    await act(async () => {
      enterValue(email, "user@example.test");
      enterValue(password, "TestPassword123!");
    });
    const event = new Event("submit", { bubbles: true, cancelable: true });
    await act(async () => {
      getForm().dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(mocks.signIn.mock.calls[0]?.[0]).toEqual({
      email: "user@example.test",
      password: "TestPassword123!",
    });
    expect(mocks.replace).toHaveBeenCalledWith("/portal");
  });

  it("cancels native navigation when validation rejects the credentials", async () => {
    const tree = serverRender(<SignInForm />);
    await act(async () => {
      root = hydrateRoot(container, tree);
    });
    const event = new Event("submit", { bubbles: true, cancelable: true });
    await act(async () => {
      getForm().dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Enter your email address.");
  });
});

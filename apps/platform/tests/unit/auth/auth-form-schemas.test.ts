import { describe, expect, it } from "vitest";

import {
  passwordResetSchema,
  newPasswordSchema,
  registrationSchema,
  signInSchema,
} from "@/platform/auth/firebase/auth-form.schemas";

describe("authentication form schemas", () => {
  it("requires matching registration passwords", () => {
    const result = registrationSchema.safeParse({
      confirmPassword: "different123",
      email: "owner@example.com",
      firstName: "Business",
      password: "secret123",
      surname: "Owner",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toContainEqual(
      expect.objectContaining({
        message: "The passwords do not match.",
        path: ["confirmPassword"],
      }),
    );
  });

  it("requires first name and surname", () => {
    const result = registrationSchema.safeParse({
      confirmPassword: "secret123",
      email: "owner@example.com",
      firstName: "",
      password: "secret123",
      surname: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: ["firstName"] }),
        expect.objectContaining({ path: ["surname"] }),
      ]),
    );
  });

  it("validates sign-in and password-reset email addresses", () => {
    expect(
      signInSchema.safeParse({ email: "invalid", password: "secret123" })
        .success,
    ).toBe(false);
    expect(passwordResetSchema.safeParse({ email: "invalid" }).success).toBe(
      false,
    );
  });
  it("requires valid, matching new passwords", () => {
    expect(
      newPasswordSchema.safeParse({ password: "123", confirmPassword: "123" })
        .success,
    ).toBe(false);
    expect(
      newPasswordSchema.safeParse({
        password: "secret123",
        confirmPassword: "different",
      }).success,
    ).toBe(false);
    expect(
      newPasswordSchema.safeParse({
        password: "secret123",
        confirmPassword: "secret123",
      }).success,
    ).toBe(true);
  });
});

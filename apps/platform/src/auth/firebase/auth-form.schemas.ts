import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("Enter a valid email address.")
  .max(254, "Email address is too long.");

const passwordSchema = z
  .string()
  .min(1, "Enter your password.")
  .min(6, "Password must contain at least 6 characters.");

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const passwordResetSchema = z.object({
  email: emailSchema,
});

export const registrationSchema = z
  .object({
    confirmPassword: z.string().min(1, "Confirm your password."),
    email: emailSchema,
    firstName: z
      .string()
      .trim()
      .min(1, "Enter your first name.")
      .max(100, "First name is too long."),
    password: passwordSchema,
    surname: z
      .string()
      .trim()
      .min(1, "Enter your surname.")
      .max(100, "Surname is too long."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  });

export type PasswordResetValues = z.infer<typeof passwordResetSchema>;
export type RegistrationValues = z.infer<typeof registrationSchema>;
export type SignInValues = z.infer<typeof signInSchema>;

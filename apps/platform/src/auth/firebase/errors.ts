import { ClientRequestError } from "@/lib/client-http";

export function getFirebaseErrorMessage(error: unknown) {
  if (error instanceof ClientRequestError) {
    return error.message;
  }

  if (
    error instanceof Error &&
    error.message === "verification-session-missing"
  ) {
    return "Your verification session is unavailable. Sign in again to request a new link.";
  }

  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";

  if (code.includes("invalid-credential") || code.includes("invalid_email")) {
    return "The email address or password is incorrect.";
  }

  if (code.includes("email-already-in-use")) {
    return "An account already exists for this email address.";
  }

  if (code.includes("weak-password")) {
    return "Use a stronger password with at least six characters.";
  }

  if (code.includes("too-many-requests")) {
    return "Too many attempts. Please wait and try again.";
  }

  return "We could not complete that request. Please try again.";
}

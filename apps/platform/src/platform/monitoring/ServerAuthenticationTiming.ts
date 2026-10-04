import "server-only";

type VerificationOperation = "id-token" | "session-cookie";

// Opt in to duration-only diagnostics; tokens, identities and errors are never logged.
export async function measureAuthenticationVerification<T>(
  operation: VerificationOperation,
  checkRevoked: boolean,
  verify: () => Promise<T>,
): Promise<T> {
  if (process.env.AUTHENTICATION_TIMING !== "1") return verify();

  const started = performance.now();
  let succeeded = false;
  try {
    const result = await verify();
    succeeded = true;
    return result;
  } finally {
    console.info("Firebase authentication timing", {
      operation,
      checkRevoked,
      succeeded,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
    });
  }
}

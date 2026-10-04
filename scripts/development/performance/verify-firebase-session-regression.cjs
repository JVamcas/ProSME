const { readFile, writeFile } = require("node:fs/promises");
const { createRequire } = require("node:module");
const requireApp = createRequire(`${process.cwd()}/package.json`);
const { cert, initializeApp, deleteApp } = requireApp("firebase-admin/app");
const { getAuth } = requireApp("firebase-admin/auth");

async function verifyRejection(operation, expectedCode) {
  try {
    await operation();
  } catch (error) {
    if (error.code === expectedCode) return { passed: true, code: error.code };
    throw error;
  }
  throw new Error(`Expected ${expectedCode}`);
}

async function run() {
  const sessionFile = process.env.RESPONSIVENESS_SCOPE_SESSION;
  const outputFile = process.env.RESPONSIVENESS_OUTPUT;
  if (!sessionFile || !outputFile) {
    throw new Error("Set private scope session and nonsecret output paths.");
  }
  const baseURL =
    process.env.RESPONSIVENESS_BASE_URL ?? "http://localhost:3018";
  if (
    !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname) ||
    new URL(process.env.DATABASE_URL).pathname !==
      "/smefund_responsiveness_test"
  ) {
    throw new Error(
      "This regression harness requires the isolated local runtime.",
    );
  }
  const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
    : {
        projectId:
          process.env.FIREBASE_PROJECT_ID ||
          process.env.PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      };
  const app = initializeApp({ credential: cert(credentials) });
  const auth = getAuth(app);
  const { cookie } = JSON.parse(await readFile(sessionFile, "utf8"));
  const results = {};
  try {
    const decoded = await auth.verifySessionCookie(cookie);
    const identity = await auth.getUser(decoded.uid);
    if (
      !identity.email?.startsWith("scope-") ||
      !identity.email.endsWith("@example.test") ||
      identity.displayName !== "Scope Test"
    ) {
      throw new Error("Refusing to revoke a non-synthetic identity.");
    }
    const parts = cookie.split(".");
    parts[2] = `${parts[2][0] === "A" ? "B" : "A"}${parts[2].slice(1)}`;
    results.signature = await verifyRejection(
      () => auth.verifySessionCookie(parts.join(".")),
      "auth/argument-error",
    );
    const originalNow = Date.now;
    try {
      Date.now = () => (decoded.exp + 1) * 1000;
      results.expiration = await verifyRejection(
        () => auth.verifySessionCookie(cookie),
        "auth/session-cookie-expired",
      );
    } finally {
      Date.now = originalNow;
    }
    await auth.revokeRefreshTokens(decoded.uid);
    results.revocation = await verifyRejection(
      () => auth.verifySessionCookie(cookie, true),
      "auth/session-cookie-revoked",
    );
    await auth.verifySessionCookie(cookie);
    results.normalSignedSession = { passed: true, validUntilExpiry: true };
    const response = await fetch(
      `${baseURL}/api/admin/roles/61111111-1111-4111-8111-111111111118`,
      {
        method: "PATCH",
        headers: {
          Cookie: `__Host-smefund_session=${cookie}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Performance Scope Test",
          description: null,
          capabilityCodes: [],
        }),
      },
    );
    if (response.status !== 401)
      throw new Error("Revoked session reached a sensitive route.");
    results.sensitiveRoute = {
      passed: true,
      status: response.status,
      method: "PATCH",
      path: "/api/admin/roles/[id]",
    };
    await writeFile(
      outputFile,
      JSON.stringify({ synthetic: true, results }, null, 2),
    );
    process.stdout.write(
      "Real Firebase expiration, signature and revocation regression checks passed.\n",
    );
  } finally {
    await deleteApp(app);
  }
}

run().catch((error) => {
  process.stderr.write(`${error.code || error.name}\n`);
  process.exitCode = 1;
});

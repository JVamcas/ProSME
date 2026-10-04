const { writeFile } = require("node:fs/promises");
const { randomBytes } = require("node:crypto");
const {
  cert,
  initializeApp,
  applicationDefault,
} = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const outputPath = process.env.AUTHENTICATION_PERFORMANCE_OUTPUT;
const samples = Number(process.env.AUTHENTICATION_PERFORMANCE_SAMPLES ?? 20);
if (!outputPath || !Number.isInteger(samples) || samples < 1 || samples > 100) {
  throw new Error("Set AUTHENTICATION_PERFORMANCE_OUTPUT and 1–100 samples.");
}

function credential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  }
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return cert({
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(
        /\\\\n/g,
        "\\n",
      ).replace(/\\n/g, "\n"),
    });
  }
  return applicationDefault();
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function verify(auth, operation, token, checkRevoked) {
  if (operation === "id-token") {
    return checkRevoked
      ? auth.verifyIdToken(token, true)
      : auth.verifyIdToken(token);
  }
  return checkRevoked
    ? auth.verifySessionCookie(token, true)
    : auth.verifySessionCookie(token);
}

async function signIn(auth, uid) {
  const customToken = await auth.createCustomToken(uid);
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${process.env.PUBLIC_FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const body = await response.json();
  if (!response.ok || !body.idToken)
    throw new Error("Synthetic sign-in failed.");
  return body.idToken;
}

async function main() {
  const auth = getAuth(
    initializeApp({
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.PUBLIC_FIREBASE_PROJECT_ID,
      credential: credential(),
    }),
  );
  const account = await auth.createUser({
    email: `auth-latency-${randomBytes(10).toString("hex")}@example.test`,
    emailVerified: true,
    displayName: "Disposable Auth Latency Test",
  });
  const measurements = [];
  const cold = [];
  let cleanedUp = false;
  const validation = {};
  try {
    const idToken = await signIn(auth, account.uid);
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: 5 * 24 * 60 * 60 * 1000,
    });
    for (const [operation, token] of [
      ["id-token", idToken],
      ["session-cookie", sessionCookie],
    ]) {
      const firstStarted = performance.now();
      await verify(auth, operation, token, false);
      cold.push({ operation, durationMs: performance.now() - firstStarted });
      for (let sample = 0; sample < samples; sample += 1) {
        const modes = sample % 2 ? [true, false] : [false, true];
        for (const checkRevoked of modes) {
          const started = performance.now();
          await verify(auth, operation, token, checkRevoked);
          measurements.push({
            operation,
            sample,
            checkRevoked,
            durationMs: performance.now() - started,
          });
        }
      }
    }
    const segments = sessionCookie.split(".");
    segments[2] = (segments[2][0] === "A" ? "B" : "A") + segments[2].slice(1);
    try {
      await auth.verifySessionCookie(segments.join("."));
      throw new Error("Tampered session unexpectedly accepted.");
    } catch (error) {
      if (error.code !== "auth/argument-error") throw error;
      validation.tamperedSessionRejected = true;
    }
    // Firebase timestamps have second resolution; make revocation later than auth_time.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await auth.revokeRefreshTokens(account.uid);
    await auth.verifySessionCookie(sessionCookie);
    validation.standardVerificationChecksSignedSessionUntilExpiry = true;
    try {
      await auth.verifySessionCookie(sessionCookie, true);
      throw new Error("Sensitive revoked session unexpectedly accepted.");
    } catch (error) {
      if (error.code !== "auth/session-cookie-revoked") throw error;
      validation.sensitiveRevokedSessionRejected = true;
    }
  } finally {
    await auth.deleteUser(account.uid);
    cleanedUp = true;
    const summary = ["id-token", "session-cookie"].map((operation) => ({
      operation,
      standardMedianMs: median(
        measurements
          .filter((m) => m.operation === operation && !m.checkRevoked)
          .map((m) => m.durationMs),
      ),
      revokedCheckMedianMs: median(
        measurements
          .filter((m) => m.operation === operation && m.checkRevoked)
          .map((m) => m.durationMs),
      ),
    }));
    await writeFile(
      outputPath,
      JSON.stringify(
        {
          recordedAt: new Date().toISOString(),
          environment:
            "Real Firebase; same synthetic identity/token; warm SDK certificate cache; alternating modes; no database reads",
          samplesPerOperationAndMode: samples,
          cold,
          summary,
          validation,
          cleanedUp,
          measurements,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(JSON.stringify({ summary, validation, cleanedUp }));
  }
}

main().catch((error) => {
  console.error("Firebase authentication measurement failed", {
    code: error.code ?? error.name,
  });
  process.exitCode = 1;
});

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { setDefaultResultOrder } from "node:dns";
import { config } from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import pg from "pg";
import { runBootstrapAdmin } from "./run-bootstrap-admin.mjs";
import {
  verifyAccess,
  verifyImmutableAuthorizationAudit,
  verifyRuntimeAuthorizationRevocation,
  verifySystemAdministrator,
} from "./verify-firebase-access.mjs";

config({ path: ".env", quiet: true });
setDefaultResultOrder("ipv4first");

const origin = process.env.G1_ORIGIN ?? "http://127.0.0.1:3014";
const apiKey = process.env.PUBLIC_FIREBASE_API_KEY
  || process.env.FIREBASE_WEB_API_KEY
  || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const projectId = process.env.FIREBASE_PROJECT_ID
  || process.env.PUBLIC_FIREBASE_PROJECT_ID
  || process.env.FIREBASE_WEB_PROJECT_ID
  || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const suffix = `${Date.now()}-${randomBytes(3).toString("hex")}`;
const password = `G1-${randomBytes(12).toString("base64url")}aA1!`;
const identities = [
  { kind: "applicant", email: `g1-applicant-${suffix}@example.test` },
  { kind: "cms", email: `g1-cms-${suffix}@example.test` },
  { kind: "operations", email: `g1-operations-${suffix}@example.test` },
  { kind: "system", email: `g1-system-${suffix}@example.test` },
];

assert(apiKey, "PUBLIC_FIREBASE_API_KEY is required");
assert(projectId, "A Firebase project ID is required");
assert(process.env.FIREBASE_CLIENT_EMAIL, "FIREBASE_CLIENT_EMAIL is required");
assert(process.env.FIREBASE_PRIVATE_KEY, "FIREBASE_PRIVATE_KEY is required");
assert(process.env.DATABASE_URL, "DATABASE_URL is required");

const admin = getAuth(initializeApp({
  projectId,
  credential: cert({
    projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
}));
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function firebaseRequest(action, body) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, returnSecureToken: true }),
  });
  const result = await response.json();
  assert(response.ok, `Firebase ${action} failed: ${result.error?.message ?? response.status}`);
  return result;
}

function responseCookie(response, name) {
  const headers = response.headers.getSetCookie?.() ?? [response.headers.get("set-cookie")];
  return headers.filter(Boolean).map((value) => value.split(";", 1)[0]).find((value) => value.startsWith(`${name}=`));
}

async function createVerifiedIdentity(identity) {
  const registered = await firebaseRequest("signUp", { email: identity.email, password });
  identity.uid = registered.localId;
  identity.registrationToken = registered.idToken;
  assert.equal((await admin.getUser(registered.localId)).emailVerified, false);
  await admin.updateUser(registered.localId, { emailVerified: true, displayName: `G1 ${identity.kind}` });
  const signedIn = await firebaseRequest("signInWithPassword", { email: identity.email, password });
  identity.registrationToken = signedIn.idToken;
  return signedIn.idToken;
}

async function createSession(idToken) {
  const csrfResponse = await fetch(`${origin}/api/auth/session`);
  assert.equal(csrfResponse.status, 200);
  const csrfCookie = responseCookie(csrfResponse, "smefund_csrf");
  const { token } = await csrfResponse.json();
  const response = await fetch(`${origin}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: csrfCookie },
    body: JSON.stringify({ idToken, csrfToken: token }),
  });
  assert.equal(response.status, 200);
  const cookie = responseCookie(response, "__Host-smefund_session")
    ?? responseCookie(response, "smefund_session");
  assert(cookie, "The session response did not set a session cookie");
  return cookie;
}

async function assignRole(email, roleCode, withCmsPrincipal = false) {
  await pool.query("UPDATE app_users SET user_type = 'staff', updated_at = now() WHERE email = $1", [email]);
  await pool.query(`
    INSERT INTO app_user_roles (user_id, role_id)
    SELECT app_users.id, app_roles.id FROM app_users CROSS JOIN app_roles
    WHERE app_users.email = $1 AND app_roles.code = $2
    ON CONFLICT DO NOTHING`, [email, roleCode]);
  if (withCmsPrincipal) {
    await pool.query(`
      INSERT INTO cms_principals (email, application_user_id, display_name, status, created_at, updated_at)
      SELECT email, id::text, display_name, 'active', now(), now() FROM app_users WHERE email = $1`, [email]);
  }
}

async function get(path, cookie) {
  return fetch(`${origin}${path}`, { headers: cookie ? { Cookie: cookie } : {}, redirect: "manual" });
}

async function verifyLogout(cookie) {
  const csrfResponse = await get("/api/auth/session", cookie);
  const csrfCookie = responseCookie(csrfResponse, "smefund_csrf");
  const { token } = await csrfResponse.json();
  const response = await fetch(`${origin}/api/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: `${cookie}; ${csrfCookie}` },
    body: JSON.stringify({ csrfToken: token }),
  });
  assert.equal(response.status, 200);
  assert(response.headers.get("set-cookie").includes("Max-Age=0"));
}

async function verifyInvalidIdToken() {
  const csrfResponse = await fetch(`${origin}/api/auth/session`);
  const csrfCookie = responseCookie(csrfResponse, "smefund_csrf");
  const { token } = await csrfResponse.json();
  const response = await fetch(`${origin}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: csrfCookie },
    body: JSON.stringify({ idToken: "invalid", csrfToken: token }),
  });
  assert.equal(response.status, 401);
}

try {
  const tokens = [];
  for (const identity of identities) tokens.push(await createVerifiedIdentity(identity));

  const invalidCsrf = await fetch(`${origin}/api/auth/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken: "invalid", csrfToken: "invalid" }),
  });
  assert.equal(invalidCsrf.status, 403);
  await verifyInvalidIdToken();

  const applicantCookie = await createSession(tokens[0]);
  const cmsCookie = await createSession(tokens[1]);
  const operationsCookie = await createSession(tokens[2]);
  const systemCookie = await createSession(tokens[3]);
  await assignRole(identities[1].email, "cms_editor", true);
  await assignRole(identities[2].email, "programme_officer", true);
  runBootstrapAdmin(identities[3].email);
  const auditCount = await pool.query("SELECT count(*) FROM app_authorization_audit_entries WHERE actor_id = $1", [`bootstrap:${identities[3].email}`]);
  assert(Number(auditCount.rows[0].count) > 0);
  runBootstrapAdmin(identities[3].email);
  const repeatedCount = await pool.query("SELECT count(*) FROM app_authorization_audit_entries WHERE actor_id = $1", [`bootstrap:${identities[3].email}`]);
  assert.equal(repeatedCount.rows[0].count, auditCount.rows[0].count);
  await verifyAccess({
    applicantCookie,
    cmsCookie,
    get,
    operationsCookie,
  });
  await verifyRuntimeAuthorizationRevocation({
    cmsCookie,
    cmsEmail: identities[1].email,
    get,
    pool,
  });
  await verifyImmutableAuthorizationAudit({
    actorId: `bootstrap:${identities[3].email}`,
    pool,
  });
  await verifySystemAdministrator(systemCookie, get);
  await verifyLogout(operationsCookie);

  await new Promise((resolve) => setTimeout(resolve, 1100));
  await admin.revokeRefreshTokens(identities[0].uid);
  assert.equal((await get("/api/auth/me", applicantCookie)).status, 401);
  console.log(
    "G1 Firebase verification passed: registration, sessions, live capability revocation, disabled-user denial, immutable authorization auditing, logout, CMS and operations authorization.",
  );
} finally {
  await pool.query("DELETE FROM cms_principals WHERE email = ANY($1)", [identities.map(({ email }) => email)]).catch(() => undefined);
  await pool.query("DELETE FROM app_users WHERE email = ANY($1)", [identities.map(({ email }) => email)]).catch(() => undefined);
  for (const identity of identities) {
    if (identity.registrationToken) {
      await firebaseRequest("delete", { idToken: identity.registrationToken }).catch(() => undefined);
    }
  }
  await pool.end();
}

import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import path from "node:path";

import { config } from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type { Page } from "playwright/test";
import pg from "pg";

config({ path: path.resolve(process.cwd(), "../../.env"), quiet: true });

const { Pool } = pg;

export type ScreenIdentity = {
  email: string;
  password: string;
  uid: string;
  userId: string;
};

function environmentValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) return undefined;
  const quoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  return quoted ? value.slice(1, -1) : value;
}

function firebaseCredential() {
  const serviceAccount = environmentValue("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (serviceAccount) {
    return cert(JSON.parse(serviceAccount));
  }

  const clientEmail = environmentValue("FIREBASE_CLIENT_EMAIL");
  const privateKey = environmentValue("FIREBASE_PRIVATE_KEY");
  const projectId =
    environmentValue("FIREBASE_PROJECT_ID") ??
    environmentValue("PUBLIC_FIREBASE_PROJECT_ID");
  assert(clientEmail, "FIREBASE_CLIENT_EMAIL is required");
  assert(privateKey, "FIREBASE_PRIVATE_KEY is required");
  assert(projectId, "A Firebase project ID is required");
  return cert({
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
    projectId,
  });
}

function firebaseAuth() {
  const app =
    getApps()[0] ??
    initializeApp({
      credential: firebaseCredential(),
      projectId:
        environmentValue("FIREBASE_PROJECT_ID") ??
        environmentValue("PUBLIC_FIREBASE_PROJECT_ID"),
    });
  return getAuth(app);
}

export async function createWorkflowScreenIdentity(): Promise<ScreenIdentity> {
  assert(process.env.DATABASE_URL, "DATABASE_URL is required");
  const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const email = `p33-screen-${suffix}@example.test`;
  const password = `P33-${randomBytes(12).toString("base64url")}aA1!`;
  const firebaseUser = await firebaseAuth().createUser({
    displayName: "P3.3 Screen Administrator",
    email,
    emailVerified: true,
    password,
  });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const user = await pool.query<{ id: string }>(
      `INSERT INTO app_users (email, display_name, user_type, status)
       VALUES ($1, 'P3.3 Screen Administrator', 'staff', 'active')
       RETURNING id`,
      [email],
    );
    const userId = user.rows[0].id;
    await pool.query(
      `INSERT INTO app_user_identities
         (user_id, provider, subject, email_verified)
       VALUES ($1, 'firebase', $2, true)`,
      [userId, firebaseUser.uid],
    );
    await pool.query(
      `INSERT INTO app_user_roles (user_id, role_id)
       SELECT $1, id FROM app_roles WHERE code = 'system_administrator'`,
      [userId],
    );
    return { email, password, uid: firebaseUser.uid, userId };
  } catch (error) {
    await firebaseAuth().deleteUser(firebaseUser.uid).catch(() => undefined);
    throw error;
  } finally {
    await pool.end();
  }
}

async function firebaseIdToken(identity: ScreenIdentity) {
  const apiKey = environmentValue("PUBLIC_FIREBASE_API_KEY");
  assert(apiKey, "PUBLIC_FIREBASE_API_KEY is required");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      body: JSON.stringify({
        email: identity.email,
        password: identity.password,
        returnSecureToken: true,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    },
  );
  const body = (await response.json()) as {
    error?: { message?: string };
    idToken?: string;
  };
  assert(response.ok && body.idToken, body.error?.message ?? "Sign-in failed");
  return body.idToken;
}

export async function establishWorkflowScreenSession(
  page: Page,
  identity: ScreenIdentity,
) {
  const csrfResponse = await page.request.get("/api/auth/session");
  assert(csrfResponse.ok(), "Could not create a CSRF token");
  const { token } = (await csrfResponse.json()) as { token: string };
  const response = await page.request.post("/api/auth/session", {
    data: { csrfToken: token, idToken: await firebaseIdToken(identity) },
  });
  assert(response.ok(), `Could not establish a session (${response.status()})`);
}

export async function deleteWorkflowScreenIdentity(identity: ScreenIdentity) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query("DELETE FROM app_users WHERE id = $1", [identity.userId]);
  } finally {
    await pool.end();
    await firebaseAuth().deleteUser(identity.uid).catch(() => undefined);
  }
}

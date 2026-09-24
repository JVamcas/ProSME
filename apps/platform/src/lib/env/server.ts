import { z } from "zod";

const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PAYLOAD_SECRET: z.string().min(32, "PAYLOAD_SECRET must be at least 32 characters"),
  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),
  PUBLIC_FIREBASE_API_KEY: z.string().min(1, "PUBLIC_FIREBASE_API_KEY is required"),
  PUBLIC_FIREBASE_AUTH_DOMAIN: z
    .string()
    .min(1, "PUBLIC_FIREBASE_AUTH_DOMAIN is required"),
  PUBLIC_FIREBASE_PROJECT_ID: z
    .string()
    .min(1, "PUBLIC_FIREBASE_PROJECT_ID is required"),
  PUBLIC_FIREBASE_APP_ID: z.string().min(1, "PUBLIC_FIREBASE_APP_ID is required"),
  FIREBASE_CLIENT_EMAIL: z.email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GOOGLE_CLOUD_PROJECT: z.string().trim().min(1).optional(),
  GOOGLE_CLOUD_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GCS_DOCUMENTS_BUCKET: z
    .string()
    .trim()
    .min(3, "GCS_DOCUMENTS_BUCKET is required")
    .optional(),
  SESSION_COOKIE_DAYS: z.coerce.number().int().min(1).max(14).default(5),
  PUBLIC_SITE_URL: z.url().default("http://localhost:3008"),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment {
  if (cachedEnvironment) {
    return cachedEnvironment;
  }

  const parsed = serverEnvironmentSchema.safeParse({
    ...process.env,
    FIREBASE_PROJECT_ID:
      process.env.FIREBASE_PROJECT_ID || process.env.PUBLIC_FIREBASE_PROJECT_ID,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${details}`);
  }

  cachedEnvironment = parsed.data;
  return cachedEnvironment;
}

export function resetServerEnvironmentForTests() {
  cachedEnvironment = undefined;
}

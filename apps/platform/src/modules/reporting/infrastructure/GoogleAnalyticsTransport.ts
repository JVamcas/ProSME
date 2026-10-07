import "server-only";

import { GoogleAuth } from "google-auth-library";

const concurrencyLimit = 4;
let active = 0;
const waiting: (() => void)[] = [];
let auth: GoogleAuth | undefined;

async function acquire() {
  if (active < concurrencyLimit) {
    active += 1;
    return;
  }
  if (waiting.length >= 32) throw new Error("Analytics provider is busy.");
  await new Promise<void>((resolve) => waiting.push(resolve));
}

function release() {
  const next = waiting.shift();
  if (next) next();
  else active -= 1;
}

export async function requestGoogleAnalytics(
  propertyId: string,
  method: "runReport" | "runFunnelReport",
  body: object,
): Promise<unknown> {
  await acquire();
  try {
    auth ??= new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
      ...(process.env.GA_SERVICE_ACCOUNT_JSON
        ? { credentials: JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON) }
        : {}),
    });
    const version = method === "runReport" ? "v1beta" : "v1alpha";
    const response = await auth.request({
      url: `https://analyticsdata.googleapis.com/${version}/properties/${propertyId}:${method}`,
      method: "POST",
      data: body,
      timeout: 15000,
      retry: false,
    });
    return response.data;
  } finally {
    release();
  }
}

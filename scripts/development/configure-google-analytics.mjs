import { pathToFileURL } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { GoogleAuth } from "google-auth-library";

const fundingCallDimension = {
  parameterName: "funding_call_id",
  displayName: "Funding Call ID",
  description: "Funding call associated with a recorded website event.",
  scope: "EVENT",
};

const journeyDimension = {
  parameterName: "journey_path",
  displayName: "User Journey",
  description:
    "Observed sequence of two or three approved public website steps.",
  scope: "EVENT",
};

async function findDimension(request, url, definition) {
  let pageToken;
  const seenTokens = new Set();
  do {
    const response = await request({
      url,
      method: "GET",
      params: {
        pageSize: 200,
        ...(pageToken ? { pageToken } : {}),
      },
      timeout: 15000,
      retry: false,
    });
    const existing = response.data.customDimensions?.find(
      (dimension) =>
        dimension.parameterName === definition.parameterName &&
        dimension.scope === definition.scope,
    );
    if (existing) return existing;
    pageToken = response.data.nextPageToken;
    if (pageToken && seenTokens.has(pageToken)) {
      throw new Error("Google Analytics returned a repeated page token.");
    }
    if (pageToken) seenTokens.add(pageToken);
  } while (pageToken);
  return null;
}

async function ensureDimension(
  request,
  { propertyId, dryRun = false },
  definition,
) {
  if (!/^\d+$/.test(propertyId ?? "")) {
    throw new Error("Set GA_PROPERTY_ID to the numeric GA property ID.");
  }
  const url = `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}/customDimensions`;
  const existing = await findDimension(request, url, definition);
  if (existing) return { action: "exists", name: existing.name };
  if (dryRun) return { action: "would-create" };

  const response = await request({
    url,
    method: "POST",
    data: definition,
    timeout: 15000,
    retry: false,
  });
  return { action: "created", name: response.data.name };
}

export function ensureFundingCallDimension(request, options) {
  return ensureDimension(request, options, fundingCallDimension);
}

export function ensureJourneyDimension(request, options) {
  return ensureDimension(request, options, journeyDimension);
}

export function setupErrorMessage(error) {
  const status = error.response?.status;
  const details = error.response?.data?.error?.details ?? [];
  if (details.some((detail) => detail.reason === "SERVICE_DISABLED")) {
    return "Enable Google Analytics Admin API in the credentials' Google Cloud project, then rerun this command.";
  }
  if (status === 403) {
    return "Google Analytics denied access. The setup credentials need Editor or Administrator access to the configured GA property.";
  }
  if (status === 401) {
    return "Google Analytics rejected the setup credentials.";
  }
  if (error.code === "EAI_AGAIN" || error.code === "ENOTFOUND") {
    return "Google Analytics could not be reached: DNS lookup failed.";
  }
  return "Google Analytics setup failed. Check the property ID, credentials, Admin API availability and custom-dimension quota.";
}

export async function enableAnalyticsAdminApi(request, error) {
  const detail = error.response?.data?.error?.details?.find(
    (item) =>
      item.reason === "SERVICE_DISABLED" &&
      item.metadata?.service === "analyticsadmin.googleapis.com",
  );
  const consumer = detail?.metadata?.consumer;
  if (!/^projects\/\d+$/.test(consumer ?? "")) throw error;

  let operation;
  try {
    const response = await request({
      url: `https://serviceusage.googleapis.com/v1/${consumer}/services/analyticsadmin.googleapis.com:enable`,
      method: "POST",
      data: {},
      timeout: 15000,
      retry: false,
    });
    operation = response.data;
    for (let attempt = 0; !operation.done && attempt < 12; attempt += 1) {
      if (!/^operations\/[A-Za-z0-9._-]+$/.test(operation.name ?? "")) {
        throw new Error("Invalid service activation operation.");
      }
      await sleep(2500);
      const status = await request({
        url: `https://serviceusage.googleapis.com/v1/${operation.name}`,
        method: "GET",
        timeout: 15000,
        retry: false,
      });
      operation = status.data;
    }
  } catch {
    throw new Error(
      "The setup credentials could not enable Google Analytics Admin API. Enable it in the credentials' Cloud project, or use a setup identity with serviceusage.services.enable permission.",
    );
  }
  if (!operation.done || operation.error) {
    throw new Error(
      "Admin API activation is incomplete. Check it in Google Cloud before rerunning setup.",
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const allowedArguments = [
    "--dry-run",
    "--enable-api",
    "--enable-api-with-adc",
  ];
  if (args.some((argument) => !allowedArguments.includes(argument))) {
    throw new Error(
      "Usage: npm run analytics:configure -- [--dry-run | --enable-api | --enable-api-with-adc]",
    );
  }
  const propertyId = process.env.GA_PROPERTY_ID;
  if (!/^\d+$/.test(propertyId ?? "")) {
    throw new Error("Set GA_PROPERTY_ID to the numeric GA property ID.");
  }
  const dryRun = args.includes("--dry-run");
  const enableApiWithAdc = args.includes("--enable-api-with-adc");
  const enableApi = args.includes("--enable-api") || enableApiWithAdc;
  if (dryRun && enableApi) {
    throw new Error(
      "A dry run cannot enable the Admin API. Use either --dry-run or --enable-api.",
    );
  }
  let credentials;
  if (process.env.GA_SERVICE_ACCOUNT_JSON) {
    try {
      credentials = JSON.parse(process.env.GA_SERVICE_ACCOUNT_JSON);
    } catch {
      throw new Error("GA_SERVICE_ACCOUNT_JSON must contain valid JSON.");
    }
  }
  const auth = new GoogleAuth({
    scopes: [
      dryRun
        ? "https://www.googleapis.com/auth/analytics.readonly"
        : "https://www.googleapis.com/auth/analytics.edit",
      ...(enableApi && !enableApiWithAdc
        ? ["https://www.googleapis.com/auth/cloud-platform"]
        : []),
    ],
    ...(credentials ? { credentials } : {}),
  });
  const request = (options) => auth.request(options);
  const configure = () =>
    Promise.all([
      ensureFundingCallDimension(request, { propertyId, dryRun }),
      ensureJourneyDimension(request, { propertyId, dryRun }),
    ]);
  let result;
  try {
    result = await configure();
  } catch (error) {
    const disabled = error.response?.data?.error?.details?.some(
      (detail) =>
        detail.reason === "SERVICE_DISABLED" &&
        detail.metadata?.service === "analyticsadmin.googleapis.com",
    );
    if (!enableApi || !disabled) throw new Error(setupErrorMessage(error));
    let activationRequest = request;
    if (enableApiWithAdc) {
      const cloudAuth = new GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
        keyFile: join(
          process.env.CLOUDSDK_CONFIG || join(homedir(), ".config/gcloud"),
          "application_default_credentials.json",
        ),
      });
      activationRequest = (options) => cloudAuth.request(options);
    }
    await enableAnalyticsAdminApi(activationRequest, error);
    console.log("Google Analytics Admin API enabled.");
    try {
      result = await configure();
    } catch (retryError) {
      throw new Error(setupErrorMessage(retryError));
    }
  }
  for (const [index, parameter] of [
    "funding_call_id",
    "journey_path",
  ].entries()) {
    console.log(
      `${result[index].action}: ${parameter} (EVENT) on properties/${propertyId}`,
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

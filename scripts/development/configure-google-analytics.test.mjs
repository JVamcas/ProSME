import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ensureFundingCallDimension,
  enableAnalyticsAdminApi,
  setupErrorMessage,
} from "./configure-google-analytics.mjs";

function transport(responses) {
  const calls = [];
  const request = async (options) => {
    calls.push(options);
    const response = responses.shift();
    if (response instanceof Error) throw response;
    assert.ok(response, "Unexpected provider request");
    return { data: response };
  };
  return { request, calls };
}

const existing = {
  name: "properties/123/customDimensions/1",
  parameterName: "funding_call_id",
  scope: "EVENT",
};

test("an existing event-scoped dimension is preserved without writes", async () => {
  const { request, calls } = transport([{ customDimensions: [existing] }]);
  assert.deepEqual(
    await ensureFundingCallDimension(request, { propertyId: "123" }),
    { action: "exists", name: existing.name },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "GET");
});

test("pagination is checked before creating a dimension", async () => {
  const { request, calls } = transport([
    { nextPageToken: "next" },
    { customDimensions: [existing] },
  ]);
  await ensureFundingCallDimension(request, { propertyId: "123" });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].params.pageToken, "next");
  assert.ok(calls.every((call) => call.method === "GET"));
});

test("a missing dimension is created once with the exact event parameter", async () => {
  const { request, calls } = transport([
    { customDimensions: [{ ...existing, scope: "USER" }] },
    { name: existing.name },
  ]);
  assert.deepEqual(
    await ensureFundingCallDimension(request, { propertyId: "123" }),
    { action: "created", name: existing.name },
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, "POST");
  assert.equal(calls[1].data.parameterName, "funding_call_id");
  assert.equal(calls[1].data.scope, "EVENT");
  assert.equal(calls[1].retry, false);
  assert.equal(
    calls[1].url,
    "https://analyticsadmin.googleapis.com/v1beta/properties/123/customDimensions",
  );
});

test("dry run does not write", async () => {
  const { request, calls } = transport([{}]);
  assert.deepEqual(
    await ensureFundingCallDimension(request, {
      propertyId: "123",
      dryRun: true,
    }),
    { action: "would-create" },
  );
  assert.equal(calls.length, 1);
});

test("invalid property IDs are rejected before provider access", async () => {
  const { request, calls } = transport([]);
  for (const propertyId of [undefined, "", "G-123", "123/other"]) {
    await assert.rejects(
      ensureFundingCallDimension(request, { propertyId }),
      /numeric GA property ID/,
    );
  }
  assert.equal(calls.length, 0);
});

test("a failed read never proceeds to creation", async () => {
  const failure = new Error("provider credentials and headers");
  const { request, calls } = transport([failure]);
  await assert.rejects(
    ensureFundingCallDimension(request, { propertyId: "123" }),
    failure,
  );
  assert.equal(calls.length, 1);
});

test("provider errors produce actionable messages without credentials", () => {
  const error = {
    message: "private credential material",
    response: { status: 403, data: { error: { details: [] } } },
  };
  assert.match(setupErrorMessage(error), /Editor or Administrator/);
  assert.ok(!setupErrorMessage(error).includes("private"));
  error.response.data.error.details.push({ reason: "SERVICE_DISABLED" });
  assert.match(setupErrorMessage(error), /Enable Google Analytics Admin API/);
});

test("repeated pagination tokens fail instead of looping indefinitely", async () => {
  const { request, calls } = transport([
    { nextPageToken: "same" },
    { nextPageToken: "same" },
  ]);
  await assert.rejects(
    ensureFundingCallDimension(request, { propertyId: "123" }),
    /repeated page token/,
  );
  assert.equal(calls.length, 2);
});

const disabledAdminApi = {
  response: {
    data: {
      error: {
        details: [{
          reason: "SERVICE_DISABLED",
          metadata: {
            service: "analyticsadmin.googleapis.com",
            consumer: "projects/12345",
          },
        }],
      },
    },
  },
};

test("API activation targets only the disabled Analytics Admin API's consumer project", async () => {
  const { request, calls } = transport([{ done: true }]);
  await enableAnalyticsAdminApi(request, disabledAdminApi);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://serviceusage.googleapis.com/v1/projects/12345/services/analyticsadmin.googleapis.com:enable",
  );
});

test("API activation is skipped for unrelated errors or an unverified project", async () => {
  const { request, calls } = transport([]);
  await assert.rejects(enableAnalyticsAdminApi(request, new Error("denied")));
  await assert.rejects(enableAnalyticsAdminApi(request, {
    response: {
      data: {
        error: {
          details: [{
            reason: "SERVICE_DISABLED",
            metadata: {
              service: "analyticsadmin.googleapis.com",
              consumer: "projects/12345/other",
            },
          }],
        },
      },
    },
  }));
  assert.equal(calls.length, 0);
});

test("failed Cloud API activation gives a safe permission error", async () => {
  const { request } = transport([new Error("private credential material")]);
  await assert.rejects(
    enableAnalyticsAdminApi(request, disabledAdminApi),
    /serviceusage.services.enable permission/,
  );
});

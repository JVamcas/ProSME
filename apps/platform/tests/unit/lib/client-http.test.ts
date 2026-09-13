import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ClientRequestError,
  patchData,
  postJson,
  requestData,
  requestJson,
} from "@/lib/client-http";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("client HTTP service", () => {
  it("returns a successful JSON response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ value: 42 }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestJson<{ value: number }>("/api/example")).resolves.toEqual({
      value: 42,
    });
  });

  it("throws the API error with its HTTP status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
        }),
      ),
    );

    const request = requestJson("/api/example");
    await expect(request).rejects.toMatchObject({
      message: "Access denied",
      status: 403,
    } satisfies Partial<ClientRequestError>);
  });

  it("parses the structured API data envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              value: 42,
            },
            meta: {
              correlationId: "correlation-id",
            },
          }),
          {
            status: 200,
          },
        ),
      ),
    );

    await expect(
      requestData<{ value: number }>("/api/example"),
    ).resolves.toEqual({
      value: 42,
    });
  });

  it("preserves structured error metadata", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "VALIDATION_ERROR",
              message: "Review the fields.",
              fields: {
                firstName: ["First name is required"],
              },
            },
            meta: {
              correlationId: "correlation-id",
            },
          }),
          {
            status: 400,
          },
        ),
      ),
    );

    await expect(requestData("/api/example")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      correlationId: "correlation-id",
      fields: {
        firstName: ["First name is required"],
      },
      message: "Review the fields.",
      status: 400,
    } satisfies Partial<ClientRequestError>);
  });

  it("serializes JSON mutations in the client service layer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await postJson("/api/example", {
      name: "Example",
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/example", {
      body: JSON.stringify({ name: "Example" }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("sends profile updates with PATCH", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            success: true,
          },
          meta: {
            correlationId: "correlation-id",
          },
        }),
        {
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await patchData("/api/example", {
      name: "Example",
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/example", {
      body: JSON.stringify({ name: "Example" }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });
  });
});

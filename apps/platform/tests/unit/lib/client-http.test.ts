import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ClientRequestError,
  postJson,
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
});

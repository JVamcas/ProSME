import { describe, expect, it } from "vitest";

import { documentDownloadResponse } from "@/lib/api/DocumentDownloadResponse";

describe("documentDownloadResponse", () => {
  it("returns private attachment content without a storage redirect", async () => {
    const response = documentDownloadResponse({
      body: Buffer.from("document body"),
      contentType: "application/pdf",
      fileName: "evidence.pdf",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="evidence.pdf"',
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toBe("document body");
  });

  it("prevents unsafe file names from injecting response headers", () => {
    const response = documentDownloadResponse({
      body: Buffer.alloc(0),
      contentType: "application/octet-stream",
      fileName: 'unsafe"\r\nX-Injected: true.pdf',
    });

    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="unsafe___X-Injected: true.pdf"',
    );
    expect(response.headers.get("x-injected")).toBeNull();
  });
});

import { z } from "zod";
import { describe, expect, it } from "vitest";

import { portalRouteError } from "@/lib/api/PortalApiResponse";

describe("portal API error responses", () => {
  it("uses field validation details as the response message", async () => {
    const result = z.object({
      reviewerCount: z.number().max(2, "Reviewer count cannot exceed two."),
    }).safeParse({ reviewerCount: 3 });

    if (result.success) throw new Error("Expected validation to fail.");

    const response = portalRouteError(result.error, "correlation-id");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe(
      "Reviewer count cannot exceed two.",
    );
    expect(body.error.fields).toEqual({
      reviewerCount: ["Reviewer count cannot exceed two."],
    });
  });
});

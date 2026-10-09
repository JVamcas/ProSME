import { afterEach, describe, expect, it, vi } from "vitest";
import { clientReportService } from "@/modules/reporting/ClientReportService";
import { ClientRequestError } from "@/lib/client-http";

afterEach(() => vi.unstubAllGlobals());
describe("private report download transport", () => {
  it("returns the saved bytes through the client service", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response("private csv", {
        headers: { "Content-Type": "text/csv" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const blob = await clientReportService.download(
      "report",
      "run",
      "artifact",
    );
    expect(await blob.text()).toBe("private csv");
    expect(fetch).toHaveBeenCalledWith(
      "/api/reporting/reports/report/runs/run/artifacts/artifact",
      { cache: "no-store" },
    );
  });
  it("translates revoked access into the existing client error used by the toast", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "FORBIDDEN", message: "Access was revoked." },
          }),
          { status: 403 },
        ),
      ),
    );
    await expect(
      clientReportService.download("report", "run", "artifact"),
    ).rejects.toBeInstanceOf(ClientRequestError);
  });
});

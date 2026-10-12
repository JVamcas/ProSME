import { describe, expect, it } from "vitest";
import { enforceCmsPublishing } from "@/payload/access/can-publish-content";
import { cmsPermissionCode } from "@/auth/authorization/permissions";
import { prepareEvent } from "@/modules/content/EventPublishing";
import type { PayloadRequest } from "payload";

function request(publish = false) {
  return {
    context: {},
    user: {
      collection: "cms-principals",
      capabilities: publish ? [cmsPermissionCode("events", "publish")] : [],
    },
  } as unknown as PayloadRequest;
}

describe("Event publishing protection", () => {
  it("keeps review submission a draft", () => {
    const data = { _status: "draft", reviewStatus: "inReview" };
    expect(enforceCmsPublishing("events", { data, req: request() })).toEqual(
      data,
    );
  });

  it("requires the event-specific publishing grant", () => {
    expect(() =>
      enforceCmsPublishing("events", {
        data: { _status: "published", reviewStatus: "approved" },
        req: request(),
      }),
    ).toThrow("cms.events.publish");
  });

  it("publishes directly for an authorized publisher", () => {
    expect(
      enforceCmsPublishing(
        "events",
        {
          data: { _status: "published", reviewStatus: "draft" },
          req: request(true),
        },
        { approveOnPublish: true },
      ),
    ).toMatchObject({ _status: "published", reviewStatus: "approved" });
    expect(() =>
      enforceCmsPublishing(
        "events",
        {
          data: { _status: "published", reviewStatus: "draft" },
          req: request(),
        },
        { approveOnPublish: true },
      ),
    ).toThrow("cms.events.publish");
  });

  it("does not permit an editor to approve content", () => {
    expect(() =>
      enforceCmsPublishing("events", {
        data: { _status: "draft", reviewStatus: "approved" },
        req: request(),
      }),
    ).toThrow("Approval requires");
  });

  it("validates combined dates and derives a stable initial slug", async () => {
    const args = {
      data: {
        title: "Sample session",
        startsAt: "2030-01-01T10:00:00Z",
        endsAt: "2030-01-01T12:00:00Z",
      },
      req: request(),
    } as unknown as Parameters<typeof prepareEvent>[0];
    expect(await prepareEvent(args)).toMatchObject({ slug: "sample-session" });
    await expect(
      prepareEvent({
        ...args,
        data: { ...args.data, endsAt: "2030-01-01T09:00:00Z" },
      }),
    ).rejects.toThrow("End time");
    await expect(
      prepareEvent({
        ...args,
        data: { ...args.data, timezone: "unknown/zone" },
      }),
    ).rejects.toThrow("timezone");
  });
});

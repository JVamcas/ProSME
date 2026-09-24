import { describe, expect, it } from "vitest";

import {
  applicantDetailProgressLabel,
} from "@/modules/applications/domain/ApplicationDetailStatus";

describe("application detail progress badge", () => {
  it("follows the applicant-facing public status", () => {
    expect(applicantDetailProgressLabel("UNDER_REVIEW")).toBe("IN PROGRESS");
    expect(applicantDetailProgressLabel("ACTION_REQUIRED")).toBe("ACTION REQUIRED");
    expect(applicantDetailProgressLabel("WITHDRAWN")).toBe("WITHDRAWN");
  });

});

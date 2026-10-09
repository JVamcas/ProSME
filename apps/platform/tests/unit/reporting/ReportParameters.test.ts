import { describe, expect, it } from "vitest";
import {
  bindReportParameters,
  type ReportParameterDefinition,
} from "@/modules/reporting/domain/ReportParameters";

function bind(definitions: ReportParameterDefinition[], values: Record<string, unknown> = {}) {
  return bindReportParameters({
    definitions,
    values,
    runAt: "2026-10-08T09:00:00.000Z",
    timezone: "Africa/Windhoek",
  });
}
function parameter(
  type: ReportParameterDefinition["type"],
  defaultValue?: unknown,
): ReportParameterDefinition {
  return { name: "value", position: 1, type, binding: "value", nullable: false, defaultValue };
}

describe("typed native PostgreSQL parameters", () => {
  it("retains exact decimal precision without converting through JavaScript numbers", () => {
    expect(bind([parameter("decimal")], { value: "9999999999999999.99" })).toEqual([
      "9999999999999999.99",
    ]);
    expect(() => bind([parameter("decimal")], { value: 1.1 })).toThrow();
  });
  it("validates literal defaults, nulls and override values", () => {
    expect(bind([parameter("integer", 2)])).toEqual([2]);
    expect(bind([{ ...parameter("integer", 2), nullable: true }], { value: null })).toEqual([null]);
    expect(() => bind([parameter("integer", "now()")])).toThrow();
    expect(() => bind([parameter("integer")], { value: "2" })).toThrow();
  });
  it("does not accept identifiers, extra actor/scope parameters or server-value overrides", () => {
    expect(() => bind([parameter("uuid")], { value: "app_users" })).toThrow();
    expect(() => bind([parameter("text")], { value: "x", actorId: "other" })).toThrow();
    const system = { ...parameter("timestamp"), binding: "run-at" as const };
    expect(bind([system])).toEqual(["2026-10-08T09:00:00.000Z"]);
    expect(() => bind([system], { value: "2020-01-01T00:00:00Z" })).toThrow();
  });
  it("checks calendar dates, IANA zones, bounded arrays and metadata order", () => {
    expect(() => bind([parameter("date")], { value: "2026-02-30" })).toThrow();
    expect(() => bind([parameter("timezone")], { value: "Unknown/Zone" })).toThrow();
    expect(() => bind([parameter("text-array")], { value: Array(101).fill("x") })).toThrow();
    expect(() => bind([{ ...parameter("text"), position: 2 }])).toThrow();
    expect(() => bind([parameter("text"), { ...parameter("text"), position: 2 }])).toThrow();
  });
});

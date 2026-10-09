import { describe, expect, it } from "vitest";
import { businessProfileSchema } from "@/modules/businesses/BusinessSchemas";
import {
  businessSectors,
  businessSectorFormValues,
} from "@/modules/businesses/domain/BusinessSectors";

const input = {
  businessType: "Close corporation",
  employeeCount: "4",
  establishedYear: "2020",
  legalName: "Example Trading CC",
  physicalAddress: "Windhoek",
  region: "Khomas",
  registrationNumber: "CC/2020/1",
  sector: "Manufacturing and value addition",
  tradingName: "Example Trading",
};
const requiredFields = [
  "registrationNumber",
  "tradingName",
  "employeeCount",
  "establishedYear",
] as const;

describe("required business details", () => {
  it("reopens legacy and custom sector text under Other for editing", () => {
    const values = businessSectorFormValues({
      ...input,
      sector: "Legacy local trade",
      secondarySector: "Custom services",
    });
    expect(values).toMatchObject({
      sector: "OTHER",
      sectorOther: "Legacy local trade",
      secondarySector: "OTHER",
      secondarySectorOther: "Custom services",
    });
    expect(businessProfileSchema.safeParse(values).success).toBe(true);
  });

  it("retains listed sectors and initializes a blank optional secondary for editing", () => {
    expect(businessSectorFormValues(input)).toMatchObject({
      sector: input.sector,
      sectorOther: "",
      secondarySector: "",
      secondarySectorOther: "",
    });
  });

  it.each(businessSectors)(
    "accepts the listed primary and secondary sector %s",
    (sector) => {
      expect(
        businessProfileSchema.safeParse({
          ...input,
          sector,
          secondarySector: sector,
        }).success,
      ).toBe(true);
    },
  );

  it("allows secondary sector to be omitted or cleared", () => {
    expect(businessProfileSchema.safeParse(input).success).toBe(true);
    expect(
      businessProfileSchema.safeParse({ ...input, secondarySector: "" })
        .success,
    ).toBe(true);
  });

  it.each(["sector", "secondarySector"])("rejects an unlisted %s", (field) => {
    expect(
      businessProfileSchema.safeParse({ ...input, [field]: "unticked" })
        .success,
    ).toBe(false);
  });

  it.each(["sector", "secondarySector"])(
    "requires details when %s is Other",
    (field) => {
      const detail =
        field === "sector" ? "sectorOther" : "secondarySectorOther";
      for (const text of [undefined, "", "   "]) {
        const result = businessProfileSchema.safeParse({
          ...input,
          [field]: "OTHER",
          [detail]: text,
        });
        expect(result.success).toBe(false);
        if (result.success) throw new Error("Missing Other details accepted");
        expect(
          result.error.issues.some((issue) => issue.path[0] === detail),
        ).toBe(true);
      }
      expect(
        businessProfileSchema.parse({
          ...input,
          [field]: "OTHER",
          [detail]: " Custom sector ",
        })[detail],
      ).toBe("Custom sector");
    },
  );
  it.each(requiredFields)("rejects blank and missing %s", (field) => {
    for (const value of ["", "   ", undefined]) {
      const result = businessProfileSchema.safeParse({
        ...input,
        [field]: value,
      });
      expect(result.success).toBe(false);
      if (result.success) throw new Error("Incomplete business accepted");
      expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(
        true,
      );
    }
  });

  it("trims required details and accepts zero employees", () => {
    expect(
      businessProfileSchema.parse({
        ...input,
        employeeCount: "0",
        registrationNumber: " CC/2020/1 ",
        tradingName: " Example Trading ",
      }),
    ).toMatchObject({
      employeeCount: "0",
      registrationNumber: "CC/2020/1",
      tradingName: "Example Trading",
    });
  });

  it.each(["1.5", "-1", "1000001", "abc"])(
    "rejects invalid employee count %s",
    (employeeCount) => {
      expect(
        businessProfileSchema.safeParse({ ...input, employeeCount }).success,
      ).toBe(false);
    },
  );

  it.each(["1799", "20XX", "2,020", String(new Date().getFullYear() + 1)])(
    "rejects invalid establishment year %s",
    (establishedYear) => {
      expect(
        businessProfileSchema.safeParse({ ...input, establishedYear }).success,
      ).toBe(false);
    },
  );
});

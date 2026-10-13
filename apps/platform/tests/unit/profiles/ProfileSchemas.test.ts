import { describe, expect, it } from "vitest";

import {
  applicantProfileSchema,
  applicantProfileUpdateSchema,
} from "@/modules/profiles/ProfileSchemas";
import { businessProfileSchema } from "@/modules/businesses/BusinessSchemas";

describe("P3.1 profile validation", () => {
  it("accepts a valid applicant profile", () => {
    const result = applicantProfileSchema.safeParse({
      gender: "Female",
      firstName: "Anna",
      surname: "Ndeitunga",
      phoneNumber: "+264 81 000 0000",
      dateOfBirth: "1990-06-12",
      nationality: "Namibian",
      region: "Khomas",
      postalAddress: "PO Box 1",
    });

    expect(result.success).toBe(true);
  });

  it("requires gender and rejects unsupported values", () => {
    const profile = {
      firstName: "Anna",
      surname: "Ndeitunga",
      phoneNumber: "+264810000000",
      dateOfBirth: "1990-06-12",
      nationality: "Namibian",
      region: "Khomas",
      postalAddress: "",
    };
    expect(
      applicantProfileSchema.parse({ ...profile, gender: "Female" }).gender,
    ).toBe("Female");
    expect(
      applicantProfileSchema.safeParse({ ...profile, gender: "invalid" })
        .success,
    ).toBe(false);
    expect(applicantProfileSchema.safeParse(profile).success).toBe(false);
  });

  it("rejects incomplete business details and invalid numeric values", () => {
    const result = businessProfileSchema.safeParse({
      legalName: "",
      tradingName: "",
      registrationNumber: "",
      businessType: "",
      sector: "Manufacturing",
      region: "Khomas",
      physicalAddress: "Windhoek",
      establishedYear: "20XX",
      employeeCount: "1.5",
    });

    expect(result.success).toBe(false);
  });

  it("validates personal and contact submissions independently", () => {
    const personal = applicantProfileUpdateSchema.safeParse({
      section: "personal",
      data: {
        gender: "Female",
        firstName: "Anna",
        surname: "Ndeitunga",
        dateOfBirth: "1990-06-12",
        nationality: "Namibian",
        region: "Khomas",
      },
    });
    const contact = applicantProfileUpdateSchema.safeParse({
      section: "contact",
      data: {
        phoneNumber: "+264 81 000 0000",
        postalAddress: "",
      },
    });

    expect(personal.success).toBe(true);
    expect(contact.success).toBe(true);
  });

  it("rejects impossible or future dates", () => {
    const invalid = applicantProfileSchema.safeParse({
      gender: "Female",
      firstName: "Anna",
      surname: "Ndeitunga",
      phoneNumber: "+264 81 000 0000",
      dateOfBirth: "2026-02-31",
      nationality: "Namibian",
      region: "Khomas",
      postalAddress: "PO Box 1",
    });

    expect(invalid.success).toBe(false);
  });
});

const requiredPersonal = {
  firstName: "Anna",
  surname: "Synthetic",
  dateOfBirth: "1990-06-12",
  gender: "Female",
  nationality: "Namibian",
  region: "Khomas",
};

it.each(Object.keys(requiredPersonal))("requires personal field %s", (key) => {
  for (const value of ["", "   ", undefined]) {
    expect(
      applicantProfileUpdateSchema.safeParse({
        section: "personal",
        data: { ...requiredPersonal, [key]: value },
      }).success,
    ).toBe(false);
  }
});

it("does not require or retain a personal position", () => {
  const result = applicantProfileUpdateSchema.parse({
    section: "personal",
    data: { ...requiredPersonal, position: "Legacy position" },
  });
  expect(result.data).not.toHaveProperty("position");
});

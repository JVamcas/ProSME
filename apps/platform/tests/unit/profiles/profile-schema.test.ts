import { describe, expect, it } from "vitest";

import {
  applicantProfileSchema,
  applicantProfileUpdateSchema,
  businessProfileSchema,
} from "@/modules/profiles/profile.schemas";

describe("P3.1 profile validation", () => {
  it("accepts a valid applicant profile", () => {
    const result = applicantProfileSchema.safeParse({
      firstName: "Anna",
      surname: "Ndeitunga",
      position: "Managing director",
      phoneNumber: "+264 81 000 0000",
      dateOfBirth: "1990-06-12",
      nationality: "Namibian",
      region: "Khomas",
      postalAddress: "PO Box 1",
    });

    expect(result.success).toBe(true);
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
        firstName: "Anna",
        surname: "Ndeitunga",
        position: "Managing director",
        dateOfBirth: "",
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
      firstName: "Anna",
      surname: "Ndeitunga",
      position: "Managing director",
      phoneNumber: "+264 81 000 0000",
      dateOfBirth: "2026-02-31",
      nationality: "Namibian",
      region: "Khomas",
      postalAddress: "PO Box 1",
    });

    expect(invalid.success).toBe(false);
  });
});

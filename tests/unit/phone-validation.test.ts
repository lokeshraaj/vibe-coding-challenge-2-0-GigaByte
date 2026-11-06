import { describe, it, expect } from "vitest";
import {
  validateAndNormalizePhone,
  validateOptionalPhone,
  POPULAR_COUNTRIES,
} from "@/lib/validation/phone";
import {
  academyRegisterSchema,
  coachInviteSchema,
  playerSchema,
} from "@/lib/validation/schemas";

describe("ATHLIX Contact Phone Number Validation Suite", () => {
  describe("1. validateAndNormalizePhone - Core Functionality", () => {
    it("accepts a valid 10-digit Indian phone number without country code and normalizes to E.164", () => {
      const result = validateAndNormalizePhone("9876543210", "IN");
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe("+919876543210");
      expect(result.country).toBe("IN");
      expect(result.callingCode).toBe("+91");
      expect(result.nationalNumber).toBe("9876543210");
    });

    it("accepts a valid 10-digit Indian phone number with +91 and spaces/dashes", () => {
      const result = validateAndNormalizePhone("+91 98765 43210", "IN");
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe("+919876543210");
    });

    it("rejects insufficient digits for India (e.g. 12345)", () => {
      const result = validateAndNormalizePhone("12345", "IN");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/10 digits/i);
    });

    it("rejects excessive digits for India (e.g. 987654321012)", () => {
      const result = validateAndNormalizePhone("987654321012", "IN");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/10 digits/i);
    });

    it("rejects arbitrary text such as sdf234234dsqwer23", () => {
      const result = validateAndNormalizePhone("sdf234234dsqwer23", "IN");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/alphabetic letters/i);
    });

    it("rejects alphanumeric strings like 98765abc10", () => {
      const result = validateAndNormalizePhone("98765abc10", "IN");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/alphabetic letters/i);
    });

    it("rejects invalid special characters like 98765#43210 or 98765$43210", () => {
      const hashResult = validateAndNormalizePhone("98765#43210", "IN");
      expect(hashResult.isValid).toBe(false);
      expect(hashResult.error).toMatch(/invalid special characters/i);

      const dollarResult = validateAndNormalizePhone("98765$43210", "IN");
      expect(dollarResult.isValid).toBe(false);
      expect(dollarResult.error).toMatch(/invalid special characters/i);
    });

    it("rejects empty and whitespace-only strings when required", () => {
      const emptyResult = validateAndNormalizePhone("", "IN");
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.error).toMatch(/required/i);

      const wsResult = validateAndNormalizePhone("   ", "IN");
      expect(wsResult.isValid).toBe(false);
      expect(wsResult.error).toMatch(/required/i);
    });

    it("accepts valid international phone numbers for United States (+1)", () => {
      const result = validateAndNormalizePhone("+1 202 555 0123", "US");
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe("+12025550123");
      expect(result.country).toBe("US");
    });

    it("accepts valid international phone numbers for United Kingdom (+44)", () => {
      const result = validateAndNormalizePhone("+44 20 7946 0192", "GB");
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe("+442079460192");
      expect(result.country).toBe("GB");
    });

    it("accepts valid international phone numbers for United Arab Emirates (+971)", () => {
      const result = validateAndNormalizePhone("+971 50 123 4567", "AE");
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe("+971501234567");
      expect(result.country).toBe("AE");
    });

    it("accepts valid international phone numbers for Australia (+61)", () => {
      const result = validateAndNormalizePhone("+61 412 345 678", "AU");
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe("+61412345678");
      expect(result.country).toBe("AU");
    });

    it("verifies POPULAR_COUNTRIES configuration has calling codes and flags", () => {
      expect(POPULAR_COUNTRIES.length).toBeGreaterThan(15);
      const india = POPULAR_COUNTRIES.find((c) => c.code === "IN");
      expect(india).toBeDefined();
      expect(india?.callingCode).toBe("+91");
      expect(india?.flag).toBe("🇮🇳");
    });
  });

  describe("2. validateOptionalPhone - Optional Fields", () => {
    it("returns valid for empty, null, and whitespace inputs", () => {
      expect(validateOptionalPhone("").isValid).toBe(true);
      expect(validateOptionalPhone(null).isValid).toBe(true);
      expect(validateOptionalPhone(undefined).isValid).toBe(true);
      expect(validateOptionalPhone("   ").isValid).toBe(true);
    });

    it("normalizes a valid optional number to E.164", () => {
      const result = validateOptionalPhone("9876543210", "IN");
      expect(result.isValid).toBe(true);
      expect(result.e164).toBe("+919876543210");
    });

    it("rejects an invalid optional number when a non-empty string is provided", () => {
      const result = validateOptionalPhone("sdf234234dsqwer23", "IN");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/alphabetic letters/i);
    });

    it("rejects incomplete digits when optional number is provided", () => {
      const result = validateOptionalPhone("12345", "IN");
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/10 digits/i);
    });
  });

  describe("3. Zod Schema Validation & Transformation to E.164", () => {
    const baseAcademyPayload = {
      academyName: "Apex Football Academy",
      state: "Maharashtra",
      city: "Mumbai",
      country: "India",
      contactEmail: "contact@apexacademy.com",
      ownerName: "Coach Marcus",
      ownerEmail: "owner@apexacademy.com",
      password: "StrongPassword123",
    };

    it("academyRegisterSchema accepts 10-digit phone and transforms to E.164", () => {
      const parsed = academyRegisterSchema.safeParse({
        ...baseAcademyPayload,
        contactPhone: "9876543210",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.contactPhone).toBe("+919876543210");
      }
    });

    it("academyRegisterSchema accepts international number in E.164 format", () => {
      const parsed = academyRegisterSchema.safeParse({
        ...baseAcademyPayload,
        contactPhone: "+12025550123",
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.contactPhone).toBe("+12025550123");
      }
    });

    it("academyRegisterSchema rejects arbitrary text in contactPhone", () => {
      const parsed = academyRegisterSchema.safeParse({
        ...baseAcademyPayload,
        contactPhone: "sdf234234dsqwer23",
      });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const phoneError = parsed.error.issues.find((i) => i.path.includes("contactPhone"));
        expect(phoneError).toBeDefined();
      }
    });

    it("academyRegisterSchema rejects insufficient digits (12345)", () => {
      const parsed = academyRegisterSchema.safeParse({
        ...baseAcademyPayload,
        contactPhone: "12345",
      });
      expect(parsed.success).toBe(false);
    });

    it("academyRegisterSchema rejects excessive digits for India", () => {
      const parsed = academyRegisterSchema.safeParse({
        ...baseAcademyPayload,
        contactPhone: "987654321012",
      });
      expect(parsed.success).toBe(false);
    });

    it("coachInviteSchema accepts valid phone and transforms to E.164", () => {
      const parsed = coachInviteSchema.safeParse({
        name: "Marcus Cole",
        email: "marcus@academy.com",
        phone: "9876543210",
        sport: "Football",
        specialization: "Striker Development",
        experienceYears: 5,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.phone).toBe("+919876543210");
      }
    });

    it("coachInviteSchema allows omitting phone", () => {
      const parsed = coachInviteSchema.safeParse({
        name: "Marcus Cole",
        email: "marcus@academy.com",
        sport: "Football",
        specialization: "Striker Development",
        experienceYears: 5,
      });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.phone).toBeUndefined();
      }
    });

    it("coachInviteSchema rejects arbitrary text for phone", () => {
      const parsed = coachInviteSchema.safeParse({
        name: "Marcus Cole",
        email: "marcus@academy.com",
        phone: "sdf234234dsqwer23",
        sport: "Football",
        specialization: "Striker Development",
        experienceYears: 5,
      });
      expect(parsed.success).toBe(false);
    });

    it("playerSchema rejects arbitrary text in contact.phone", () => {
      const parsed = playerSchema.safeParse({
        name: "Leo Vance",
        dateOfBirth: "2008-05-15",
        gender: "MALE",
        sport: "Football",
        position: "Striker",
        enrollmentDate: "2026-01-01",
        coachId: "650000000000000000000001",
        contact: {
          phone: "sdf234234dsqwer23",
        },
      });
      expect(parsed.success).toBe(false);
    });

    it("playerSchema normalizes valid contact.phone to E.164", () => {
      const parsed = playerSchema.safeParse({
        name: "Leo Vance",
        dateOfBirth: "2008-05-15",
        gender: "MALE",
        sport: "Football",
        position: "Striker",
        enrollmentDate: "2026-01-01",
        coachId: "650000000000000000000001",
        contact: {
          phone: "9876543210",
        },
      });
      expect(parsed.success).toBe(true);
      if (parsed.success && parsed.data.contact?.phone) {
        expect(parsed.data.contact.phone).toBe("+919876543210");
      }
    });
  });
});

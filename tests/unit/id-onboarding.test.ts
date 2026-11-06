import { describe, it, expect } from "vitest";
import { getSportCode, getStatePrefix, getAcademyInitial } from "@/lib/id-generator";
import { generateSecureOtp, hashOtp, verifyOtp, maskEmail } from "@/lib/auth/otp";
import { setPasswordSchema, verifyAcademyCodeSchema } from "@/lib/validation/schemas";

describe("ATHLIX ID Onboarding & Authentication Unit Tests", () => {
  describe("Academy Code & State Prefix Mapping", () => {
    it("correctly derives state prefixes using first two alphabetic characters", () => {
      expect(getStatePrefix("Bihar")).toBe("BI");
      expect(getStatePrefix("Jharkhand")).toBe("JH");
      expect(getStatePrefix("West Bengal")).toBe("WE");
      expect(getStatePrefix("Delhi")).toBe("DE");
      expect(getStatePrefix("Maharashtra")).toBe("MA");
      expect(getStatePrefix("Tamil Nadu")).toBe("TA");
      expect(getStatePrefix("Uttar Pradesh")).toBe("UT");
      expect(getStatePrefix("Karnataka")).toBe("KA");
      expect(getStatePrefix("Kerala")).toBe("KE");
      expect(getStatePrefix("Goa")).toBe("GO");
    });

    it("handles whitespace, lowercase, and abnormal characters cleanly", () => {
      expect(getStatePrefix("  bihar  ")).toBe("BI");
      expect(getStatePrefix("west bengal")).toBe("WE");
      expect(getStatePrefix("N")).toBe("NX");
      expect(getStatePrefix("")).toBe("XX");
    });

    it("validates academy codes matching SSNNNN format", () => {
      const validCodes = ["BI0001", "BI0002", "JH0001", "JH0002", "WE0001", "DE0042"];
      for (const code of validCodes) {
        expect(code).toMatch(/^[A-Z]{2}\d{4}$/);
        const parseResult = verifyAcademyCodeSchema.safeParse({ academyCode: code });
        expect(parseResult.success).toBe(true);
      }

      const invalidCodes = ["B0001", "BI001", "BI00001", "120001", "bihar001", ""];
      for (const code of invalidCodes) {
        const parseResult = verifyAcademyCodeSchema.safeParse({ academyCode: code });
        expect(parseResult.success).toBe(false);
      }
    });
  });

  describe("Sport Code & Individual ID Generation Conventions", () => {
    it("correctly resolves sport codes", () => {
      expect(getSportCode("Football")).toBe("FO");
      expect(getSportCode("Soccer")).toBe("FO");
      expect(getSportCode("Cricket")).toBe("CR");
      expect(getSportCode("Basketball")).toBe("BA");
      expect(getSportCode("Tennis")).toBe("TE");
      expect(getSportCode("Athletics")).toBe("AT");
      expect(getSportCode("Badminton")).toBe("BD");
      expect(getSportCode("Swimming")).toBe("SW");
      expect(getSportCode("Hockey")).toBe("HO");
    });

    it("constructs compliant Coach, Player, and Scout IDs WITHOUT academy prefix", () => {
      const sportCode = getSportCode("Football");
      const serial = "001";

      const coachId = `CO${sportCode}${serial}`;
      const playerId = `PL${sportCode}${serial}`;
      const scoutId = `SC${sportCode}${serial}`;

      expect(coachId).toBe("COFO001");
      expect(playerId).toBe("PLFO001");
      expect(scoutId).toBe("SCFO001");

      // Verify strict regex matching new format (NO leading academy letter)
      expect(coachId).toMatch(/^CO[A-Z]{2}\d{3}$/);
      expect(playerId).toMatch(/^PL[A-Z]{2}\d{3}$/);
      expect(scoutId).toMatch(/^SC[A-Z]{2}\d{3}$/);

      // Verify that the old DCOFO001 format is NOT matched by the new format
      expect("DCOFO001").not.toMatch(/^CO[A-Z]{2}\d{3}$/);
      expect("DPLFO001").not.toMatch(/^PL[A-Z]{2}\d{3}$/);
    });

    it("extracts legacy academy initial when needed for migration reference", () => {
      expect(getAcademyInitial("DemoAcademy")).toBe("D");
      expect(getAcademyInitial("Apex Elite Sports")).toBe("A");
      expect(getAcademyInitial("Real Madrid Academy")).toBe("R");
      expect(getAcademyInitial("  123 Sports")).toBe("S");
      expect(getAcademyInitial("")).toBe("A");
    });
  });

  describe("OTP Generation & Cryptographic Verification", () => {
    it("generates 6-digit numeric OTPs", () => {
      const otp = generateSecureOtp();
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it("hashes and verifies OTPs correctly using timing-safe comparison", () => {
      const otp = "849201";
      const hash = hashOtp(otp);

      expect(hash).not.toBe(otp);
      expect(hash).toHaveLength(64); // SHA-256 hex string

      expect(verifyOtp("849201", hash)).toBe(true);
      expect(verifyOtp("849202", hash)).toBe(false);
      expect(verifyOtp("000000", hash)).toBe(false);
      expect(verifyOtp("", hash)).toBe(false);
    });

    it("masks email addresses safely without data leakage", () => {
      expect(maskEmail("coachdemo1@gmail.com")).toBe("c********1@gmail.com");
      expect(maskEmail("alex@academy.org")).toBe("a**x@academy.org");
      expect(maskEmail("ab@test.com")).toBe("a*@test.com");
    });
  });

  describe("Password Setting Validation Rules", () => {
    it("rejects weak passwords lacking uppercase, lowercase, or digits", () => {
      // Missing uppercase
      const noUpper = setPasswordSchema.safeParse({
        activationToken: "valid-token",
        password: "password123",
        confirmPassword: "password123",
      });
      expect(noUpper.success).toBe(false);

      // Missing number
      const noNumber = setPasswordSchema.safeParse({
        activationToken: "valid-token",
        password: "PasswordOnly",
        confirmPassword: "PasswordOnly",
      });
      expect(noNumber.success).toBe(false);

      // Mismatched passwords
      const mismatch = setPasswordSchema.safeParse({
        activationToken: "valid-token",
        password: "CoachPassword2026!",
        confirmPassword: "DifferentPassword2026!",
      });
      expect(mismatch.success).toBe(false);

      // Valid password
      const valid = setPasswordSchema.safeParse({
        activationToken: "valid-token",
        password: "CoachPassword2026!",
        confirmPassword: "CoachPassword2026!",
      });
      expect(valid.success).toBe(true);
    });
  });
});

import { describe, it, expect } from "vitest";
import { getSportCode, getAcademyInitial } from "@/lib/id-generator";
import { generateSecureOtp, hashOtp, verifyOtp, maskEmail } from "@/lib/auth/otp";
import { setPasswordSchema } from "@/lib/validation/schemas";

describe("ATHLIX ID Onboarding & Authentication Unit Tests", () => {
  describe("Sport Code & Academy Initial Mapping", () => {
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

    it("correctly extracts academy initial uppercase letter", () => {
      expect(getAcademyInitial("DemoAcademy")).toBe("D");
      expect(getAcademyInitial("Apex Elite Sports")).toBe("A");
      expect(getAcademyInitial("Real Madrid Academy")).toBe("R");
      expect(getAcademyInitial("  123 Sports")).toBe("S");
      expect(getAcademyInitial("")).toBe("A");
    });

    it("constructs compliant Coach ID and Player ID shapes", () => {
      const initial = getAcademyInitial("DemoAcademy");
      const sportCode = getSportCode("Football");
      const serial = "001";

      const coachId = `${initial}CO${sportCode}${serial}`;
      const playerId = `${initial}PL${sportCode}${serial}`;

      expect(coachId).toBe("DCOFO001");
      expect(playerId).toBe("DPLFO001");

      // Verify regex matching required format
      expect(coachId).toMatch(/^[A-Z]CO[A-Z]{2}\d{3}$/);
      expect(playerId).toMatch(/^[A-Z]PL[A-Z]{2}\d{3}$/);
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

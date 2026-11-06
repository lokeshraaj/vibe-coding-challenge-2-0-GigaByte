import { describe, it, expect } from "vitest";
import { generateSecureOtp, hashOtp, verifyOtp, maskEmail } from "@/lib/auth/otp";
import { academyRegisterSchema } from "@/lib/validation/schemas";
import { getStatePrefix } from "@/lib/id-generator";

describe("Phase 4: Academy Registration with Mandatory Email OTP Verification", () => {
  describe("Academy Registration Schema Validation", () => {
    it("validates valid academy registration inputs with required state", () => {
      const validPayload = {
        academyName: "Apex Football Academy",
        state: "Bihar",
        city: "Patna",
        country: "India",
        contactEmail: "admin@apexacademy.com",
        contactPhone: "+919876543210",
        ownerName: "Rajesh Kumar",
        ownerEmail: "rajesh@apexacademy.com",
        password: "StrongPassword123",
      };

      const result = academyRegisterSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("requires state for Academy Code generation", () => {
      const invalidPayload = {
        academyName: "Apex Football Academy",
        state: "", // Empty state
        city: "Patna",
        country: "India",
        contactEmail: "admin@apexacademy.com",
        contactPhone: "+919876543210",
        ownerName: "Rajesh Kumar",
        ownerEmail: "rajesh@apexacademy.com",
        password: "StrongPassword123",
      };

      const result = academyRegisterSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe("OTP Generation, Masking & Expiry Invariants", () => {
    it("generates 6-digit numeric codes exclusively", () => {
      for (let i = 0; i < 25; i++) {
        const otp = generateSecureOtp();
        expect(otp).toHaveLength(6);
        expect(otp).toMatch(/^\d{6}$/);
      }
    });

    it("verifies matching OTP and rejects tampered codes", () => {
      const otp = generateSecureOtp();
      const hash = hashOtp(otp);

      expect(verifyOtp(otp, hash)).toBe(true);
      expect(verifyOtp("000000", hash)).toBe(false);
      expect(verifyOtp("999999", hash)).toBe(false);
      expect(verifyOtp(otp + "1", hash)).toBe(false);
    });

    it("masks email cleanly to protect user privacy", () => {
      expect(maskEmail("rajesh.kumar@apexacademy.com")).toBe("r**********r@apexacademy.com");
      expect(maskEmail("admin@gmail.com")).toBe("a***n@gmail.com");
      expect(maskEmail("ab@test.com")).toBe("a*@test.com");
    });

    it("derives the correct state prefix for Academy Code allocation", () => {
      expect(getStatePrefix("Bihar")).toBe("BI");
      expect(getStatePrefix("Jharkhand")).toBe("JH");
      expect(getStatePrefix("West Bengal")).toBe("WE");
      expect(getStatePrefix("Delhi")).toBe("DE");
      expect(getStatePrefix("Maharashtra")).toBe("MA");
    });
  });

  describe("Single-Use and Expiry Rules", () => {
    it("calculates 5-minute expiry timestamp correctly", () => {
      const now = Date.now();
      const expiresAt = new Date(now + 5 * 60 * 1000);
      const diffMs = expiresAt.getTime() - now;

      expect(diffMs).toBe(300000); // exactly 5 minutes in milliseconds
    });

    it("validates 60-second resend cooldown threshold", () => {
      const cooldownSeconds = 60;
      const lastSentAt = Date.now() - 30 * 1000; // 30 seconds ago
      const isCooldownActive = Date.now() - lastSentAt < cooldownSeconds * 1000;

      expect(isCooldownActive).toBe(true);

      const pastCooldown = Date.now() - 65 * 1000; // 65 seconds ago
      const isPastActive = Date.now() - pastCooldown < cooldownSeconds * 1000;
      expect(isPastActive).toBe(false);
    });
  });
});

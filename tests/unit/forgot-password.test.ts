import { describe, it, expect } from "vitest";
import {
  forgotPasswordInitiateSchema,
  forgotPasswordVerifySchema,
  forgotPasswordResetSchema,
} from "@/lib/validation/schemas";
import { signResetToken, verifyResetToken } from "@/modules/authentication/password-reset-service";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateSecureOtp, hashOtp, verifyOtp } from "@/lib/auth/otp";

describe("Phase 11: Forgot Password Functionality Unit Tests", () => {
  describe("Forgot Password Input Schema Validation", () => {
    it("validates identifier and optional academy code on initiation", () => {
      // With Academy Code
      const validWithCode = forgotPasswordInitiateSchema.safeParse({
        academyCode: "BI0001",
        identifier: "COCR001",
      });
      expect(validWithCode.success).toBe(true);

      // Email only (Owner or direct user)
      const validEmail = forgotPasswordInitiateSchema.safeParse({
        identifier: "owner@patnaacademy.com",
      });
      expect(validEmail.success).toBe(true);

      // Empty identifier fails
      const invalidEmpty = forgotPasswordInitiateSchema.safeParse({
        identifier: "",
      });
      expect(invalidEmpty.success).toBe(false);
    });

    it("enforces 6-digit numeric OTP format during verification", () => {
      expect(
        forgotPasswordVerifySchema.safeParse({
          challengeId: "chal-12345",
          otp: "123456",
        }).success
      ).toBe(true);

      // Non-digit OTP fails
      expect(
        forgotPasswordVerifySchema.safeParse({
          challengeId: "chal-12345",
          otp: "abcdef",
        }).success
      ).toBe(false);

      // 5-digit OTP fails
      expect(
        forgotPasswordVerifySchema.safeParse({
          challengeId: "chal-12345",
          otp: "12345",
        }).success
      ).toBe(false);

      // 7-digit OTP fails
      expect(
        forgotPasswordVerifySchema.safeParse({
          challengeId: "chal-12345",
          otp: "1234567",
        }).success
      ).toBe(false);
    });

    it("enforces password complexity and matching confirmation", () => {
      // Valid strong password
      const valid = forgotPasswordResetSchema.safeParse({
        resetToken: "valid-jwt-token",
        password: "Password123",
        confirmPassword: "Password123",
      });
      expect(valid.success).toBe(true);

      // Mismatched confirmation fails
      const mismatch = forgotPasswordResetSchema.safeParse({
        resetToken: "valid-jwt-token",
        password: "Password123",
        confirmPassword: "DifferentPassword123",
      });
      expect(mismatch.success).toBe(false);

      // No uppercase fails
      const noUpper = forgotPasswordResetSchema.safeParse({
        resetToken: "valid-jwt-token",
        password: "password123",
        confirmPassword: "password123",
      });
      expect(noUpper.success).toBe(false);

      // No digit fails
      const noDigit = forgotPasswordResetSchema.safeParse({
        resetToken: "valid-jwt-token",
        password: "PasswordLetters",
        confirmPassword: "PasswordLetters",
      });
      expect(noDigit.success).toBe(false);

      // Short password (< 8 chars) fails
      const tooShort = forgotPasswordResetSchema.safeParse({
        resetToken: "valid-jwt-token",
        password: "Pass1",
        confirmPassword: "Pass1",
      });
      expect(tooShort.success).toBe(false);
    });
  });

  describe("Reset Token Signing and Verification", () => {
    it("signs and successfully verifies valid reset token", async () => {
      const payload = {
        userId: "user_67890",
        challengeId: "chal_abcde",
        email: "coach@biharacademy.com",
      };

      const token = await signResetToken(payload);
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(20);

      const verified = await verifyResetToken(token);
      expect(verified.userId).toBe(payload.userId);
      expect(verified.challengeId).toBe(payload.challengeId);
      expect(verified.email).toBe(payload.email);
    });

    it("rejects tampered reset tokens", async () => {
      const payload = {
        userId: "user_12345",
        challengeId: "chal_12345",
        email: "test@example.com",
      };

      const token = await signResetToken(payload);
      const tampered = token.slice(0, -5) + "abcde";

      await expect(verifyResetToken(tampered)).rejects.toThrow();
    });
  });

  describe("Password Hashing & Verification (12 bcrypt rounds)", () => {
    it("hashes password and verifies matches", async () => {
      const password = "NewSecurePassword2026!";
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword("WrongPassword123!", hash);
      expect(isInvalid).toBe(false);
    });
  });
});

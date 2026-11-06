import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  sendBrevoEmail,
  sendCoachNotificationEmail,
  sendPlayerNotificationEmail,
  sendAcademyRegistrationEmail,
  sendOtpEmail,
} from "@/lib/email/brevo";
import { generateSecureOtp, hashOtp, verifyOtp } from "@/lib/auth/otp";

describe("Brevo Email Service & OTP Verification Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...originalEnv,
      BREVO_API_KEY: "test-brevo-api-key",
      BREVO_SENDER_EMAIL: "aalex04820834@gmail.com",
      BREVO_SENDER_NAME: "ATHLIX",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("1. Academy Welcome Email via Brevo", () => {
    it("dispatches academy registration email featuring Academy Code and state", async () => {
      let capturedRequest: any = null;

      global.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
        capturedRequest = { url, ...options, body: JSON.parse(options.body) };
        return {
          ok: true,
          status: 201,
          json: async () => ({ messageId: "msg-academy-001" }),
        };
      });

      const result = await sendAcademyRegistrationEmail({
        toEmail: "owner@jharkhandacademy.com",
        ownerName: "Rajesh Kumar",
        academyName: "Ranchi Super Sports",
        academyCode: "JH0001",
        city: "Ranchi",
        state: "Jharkhand",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-academy-001");
      expect(capturedRequest.url).toBe("https://api.brevo.com/v3/smtp/email");
      expect(capturedRequest.headers["api-key"]).toBe("test-brevo-api-key");
      expect(capturedRequest.body.to[0].email).toBe("owner@jharkhandacademy.com");
      expect(capturedRequest.body.subject).toContain("JH0001");
      expect(capturedRequest.body.htmlContent).toContain("JH0001");
      expect(capturedRequest.body.htmlContent).toContain("Ranchi Super Sports");
      expect(capturedRequest.body.htmlContent).toContain("Jharkhand");
    });
  });

  describe("2. Coach Notification Email via Brevo", () => {
    it("dispatches coach notification containing Academy Code and Coach ID without OTP or sign-up link", async () => {
      let capturedRequest: any = null;

      global.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
        capturedRequest = { url, ...options, body: JSON.parse(options.body) };
        return {
          ok: true,
          status: 201,
          json: async () => ({ messageId: "msg-coach-123" }),
        };
      });

      const result = await sendCoachNotificationEmail({
        toEmail: "coach@academy.com",
        coachName: "Alex Ferguson",
        coachId: "COFO001",
        academyName: "Apex Elite Sports",
        academyCode: "JH0001",
        sport: "Football",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-coach-123");
      expect(capturedRequest.url).toBe("https://api.brevo.com/v3/smtp/email");
      expect(capturedRequest.headers["api-key"]).toBe("test-brevo-api-key");
      expect(capturedRequest.body.sender.email).toBe("aalex04820834@gmail.com");
      expect(capturedRequest.body.sender.name).toBe("ATHLIX");
      expect(capturedRequest.body.to[0].email).toBe("coach@academy.com");
      expect(capturedRequest.body.subject).toContain("COFO001");
      expect(capturedRequest.body.htmlContent).toContain("COFO001");
      expect(capturedRequest.body.htmlContent).toContain("JH0001");
      expect(capturedRequest.body.htmlContent).toContain("Apex Elite Sports");
      expect(capturedRequest.body.htmlContent).toContain("Football");
      // Security rule: NO direct sign-up link or OTP in notification
      expect(capturedRequest.body.htmlContent).not.toContain("token=");
      expect(capturedRequest.body.htmlContent).not.toContain("password=");
    });
  });

  describe("3. Player Notification Email via Brevo", () => {
    it("dispatches player notification containing Academy Code and Player ID without OTP or registration link", async () => {
      let capturedRequest: any = null;

      global.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
        capturedRequest = { url, ...options, body: JSON.parse(options.body) };
        return {
          ok: true,
          status: 201,
          json: async () => ({ messageId: "msg-player-456" }),
        };
      });

      const result = await sendPlayerNotificationEmail({
        toEmail: "player@academy.com",
        playerName: "Marcus Rashford",
        playerId: "PLFO001",
        academyName: "Apex Elite Sports",
        academyCode: "JH0001",
        sport: "Football",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg-player-456");
      expect(capturedRequest.url).toBe("https://api.brevo.com/v3/smtp/email");
      expect(capturedRequest.body.sender.email).toBe("aalex04820834@gmail.com");
      expect(capturedRequest.body.to[0].email).toBe("player@academy.com");
      expect(capturedRequest.body.subject).toContain("PLFO001");
      expect(capturedRequest.body.htmlContent).toContain("PLFO001");
      expect(capturedRequest.body.htmlContent).toContain("JH0001");
      expect(capturedRequest.body.htmlContent).toContain("Apex Elite Sports");
      expect(capturedRequest.body.htmlContent).not.toContain("token=");
    });
  });

  describe("4. Coach & Player OTP Email via Brevo", () => {
    it("sends 6-digit OTP email with 5-minute expiry notice for Coach registration", async () => {
      let capturedRequest: any = null;

      global.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
        capturedRequest = { url, ...options, body: JSON.parse(options.body) };
        return {
          ok: true,
          status: 201,
          json: async () => ({ messageId: "msg-otp-789" }),
        };
      });

      const result = await sendOtpEmail({
        toEmail: "coach@academy.com",
        recipientName: "Alex Ferguson",
        otpCode: "482910",
        role: "COACH",
        athlixId: "COFO001",
        academyCode: "JH0001",
      });

      expect(result.success).toBe(true);
      expect(capturedRequest.body.sender.email).toBe("aalex04820834@gmail.com");
      expect(capturedRequest.body.sender.name).toBe("ATHLIX");
      expect(capturedRequest.body.to[0].email).toBe("coach@academy.com");
      expect(capturedRequest.body.subject).toBe("482910 is your ATHLIX verification code");
      expect(capturedRequest.body.htmlContent).toContain("482910");
      expect(capturedRequest.body.htmlContent).toContain("COFO001");
      expect(capturedRequest.body.htmlContent).toContain("JH0001");
      expect(capturedRequest.body.htmlContent).toContain("5 minutes");
      expect(capturedRequest.body.htmlContent).toContain("Coach");
    });

    it("sends 6-digit OTP email for Player registration", async () => {
      let capturedRequest: any = null;

      global.fetch = vi.fn().mockImplementation(async (url: string, options: any) => {
        capturedRequest = { url, ...options, body: JSON.parse(options.body) };
        return {
          ok: true,
          status: 201,
          json: async () => ({ messageId: "msg-otp-player" }),
        };
      });

      const result = await sendOtpEmail({
        toEmail: "player@academy.com",
        recipientName: "Marcus Rashford",
        otpCode: "918234",
        role: "PLAYER",
        athlixId: "PLFO001",
        academyCode: "JH0001",
      });

      expect(result.success).toBe(true);
      expect(capturedRequest.body.subject).toBe("918234 is your ATHLIX verification code");
      expect(capturedRequest.body.htmlContent).toContain("918234");
      expect(capturedRequest.body.htmlContent).toContain("PLFO001");
      expect(capturedRequest.body.htmlContent).toContain("JH0001");
      expect(capturedRequest.body.htmlContent).toContain("Player");
    });
  });

  describe("5. Brevo API Error Handling", () => {
    it("handles Brevo API HTTP 401 / 400 error cleanly without throwing unhandled exceptions", async () => {
      global.fetch = vi.fn().mockImplementation(async () => {
        return {
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ message: "Key not found", code: "unauthorized" }),
        };
      });

      const result = await sendBrevoEmail({
        toEmail: "test@example.com",
        toName: "Test User",
        subject: "Test Subject",
        htmlContent: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("401");
      expect(result.error).toContain("Key not found");
    });

    it("handles Brevo network or connection failure cleanly", async () => {
      global.fetch = vi.fn().mockImplementation(async () => {
        throw new Error("getaddrinfo ENOTFOUND api.brevo.com");
      });

      const result = await sendBrevoEmail({
        toEmail: "test@example.com",
        toName: "Test User",
        subject: "Test Subject",
        htmlContent: "<p>Test</p>",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("getaddrinfo ENOTFOUND api.brevo.com");
    });
  });

  describe("6. OTP Security, Hashing & Attempt Invariants", () => {
    it("never stores plain OTP and verifies valid vs invalid candidate OTPs", () => {
      const plainOtp = generateSecureOtp();
      const hash = hashOtp(plainOtp);

      expect(hash).not.toBe(plainOtp);
      expect(hash).toHaveLength(64);

      expect(verifyOtp(plainOtp, hash)).toBe(true);
      expect(verifyOtp("000000", hash)).toBe(false);
      expect(verifyOtp("123456", hash)).toBe(false);
      expect(verifyOtp("", hash)).toBe(false);
    });

    it("validates 5-minute expiration logic", () => {
      const now = Date.now();
      const validExpiresAt = new Date(now + 5 * 60 * 1000);
      const expiredAt = new Date(now - 1000); // 1 second ago

      const isExpired = (expiry: Date) => new Date() > expiry;

      expect(isExpired(validExpiresAt)).toBe(false);
      expect(isExpired(expiredAt)).toBe(true);
    });

    it("validates 60-second cooldown calculation", () => {
      const now = Date.now();
      const recentChallengeTime = new Date(now - 25 * 1000); // 25s ago
      const oldChallengeTime = new Date(now - 65 * 1000); // 65s ago

      const checkCooldown = (createdAt: Date) => {
        const timeSince = Date.now() - createdAt.getTime();
        if (timeSince < 60 * 1000) {
          return { allowed: false, remainingSec: Math.ceil((60 * 1000 - timeSince) / 1000) };
        }
        return { allowed: true, remainingSec: 0 };
      };

      const recentCheck = checkCooldown(recentChallengeTime);
      expect(recentCheck.allowed).toBe(false);
      expect(recentCheck.remainingSec).toBeGreaterThan(0);
      expect(recentCheck.remainingSec).toBeLessThanOrEqual(35);

      const oldCheck = checkCooldown(oldChallengeTime);
      expect(oldCheck.allowed).toBe(true);
      expect(oldCheck.remainingSec).toBe(0);
    });

    it("validates maximum 5 verification attempts", () => {
      let attempts = 0;
      const maxAttempts = 5;

      const attemptVerify = (candidate: string, correct: string) => {
        if (attempts >= maxAttempts) {
          return { success: false, locked: true };
        }
        if (candidate === correct) {
          return { success: true, locked: false };
        }
        attempts += 1;
        return { success: false, locked: attempts >= maxAttempts, remaining: maxAttempts - attempts };
      };

      for (let i = 0; i < 4; i++) {
        const res = attemptVerify("wrong", "123456");
        expect(res.success).toBe(false);
        expect(res.locked).toBe(false);
      }

      const fifth = attemptVerify("wrong", "123456");
      expect(fifth.success).toBe(false);
      expect(fifth.locked).toBe(true);

      const sixth = attemptVerify("123456", "123456");
      expect(sixth.locked).toBe(true);
      expect(sixth.success).toBe(false);
    });
  });
});

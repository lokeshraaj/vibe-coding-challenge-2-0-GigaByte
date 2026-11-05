import crypto from "node:crypto";

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Computes a secure SHA-256 hash of the OTP for storage.
 * Never store plaintext OTPs in the database.
 */
export function hashOtp(otp: string): string {
  const salt = process.env.AUTH_SECRET || "athlix-otp-default-salt-key-2026";
  return crypto.createHmac("sha256", salt).update(otp.trim()).digest("hex");
}

/**
 * Safely compares candidate OTP against stored hash using constant-time comparison.
 */
export function verifyOtp(candidateOtp: string, storedHash: string): boolean {
  const candidateHash = hashOtp(candidateOtp);
  try {
    const candidateBuffer = Buffer.from(candidateHash, "hex");
    const storedBuffer = Buffer.from(storedHash, "hex");
    if (candidateBuffer.length !== storedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(candidateBuffer, storedBuffer);
  } catch {
    return false;
  }
}

/**
 * Masks an email address for safe UI display without exposing full identity.
 * e.g. "coachdemo1@gmail.com" -> "c***1@gmail.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***@***.***";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}${"*".repeat(Math.max(1, local.length - 2))}${last}@${domain}`;
}

import { describe, it, expect } from "vitest";
import { signSessionToken, verifySessionToken } from "@/lib/auth/jwt";
import { AuthSessionPayload } from "@/types";

describe("JWT Session Token Security Tests", () => {
  const mockPayload: AuthSessionPayload = {
    userId: "u123",
    email: "coach@athlix.com",
    name: "Alex Hunter",
    role: "COACH",
    academyId: "acad456",
    coachId: "c789",
  };

  it("successfully signs and verifies a valid session payload", async () => {
    const token = await signSessionToken(mockPayload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const verified = await verifySessionToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(mockPayload.userId);
    expect(verified?.role).toBe("COACH");
    expect(verified?.academyId).toBe(mockPayload.academyId);
    expect(verified?.coachId).toBe(mockPayload.coachId);
  });

  it("returns null for a forged or tampered token", async () => {
    const validToken = await signSessionToken(mockPayload);
    const tamperedToken = validToken.slice(0, -6) + "xxxxxx";

    const verified = await verifySessionToken(tamperedToken);
    expect(verified).toBeNull();
  });

  it("returns null for completely invalid token strings", async () => {
    const verified = await verifySessionToken("not-a-real-jwt");
    expect(verified).toBeNull();
  });
});

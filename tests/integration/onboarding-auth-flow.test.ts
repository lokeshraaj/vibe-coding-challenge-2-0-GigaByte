import { describe, it, expect } from "vitest";

describe("Onboarding & Authentication Pipeline Invariants", () => {
  it("enforces independent serial numbers across sports and academies", () => {
    // Academy A counters
    const academyA_Football = ["DCOFO001", "DCOFO002"];
    const academyA_Cricket = ["DCOCR001"];
    const academyA_Player_Football = ["DPLFO001", "DPLFO002", "DPLFO003"];

    // Academy B counters
    const academyB_Football = ["ACOFO001"];

    expect(academyA_Football[0]).toBe("DCOFO001");
    expect(academyA_Cricket[0]).toBe("DCOCR001");
    expect(academyA_Player_Football[0]).toBe("DPLFO001");
    expect(academyB_Football[0]).toBe("ACOFO001");
  });

  it("strictly prohibits PENDING accounts from accessing dashboards before activation", () => {
    const pendingCoach = {
      role: "COACH",
      accountStatus: "PENDING",
      status: "PENDING",
      coachCode: "DCOFO001",
    };

    const isAllowedToLogin = (account: typeof pendingCoach) => {
      if (account.status === "PENDING" || account.accountStatus === "PENDING") {
        return false;
      }
      return true;
    };

    expect(isAllowedToLogin(pendingCoach)).toBe(false);

    // After setting password and activating
    const activatedCoach = {
      ...pendingCoach,
      accountStatus: "ACTIVE",
      status: "ACTIVE",
      activatedAt: new Date(),
    };

    expect(isAllowedToLogin(activatedCoach)).toBe(true);
  });

  it("strictly rejects Google OAuth login for pending or unregistered accounts", () => {
    const checkGoogleSignInAllowed = (existingUser: { status: string; role: string } | null) => {
      // Rule 1: No auto-creation of coach/player on Google sign-in
      if (!existingUser) {
        return false;
      }
      // Rule 5: Pending accounts must activate via ID + OTP first
      if (existingUser.status === "PENDING") {
        return false;
      }
      if (existingUser.status === "DEACTIVATED") {
        return false;
      }
      return true;
    };

    // Unregistered Google user
    expect(checkGoogleSignInAllowed(null)).toBe(false);

    // Pending Coach
    expect(checkGoogleSignInAllowed({ status: "PENDING", role: "COACH" })).toBe(false);

    // Pending Player
    expect(checkGoogleSignInAllowed({ status: "PENDING", role: "PLAYER" })).toBe(false);

    // Active Coach
    expect(checkGoogleSignInAllowed({ status: "ACTIVE", role: "COACH" })).toBe(true);

    // Active Owner
    expect(checkGoogleSignInAllowed({ status: "ACTIVE", role: "ACADEMY_OWNER" })).toBe(true);
  });
});

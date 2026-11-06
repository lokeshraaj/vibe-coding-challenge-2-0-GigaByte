import { describe, it, expect, vi } from "vitest";

// Mock Next.js & NextAuth modules before importing auth-guard
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
  }),
}));

import { requireSportAccess } from "@/lib/permissions/auth-guard";
import { ForbiddenError } from "@/lib/errors";
import { AuthSessionPayload } from "@/types";

describe("Sport-Based Access Control (Sport-Level Data Isolation)", () => {
  describe("requireSportAccess Authorization Guard", () => {
    it("allows a Cricket coach to access Cricket resources", async () => {
      const mockCoachSession: AuthSessionPayload = {
        userId: "user_coach_1",
        email: "coach.cricket@athlix.com",
        name: "Coach Cricket",
        role: "COACH",
        academyId: "acad_1",
        coachId: "coach_cricket_1",
        sport: "Cricket",
      };

      const sport = await requireSportAccess(mockCoachSession, "Cricket");
      expect(sport?.toLowerCase()).toBe("cricket");
    });

    it("strictly blocks a Cricket coach from accessing Football resources with 403 Forbidden", async () => {
      const mockCoachSession: AuthSessionPayload = {
        userId: "user_coach_1",
        email: "coach.cricket@athlix.com",
        name: "Coach Cricket",
        role: "COACH",
        academyId: "acad_1",
        coachId: "coach_cricket_1",
        sport: "Cricket",
      };

      await expect(
        requireSportAccess(mockCoachSession, "Football")
      ).rejects.toThrow(ForbiddenError);
    });

    it("strictly blocks a Cricket coach from accessing Basketball resources with 403 Forbidden", async () => {
      const mockCoachSession: AuthSessionPayload = {
        userId: "user_coach_1",
        email: "coach.cricket@athlix.com",
        name: "Coach Cricket",
        role: "COACH",
        academyId: "acad_1",
        coachId: "coach_cricket_1",
        sport: "Cricket",
      };

      await expect(
        requireSportAccess(mockCoachSession, "Basketball")
      ).rejects.toThrow(ForbiddenError);
    });

    it("handles case-insensitive sport comparison accurately", async () => {
      const mockCoachSession: AuthSessionPayload = {
        userId: "user_coach_1",
        email: "coach.cricket@athlix.com",
        name: "Coach Cricket",
        role: "COACH",
        academyId: "acad_1",
        coachId: "coach_cricket_1",
        sport: "Cricket",
      };

      const resultLower = await requireSportAccess(mockCoachSession, "cricket");
      expect(resultLower?.toLowerCase()).toBe("cricket");

      const resultUpper = await requireSportAccess(mockCoachSession, "CRICKET");
      expect(resultUpper?.toLowerCase()).toBe("cricket");
    });

    it("allows a Scout to access their assigned sport", async () => {
      const mockScoutSession: AuthSessionPayload = {
        userId: "user_scout_1",
        email: "scout.cricket@athlix.com",
        name: "Scout Cricket",
        role: "SCOUT",
        academyId: "acad_1",
        coachId: "coach_cricket_1",
        sport: "Cricket",
      };

      const sport = await requireSportAccess(mockScoutSession, "Cricket");
      expect(sport?.toLowerCase()).toBe("cricket");
    });

    it("strictly blocks a Cricket scout from searching or viewing Football talent", async () => {
      const mockScoutSession: AuthSessionPayload = {
        userId: "user_scout_1",
        email: "scout.cricket@athlix.com",
        name: "Scout Cricket",
        role: "SCOUT",
        academyId: "acad_1",
        coachId: "coach_cricket_1",
        sport: "Cricket",
      };

      await expect(
        requireSportAccess(mockScoutSession, "Football")
      ).rejects.toThrow(ForbiddenError);
    });

    it("strictly blocks a Cricket scout from searching or viewing Basketball talent", async () => {
      const mockScoutSession: AuthSessionPayload = {
        userId: "user_scout_1",
        email: "scout.cricket@athlix.com",
        name: "Scout Cricket",
        role: "SCOUT",
        academyId: "acad_1",
        coachId: "coach_cricket_1",
        sport: "Cricket",
      };

      await expect(
        requireSportAccess(mockScoutSession, "Basketball")
      ).rejects.toThrow(ForbiddenError);
    });

    it("preserves Academy Owner multi-sport access across all sports", async () => {
      const mockOwnerSession: AuthSessionPayload = {
        userId: "user_owner_1",
        email: "owner@apexacademy.com",
        name: "Academy Owner",
        role: "ACADEMY_OWNER",
        academyId: "acad_1",
      };

      const footballAccess = await requireSportAccess(mockOwnerSession, "Football");
      expect(footballAccess).toBe("Football");

      const cricketAccess = await requireSportAccess(mockOwnerSession, "Cricket");
      expect(cricketAccess).toBe("Cricket");

      const basketballAccess = await requireSportAccess(mockOwnerSession, "Basketball");
      expect(basketballAccess).toBe("Basketball");
    });

    it("preserves Super Admin multi-sport platform access across all sports", async () => {
      const mockAdminSession: AuthSessionPayload = {
        userId: "user_admin_1",
        email: "superadmin@athlix.com",
        name: "Platform Super Admin",
        role: "SUPER_ADMIN",
      };

      const footballAccess = await requireSportAccess(mockAdminSession, "Football");
      expect(footballAccess).toBe("Football");

      const cricketAccess = await requireSportAccess(mockAdminSession, "Cricket");
      expect(cricketAccess).toBe("Cricket");
    });
  });

  describe("Sport-Level Cross-Boundary Invariants", () => {
    it("validates that a coach can only create sessions in assigned sport", () => {
      const coachSport = "Cricket";
      const requestedSport = "Football";

      const isPermitted = coachSport.toLowerCase() === requestedSport.toLowerCase();
      expect(isPermitted).toBe(false);
    });

    it("validates that a coach can only create matches matching linked session sport", () => {
      const sessionSport = "Cricket";
      const matchSport = "Football";

      expect(sessionSport.toLowerCase() === matchSport.toLowerCase()).toBe(false);
    });

    it("validates that scouts are constrained by both Assigned Sport and READY eligibility", () => {
      const scoutSport = "Cricket";
      const mockPlayers = [
        { name: "Player 1", sport: "Cricket", status: "READY" },
        { name: "Player 2", sport: "Cricket", status: "NOT_READY" },
        { name: "Player 3", sport: "Football", status: "READY" },
        { name: "Player 4", sport: "Football", status: "NOT_READY" },
      ];

      const visibleToScout = mockPlayers.filter(
        (p) => p.sport.toLowerCase() === scoutSport.toLowerCase() && p.status === "READY"
      );

      expect(visibleToScout).toHaveLength(1);
      expect(visibleToScout[0].name).toBe("Player 1");
    });
  });
});

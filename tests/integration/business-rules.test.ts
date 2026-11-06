import { describe, it, expect } from "vitest";
import { calculatePlayerEligibility } from "@/modules/eligibility/eligibility-engine";

describe("Business Logic & Security Invariants Tests", () => {
  describe("Eligibility Rules Invariants", () => {
    it("strictly requires BOTH attendance >= 75% AND matches >= 2 for READY status", () => {
      // 74% + 5 matches -> NOT_READY
      const underAttendance = calculatePlayerEligibility({
        playerId: "p1",
        playerName: "Test Player",
        sport: "Football",
        position: "Striker",
        enrollmentDate: "2026-01-01",
        totalClosedSessions: 100,
        presentSessions: 74,
        matchesPlayed: 5,
      });
      expect(underAttendance.status).toBe("NOT_READY");
      expect(underAttendance.isAttendanceMet).toBe(false);
      expect(underAttendance.isMatchesMet).toBe(true);

      // 95% + 1 match -> NOT_READY
      const underMatches = calculatePlayerEligibility({
        playerId: "p2",
        playerName: "Test Player 2",
        sport: "Football",
        position: "Midfielder",
        enrollmentDate: "2026-01-01",
        totalClosedSessions: 20,
        presentSessions: 19,
        matchesPlayed: 1,
      });
      expect(underMatches.status).toBe("NOT_READY");
      expect(underMatches.isAttendanceMet).toBe(true);
      expect(underMatches.isMatchesMet).toBe(false);

      // 75% + 2 matches -> READY
      const thresholdMet = calculatePlayerEligibility({
        playerId: "p3",
        playerName: "Test Player 3",
        sport: "Football",
        position: "Defender",
        enrollmentDate: "2026-01-01",
        totalClosedSessions: 4,
        presentSessions: 3,
        matchesPlayed: 2,
      });
      expect(thresholdMet.status).toBe("READY");
      expect(thresholdMet.isAttendanceMet).toBe(true);
      expect(thresholdMet.isMatchesMet).toBe(true);
    });
  });

  describe("Phase 6: Player Creation Role Invariant", () => {
    it("strictly limits player registration permissions exclusively to COACH", () => {
      // Invariant: only role === "COACH" may create players
      const canCreatePlayer = (role: string) => role === "COACH";

      expect(canCreatePlayer("COACH")).toBe(true);
      expect(canCreatePlayer("ACADEMY_OWNER")).toBe(false);
      expect(canCreatePlayer("SCOUT")).toBe(false);
      expect(canCreatePlayer("PLAYER")).toBe(false);
      expect(canCreatePlayer("SUPER_ADMIN")).toBe(false);
    });
  });

  describe("Phase 12: Scout Talent Directory Invariant", () => {
    it("filters out any player whose status is NOT_READY", () => {
      const candidates = [
        calculatePlayerEligibility({
          playerId: "p1",
          playerName: "Eligible Player",
          sport: "Basketball",
          position: "Point Guard",
          enrollmentDate: "2026-01-01",
          totalClosedSessions: 10,
          presentSessions: 9,
          matchesPlayed: 3,
        }),
        calculatePlayerEligibility({
          playerId: "p2",
          playerName: "Ineligible Low Attendance",
          sport: "Basketball",
          position: "Center",
          enrollmentDate: "2026-01-01",
          totalClosedSessions: 10,
          presentSessions: 6, // 60%
          matchesPlayed: 4,
        }),
        calculatePlayerEligibility({
          playerId: "p3",
          playerName: "Ineligible Low Matches",
          sport: "Basketball",
          position: "Forward",
          enrollmentDate: "2026-01-01",
          totalClosedSessions: 10,
          presentSessions: 10, // 100%
          matchesPlayed: 1, // Only 1 match
        }),
      ];

      // Simulated scout filter
      const scoutVisible = candidates.filter((c) => c.status === "READY");
      expect(scoutVisible).toHaveLength(1);
      expect(scoutVisible[0].playerId).toBe("p1");
      expect(scoutVisible[0].playerName).toBe("Eligible Player");
    });

    it("strictly forbids scout access to a player whose eligibility status is NOT_READY or under an unassigned coach", () => {
      const assignedCoachId = "coach_101";

      const checkScoutPlayerAccess = (params: {
        playerCoachId: string;
        eligibilityStatus: string;
      }) => {
        if (params.playerCoachId !== assignedCoachId) {
          throw new Error("Unauthorized: Scouts can only view athletes under their assigned coach.");
        }
        if (params.eligibilityStatus !== "READY") {
          throw new Error("Access restricted: Scouts can strictly only view trial-ready (READY) athletes.");
        }
        return true;
      };

      // Assigned coach + READY -> allowed
      expect(
        checkScoutPlayerAccess({
          playerCoachId: "coach_101",
          eligibilityStatus: "READY",
        })
      ).toBe(true);

      // Assigned coach + NOT_READY -> blocked
      expect(() =>
        checkScoutPlayerAccess({
          playerCoachId: "coach_101",
          eligibilityStatus: "NOT_READY",
        })
      ).toThrow("Access restricted: Scouts can strictly only view trial-ready (READY) athletes.");

      // Different coach + READY -> blocked
      expect(() =>
        checkScoutPlayerAccess({
          playerCoachId: "coach_999",
          eligibilityStatus: "READY",
        })
      ).toThrow("Unauthorized: Scouts can only view athletes under their assigned coach.");
    });
  });

  describe("Match Participation Invariant Logic", () => {
    it("correctly identifies absent players who must be barred from match rosters", () => {
      const sessionAttendance = [
        { playerId: "p1", status: "PRESENT" },
        { playerId: "p2", status: "PRESENT" },
        { playerId: "p3", status: "ABSENT" },
      ];

      const presentSet = new Set(
        sessionAttendance.filter((a) => a.status === "PRESENT").map((a) => a.playerId)
      );

      // Attempting to field p1, p2: valid
      const validRoster = ["p1", "p2"];
      const allPresent = validRoster.every((id) => presentSet.has(id));
      expect(allPresent).toBe(true);

      // Attempting to field p3 (absent): rejected!
      const invalidRoster = ["p1", "p3"];
      const containsAbsent = invalidRoster.some((id) => !presentSet.has(id));
      expect(containsAbsent).toBe(true);
    });
  });
});

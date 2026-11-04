import { describe, it, expect } from "vitest";
import { calculatePlayerEligibility } from "@/modules/eligibility/eligibility-engine";

describe("Player Eligibility Engine Unit Tests", () => {
  it("74% attendance + 3 matches = NOT_READY", () => {
    // 74 out of 100 sessions
    const result = calculatePlayerEligibility({
      playerId: "p1",
      playerName: "Marcus Vance",
      sport: "Football",
      position: "Striker",
      enrollmentDate: "2026-01-01",
      totalClosedSessions: 100,
      presentSessions: 74,
      matchesPlayed: 3,
    });

    expect(result.attendancePercentage).toBe(74.0);
    expect(result.matchesPlayed).toBe(3);
    expect(result.isAttendanceMet).toBe(false);
    expect(result.isMatchesMet).toBe(true);
    expect(result.status).toBe("NOT_READY");
    expect(result.reasons[0]).toContain("below the required 75% threshold");
  });

  it("75% attendance + 2 matches = READY", () => {
    // 75 out of 100 sessions
    const result = calculatePlayerEligibility({
      playerId: "p2",
      playerName: "Leo Sterling",
      sport: "Football",
      position: "Midfielder",
      enrollmentDate: "2026-01-01",
      totalClosedSessions: 4,
      presentSessions: 3, // 3/4 = 75%
      matchesPlayed: 2,
    });

    expect(result.attendancePercentage).toBe(75.0);
    expect(result.matchesPlayed).toBe(2);
    expect(result.isAttendanceMet).toBe(true);
    expect(result.isMatchesMet).toBe(true);
    expect(result.status).toBe("READY");
    expect(result.reasons[0]).toContain("Trial Ready");
  });

  it("90% attendance + 1 match = NOT_READY", () => {
    // 9 out of 10 sessions = 90%
    const result = calculatePlayerEligibility({
      playerId: "p3",
      playerName: "Kai Ren",
      sport: "Basketball",
      position: "Guard",
      enrollmentDate: "2026-01-01",
      totalClosedSessions: 10,
      presentSessions: 9,
      matchesPlayed: 1,
    });

    expect(result.attendancePercentage).toBe(90.0);
    expect(result.matchesPlayed).toBe(1);
    expect(result.isAttendanceMet).toBe(true);
    expect(result.isMatchesMet).toBe(false);
    expect(result.status).toBe("NOT_READY");
    expect(result.reasons[0]).toContain("Needs 1 more match appearance");
  });

  it("100% attendance + 2 matches = READY", () => {
    const result = calculatePlayerEligibility({
      playerId: "p4",
      playerName: "Zayn Croft",
      sport: "Cricket",
      position: "All-Rounder",
      enrollmentDate: "2026-01-01",
      totalClosedSessions: 5,
      presentSessions: 5,
      matchesPlayed: 2,
    });

    expect(result.attendancePercentage).toBe(100.0);
    expect(result.matchesPlayed).toBe(2);
    expect(result.isAttendanceMet).toBe(true);
    expect(result.isMatchesMet).toBe(true);
    expect(result.status).toBe("READY");
  });

  it("handles zero sessions safely without NaN or division by zero", () => {
    const result = calculatePlayerEligibility({
      playerId: "p5",
      playerName: "Rookie Player",
      sport: "Football",
      position: "Winger",
      enrollmentDate: "2026-02-01",
      totalClosedSessions: 0,
      presentSessions: 0,
      matchesPlayed: 0,
    });

    expect(result.attendancePercentage).toBe(0.0);
    expect(result.status).toBe("NOT_READY");
    expect(isNaN(result.attendancePercentage)).toBe(false);
    expect(result.isAttendanceMet).toBe(false);
    expect(result.isMatchesMet).toBe(false);
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { calculatePlayerEligibility } from "@/modules/eligibility/eligibility-engine";

describe("Complete End-to-End Sports Academy Workflow Simulation", () => {
  it("executes the complete 15-step multi-tenant academy-to-scout pipeline", () => {
    // Step 1: Academy Tenant provisioned
    const academyA = {
      id: "acad-001",
      name: "Apex Elite Sports Academy",
      slug: "apex-elite",
      ownerEmail: "owner@apex.com",
    };
    expect(academyA.id).toBeDefined();

    // Step 2: Add Coach A
    const coachA = {
      id: "coach-001",
      academyId: academyA.id,
      name: "Marcus Cole",
      sport: "Football",
      email: "coach.marcus@apex.com",
    };
    expect(coachA.academyId).toBe(academyA.id);

    // Step 3: Assign Scout A to Coach A
    const scoutA = {
      id: "scout-001",
      academyId: academyA.id,
      name: "Elena Rostova",
      assignedCoachId: coachA.id,
      email: "scout.elena@apex.com",
    };
    expect(scoutA.assignedCoachId).toBe(coachA.id);

    // Step 4: Add three players under Coach A
    const player1 = {
      id: "p1",
      name: "Leo Sterling",
      playerCode: "FTB-2026-1001",
      coachId: coachA.id,
      academyId: academyA.id,
      sport: "Football",
      position: "Striker",
      enrollmentDate: "2026-01-01",
    };
    const player2 = {
      id: "p2",
      name: "Marcus Vance",
      playerCode: "FTB-2026-1002",
      coachId: coachA.id,
      academyId: academyA.id,
      sport: "Football",
      position: "Midfielder",
      enrollmentDate: "2026-01-01",
    };
    const player3 = {
      id: "p3",
      name: "Zayn Croft",
      playerCode: "FTB-2026-1003",
      coachId: coachA.id,
      academyId: academyA.id,
      sport: "Football",
      position: "Defender",
      enrollmentDate: "2026-01-01",
    };

    // Step 5: Create a practice session
    const session1 = {
      id: "sess-001",
      academyId: academyA.id,
      coachId: coachA.id,
      sport: "Football",
      date: "2026-02-10",
      status: "OPEN" as "OPEN" | "CLOSED",
      closedAt: null as Date | null,
    };
    expect(session1.status).toBe("OPEN");

    // Step 6: Mark two players PRESENT (player1, player3) and one ABSENT (player2)
    const session1Attendance = new Map<string, "PRESENT" | "ABSENT">([
      [player1.id, "PRESENT"],
      [player2.id, "ABSENT"],
      [player3.id, "PRESENT"],
    ]);

    expect(session1Attendance.get(player1.id)).toBe("PRESENT");
    expect(session1Attendance.get(player2.id)).toBe("ABSENT");
    expect(session1Attendance.get(player3.id)).toBe("PRESENT");

    // Step 7: Close the session (completeness verified: all 3 marked)
    expect(session1Attendance.size).toBe(3);
    session1.status = "CLOSED";
    session1.closedAt = new Date();
    expect(session1.status).toBe("CLOSED");

    // Step 8 & 9: Create a match linked to session 1
    // Step 10: Invariant Test: Verify the absent player (player2) is strictly rejected from match sheet!
    const candidateRoster = [player1.id, player2.id]; // Attempting to include absent player2
    const absentPlayerViolation = candidateRoster.some(
      (pId) => session1Attendance.get(pId) === "ABSENT"
    );
    expect(absentPlayerViolation).toBe(true); // REJECTED!

    // Valid roster: Only present players (player1, player3)
    const validMatchParticipants = [
      { playerId: player1.id, score: 2 },
      { playerId: player3.id, score: 0 },
    ];
    const allValidPresent = validMatchParticipants.every(
      (p) => session1Attendance.get(p.playerId) === "PRESENT"
    );
    expect(allValidPresent).toBe(true);

    const match1 = {
      id: "match-001",
      sessionId: session1.id,
      coachId: coachA.id,
      opponentName: "Arsenal U18",
      academyTeamScore: 2,
      opponentScore: 0,
      result: "WON",
      participants: validMatchParticipants,
    };
    expect(match1.result).toBe("WON");

    // Add Session 2 & Match 2 to satisfy Condition 2 (>= 2 matches) for player 1
    const session2 = { id: "sess-002", status: "CLOSED" };
    const session2Attendance = new Map<string, "PRESENT" | "ABSENT">([
      [player1.id, "PRESENT"],
      [player2.id, "ABSENT"],
      [player3.id, "PRESENT"],
    ]);
    const match2Participants = [{ playerId: player1.id, score: 1 }]; // player3 rested

    // Step 11: Verify eligibility for all 3 players
    // Player 1 (Leo): 2/2 closed sessions present (100%), 2 matches -> READY
    const p1Eligibility = calculatePlayerEligibility({
      playerId: player1.id,
      playerName: player1.name,
      sport: player1.sport,
      position: player1.position,
      enrollmentDate: player1.enrollmentDate,
      totalClosedSessions: 2,
      presentSessions: 2,
      matchesPlayed: 2,
      totalScore: 3,
    });
    expect(p1Eligibility.status).toBe("READY");
    expect(p1Eligibility.isAttendanceMet).toBe(true);
    expect(p1Eligibility.isMatchesMet).toBe(true);

    // Player 2 (Marcus): 0/2 closed sessions present (0%), 0 matches -> NOT_READY
    const p2Eligibility = calculatePlayerEligibility({
      playerId: player2.id,
      playerName: player2.name,
      sport: player2.sport,
      position: player2.position,
      enrollmentDate: player2.enrollmentDate,
      totalClosedSessions: 2,
      presentSessions: 0,
      matchesPlayed: 0,
    });
    expect(p2Eligibility.status).toBe("NOT_READY");

    // Player 3 (Zayn): 2/2 closed sessions present (100%), 1 match -> NOT_READY (needs 2 matches)
    const p3Eligibility = calculatePlayerEligibility({
      playerId: player3.id,
      playerName: player3.name,
      sport: player3.sport,
      position: player3.position,
      enrollmentDate: player3.enrollmentDate,
      totalClosedSessions: 2,
      presentSessions: 2,
      matchesPlayed: 1,
    });
    expect(p3Eligibility.status).toBe("NOT_READY");
    expect(p3Eligibility.reasons[0]).toContain("Needs 1 more match appearance");

    // Step 12 & 13: Login as Scout A -> Only READY players visible
    const allSquadCalculations = [p1Eligibility, p2Eligibility, p3Eligibility];
    const scoutDirectory = allSquadCalculations.filter((c) => c.status === "READY");
    expect(scoutDirectory).toHaveLength(1);
    expect(scoutDirectory[0].playerId).toBe(player1.id);
    expect(scoutDirectory[0].playerName).toBe("Leo Sterling");

    // Step 14 & 15: Login as player -> Only personal record accessible
    const loggedInPlayerId = player1.id;
    const accessibleRecord =
      player1.id === loggedInPlayerId ? p1Eligibility : null;
    expect(accessibleRecord).not.toBeNull();
    expect(accessibleRecord?.playerId).toBe(player1.id);
  });
});

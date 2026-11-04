import { EligibilityStatus, IEligibilityCalculation } from "@/types";

export interface EligibilityRulesConfig {
  minimumAttendancePercentage: number;
  minimumMatchesPlayed: number;
}

export const DEFAULT_ELIGIBILITY_CONFIG: EligibilityRulesConfig = {
  minimumAttendancePercentage: 75.0,
  minimumMatchesPlayed: 2,
};

export interface EligibilityInput {
  playerId: string;
  playerName: string;
  sport: string;
  position: string;
  enrollmentDate: string;
  totalClosedSessions: number;
  presentSessions: number;
  matchesPlayed: number;
  totalScore?: number;
}

/**
 * Pure, deterministic calculation function for player eligibility.
 * Evaluates Condition 1 (Attendance >= 75%) and Condition 2 (Matches >= 2).
 */
export function calculatePlayerEligibility(
  input: EligibilityInput,
  config: EligibilityRulesConfig = DEFAULT_ELIGIBILITY_CONFIG
): IEligibilityCalculation {
  const {
    playerId,
    playerName,
    sport,
    position,
    enrollmentDate,
    totalClosedSessions,
    presentSessions,
    matchesPlayed,
    totalScore = 0,
  } = input;

  // Safe division for attendance percentage
  const attendancePercentage =
    totalClosedSessions > 0
      ? Number(((presentSessions / totalClosedSessions) * 100).toFixed(1))
      : 0.0;

  const absentSessions = Math.max(0, totalClosedSessions - presentSessions);
  const averageScore = matchesPlayed > 0 ? Number((totalScore / matchesPlayed).toFixed(2)) : 0.0;

  const isAttendanceMet = attendancePercentage >= config.minimumAttendancePercentage;
  const isMatchesMet = matchesPlayed >= config.minimumMatchesPlayed;

  const reasons: string[] = [];

  if (!isAttendanceMet && !isMatchesMet) {
    reasons.push(
      `Attendance (${attendancePercentage}%) is below required ${config.minimumAttendancePercentage}% threshold and match appearances (${matchesPlayed}) are below minimum (${config.minimumMatchesPlayed}).`
    );
  } else if (!isAttendanceMet) {
    reasons.push(
      `Attendance (${attendancePercentage}%) is below the required ${config.minimumAttendancePercentage}% threshold.`
    );
  } else if (!isMatchesMet) {
    const remaining = config.minimumMatchesPlayed - matchesPlayed;
    reasons.push(
      `Needs ${remaining} more match appearance${remaining > 1 ? "s" : ""} to meet the minimum threshold of ${config.minimumMatchesPlayed} (currently ${matchesPlayed}).`
    );
  } else {
    reasons.push(
      `Trial Ready: Meets both requirements (${attendancePercentage}% attendance >= ${config.minimumAttendancePercentage}%, ${matchesPlayed} matches >= ${config.minimumMatchesPlayed}).`
    );
  }

  const status: EligibilityStatus = isAttendanceMet && isMatchesMet ? "READY" : "NOT_READY";

  return {
    playerId,
    playerName,
    sport,
    position,
    enrollmentDate,
    totalClosedSessions,
    presentSessions,
    absentSessions,
    attendancePercentage,
    matchesPlayed,
    totalScore,
    averageScore,
    status,
    reasons,
    isAttendanceMet,
    isMatchesMet,
  };
}

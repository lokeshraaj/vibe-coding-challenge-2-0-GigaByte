import mongoose from "mongoose";
import { IdCounter } from "@/models/IdCounter";
import { AcademyCodeCounter } from "@/models/AcademyCodeCounter";
import { Academy } from "@/models/Academy";

/**
 * Returns the 2-letter uppercase sport code.
 */
export function getSportCode(sport: string): string {
  if (!sport) return "SP";
  const clean = sport.trim().toUpperCase().replace(/[^A-Z]/g, "");

  // Common sport mappings
  const sportMap: Record<string, string> = {
    FOOTBALL: "FO",
    SOCCER: "FO",
    CRICKET: "CR",
    BASKETBALL: "BA",
    TENNIS: "TE",
    BADMINTON: "BD",
    ATHLETICS: "AT",
    SWIMMING: "SW",
    VOLLEYBALL: "VO",
    HOCKEY: "HO",
    RUGBY: "RU",
  };

  if (sportMap[clean]) {
    return sportMap[clean];
  }

  // Fallback to first two letters
  if (clean.length >= 2) {
    return clean.slice(0, 2);
  }

  return (clean + "X").slice(0, 2);
}

/**
 * Extracts normalized 2-letter state code (uppercase).
 * Uses the first two alphabetic letters of the normalized state name.
 * e.g., "Bihar" -> "BI", "Jharkhand" -> "JH", "West Bengal" -> "WE"
 */
export function getStatePrefix(state: string): string {
  if (!state) return "XX";
  const clean = state.trim().toUpperCase().replace(/[^A-Z]/g, "");
  if (clean.length >= 2) {
    return clean.slice(0, 2);
  }
  return (clean + "X").slice(0, 2);
}

/**
 * Extracts academy initial letter (uppercase).
 * @deprecated Preserved for backwards compatibility / migration references.
 */
export function getAcademyInitial(academyName: string): string {
  if (!academyName) return "A";
  const match = academyName.trim().match(/[a-zA-Z]/);
  return match ? match[0].toUpperCase() : "A";
}

/**
 * Generates an atomic, collision-free, state-specific sequential Academy Code.
 * Format: SSNNNN (e.g. BI0001, JH0001, WE0001)
 *
 * Rules:
 * 1. Each state has an independent sequence starting at 0001.
 * 2. Sequence is atomic and permanent.
 */
export async function generateAcademyCode(state: string): Promise<string> {
  const stateCode = getStatePrefix(state);

  const counter = await AcademyCodeCounter.findOneAndUpdate(
    { stateCode },
    { $inc: { seq: 1 } },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  const serial = String(counter.seq).padStart(4, "0");
  return `${stateCode}${serial}`;
}

/**
 * Generates an atomic, collision-free, sequential Individual ATHLIX ID.
 *
 * Format:
 * - Coach:  CO{SPORT_CODE}{SERIAL} -> e.g. COFO001, COCR001
 * - Player: PL{SPORT_CODE}{SERIAL} -> e.g. PLFO001, PLCR001
 * - Scout:  SC{SPORT_CODE}{SERIAL} -> e.g. SCFO001, SCCR001
 *
 * Scoped independently per academyId, userType, and sport.
 * Academy-name prefix is strictly omitted.
 */
export async function generateAthlixId(params: {
  academyId: string | mongoose.Types.ObjectId;
  userType: "COACH" | "PLAYER" | "SCOUT";
  sport: string;
}): Promise<string> {
  const academyObjectId = new mongoose.Types.ObjectId(params.academyId);
  const sportCode = getSportCode(params.sport);
  const typeCode =
    params.userType === "COACH"
      ? "CO"
      : params.userType === "PLAYER"
      ? "PL"
      : "SC";

  // Atomically increment counter in MongoDB scoped per academy, userType, and sport
  const counter = await IdCounter.findOneAndUpdate(
    {
      academyId: academyObjectId,
      userType: params.userType,
      sportCode: sportCode,
    },
    {
      $inc: { seq: 1 },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  const serial = String(counter.seq).padStart(3, "0");
  return `${typeCode}${sportCode}${serial}`;
}

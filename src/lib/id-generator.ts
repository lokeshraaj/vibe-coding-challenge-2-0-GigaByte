import mongoose from "mongoose";
import { IdCounter } from "@/models/IdCounter";
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
 * Extracts academy initial letter (uppercase).
 */
export function getAcademyInitial(academyName: string): string {
  if (!academyName) return "A";
  const match = academyName.trim().match(/[a-zA-Z]/);
  return match ? match[0].toUpperCase() : "A";
}

/**
 * Generates an atomic, collision-free, sequential ATHLIX ID.
 *
 * Format:
 * - Coach:  {ACADEMY_INITIAL}CO{SPORT_CODE}{SERIAL} -> e.g. DCOFO001
 * - Player: {ACADEMY_INITIAL}PL{SPORT_CODE}{SERIAL} -> e.g. DPLFO001
 *
 * Counter is strictly independent for each academy, userType, and sport.
 */
export async function generateAthlixId(params: {
  academyId: string | mongoose.Types.ObjectId;
  userType: "COACH" | "PLAYER";
  sport: string;
}): Promise<string> {
  const academyObjectId = new mongoose.Types.ObjectId(params.academyId);
  const academy = await Academy.findById(academyObjectId);
  const initial = academy ? getAcademyInitial(academy.name) : "A";
  const sportCode = getSportCode(params.sport);
  const typeCode = params.userType === "COACH" ? "CO" : "PL";

  // Atomically increment counter in MongoDB
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
  return `${initial}${typeCode}${sportCode}${serial}`;
}

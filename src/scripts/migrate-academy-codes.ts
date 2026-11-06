#!/usr/bin/env node

/**
 * ATHLIX Academy Code and Individual ID Data Migration Script
 *
 * Requirements:
 * 1. Assign permanent Academy Codes (SSNNNN) to existing academies based on state.
 *    - Independent sequence starting at 0001 per state.
 *    - Deterministic ordering by createdAt, _id.
 * 2. Migrate existing coach and player IDs:
 *    - Strip leading academy initial (e.g. DCOCR001 -> COCR001, DPLCR001 -> PLCR001).
 *    - Check and report any ID collisions within each academy tenant.
 * 3. Dry-run mode by default. Pass `--apply` to commit changes to the database.
 *
 * Usage:
 *   npm run migrate:academy-codes            # Dry-run mode (safe preview)
 *   npm run migrate:academy-codes -- --apply # Apply mode (commits to MongoDB)
 */

import { connectToDatabase } from "../lib/db/mongodb";
import { Academy } from "../models/Academy";
import { Coach } from "../models/Coach";
import { Player } from "../models/Player";
import { Scout } from "../models/Scout";
import { OtpChallenge } from "../models/OtpChallenge";
import { AcademyCodeCounter } from "../models/AcademyCodeCounter";
import { getStatePrefix } from "../lib/id-generator";

interface MigrationStats {
  academiesTotal: number;
  academiesAlreadyCoded: number;
  academiesMigrated: number;
  coachesTotal: number;
  coachesMigrated: number;
  coachesCollisions: number;
  playersTotal: number;
  playersMigrated: number;
  playersCollisions: number;
  scoutsTotal: number;
  scoutsMigrated: number;
  scoutsCollisions: number;
  otpChallengesMigrated: number;
  collisionDetails: string[];
}

async function runMigration() {
  const isApply = process.argv.includes("--apply");
  const isDryRun = !isApply;

  console.log("\n======================================================================");
  console.log("       ATHLIX ACADEMY CODE & INDIVIDUAL ID MIGRATION UTILITY          ");
  console.log("======================================================================");
  if (isDryRun) {
    console.log("  >>> MODE: DRY-RUN (Previewing changes. No records will be modified) <<<");
    console.log("  >>> To apply changes, execute with: npm run migrate:academy-codes -- --apply <<<\n");
  } else {
    console.log("  >>> MODE: APPLY (Executing permanent updates to database) <<<\n");
  }

  await connectToDatabase();

  const stats: MigrationStats = {
    academiesTotal: 0,
    academiesAlreadyCoded: 0,
    academiesMigrated: 0,
    coachesTotal: 0,
    coachesMigrated: 0,
    coachesCollisions: 0,
    playersTotal: 0,
    playersMigrated: 0,
    playersCollisions: 0,
    scoutsTotal: 0,
    scoutsMigrated: 0,
    scoutsCollisions: 0,
    otpChallengesMigrated: 0,
    collisionDetails: [],
  };

  // -------------------------------------------------------------------------
  // STEP 1: Migrate Academies (Assign SSNNNN Academy Codes)
  // -------------------------------------------------------------------------
  console.log("[1/3] Processing Academies...");
  const academies = await Academy.find({}).sort({ createdAt: 1, _id: 1 });
  stats.academiesTotal = academies.length;

  // Track state sequences
  const stateCounters: Record<string, number> = {};

  // First pass: inspect already assigned academy codes per state
  for (const academy of academies) {
    if (academy.academyCode) {
      stats.academiesAlreadyCoded++;
      const match = academy.academyCode.match(/^([A-Z]{2})(\d{4})$/);
      if (match) {
        const statePrefix = match[1];
        const num = parseInt(match[2], 10);
        stateCounters[statePrefix] = Math.max(stateCounters[statePrefix] || 0, num);
      }
    }
  }

  // Also query existing AcademyCodeCounter documents from the database
  const existingDbCounters = await AcademyCodeCounter.find({});
  for (const c of existingDbCounters) {
    stateCounters[c.stateCode] = Math.max(stateCounters[c.stateCode] || 0, c.seq);
  }

  // Second pass: assign codes to academies without code
  for (const academy of academies) {
    if (academy.academyCode) {
      continue;
    }

    const state = academy.state || academy.location?.state || "Unknown";
    const statePrefix = getStatePrefix(state);
    const nextSeq = (stateCounters[statePrefix] || 0) + 1;
    stateCounters[statePrefix] = nextSeq;

    const newCode = `${statePrefix}${String(nextSeq).padStart(4, "0")}`;

    console.log(
      `  - Academy [${academy.name}] (${state}) -> Assigning Academy Code: ${newCode}`
    );

    if (isApply) {
      academy.academyCode = newCode;
      if (!academy.state) {
        academy.state = state;
      }
      await academy.save();

      // Update atomic counter to stay in sync
      await AcademyCodeCounter.findOneAndUpdate(
        { stateCode: statePrefix },
        { $max: { seq: nextSeq } },
        { upsert: true }
      );
    }
    stats.academiesMigrated++;
  }

  console.log(
    `  => Academies processed: ${stats.academiesTotal} total | ${stats.academiesAlreadyCoded} already had codes | ${stats.academiesMigrated} assigned new codes.\n`
  );

  // -------------------------------------------------------------------------
  // STEP 2: Migrate Coach IDs (Remove academy prefix: DCOCR001 -> COCR001)
  // -------------------------------------------------------------------------
  console.log("[2/3] Processing Coach IDs...");
  const coaches = await Coach.find({});
  stats.coachesTotal = coaches.length;

  for (const coach of coaches) {
    if (!coach.coachCode) continue;

    // Check if coachCode starts with academy initial before role prefix: e.g. DCOFO001
    // New format: CO{SPORT}{SERIAL} (2 letters role, 2 letters sport, 3+ digits)
    const oldFormatMatch = coach.coachCode.match(/^[A-Z](CO[A-Z]{2}\d{3,})$/);
    if (oldFormatMatch) {
      const newCoachCode = oldFormatMatch[1]; // stripped prefix

      // Collision check within the same academy tenant
      const existingConflict = await Coach.findOne({
        academyId: coach.academyId,
        coachCode: newCoachCode,
        _id: { $ne: coach._id },
      });

      if (existingConflict) {
        stats.coachesCollisions++;
        const errDetail = `Coach Collision in Academy [${coach.academyId}]: '${coach.coachCode}' -> '${newCoachCode}' conflicts with coach [${existingConflict._id}]`;
        stats.collisionDetails.push(errDetail);
        console.warn(`  [!] COLLISION: ${errDetail}`);
      } else {
        console.log(
          `  - Coach [${coach._id}] in Academy [${coach.academyId}]: ${coach.coachCode} -> ${newCoachCode}`
        );
        if (isApply) {
          const oldCode = coach.coachCode;
          coach.coachCode = newCoachCode;
          await coach.save();

          // Also update active OTP challenges if any
          const updatedOtp = await OtpChallenge.updateMany(
            { academyId: coach.academyId, athlixId: oldCode },
            { $set: { athlixId: newCoachCode } }
          );
          stats.otpChallengesMigrated += updatedOtp.modifiedCount;
        }
        stats.coachesMigrated++;
      }
    }
  }

  console.log(
    `  => Coaches processed: ${stats.coachesTotal} total | ${stats.coachesMigrated} migrated | ${stats.coachesCollisions} collisions.\n`
  );

  // -------------------------------------------------------------------------
  // STEP 3: Migrate Player IDs (Remove academy prefix: DPLCR001 -> PLCR001)
  // -------------------------------------------------------------------------
  console.log("[3/3] Processing Player IDs...");
  const players = await Player.find({});
  stats.playersTotal = players.length;

  for (const player of players) {
    if (!player.playerCode) continue;

    const oldFormatMatch = player.playerCode.match(/^[A-Z](PL[A-Z]{2}\d{3,})$/);
    if (oldFormatMatch) {
      const newPlayerCode = oldFormatMatch[1];

      // Collision check within the same academy tenant
      const existingConflict = await Player.findOne({
        academyId: player.academyId,
        playerCode: newPlayerCode,
        _id: { $ne: player._id },
      });

      if (existingConflict) {
        stats.playersCollisions++;
        const errDetail = `Player Collision in Academy [${player.academyId}]: '${player.playerCode}' -> '${newPlayerCode}' conflicts with player [${existingConflict._id}]`;
        stats.collisionDetails.push(errDetail);
        console.warn(`  [!] COLLISION: ${errDetail}`);
      } else {
        console.log(
          `  - Player [${player._id}] in Academy [${player.academyId}]: ${player.playerCode} -> ${newPlayerCode}`
        );
        if (isApply) {
          const oldCode = player.playerCode;
          player.playerCode = newPlayerCode;
          await player.save();

          const updatedOtp = await OtpChallenge.updateMany(
            { academyId: player.academyId, athlixId: oldCode },
            { $set: { athlixId: newPlayerCode } }
          );
          stats.otpChallengesMigrated += updatedOtp.modifiedCount;
        }
        stats.playersMigrated++;
      }
    }
  }

  console.log(
    `  => Players processed: ${stats.playersTotal} total | ${stats.playersMigrated} migrated | ${stats.playersCollisions} collisions.\n`
  );

  // -------------------------------------------------------------------------
  // OPTIONAL: Migrate Scout IDs if present
  // -------------------------------------------------------------------------
  const scouts = await Scout.find({});
  stats.scoutsTotal = scouts.length;
  for (const scout of scouts) {
    if (!scout.scoutCode) continue;
    const oldFormatMatch = scout.scoutCode.match(/^[A-Z](SC[A-Z]{2}\d{3,})$/);
    if (oldFormatMatch) {
      const newScoutCode = oldFormatMatch[1];
      const existingConflict = await Scout.findOne({
        academyId: scout.academyId,
        scoutCode: newScoutCode,
        _id: { $ne: scout._id },
      });

      if (existingConflict) {
        stats.scoutsCollisions++;
        const errDetail = `Scout Collision in Academy [${scout.academyId}]: '${scout.scoutCode}' -> '${newScoutCode}' conflicts with scout [${existingConflict._id}]`;
        stats.collisionDetails.push(errDetail);
      } else {
        if (isApply) {
          const oldCode = scout.scoutCode;
          scout.scoutCode = newScoutCode;
          await scout.save();
        }
        stats.scoutsMigrated++;
      }
    }
  }

  // -------------------------------------------------------------------------
  // MIGRATION SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log("======================================================================");
  console.log("                      MIGRATION SUMMARY REPORT                        ");
  console.log("======================================================================");
  console.log(`Execution Mode:            ${isDryRun ? "DRY-RUN (No writes)" : "APPLIED (Committed to DB)"}`);
  console.log(`Total Academies Inspected:  ${stats.academiesTotal}`);
  console.log(`  - Already Assigned Code:  ${stats.academiesAlreadyCoded}`);
  console.log(`  - Codes Assigned/Migrated:${stats.academiesMigrated}`);
  console.log(`Total Coaches Inspected:    ${stats.coachesTotal}`);
  console.log(`  - Coaches Migrated:       ${stats.coachesMigrated}`);
  console.log(`  - Coach Collisions:       ${stats.coachesCollisions}`);
  console.log(`Total Players Inspected:    ${stats.playersTotal}`);
  console.log(`  - Players Migrated:       ${stats.playersMigrated}`);
  console.log(`  - Player Collisions:      ${stats.playersCollisions}`);
  console.log(`Total Scouts Inspected:     ${stats.scoutsTotal}`);
  console.log(`  - Scouts Migrated:        ${stats.scoutsMigrated}`);
  console.log(`  - Scout Collisions:       ${stats.scoutsCollisions}`);
  if (isApply) {
    console.log(`OTP Challenges Updated:     ${stats.otpChallengesMigrated}`);
  }

  if (stats.collisionDetails.length > 0) {
    console.log("\n[WARNING] The following ID collisions were detected and skipped:");
    for (const detail of stats.collisionDetails) {
      console.log(`  * ${detail}`);
    }
  }

  console.log("======================================================================\n");

  if (isDryRun) {
    console.log("[✓] Dry-run completed cleanly. Review summary above before applying.");
  } else {
    console.log("[✓] Migration applied successfully.");
  }

  process.exit(0);
}

runMigration().catch((err) => {
  console.error("\n[✗] MIGRATION FAILED WITH ERROR:");
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

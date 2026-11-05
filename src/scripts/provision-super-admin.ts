#!/usr/bin/env node

/**
 * ATHLIX One-Time Super Admin Provisioning CLI
 *
 * Usage:
 *   npm run provision:super-admin
 */

import { provisionInitialSuperAdmin } from "../modules/admin/provision-service";

async function run() {
  console.log("\n========================================================");
  console.log("   ATHLIX PLATFORM – INITIAL SUPER ADMIN PROVISIONING   ");
  console.log("========================================================\n");

  try {
    const result = await provisionInitialSuperAdmin();

    if (result.alreadyProvisioned) {
      console.warn(`[!] PROVISIONING REFUSED:`);
      console.warn(`    ${result.message}\n`);
      process.exit(1);
    }

    console.log(`[✓] SUCCESS:`);
    console.log(`    ${result.message}`);
    console.log(`    User ID:    ${result.user?.id}`);
    console.log(`    Email:      ${result.user?.email}`);
    console.log(`    Role:       ${result.user?.role}`);
    console.log(`    Status:     ${result.user?.status}`);
    console.log(`    Timestamp:  ${result.provisionedAt?.toISOString()}`);
    console.log("\nYou may now log in at http://localhost:3000/login using these credentials.\n");
    process.exit(0);
  } catch (err) {
    console.error(`[✗] PROVISIONING ERROR:`);
    console.error(`    ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}

run();

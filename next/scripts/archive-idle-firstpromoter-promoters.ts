/**
 * One-off / ops helper: archive FirstPromoter promoters with zero clicks
 * (and no referrals/sales) to free plan quota.
 *
 * Usage (from next/):
 *   npx tsx scripts/archive-idle-firstpromoter-promoters.ts
 *   npx tsx scripts/archive-idle-firstpromoter-promoters.ts --dry-run
 *
 * Requires FIRSTPROMOTER_API_KEY + FIRSTPROMOTER_ACCOUNT_ID in env (.env.local).
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";
import { fpArchiveIdlePromoters } from "../src/lib/firstpromoter";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const result = await fpArchiveIdlePromoters({ dryRun, chunkSize: 5 });
  console.log(
    JSON.stringify(
      {
        dryRun: result.dryRun,
        scanned_zero_click: result.scanned,
        skipped_with_activity: result.skippedActive,
        archived_or_would_archive: result.archivedIds.length,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

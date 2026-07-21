import { scrapeLiveAndUpcoming, closeBrowser } from "./scrape";
import { upsertMatches, pruneOldMatches } from "../lib/db";

const REFRESH_INTERVAL_MS = 90_000;

let running = false;

async function runScrapeCycle() {
  if (running) {
    console.log("[worker] previous cycle still running, skipping this tick");
    return;
  }
  running = true;
  const startedAt = new Date().toISOString();
  try {
    const matches = await scrapeLiveAndUpcoming();
    upsertMatches(matches);
    pruneOldMatches(6);
    const live = matches.filter((m) => m.status === "live").length;
    console.log(`[worker] ${startedAt} ok — ${matches.length} matches (${live} live)`);
  } catch (err) {
    console.error(`[worker] ${startedAt} scrape failed:`, err);
  } finally {
    running = false;
  }
}

console.log(
  `[worker] refreshing every ${REFRESH_INTERVAL_MS / 1000}s (today + tomorrow's schedule, covers live + next-24h)`
);

runScrapeCycle();
const timer = setInterval(runScrapeCycle, REFRESH_INTERVAL_MS);

async function shutdown() {
  clearInterval(timer);
  await closeBrowser();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

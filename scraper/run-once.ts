import { scrapeLiveAndUpcoming, closeBrowser } from "./scrape";
import { upsertMatches } from "../lib/db";

async function main() {
  console.log("Scraping totalcorner.com...");
  const matches = await scrapeLiveAndUpcoming();
  console.log(`Parsed ${matches.length} matches.`);
  upsertMatches(matches);
  console.log("Saved to database.");

  const live = matches.filter((m) => m.status === "live").length;
  const upcoming = matches.filter((m) => m.status === "upcoming").length;
  const finished = matches.filter((m) => m.status === "finished").length;
  console.log(`live=${live} upcoming=${upcoming} finished=${finished}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeBrowser());

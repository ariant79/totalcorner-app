import type { Page } from "playwright";
import type { Match, MatchStatus } from "../lib/types";

interface RawRow {
  leagueId: string;
  leagueName: string;
  countryFlagUrl: string | null;
  time: string; // "HH:mm"
  statusLabel: string; // minute number text, "Pauză", "Final", or ""
  homeTeam: string;
  homeTeamId: string;
  awayTeam: string;
  awayTeamId: string;
  score: string; // "1 - 1"
  handicap: string; // "-1.0 (-0.25)" or "-1.0"
  cornerLive: string; // "13 - 2"
  cornerHalfLive: string; // "(6-1)"
  cornerTotalLine: string; // "10.0 (15.5)" or "9.0"
  goalTotalLine: string; // "3.0 ( 2.5)"
  dangerousAttacks: string; // "73 - 39"
  statsHref: string | null;
  oddsHref: string | null;
  liveHref: string | null;
}

/** Runs inside the browser page context to pull structured data out of the match table rows. */
async function extractRows(page: Page): Promise<RawRow[]> {
  // tsx/esbuild injects a `__name(...)` call around every function definition
  // (for better stack traces) but doesn't ship that helper into the string
  // page.evaluate() sends to the browser. Predefine a no-op stand-in so the
  // injected calls don't blow up with ReferenceError in the page context.
  await page.evaluate(() => {
    (window as unknown as { __name?: unknown }).__name ??= (fn: unknown) => fn;
  });

  return page.evaluate(() => {
    const text = (el: Element | null): string =>
      el?.textContent?.replace(/\s+/g, " ").trim() ?? "";

    const rows = Array.from(document.querySelectorAll("table tbody tr"));
    const out: RawRow[] = [];

    for (const row of rows) {
      const leagueLink = row.querySelector<HTMLAnchorElement>("td.td_league a");
      if (!leagueLink) continue; // skip filter/separator rows without a league

      const flagImg = row.querySelector<HTMLImageElement>("td.today-flag-cell img");
      const timeCell = row.querySelector("td.today-match-time");
      const statusCell = row.querySelector("td.match_status .match_status_minutes");
      const homeLink = row.querySelector<HTMLAnchorElement>("td.match_home a");
      const awayLink = row.querySelector<HTMLAnchorElement>("td.match_away a");
      const scoreCell = row.querySelector("td.match_goal");
      const handicapCell = row.querySelector("td.match_handicap");
      const cornerLiveCell = row.querySelector("td.match_corner .span_match_corner");
      const cornerHalfCell = row.querySelector("td.match_corner .span_half_corner");
      const cornerTotalCell = row.querySelector("td.match_total_corner .match_total_corner_div");
      const goalTotalCell = row.querySelector("td.total_goals .match_total_goal_div");
      const attacksCell = row.querySelector("td.match_attach .match_dangerous_attacks_div");
      const statsHref = row.querySelector<HTMLAnchorElement>('td.td_analysis a[href*="/stats/"]');
      const oddsHref = row.querySelector<HTMLAnchorElement>('td.td_analysis a[href*="/odds/"]');
      const liveHref = row.querySelector<HTMLAnchorElement>('td.td_analysis a[href*="/live/"]');

      const leagueHrefMatch = leagueLink.href.match(/\/league\/view\/(\d+)/);
      const homeHrefMatch = homeLink?.href.match(/\/team\/view\/(\d+)/);
      const awayHrefMatch = awayLink?.href.match(/\/team\/view\/(\d+)/);

      out.push({
        leagueId: leagueHrefMatch ? leagueHrefMatch[1] : leagueLink.href,
        leagueName: text(leagueLink),
        countryFlagUrl: flagImg ? flagImg.src : null,
        time: text(timeCell),
        statusLabel: text(statusCell),
        homeTeam: text(homeLink),
        homeTeamId: homeHrefMatch ? homeHrefMatch[1] : "",
        awayTeam: text(awayLink),
        awayTeamId: awayHrefMatch ? awayHrefMatch[1] : "",
        score: text(scoreCell),
        handicap: text(handicapCell),
        cornerLive: text(cornerLiveCell),
        cornerHalfLive: text(cornerHalfCell),
        cornerTotalLine: text(cornerTotalCell),
        goalTotalLine: text(goalTotalCell),
        dangerousAttacks: text(attacksCell),
        statsHref: statsHref ? statsHref.getAttribute("href") : null,
        oddsHref: oddsHref ? oddsHref.getAttribute("href") : null,
        liveHref: liveHref ? liveHref.getAttribute("href") : null,
      });
    }

    return out;
  });
}

function parseStatus(statusLabel: string): MatchStatus {
  if (!statusLabel) return "upcoming";
  if (/final/i.test(statusLabel)) return "finished";
  return "live"; // numeric minute or "Pauză"
}

function parseScore(score: string): [number | null, number | null] {
  const m = score.match(/(\d+)\s*-\s*(\d+)/);
  if (!m) return [null, null];
  return [Number(m[1]), Number(m[2])];
}

/** "-1.0 (-0.25)" -> { line: "-1.0", live: "-0.25" }; "-1.0" -> { line: "-1.0", live: null } */
function splitLineAndLive(raw: string): { line: string | null; live: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { line: null, live: null };
  const m = trimmed.match(/^([^\s(]+)\s*(?:\(\s*([^)]+)\s*\))?$/);
  if (!m) return { line: trimmed, live: null };
  return { line: m[1], live: m[2] ?? null };
}

function toNumber(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function extractId(href: string | null): string | null {
  if (!href) return null;
  const m = href.match(/\/(\d+)$/);
  return m ? m[1] : null;
}

/**
 * Parses the "matches for a day" tables used by both /ro/match/today and
 * /ro/match/schedule/{yyyymmdd}. `dateForRows` is the calendar date (in the
 * scraping timezone) those rows' "HH:mm" times belong to.
 */
export async function parseMatchListPage(page: Page, dateForRows: Date): Promise<Match[]> {
  const rawRows = await extractRows(page);
  const now = new Date().toISOString();
  const matches: Match[] = [];

  for (const row of rawRows) {
    const id = extractId(row.statsHref) ?? extractId(row.liveHref) ?? extractId(row.oddsHref);
    if (!id) continue;

    const [hh, mm] = row.time.split(":").map((v) => Number(v));
    const kickoff = new Date(dateForRows);
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      kickoff.setHours(hh, mm, 0, 0);
    }

    const [scoreHome, scoreAway] = parseScore(row.score);
    const handicap = splitLineAndLive(row.handicap);
    const cornerTotal = splitLineAndLive(row.cornerTotalLine);
    const goalTotal = splitLineAndLive(row.goalTotalLine);
    const attacks = row.dangerousAttacks.match(/(\d+)\s*-\s*(\d+)/);

    matches.push({
      id,
      slug: row.statsHref?.split("/")[3] ?? "",
      leagueId: row.leagueId,
      leagueName: row.leagueName,
      countryFlagUrl: row.countryFlagUrl,
      kickoffAt: kickoff.toISOString(),
      status: parseStatus(row.statusLabel),
      statusLabel: row.statusLabel,
      homeTeam: row.homeTeam,
      homeTeamId: row.homeTeamId,
      awayTeam: row.awayTeam,
      awayTeamId: row.awayTeamId,
      scoreHome,
      scoreAway,
      handicapLine: handicap.line,
      handicapLive: handicap.live,
      cornerLive: row.cornerLive || null,
      cornerHalfLive: row.cornerHalfLive || null,
      cornerTotalLine: toNumber(cornerTotal.line),
      cornerTotalLineLive: toNumber(cornerTotal.live),
      goalTotalLine: toNumber(goalTotal.line),
      goalTotalLineLive: toNumber(goalTotal.live),
      dangerousAttacksHome: attacks ? Number(attacks[1]) : null,
      dangerousAttacksAway: attacks ? Number(attacks[2]) : null,
      statsUrl: row.statsHref ? `https://www.totalcorner.com${row.statsHref}` : "",
      oddsUrl: row.oddsHref ? `https://www.totalcorner.com${row.oddsHref}` : "",
      liveUrl: row.liveHref ? `https://www.totalcorner.com${row.liveHref}` : "",
      lastScrapedAt: now,
    });
  }

  return matches;
}

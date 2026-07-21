import { chromium, type Browser } from "playwright";
import { parseMatchListPage } from "./parse";
import type { Match } from "../lib/types";

const TIMEZONE = "Europe/Bucharest";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

export async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

function formatDateForSchedule(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}${m}${d}`;
}

/** Midnight (in TIMEZONE) of the given date, expressed as a local Date the parser can call setHours on. */
function startOfDayLocal(date: Date): Date {
  // Rendering the date in TIMEZONE and re-parsing pins us to that day's midnight
  // regardless of the host machine's own timezone.
  const dateStr = formatDateForSchedule(date); // yyyymmdd
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  return new Date(`${y}-${m}-${d}T00:00:00`);
}

async function scrapeUrl(url: string, dateForRows: Date): Promise<Match[]> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: "ro-RO",
    timezoneId: TIMEZONE,
  });
  try {
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    return await parseMatchListPage(page, dateForRows);
  } finally {
    await context.close();
  }
}

/** All of today's matches (live status included) — from /ro/match/today. */
export async function scrapeToday(): Promise<Match[]> {
  return scrapeUrl("https://www.totalcorner.com/ro/match/today", startOfDayLocal(new Date()));
}

/** A future day's fixtures — from /ro/match/schedule/{yyyymmdd}. */
export async function scrapeScheduleDay(date: Date): Promise<Match[]> {
  const dateStr = formatDateForSchedule(date);
  return scrapeUrl(
    `https://www.totalcorner.com/ro/match/schedule/${dateStr}`,
    startOfDayLocal(date)
  );
}

/** Today + tomorrow, which together cover "live now" and "next 24h". */
export async function scrapeLiveAndUpcoming(): Promise<Match[]> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [today, tomorrowMatches] = await Promise.all([
    scrapeToday(),
    scrapeScheduleDay(tomorrow),
  ]);

  const byId = new Map<string, Match>();
  for (const m of [...today, ...tomorrowMatches]) byId.set(m.id, m);
  return Array.from(byId.values());
}

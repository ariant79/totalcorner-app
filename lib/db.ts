import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { Match } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "totalcorner.db");

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      league_id TEXT NOT NULL,
      league_name TEXT NOT NULL,
      country_flag_url TEXT,
      kickoff_at TEXT NOT NULL,
      status TEXT NOT NULL,
      status_label TEXT,
      home_team TEXT NOT NULL,
      home_team_id TEXT,
      away_team TEXT NOT NULL,
      away_team_id TEXT,
      score_home INTEGER,
      score_away INTEGER,
      handicap_line TEXT,
      handicap_live TEXT,
      corner_live TEXT,
      corner_half_live TEXT,
      corner_total_line REAL,
      corner_total_line_live REAL,
      goal_total_line REAL,
      goal_total_line_live REAL,
      dangerous_attacks_home INTEGER,
      dangerous_attacks_away INTEGER,
      stats_url TEXT,
      odds_url TEXT,
      live_url TEXT,
      last_scraped_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
    CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches(kickoff_at);
  `);

  dbInstance = db;
  return db;
}

const upsertSql = `
  INSERT INTO matches (
    id, slug, league_id, league_name, country_flag_url, kickoff_at, status, status_label,
    home_team, home_team_id, away_team, away_team_id, score_home, score_away,
    handicap_line, handicap_live, corner_live, corner_half_live,
    corner_total_line, corner_total_line_live, goal_total_line, goal_total_line_live,
    dangerous_attacks_home, dangerous_attacks_away, stats_url, odds_url, live_url, last_scraped_at
  ) VALUES (
    @id, @slug, @leagueId, @leagueName, @countryFlagUrl, @kickoffAt, @status, @statusLabel,
    @homeTeam, @homeTeamId, @awayTeam, @awayTeamId, @scoreHome, @scoreAway,
    @handicapLine, @handicapLive, @cornerLive, @cornerHalfLive,
    @cornerTotalLine, @cornerTotalLineLive, @goalTotalLine, @goalTotalLineLive,
    @dangerousAttacksHome, @dangerousAttacksAway, @statsUrl, @oddsUrl, @liveUrl, @lastScrapedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    slug = excluded.slug,
    league_id = excluded.league_id,
    league_name = excluded.league_name,
    country_flag_url = excluded.country_flag_url,
    kickoff_at = excluded.kickoff_at,
    status = excluded.status,
    status_label = excluded.status_label,
    home_team = excluded.home_team,
    home_team_id = excluded.home_team_id,
    away_team = excluded.away_team,
    away_team_id = excluded.away_team_id,
    score_home = excluded.score_home,
    score_away = excluded.score_away,
    handicap_line = excluded.handicap_line,
    handicap_live = excluded.handicap_live,
    corner_live = excluded.corner_live,
    corner_half_live = excluded.corner_half_live,
    corner_total_line = excluded.corner_total_line,
    corner_total_line_live = excluded.corner_total_line_live,
    goal_total_line = excluded.goal_total_line,
    goal_total_line_live = excluded.goal_total_line_live,
    dangerous_attacks_home = excluded.dangerous_attacks_home,
    dangerous_attacks_away = excluded.dangerous_attacks_away,
    stats_url = excluded.stats_url,
    odds_url = excluded.odds_url,
    live_url = excluded.live_url,
    last_scraped_at = excluded.last_scraped_at
`;

export function upsertMatches(matches: Match[]) {
  const db = getDb();
  const stmt = db.prepare(upsertSql);
  const insertMany = db.transaction((rows: Match[]) => {
    for (const row of rows) {
      stmt.run({
        ...row,
        countryFlagUrl: row.countryFlagUrl ?? null,
        scoreHome: row.scoreHome ?? null,
        scoreAway: row.scoreAway ?? null,
        handicapLine: row.handicapLine ?? null,
        handicapLive: row.handicapLive ?? null,
        cornerLive: row.cornerLive ?? null,
        cornerHalfLive: row.cornerHalfLive ?? null,
        cornerTotalLine: row.cornerTotalLine ?? null,
        cornerTotalLineLive: row.cornerTotalLineLive ?? null,
        goalTotalLine: row.goalTotalLine ?? null,
        goalTotalLineLive: row.goalTotalLineLive ?? null,
        dangerousAttacksHome: row.dangerousAttacksHome ?? null,
        dangerousAttacksAway: row.dangerousAttacksAway ?? null,
      });
    }
  });
  insertMany(matches);
}

export function getMatches(): Match[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM matches ORDER BY kickoff_at ASC`
    )
    .all() as Record<string, unknown>[];

  return rows.map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    leagueId: r.league_id as string,
    leagueName: r.league_name as string,
    countryFlagUrl: (r.country_flag_url as string) ?? null,
    kickoffAt: r.kickoff_at as string,
    status: r.status as Match["status"],
    statusLabel: (r.status_label as string) ?? "",
    homeTeam: r.home_team as string,
    homeTeamId: (r.home_team_id as string) ?? "",
    awayTeam: r.away_team as string,
    awayTeamId: (r.away_team_id as string) ?? "",
    scoreHome: (r.score_home as number) ?? null,
    scoreAway: (r.score_away as number) ?? null,
    handicapLine: (r.handicap_line as string) ?? null,
    handicapLive: (r.handicap_live as string) ?? null,
    cornerLive: (r.corner_live as string) ?? null,
    cornerHalfLive: (r.corner_half_live as string) ?? null,
    cornerTotalLine: (r.corner_total_line as number) ?? null,
    cornerTotalLineLive: (r.corner_total_line_live as number) ?? null,
    goalTotalLine: (r.goal_total_line as number) ?? null,
    goalTotalLineLive: (r.goal_total_line_live as number) ?? null,
    dangerousAttacksHome: (r.dangerous_attacks_home as number) ?? null,
    dangerousAttacksAway: (r.dangerous_attacks_away as number) ?? null,
    statsUrl: r.stats_url as string,
    oddsUrl: r.odds_url as string,
    liveUrl: r.live_url as string,
    lastScrapedAt: r.last_scraped_at as string,
  }));
}

/** Removes finished matches whose kickoff was more than `hoursOld` hours ago, to keep the table small. */
export function pruneOldMatches(hoursOld: number) {
  const db = getDb();
  const cutoff = new Date(Date.now() - hoursOld * 3600_000).toISOString();
  db.prepare(`DELETE FROM matches WHERE status = 'finished' AND kickoff_at < ?`).run(cutoff);
}

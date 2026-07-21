export type MatchStatus = "upcoming" | "live" | "finished";

export interface Match {
  id: string;
  slug: string;
  leagueId: string;
  leagueName: string;
  countryFlagUrl: string | null;
  kickoffAt: string; // ISO string
  status: MatchStatus;
  statusLabel: string; // raw label: minute number, "Pauză", "Final", ""
  homeTeam: string;
  homeTeamId: string;
  awayTeam: string;
  awayTeamId: string;
  scoreHome: number | null;
  scoreAway: number | null;
  handicapLine: string | null;
  handicapLive: string | null;
  cornerLive: string | null;
  cornerHalfLive: string | null;
  cornerTotalLine: number | null;
  cornerTotalLineLive: number | null;
  goalTotalLine: number | null;
  goalTotalLineLive: number | null;
  dangerousAttacksHome: number | null;
  dangerousAttacksAway: number | null;
  statsUrl: string;
  oddsUrl: string;
  liveUrl: string;
  lastScrapedAt: string;
}

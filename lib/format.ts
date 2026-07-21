import type { Match } from "./types";

export function formatKickoffTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatKickoffDay(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export function isWithinNext24h(match: Match): boolean {
  const kickoff = new Date(match.kickoffAt).getTime();
  const now = Date.now();
  return kickoff >= now - 3 * 3600_000 && kickoff <= now + 24 * 3600_000;
}

export function statusDisplay(match: Match): string {
  if (match.status === "upcoming") return formatKickoffTime(match.kickoffAt);
  if (match.status === "finished") return "Final";
  if (match.statusLabel === "Pauză") return "Pauză";
  return `${match.statusLabel}'`;
}

export function scoreDisplay(match: Match): string {
  if (match.scoreHome === null || match.scoreAway === null) return "–";
  return `${match.scoreHome} - ${match.scoreAway}`;
}

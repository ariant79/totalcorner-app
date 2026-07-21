import type { Match } from "../lib/types";
import { statusDisplay, scoreDisplay, formatKickoffDay } from "../lib/format";

function PredictionBadge({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === "live";

  return (
    <a
      href={match.statsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:shadow-md hover:border-accent/40"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {match.countryFlagUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={match.countryFlagUrl}
              alt=""
              width={16}
              height={12}
              className="shrink-0 rounded-sm"
            />
          )}
          <span className="truncate text-xs font-medium text-muted">
            {match.leagueName}
          </span>
        </div>
        {isLive ? (
          <span className="flex items-center gap-1.5 rounded-full bg-live-soft px-2 py-0.5 text-xs font-semibold text-live shrink-0">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-live" />
            {statusDisplay(match)}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted">
            {formatKickoffDay(match.kickoffAt)} · {statusDisplay(match)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-3">
        <span className="truncate text-right text-sm font-semibold text-foreground">
          {match.homeTeam}
        </span>
        <span
          className={`rounded-md px-2 py-0.5 text-sm font-bold ${
            isLive
              ? "bg-live-soft text-live"
              : "bg-background text-muted"
          }`}
        >
          {scoreDisplay(match)}
        </span>
        <span className="truncate text-sm font-semibold text-foreground">
          {match.awayTeam}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <PredictionBadge label="Cornere linie" value={match.cornerTotalLine} />
        <PredictionBadge label="Cornere live" value={match.cornerLive} />
        <PredictionBadge label="Goluri linie" value={match.goalTotalLine} />
        <PredictionBadge label="Handicap" value={match.handicapLine} />
      </div>
    </a>
  );
}

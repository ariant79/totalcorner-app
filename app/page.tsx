"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import type { Match } from "../lib/types";
import { isWithinNext24h } from "../lib/format";
import MatchCard from "../components/MatchCard";

type Tab = "live" | "upcoming";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const { data, error, isLoading } = useSWR<{ matches: Match[]; fetchedAt: string }>(
    "/api/matches",
    fetcher,
    { refreshInterval: 30_000 }
  );
  const [tab, setTab] = useState<Tab>("live");
  const [league, setLeague] = useState<string>("all");

  const matches = useMemo(() => data?.matches ?? [], [data]);

  const liveMatches = useMemo(
    () => matches.filter((m) => m.status === "live"),
    [matches]
  );
  const upcomingMatches = useMemo(
    () =>
      matches.filter((m) => m.status === "upcoming" && isWithinNext24h(m)),
    [matches]
  );

  const activeList = tab === "live" ? liveMatches : upcomingMatches;

  const leagues = useMemo(() => {
    const names = new Set(activeList.map((m) => m.leagueName));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [activeList]);

  const filteredList = useMemo(() => {
    const list =
      league === "all" ? activeList : activeList.filter((m) => m.leagueName === league);
    return [...list].sort(
      (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime()
    );
  }, [activeList, league]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          Predicții fotbal
        </h1>
        <p className="text-sm text-muted">
          Meciuri live și programate în următoarele 24h, cu cornere, goluri și handicap.
        </p>
      </header>

      <div className="mb-4 flex items-center gap-2 rounded-lg bg-surface border border-border p-1 w-fit">
        <button
          onClick={() => {
            setTab("live");
            setLeague("all");
          }}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab === "live"
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Live acum{liveMatches.length > 0 ? ` (${liveMatches.length})` : ""}
        </button>
        <button
          onClick={() => {
            setTab("upcoming");
            setLeague("all");
          }}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab === "upcoming"
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          Următoarele 24h{upcomingMatches.length > 0 ? ` (${upcomingMatches.length})` : ""}
        </button>
      </div>

      {leagues.length > 1 && (
        <div className="mb-5">
          <select
            value={league}
            onChange={(e) => setLeague(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
          >
            <option value="all">Toate ligile ({activeList.length})</option>
            {leagues.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLoading && <p className="text-sm text-muted">Se încarcă meciurile…</p>}

      {error && (
        <p className="text-sm text-live">
          Nu am putut încărca datele. Verifică dacă scraper-ul rulează.
        </p>
      )}

      {!isLoading && !error && filteredList.length === 0 && (
        <p className="text-sm text-muted">
          Niciun meci de afișat momentan pentru acest filtru.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredList.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
    </main>
  );
}

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTournament } from "../context/TournamentContext";
import { fetchTeamsForTournament, MAX_TEAM_SIZE } from "../utils/teamService";
import LoadingSkeleton from "../components/LoadingSkeleton";
import PageShell from "../components/layout/PageShell";

export default function ViewTeams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { currentTournament } = useTournament();

  useEffect(() => {
    async function fetchTeams() {
      if (!currentTournament) {
        setTeams([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const teamsData = await fetchTeamsForTournament(currentTournament);
      setTeams(
        teamsData.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, {
            sensitivity: "base",
          })
        )
      );
      setLoading(false);
    }

    fetchTeams();
  }, [currentTournament]);

  if (!currentTournament) {
    return (
      <PageShell
        title="View Teams"
        description="Select a tournament to see its squads."
        backHref="/dashboard"
      >
        <div className="mobile-card p-8 text-center">
          <p className="text-[var(--text-muted)]">
            Select a tournament first to view its teams.
          </p>
        </div>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell
        title="Current Teams"
        description="Fetching the latest pairings..."
        backHref="/dashboard"
      >
        <div className="mobile-card p-6">
          <LoadingSkeleton
            items={3}
            lines={3}
            showAvatar
            cardClassName="bg-[var(--surface-muted)]"
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Current Teams"
      description="Review every pair in your tournament."
      backHref="/dashboard"
      bodyClassName="mobile-section"
    >
      <section className="mobile-card p-6">
        {teams.length === 0 ? (
          <p className="text-center text-[var(--text-muted)]">
            No teams have been created yet.
          </p>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => {
              const roster = Array.isArray(team.players)
                ? team.players
                : [team.player1, team.player2].filter(Boolean);
              const openSlots = Math.max(
                MAX_TEAM_SIZE - (roster.length || 0),
                0
              );

              return (
                <div
                  key={team.id}
                  className="p-4 sm:p-6 rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)]"
                >
                  <h3 className="text-center text-[var(--text-strong)] font-bold text-lg sm:text-xl mb-3 sm:mb-4">
                    {team.name || "Unnamed Team"}
                  </h3>
                  <p className="text-center text-sm text-[var(--text-muted)] mb-4">
                    {roster.length} / {MAX_TEAM_SIZE} players
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                    {roster.length > 0 ? (
                      roster.map((player) => (
                        <PlayerCard
                          key={player.uid || player.userId || player.id}
                          player={player}
                        />
                      ))
                    ) : (
                      <span className="text-[var(--text-muted)] font-semibold text-sm sm:text-base">
                        Waiting for team members
                      </span>
                    )}
                    {openSlots > 0 &&
                      Array.from({ length: openSlots }).map((_, idx) => (
                        <div
                          key={`open-${team.id}-${idx}`}
                          className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-dashed border-[var(--surface-card-border)] flex items-center justify-center text-xs sm:text-sm text-[var(--text-muted)] font-semibold"
                        >
                          Open slot
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}

function PlayerCard({ player }) {
  if (!player) return null;

  return (
    <div className="flex flex-col items-center text-center rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-card)] px-4 py-3">
      {player.profilePictureUrl ? (
        <img
          src={player.profilePictureUrl}
          alt={player.displayName}
          className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl object-cover"
        />
      ) : (
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-brand-500/15 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold text-lg sm:text-xl">
          {player.displayName?.charAt(0) || "?"}
        </div>
      )}
      <span className="font-medium text-[var(--text-strong)] mt-2 text-sm sm:text-base">
        {player.displayName || "Unknown"}
      </span>
      <span className="text-[var(--text-muted)] text-xs sm:text-sm">
        HCP: {player.handicap ?? "—"}
      </span>
    </div>
  );
}

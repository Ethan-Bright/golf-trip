import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import StablefordScorecardModal from "./StablefordScorecardModal";
import { fetchTeamsForTournament, getTeamIdForTournament } from "../utils/teamService";

export default function StablefordLeaderboard({ game }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!game?.players || game.players.length === 0) return;

      const playerIds = Array.from(
        new Set((game?.players || []).map((p) => p.userId).filter(Boolean))
      );
      const userDocs = await Promise.all(
        playerIds.map((id) => getDoc(doc(db, "users", id)))
      );
      const users = userDocs
        .filter((snap) => snap.exists())
        .map((snap) => ({ id: snap.id, ...snap.data() }));

      const teams = Array.isArray(game?.finalizedTeams) && game.finalizedTeams.length > 0
        ? game.finalizedTeams
        : await fetchTeamsForTournament(game?.tournamentId);

      const gamePlayersMap = {};
      game.players.forEach((p) => (gamePlayersMap[p.userId] = p));

      // Respect 9-hole / back-nine games instead of always iterating 18 holes.
      const holeTotal = game.holeCount || 18;
      const holeStart = game.nineType === "back" ? 9 : 0;
      const holeEnd = holeStart + holeTotal;

      const resolveTeamUsers = (team) => {
        const roster =
          Array.isArray(team.players) && team.players.length > 0
            ? team.players
            : [team.player1, team.player2].filter(Boolean);
        return roster
          .map((slot) => {
            const playerId = slot?.uid || slot?.userId || slot?.id;
            if (!playerId) return null;
            const foundUser = users.find(
              (u) => u.id === playerId && gamePlayersMap[u.id]
            );
            return foundUser || null;
          })
          .filter(Boolean);
      };

      const leaderboardData = [];

      teams.forEach((team) => {
        const teamMembers = resolveTeamUsers(team);
        if (teamMembers.length === 0) return;

        let totalPoints = 0;
        let holesThru = 0;
        let totalStrokes = 0;
        let isRoundComplete = true;

        const memberScores = teamMembers.map(
          (member) => gamePlayersMap[member.id]?.scores ?? []
        );

        for (let i = holeStart; i < holeEnd; i++) {
          const holeNets = [];
          let holeHasNet = false;
          let holeHasGross = false;
          let bestGross = null;

          memberScores.forEach((scores) => {
            const score = scores[i];
            if (!score) return;
            if (score.net != null) {
              holeHasNet = true;
              holeNets.push(score.net);
            }
            if (score.gross != null && score.gross > 0) {
              holeHasGross = true;
              // Best-ball strokes = the LOWER gross of the team on that hole.
              bestGross =
                bestGross === null ? score.gross : Math.min(bestGross, score.gross);
            }
          });

          if (holeHasNet) {
            holesThru++;
            totalPoints += Math.max(...holeNets);
          }

          if (holeHasGross && bestGross !== null) {
            totalStrokes += bestGross;
          } else {
            isRoundComplete = false;
          }
        }

        const opponentPlayers = [];
        let opponentDisplayName = "";
        const opponentTeam = teams.find(
          (t) =>
            t.id !== team.id &&
            (Array.isArray(t.players) ? t.players.length : 0) >= 1
        );

        if (opponentTeam) {
          const opponents = resolveTeamUsers(opponentTeam);
          opponentPlayers.push(...opponents);
          opponentDisplayName = opponentTeam.name;
        }

        leaderboardData.push({
          id: team.id,
          name: team.name,
          players: teamMembers,
          totalPoints,
          thru: holesThru,
          isSolo: false,
          totalStrokes,
          isRoundComplete,
          opponentPlayers,
          opponentDisplayName:
            opponentDisplayName ||
            (opponentPlayers.length > 0
              ? opponentPlayers
                  .map((p) => p.displayName || p.name || "Opponent")
                  .join(" & ")
              : ""),
        });
      });

      const soloPlayers = users.filter(
        (u) =>
          !getTeamIdForTournament(u, game?.tournamentId) && gamePlayersMap[u.id]
      );
      soloPlayers.forEach((player) => {
        const scores = gamePlayersMap[player.id]?.scores ?? [];
        let totalPoints = 0;
        let holesThru = 0;
        let totalStrokes = 0;
        let isRoundComplete = true;
        
        for (let i = holeStart; i < holeEnd; i++) {
          const net = scores[i]?.net;
          if (net != null) holesThru++;
          totalPoints += net ?? 0;

          // Calculate strokes using gross scores
          const gross = scores[i]?.gross;
          totalStrokes += gross ?? 0;

          // Check if round is complete
          if (gross == null) {
            isRoundComplete = false;
          }
        }
        leaderboardData.push({
          players: [player],
          displayName: `${player.displayName ?? "Unknown"} (Solo)`,
          totalPoints,
          thru: holesThru,
          isSolo: true,
          totalStrokes,
          isRoundComplete,
        });
      });

      leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);
      setLeaderboard(leaderboardData);
    };

    fetchLeaderboard();
  }, [game]);

  const openModal = (team) => {
    setSelectedTeam(team);
    setModalOpen(true);
  };
  const closeModal = () => {
    setSelectedTeam(null);
    setModalOpen(false);
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[var(--text-strong)] text-center mb-6">
        Stableford Leaderboard
      </h1>
      {leaderboard.length === 0 ? (
        <p className="text-center text-[var(--text-muted)] text-sm sm:text-base">
          No players or teams found.
        </p>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((team, index) => (
            <div
              key={index}
              className={`p-3 sm:p-4 rounded-2xl border transition-colors hover:bg-brand-500/5 ${
                index === 0
                  ? "bg-brand-500/10 border-brand-500/40"
                  : "bg-[var(--surface-muted)] border-[var(--surface-card-border)]"
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Position Number */}
                  <div className="w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 tabular-nums">
                    {index + 1}
                  </div>
                  
                  {/* Profile Picture - Only for solo players */}
                  {team.isSolo && (
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--surface-muted)] flex-shrink-0">
                      {team.players[0]?.profilePictureUrl ? (
                        <img 
                          src={team.players[0].profilePictureUrl} 
                          alt={team.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-sm font-medium">
                          {team.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Player/Team Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[var(--text-strong)] text-sm sm:text-base truncate">
                      {team.isSolo ? team.displayName : team.name}
                    </h3>
                    {!team.isSolo && team.players && team.players.length > 0 && (
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {team.players.map((player, idx) => (
                          <div key={idx} className="flex items-center gap-1 flex-shrink-0">
                            {player.profilePictureUrl ? (
                              <img
                                src={player.profilePictureUrl}
                                alt={player.displayName}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                                {player.displayName?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="text-xs text-[var(--text-muted)]">
                              {player.displayName || 'Unknown'}
                            </span>
                            {idx < team.players.length - 1 && <span className="text-xs text-[var(--text-muted)]">•</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1">
                      {team.isRoundComplete ? "Completed Match" : `Thru ${team.thru}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <span className="text-[var(--text-strong)] font-bold text-base sm:text-lg tabular-nums">
                    {team.totalPoints} pts
                  </span>
                  <button
                    onClick={() => openModal(team)}
                    className="btn btn-primary btn-sm flex-1 sm:flex-none whitespace-nowrap"
                  >
                    View Scores
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {modalOpen && selectedTeam && (
        <StablefordScorecardModal selectedTeam={selectedTeam} game={game} onClose={closeModal} />
      )}
    </div>
  );
}

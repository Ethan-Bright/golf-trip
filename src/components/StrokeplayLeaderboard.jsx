import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import StrokeplayScorecardModal from "./StrokeplayScorecardModal";
import { fetchTeamsForTournament, getTeamIdForTournament } from "../utils/teamService";

export default function StrokeplayLeaderboard({ game }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Calculate match status using cumulative stroke differential (best score per hole)
  const calculateMatchStatus = (
    leftName,
    leftBestScores,
    rightName,
    rightBestScores
  ) => {
    let diff = 0;
    let holesPlayed = 0;
    const maxHoles = Math.max(leftBestScores.length, rightBestScores.length);

    for (let i = 0; i < maxHoles; i++) {
      const leftGross = leftBestScores[i];
      const rightGross = rightBestScores[i];
      if (leftGross == null || rightGross == null) continue;

      holesPlayed++;
      diff += rightGross - leftGross;
    }

    if (holesPlayed === 0) {
      return { diff: 0, label: "Waiting for opponent" };
    }

    if (diff === 0) {
      return { diff: 0, label: "Even" };
    }

    if (diff > 0) {
      return { diff, label: `${leftName} +${diff}` };
    }

    return { diff, label: `${rightName} +${Math.abs(diff)}` };
  };

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

      const teams =
        Array.isArray(game?.finalizedTeams) && game.finalizedTeams.length > 0
          ? game.finalizedTeams
          : await fetchTeamsForTournament(game?.tournamentId);

      const gamePlayersMap = {};
      game.players.forEach((p) => (gamePlayersMap[p.userId] = p));

      const leaderboardData = [];
      const totalHoles = game.course?.holes?.length || 18;

      const getBestHoleScores = (playerList) =>
        Array.from({ length: totalHoles }, (_, idx) => {
          const grossValues = playerList
            .map((player) => gamePlayersMap[player?.id]?.scores?.[idx]?.gross)
            .filter((val) => typeof val === "number");
          if (grossValues.length === 0) return null;
          return Math.min(...grossValues);
        });

      teams.forEach((team) => {
        const player1 = users.find(
          (u) => u.id === team.player1?.uid && gamePlayersMap[u.id]
        );
        const player2 = users.find(
          (u) => u.id === team.player2?.uid && gamePlayersMap[u.id]
        );
        if (!player1 && !player2) return;

        let holesThru = 0;
        let totalStrokes = 0;
        let isRoundComplete = true;
        let matchStatus = "Waiting for opponent";
        let matchDiff = 0;

        const p1Scores = gamePlayersMap[player1?.id]?.scores ?? [];
        const p2Scores = gamePlayersMap[player2?.id]?.scores ?? [];

        let opponentDisplayName = "";
        const opponentPlayers = [];

        // Calculate match status for teams
        if (player1 && player2) {
          const opponentTeam = teams.find(
            (t) =>
              t.id !== team.id &&
              ((t.player1?.uid && gamePlayersMap[t.player1.uid]) ||
                (t.player2?.uid && gamePlayersMap[t.player2.uid]))
          );

          if (opponentTeam) {
            const opponent1 = users.find(
              (u) => u.id === opponentTeam.player1?.uid && gamePlayersMap[u.id]
            );
            const opponent2 = users.find(
              (u) => u.id === opponentTeam.player2?.uid && gamePlayersMap[u.id]
            );

            if (opponent1) opponentPlayers.push(opponent1);
            if (opponent2) opponentPlayers.push(opponent2);
            opponentDisplayName = opponentTeam.name;

            if (opponentPlayers.length > 0) {
              const teamBestScores = getBestHoleScores(
                [player1, player2].filter(Boolean)
              );
              const opponentBestScores = getBestHoleScores(opponentPlayers);
              const statusInfo = calculateMatchStatus(
                team.name,
                teamBestScores,
                opponentDisplayName || "Opponents",
                opponentBestScores
              );
              matchDiff = statusInfo.diff;
              if (statusInfo.diff === 0) {
                matchStatus = "Even";
              } else if (statusInfo.diff > 0) {
                matchStatus = `${team.name} +${statusInfo.diff}`;
              } else {
                matchStatus = `${team.name} ${statusInfo.diff}`;
              }
            }
          }
        }

        for (let i = 0; i < 18; i++) {
          const p1Gross = p1Scores[i]?.gross;
          const p2Gross = p2Scores[i]?.gross;
          if (p1Gross != null || p2Gross != null) holesThru++;
          totalStrokes += (p1Gross ?? 0) + (p2Gross ?? 0);

          if (p1Gross == null && p2Gross == null) {
            isRoundComplete = false;
          }
        }

        leaderboardData.push({
          id: team.id,
          name: team.name,
          players: [player1, player2].filter(Boolean),
          thru: holesThru,
          isSolo: false,
          totalStrokes,
          isRoundComplete,
          matchStatus,
          opponentPlayers,
          matchDiff,
          opponentDisplayName:
            opponentDisplayName ||
            (opponentPlayers.length > 0
              ? opponentPlayers
                  .map((p) => p.displayName || "Opponent")
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
        let holesThru = 0;
        let totalStrokes = 0;
        let isRoundComplete = true;
        let matchStatus = "Waiting for opponent";
        let matchDiff = 0;
        let opponentDisplayName = "";
        const opponentPlayers = [];
        
        // Find opponent for solo player
        const otherSoloPlayers = soloPlayers.filter(p => p.id !== player.id);
        if (otherSoloPlayers.length > 0) {
          const opponent = otherSoloPlayers[0];
          const playerBestScores = getBestHoleScores([player]);
          const opponentBestScores = getBestHoleScores([opponent]);
          const statusInfo = calculateMatchStatus(
            player.displayName || "Player",
            playerBestScores,
            opponent.displayName || "Opponent",
            opponentBestScores
          );
          matchDiff = statusInfo.diff;
          if (statusInfo.diff === 0) {
            matchStatus = "Even";
          } else if (statusInfo.diff > 0) {
            matchStatus = `${player.displayName || "Player"} +${
              statusInfo.diff
            }`;
          } else {
            matchStatus = `${player.displayName || "Player"} ${
              statusInfo.diff
            }`;
          }
          opponentPlayers.push(opponent);
          opponentDisplayName =
            opponent.displayName || opponent.name || "Opponent";
        }
        
        for (let i = 0; i < 18; i++) {
          const gross = scores[i]?.gross;
          if (gross != null) holesThru++;
          totalStrokes += gross ?? 0;

          if (gross == null) {
            isRoundComplete = false;
          }
        }
        leaderboardData.push({
          players: [player],
          displayName: `${player.displayName ?? "Unknown"} (Solo)`,
          thru: holesThru,
          isSolo: true,
          totalStrokes,
          isRoundComplete,
          matchStatus,
          matchDiff,
          opponentPlayers,
          opponentDisplayName,
        });
      });

      leaderboardData.sort((a, b) => {
        if (a.totalStrokes !== b.totalStrokes) {
          return a.totalStrokes - b.totalStrokes;
        }
        return (b.matchDiff ?? 0) - (a.matchDiff ?? 0);
      });
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
        Strokeplay Leaderboard
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
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                  <span className="text-brand-600 dark:text-brand-300 font-bold text-lg sm:text-xl">
                    {team.matchStatus}
                  </span>
                  <button
                    onClick={() => openModal(team)}
                    className="btn btn-primary btn-sm w-full sm:w-auto whitespace-nowrap"
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
        <StrokeplayScorecardModal game={game} selectedTeam={selectedTeam} onClose={closeModal} />
      )}
    </div>
  );
}

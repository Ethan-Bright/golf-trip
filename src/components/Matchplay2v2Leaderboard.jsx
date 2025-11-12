import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import Matchplay2v2ScorecardModal from "./Matchplay2v2ScorecardModal";

export default function Matchplay2v2Leaderboard({ game }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!game?.players || game.players.length === 0) return;

      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const teamsSnap = await getDocs(collection(db, "teams"));
      const teams = teamsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const gamePlayersMap = {};
      game.players.forEach((p) => (gamePlayersMap[p.userId] = p));

      // Calculate match status based on best ball scores from each team
      const calculateMatchStatus = (team1Players, team2Players, holeCount, team1Name, team2Name) => {
        let status = 0;
        let holesPlayed = 0;
        let lockedWinStatus = null; // Track if match was won at any point
        
        for (let i = 0; i < 18; i++) {
          // Get best ball (lowest net score) from team 1
          const team1Scores = team1Players
            .map(player => gamePlayersMap[player.id]?.scores?.[i]?.net)
            .filter(score => score != null);
          
          // Get best ball (lowest net score) from team 2
          const team2Scores = team2Players
            .map(player => gamePlayersMap[player.id]?.scores?.[i]?.net)
            .filter(score => score != null);
          
          if (team1Scores.length === 0 || team2Scores.length === 0) continue;
          
          holesPlayed++;
          const team1Best = Math.min(...team1Scores);
          const team2Best = Math.min(...team2Scores);
          
          if (team1Best < team2Best) status++;
          else if (team2Best < team1Best) status--;
          
          // Check if match is won at this point
          const holesRemaining = holeCount - holesPlayed;
          const absStatus = Math.abs(status);
          
          if (absStatus > holesRemaining && !lockedWinStatus) {
            // Match is won - lock this status
            if (status > 0) {
              lockedWinStatus = `${team1Name} won ${absStatus}-${holesRemaining}`;
            } else {
              lockedWinStatus = `${team2Name} won ${absStatus}-${holesRemaining}`;
            }
          }
        }
        
        if (holesPlayed === 0) return "Waiting for opponent";
        
        // If match was won at any point, return the locked status
        if (lockedWinStatus) return lockedWinStatus;
        
        // Otherwise calculate current status
        const holesRemaining = holeCount - holesPlayed;
        const absStatus = Math.abs(status);
        
        if (status === 0) return "All Square";
        if (status > 0) return `${status} Up`;
        return `${absStatus} Down`;
      };

      const leaderboardData = [];

      teams.forEach((team) => {
        const player1 = users.find(
          (u) => u.id === team.player1?.uid && gamePlayersMap[u.id]
        );
        const player2 = users.find(
          (u) => u.id === team.player2?.uid && gamePlayersMap[u.id]
        );
        
        if (!player1 || !player2) return;

        let totalStrokes = 0;
        let holesThru = 0;
        let isRoundComplete = true;

        const p1Scores = gamePlayersMap[player1.id]?.scores ?? [];
        const p2Scores = gamePlayersMap[player2.id]?.scores ?? [];

        // Calculate total strokes (sum of both players)
        for (let i = 0; i < 18; i++) {
          const p1Gross = p1Scores[i]?.gross ?? 0;
          const p2Gross = p2Scores[i]?.gross ?? 0;
          
          if (p1Gross > 0 || p2Gross > 0) holesThru++;
          totalStrokes += p1Gross + p2Gross;
          
          if (p1Gross === 0 && p2Gross === 0) {
            isRoundComplete = false;
          }
        }

        // Find opposing team
        const opponentPlayers = [];
        let opponentDisplayName = "";
        const opponentTeam = teams.find(
          (t) => t.id !== team.id && t.player1?.uid && t.player2?.uid
        );

        let matchStatus = "Waiting for opponent";

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

          if (opponent1 && opponent2) {
            matchStatus = calculateMatchStatus(
              [player1, player2],
              [opponent1, opponent2],
              game.holeCount || 18,
              team.name,
              opponentTeam.name
            );
          }
        }

        leaderboardData.push({
          id: team.id,
          name: team.name,
          players: [player1, player2],
          thru: holesThru,
          isSolo: false,
          matchStatus,
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

      leaderboardData.sort((a, b) => {
        // Parse match status values - positive for "Up", negative for "Down"
        let aVal = 0;
        let bVal = 0;
        
        if (a.matchStatus.includes("won")) {
          // Extract the number before the dash (e.g., "Team won 4-3" -> 4)
          const match = a.matchStatus.match(/(\d+)-/);
          aVal = match ? parseInt(match[1]) : 0;
        } else if (a.matchStatus.includes("Up")) {
          aVal = parseInt(a.matchStatus);
        } else if (a.matchStatus.includes("Down")) {
          aVal = -parseInt(a.matchStatus);
        } else if (a.matchStatus === "All Square") {
          aVal = 0;
        }
        
        if (b.matchStatus.includes("won")) {
          // Extract the number before the dash (e.g., "Team won 4-3" -> 4)
          const match = b.matchStatus.match(/(\d+)-/);
          bVal = match ? parseInt(match[1]) : 0;
        } else if (b.matchStatus.includes("Up")) {
          bVal = parseInt(b.matchStatus);
        } else if (b.matchStatus.includes("Down")) {
          bVal = -parseInt(b.matchStatus);
        } else if (b.matchStatus === "All Square") {
          bVal = 0;
        }
        
        return bVal - aVal;
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
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
        2v2 Matchplay Leaderboard
      </h1>
      {leaderboard.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-300 text-sm sm:text-base">
          There needs to be 2 teams for the 2v2 matchplay format
        </p>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((team, index) => (
            <div
              key={team.id || index}
              className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Position Number */}
                  <div className="w-8 h-8 bg-green-600 dark:bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  
                  {/* Team Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                      {team.name}
                    </h3>
                    {team.players && team.players.length > 0 && (
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
                              <div className="w-5 h-5 rounded-full bg-gray-400 dark:bg-gray-500 flex items-center justify-center text-xs text-white">
                                {player.displayName?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {player.displayName || 'Unknown'}
                            </span>
                            {idx < team.players.length - 1 && <span className="text-xs text-gray-400">•</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {team.isRoundComplete ? "Completed Match" : `Thru ${team.thru}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <span className="text-green-600 dark:text-green-400 font-bold text-lg sm:text-xl">
                    {team.matchStatus}
                  </span>
                  <button
                    onClick={() => openModal(team)}
                    className="px-3 py-2 text-sm bg-green-600 dark:bg-green-500 text-white rounded-xl flex-1 sm:flex-none whitespace-nowrap"
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
        <Matchplay2v2ScorecardModal game={game} selectedTeam={selectedTeam} onClose={closeModal} />
      )}
    </div>
  );
}



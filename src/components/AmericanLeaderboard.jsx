import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import AmericanScorecardModal from "./AmericanScorecardModal";

export default function AmericanLeaderboard({ game }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!game?.players || game.players.length === 0) return;

      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const gamePlayersMap = {};
      game.players.forEach((p) => (gamePlayersMap[p.userId] = p));

      const soloPlayers = users.filter(
        (u) => !u.teamId && gamePlayersMap[u.id]
      );

      const leaderboardData = soloPlayers.map((player) => {
        const scores = gamePlayersMap[player.id]?.scores ?? [];
        let holesThru = 0;
        let totalStrokes = 0;
        let isRoundComplete = true;
        let totalPoints = 0;

        // Calculate American scoring points for each hole
        for (let i = 0; i < 18; i++) {
          const playerScore = scores[i];
          const playerGross = playerScore?.gross ?? null;
          const playerNet = playerScore?.netScore ?? null;

          if (playerGross !== null && playerGross > 0) {
            holesThru++;
            totalStrokes += playerGross;
          } else {
            isRoundComplete = false;
          }

          // Calculate points if we have a valid net score
          if (playerNet !== null) {
            // Get all players' net scores for this hole
            const allScores = game.players.map((p) => ({
              userId: p.userId,
              net: p.scores[i]?.netScore ?? null,
            })).filter(s => s.net !== null);

            // Only calculate if at least 2 players have scores (for fair comparison)
            if (allScores.length >= 2) {
              const points = calculateAmericanPoints(allScores, player.id);
              totalPoints += points;
            }
          }
        }

        return {
          players: [player],
          displayName: player.displayName ?? "Unknown",
          thru: holesThru,
          totalStrokes,
          isRoundComplete,
          totalPoints,
        };
      });

      // Sort by total points descending
      leaderboardData.sort((a, b) => b.totalPoints - a.totalPoints);

      setLeaderboard(leaderboardData);
    };

    fetchLeaderboard();
  }, [game]);

  const openModal = (player) => {
    setSelectedPlayer(player);
    setModalOpen(true);
  };

  const closeModal = () => {
    setSelectedPlayer(null);
    setModalOpen(false);
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-6">
        American Scoring Leaderboard
      </h1>
      {leaderboard.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-300 text-sm sm:text-base">
          No players found for this game.
        </p>
      ) : (
        <div className="space-y-3">
          {leaderboard.map((playerData, index) => (
            <div
              key={playerData.players[0].id}
              className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl border border-gray-200 dark:border-gray-600"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Position Number */}
                  <div className="w-8 h-8 bg-green-600 dark:bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  
                  {/* Profile Picture */}
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-300 dark:bg-gray-600 flex-shrink-0">
                    {playerData.players[0]?.profilePictureUrl ? (
                      <img 
                        src={playerData.players[0].profilePictureUrl} 
                        alt={playerData.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-300 text-sm font-medium">
                        {playerData.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* Player Info */}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                      {playerData.displayName}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {playerData.isRoundComplete ? 'Total strokes' : 'Current strokes'}: {playerData.totalStrokes}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      {playerData.isRoundComplete ? "Completed Match" : `Thru ${playerData.thru}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <span className="text-green-600 dark:text-green-400 font-bold text-lg sm:text-xl">
                    {playerData.totalPoints} pts
                  </span>
                  <button
                    onClick={() => openModal(playerData)}
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
      {modalOpen && selectedPlayer && (
        <AmericanScorecardModal game={game} selectedPlayer={selectedPlayer} onClose={closeModal} />
      )}
    </div>
  );
}

// Calculate American scoring points for a hole
function calculateAmericanPoints(allScores, currentPlayerId) {
  const numPlayers = allScores.length;
  
  // Sort by net score (lower is better for scoring)
  const sortedScores = [...allScores].sort((a, b) => a.net - b.net);
  
  // Find the current player's index in the sorted array
  const currentPlayerIndex = sortedScores.findIndex(s => s.userId === currentPlayerId);
  
  // Build position groups (handling ties)
  const groups = [];
  for (let i = 0; i < sortedScores.length; i++) {
    if (i === 0 || sortedScores[i].net !== sortedScores[i-1].net) {
      groups.push({ net: sortedScores[i].net, players: [sortedScores[i]] });
    } else {
      groups[groups.length - 1].players.push(sortedScores[i]);
    }
  }
  
  // Find which group the current player is in
  let cumulativeIndex = 0;
  let playerGroupIndex = -1;
  for (let i = 0; i < groups.length; i++) {
    if (currentPlayerIndex < cumulativeIndex + groups[i].players.length) {
      playerGroupIndex = i;
      break;
    }
    cumulativeIndex += groups[i].players.length;
  }
  
  const playerGroup = groups[playerGroupIndex];
  const numTiedAtPosition = playerGroup.players.length;
  const positionRank = cumulativeIndex + 1;
  
  // Calculate points based on number of players and ties
  if (numPlayers === 3) {
    // 6 points total
    if (groups.length === 1) {
      // All tied: 2-2-2
      return 2;
    } else if (groups.length === 2) {
      // Two groups
      if (playerGroupIndex === 0) {
        // In winning group
        return numTiedAtPosition === 1 ? 4 : 3; // 4-1-1 or 3-3
      } else {
        // In losing group
        return numTiedAtPosition === 1 ? 0 : 1; // 0 points or 1 point
      }
    } else {
      // Three groups: 4-2-0
      if (positionRank === 1) return 4;
      else if (positionRank === 2) return 2;
      else return 0;
    }
  } else if (numPlayers === 4) {
    // 8 points total
    if (groups.length === 1) {
      // All tied: 2-2-2-2
      return 2;
    } else if (groups.length === 2) {
      // Two groups (ex: X winners, Y losers)
      if (playerGroupIndex === 0) {
        // In first group
        if (numTiedAtPosition === 1) {
          // Check second group size
          const secondGroup = groups[1];
          if (secondGroup.players.length === 3) return 5; // 5-1-1-1
          else if (secondGroup.players.length === 2) return 4; // 4-2-1-1
          else return 4; // 4-3-1-0
        } else {
          // Tied for first (likely 3-3-1-1)
          return 3;
        }
      } else {
        // In second group
        if (numTiedAtPosition === 1) {
          return 1; // Solo last
        } else {
          return 1; // Tied for last
        }
      }
    } else if (groups.length === 3) {
      // Three groups
      if (positionRank === 1) return 4; // First
      else if (positionRank === 2) {
        // Check if tied for second or solo second
        return numTiedAtPosition === 1 ? 3 : 2; // 3 or 2 points
      } else return 1; // Last group gets 1 point
    } else {
      // Four groups: 4-3-1-0
      if (positionRank === 1) return 4;
      else if (positionRank === 2) return 3;
      else if (positionRank === 3) return 1;
      else return 0;
    }
  }
  
  return 0;
}


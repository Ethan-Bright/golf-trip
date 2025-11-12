import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import AmericanScorecardModal from "./AmericanScorecardModal";

export default function AmericanLeaderboard({ game }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const [numSoloPlayers, setNumSoloPlayers] = useState(0);

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

      // For American scoring, show all players in the game (not just solo players)
      const soloPlayers = users.filter(
        (u) => gamePlayersMap[u.id]
      );

      // Set the number of players for the points format display
      setNumSoloPlayers(soloPlayers.length);

      // Determine which holes to calculate for
      const holeCount = game?.holeCount || 18;
      const nineType = game?.nineType || "front";
      const startIndex = nineType === "back" ? 9 : 0;

      const leaderboardData = soloPlayers.map((player) => {
        const scores = gamePlayersMap[player.id]?.scores ?? [];
        let holesThru = 0;
        let totalStrokes = 0;
        let isRoundComplete = true;
        let totalPoints = 0;

        // Calculate American scoring points for each hole using gross scores
        for (let i = startIndex; i < startIndex + holeCount; i++) {
          const displayIndex = i - startIndex;
          const playerScore = scores[i];
          const playerGross = playerScore?.gross ?? null;

          if (playerGross !== null && playerGross > 0) {
            holesThru++;
            totalStrokes += playerGross;
          } else {
            isRoundComplete = false;
          }

          // Calculate points using gross scores
          if (playerGross !== null && playerGross > 0) {
            // Get all solo players' gross scores for this hole
            const allScores = soloPlayers.map((p) => {
              const pScores = gamePlayersMap[p.id]?.scores ?? [];
              const pScore = pScores[i];
              return {
                userId: p.id,
                gross: pScore?.gross ?? null,
              };
            }).filter(s => s.gross !== null && s.gross > 0);

            // Only calculate if at least 2 players have scores (for fair comparison)
            if (allScores.length >= 2) {
              const points = calculateAmericanPointsGross(allScores, player.id);
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

  // Determine points format
  const pointsFormat = numSoloPlayers === 3 
    ? "6 points per hole (3 players)" 
    : numSoloPlayers === 4 
    ? "20 points per hole (4 players)" 
    : "";

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
        American Scoring Leaderboard
      </h1>
      {pointsFormat && (
        <p className="text-center text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
          {pointsFormat}
        </p>
      )}
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
                  {numSoloPlayers < 3 ? (
                    <span className="text-gray-600 dark:text-gray-400 font-semibold text-sm sm:text-base">
                      {numSoloPlayers === 1 
                        ? "Waiting for 2 more players" 
                        : "Waiting for 1 more player"}
                    </span>
                  ) : (
                    <>
                      <span className="text-green-600 dark:text-green-400 font-bold text-lg sm:text-xl">
                        {playerData.totalPoints} pts
                      </span>
                      <button
                        onClick={() => openModal(playerData)}
                        className="px-3 py-2 text-sm bg-green-600 dark:bg-green-500 text-white rounded-xl flex-1 sm:flex-none whitespace-nowrap"
                      >
                        View Scores
                      </button>
                    </>
                  )}
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

// Calculate American scoring points for a hole using gross scores
function calculateAmericanPointsGross(allScores, currentPlayerId) {
  const numPlayers = allScores.length;
  
  // Sort by gross score (lower is better for scoring)
  const sortedScores = [...allScores].sort((a, b) => a.gross - b.gross);
  
  // Find the current player's index in the sorted array
  const currentPlayerIndex = sortedScores.findIndex(s => s.userId === currentPlayerId);
  
  if (currentPlayerIndex === -1) return 0;
  
  // Build position groups (handling ties)
  const groups = [];
  for (let i = 0; i < sortedScores.length; i++) {
    if (i === 0 || sortedScores[i].gross !== sortedScores[i-1].gross) {
      groups.push({ gross: sortedScores[i].gross, players: [sortedScores[i]] });
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
    // 20 points total (avoid decimals - all scenarios distribute evenly)
    if (groups.length === 1) {
      // All tied: 20/4 = 5 each
      return 5;
    } else if (groups.length === 2) {
      // Two groups (ex: X winners, Y losers)
      if (playerGroupIndex === 0) {
        // In first group
          if (numTiedAtPosition === 1) {
            // Solo first, check second group size
            const secondGroup = groups[1];
            if (secondGroup.players.length === 3) {
              // Solo first (8), 3 tied for last
              // Positions 2-4 normally get 6+4+2=12, split among 3 tied players = 4 each
              // So: 8-4-4-4 = 20 total
              return 8;
            } else if (secondGroup.players.length === 2) {
              // Solo first, 2 tied for positions 3-4
              // Positions 3-4 normally get 4+2=6, split = 3 each
              // So: 8-6-3-3 = 20 total
              return 8;
            } else {
              return 8; // Solo first, solo second, solo third: 8-6-4-2 = 20
            }
        } else if (numTiedAtPosition === 3) {
          // 3-way tie for first: positions 1-3 normally get 8+6+4=18, distribute evenly as 6-6-6, last gets 2
          return 6;
        } else {
          // 2-way tie for first: positions 1-2 normally get 8+6=14, both tied players get 7 each, positions 3-4 get 4-2
          return 7;
        }
      } else {
        // In second group (losing group)
        if (numTiedAtPosition === 1) {
          // Solo last
          const firstGroup = groups[0];
          if (firstGroup.players.length === 3) {
            // 3-way tie for first (all get 6), so last gets 2 (6-6-6-2)
            return 2;
          } else if (firstGroup.players.length === 2) {
            // 2-way tie for first (both get 7 = 14 points), remaining 6 points for positions 3-4
            const secondGroup = groups[1];
            if (secondGroup.players.length === 2) {
              // 2 tied for last, split 6 points: 3-3
              return 3;
            } else {
              // Solo last (position 4), gets 2 (7-7-4-2)
              return 2;
            }
          } else {
            // Solo first (8), so this is position 2 (6)
            return 6;
          }
        } else {
          // Tied for last
            const firstGroup = groups[0];
            if (firstGroup.players.length === 1) {
              // Solo first (8), 3 tied for last
              // Positions 2-4 normally get 6+4+2=12, split among 3 tied players = 4 each
              // So: 8-4-4-4 = 20 total
              return 4;
          } else if (firstGroup.players.length === 2) {
            // 2 tied for first (both get 7 = 14 points), so 2 tied for last split remaining 6 points: 3-3
            return 3;
          } else {
            return 2; // 3 tied for first (all get 6 = 18 points), so 1 last gets 2
          }
        }
      }
    } else if (groups.length === 3) {
      // Three groups
      if (positionRank === 1) return 8; // First: 8 points
      else if (positionRank === 2) {
        // Check if tied for second or solo second
        return numTiedAtPosition === 1 ? 6 : 4; // 6 or 4 points
      } else return 2; // Last group gets 2 points
    } else {
      // Four groups: 8-6-4-2 = 20
      if (positionRank === 1) return 8;
      else if (positionRank === 2) return 6;
      else if (positionRank === 3) return 4;
      else return 2;
    }
  }
  
  return 0;
}


import React, { useEffect, useState, useMemo } from "react";
import { courses } from "../data/courses";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";
import { buildColumnBorderClasses } from "../utils/scorecardUtils";

export default function AmericanScorecardModal({ game, selectedPlayer, onClose }) {
  const [soloPlayers, setSoloPlayers] = useState([]);

  useEffect(() => {
    const fetchSoloPlayers = async () => {
      if (!game?.players || game.players.length === 0) return;

      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const gamePlayersMap = {};
      game.players.forEach((p) => (gamePlayersMap[p.userId] = p));

      // For American scoring, show all players in the game (not just solo players)
      const solo = users.filter(
        (u) => gamePlayersMap[u.id]
      );

      setSoloPlayers(solo);
    };

    fetchSoloPlayers();
  }, [game]);

  if (!game) return null;

  const course = courses.find(c => c.id === game.courseId);
  const players = game.players || [];
  
  // Determine which holes to display
  const holeCount = game.holeCount || 18;
  const nineType = game.nineType || "front";
  const startIndex = nineType === "back" ? 9 : 0;

  if (!players || players.length === 0 || soloPlayers.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto -webkit-overflow-scrolling-touch">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-3xl shadow-2xl border border-blue-500 dark:border-blue-400 max-w-md w-full p-6 overflow-y-auto max-h-[90vh]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            {game.name}
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
            {soloPlayers.length === 0 ? "No solo players found for this game." : "No players found for this game."}
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const gamePlayersMap = {};
  game.players.forEach((p) => (gamePlayersMap[p.userId] = p));

  // Calculate points for each player on each hole using gross scores
  const calculatePointsForPlayerOnHole = (playerId, holeIndex) => {
    const playerScore = gamePlayersMap[playerId]?.scores?.[holeIndex];
    const playerGross = playerScore?.gross ?? null;
    
    if (playerGross === null || playerGross <= 0) return null;
    
    // Get all solo players' gross scores for this hole
    const allScores = soloPlayers.map((p) => {
      const pScores = gamePlayersMap[p.id]?.scores ?? [];
      const pScore = pScores[holeIndex];
      return {
        userId: p.id,
        gross: pScore?.gross ?? null,
      };
    }).filter(s => s.gross !== null && s.gross > 0);
    
    // Only calculate if at least 2 players have scores (for fair comparison)
    if (allScores.length < 2) return null;
    
    return calculateAmericanPointsGross(allScores, playerId);
  };

  // Calculate totals for each player
  const calculatePlayerTotals = (playerId) => {
    let grossTotal = 0;
    let pointsTotal = 0;
    
    for (let i = 0; i < holeCount; i++) {
      const actualIndex = startIndex + i;
      const score = gamePlayersMap[playerId]?.scores?.[actualIndex];
      if (score?.gross !== null && score.gross > 0) {
        grossTotal += score.gross;
      }
      const points = calculatePointsForPlayerOnHole(playerId, actualIndex);
      if (points !== null) {
        pointsTotal += points;
      }
    }
    
    return { grossTotal, pointsTotal };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto -webkit-overflow-scrolling-touch">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-500 dark:border-blue-400 max-w-6xl w-full p-3 sm:p-6 overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white pr-3">
            {game.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl sm:text-3xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="w-full border-collapse text-xs sm:text-sm min-w-[600px]">
            <thead>
              <tr>
                <th
                  className="px-2 py-1 text-left align-bottom border-2 border-solid border-blue-500 dark:border-blue-400 rounded-tl-lg"
                >
                  Hole
                </th>
                {soloPlayers.map((player, idx) => (
                  <th
                    key={player.id}
                    className={`px-2 py-1 text-center font-semibold text-gray-900 dark:text-white ${buildColumnBorderClasses(
                      "border-blue-500 dark:border-blue-400 border-solid",
                      idx,
                      soloPlayers.length,
                      {
                        top: true,
                        bottom: false,
                        roundBottomLeft: false,
                        roundBottomRight: false,
                      }
                    )}`}
                  >
                    {player.displayName || "Unknown"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: holeCount }).map((_, displayIndex) => {
                const holeIndex = startIndex + displayIndex;
                const hole = course?.holes?.[holeIndex];
                const par = hole?.par || "?";

                return (
                  <tr
                    key={displayIndex}
                    className="border-t border-blue-500 dark:border-blue-400"
                  >
                    <td
                      className={`px-2 py-1 font-medium text-gray-900 dark:text-white ${buildColumnBorderClasses(
                        "border-blue-500 dark:border-blue-400 border-solid",
                        0,
                        1,
                        {
                          top: displayIndex === 0,
                          bottom: displayIndex === holeCount - 1,
                          roundBottomLeft: true,
                        }
                      )}`}
                    >
                      <div>
                        <span className="font-bold">{holeIndex + 1}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          Par {par}
                        </span>
                      </div>
                    </td>
                    {soloPlayers.map((player, idx) => {
                      const score = gamePlayersMap[player.id]?.scores?.[holeIndex];
                      const gross = score?.gross ?? null;
                      const points = calculatePointsForPlayerOnHole(player.id, holeIndex);
                      
                      return (
                        <td
                          key={`${player.id}-${displayIndex}`}
                          className={`px-2 py-1 text-center text-gray-900 dark:text-white ${buildColumnBorderClasses(
                            "border-blue-500 dark:border-blue-400 border-solid",
                            idx,
                            soloPlayers.length,
                            {
                              top: displayIndex === 0,
                              bottom: displayIndex === holeCount - 1,
                              roundBottomRight: displayIndex === holeCount - 1 && idx === soloPlayers.length - 1,
                            }
                          )}`}
                        >
                          <div className="space-y-0.5">
                            {gross !== null && gross > 0 ? (
                              <div className="text-sm font-semibold">{gross}</div>
                            ) : (
                              <div className="text-sm text-gray-400 dark:text-gray-500">—</div>
                            )}
                            {points !== null && (
                              <div className="text-[10px] font-bold text-green-600 dark:text-green-400">
                                {points} pts
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-blue-500 dark:border-blue-400 bg-gray-100 dark:bg-gray-800">
                <td
                  className={`px-2 py-3 font-bold text-gray-900 dark:text-white ${buildColumnBorderClasses(
                    "border-blue-500 dark:border-blue-400 border-solid",
                    0,
                    1,
                    {
                      top: false,
                      bottom: true,
                      roundBottomLeft: true,
                    }
                  )}`}
                >
                  Total
                </td>
                {soloPlayers.map((player, idx) => {
                  const totals = calculatePlayerTotals(player.id);
                  return (
                    <td
                      key={`total-${player.id}`}
                      className={`px-2 py-3 text-center font-semibold text-gray-900 dark:text-white ${buildColumnBorderClasses(
                        "border-blue-500 dark:border-blue-400 border-solid",
                        idx,
                        soloPlayers.length,
                        {
                          top: false,
                          bottom: true,
                          roundBottomRight: idx === soloPlayers.length - 1,
                        }
                      )}`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-sm">{totals.grossTotal}</div>
                        <div className="text-xs font-bold text-green-600 dark:text-green-400">
                          {totals.pointsTotal} pts
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 sm:mt-6 flex justify-center px-3 sm:px-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-green-600 dark:bg-green-500 text-white rounded-xl sm:rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
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
              // Solo first, solo second, solo third: 8-6-4-2 = 20
              return 8;
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

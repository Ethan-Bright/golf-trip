import React from "react";
import { courses } from "../data/courses";

export default function AmericanScorecardModal({ game, selectedPlayer, onClose }) {
  if (!game || !selectedPlayer) return null;

  const course = courses.find(c => c.id === game.courseId);
  const players = game.players || [];
  
  // Determine which holes to display
  const holeCount = game.holeCount || 18;
  const nineType = game.nineType || "front";
  const startIndex = nineType === "back" ? 9 : 0;

  if (!players || players.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-600 max-w-md w-full p-6 overflow-y-auto max-h-[90vh]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            {game.name}
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
            No players found for this game.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-2xl text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const player = selectedPlayer.players[0];
  const scores = game.players.find(p => p.userId === player.id)?.scores || [];

  // Calculate points for each hole
  const calculatePointsForHole = (displayIndex) => {
    const actualIndex = startIndex + displayIndex;
    const playerScore = scores[actualIndex];
    const playerNet = playerScore?.netScore ?? null;
    
    if (playerNet === null) return null;
    
    // Get all players' net scores for this hole
    const allScores = game.players.map((p) => ({
      userId: p.userId,
      net: p.scores[actualIndex]?.netScore ?? null,
    })).filter(s => s.net !== null);
    
    if (allScores.length < 2) return null;
    
    return calculateAmericanPoints(allScores, player.id);
  };

  const calculateTotals = () => {
    let grossTotal = 0;
    let netTotal = 0;
    let pointsTotal = 0;
    
    for (let i = 0; i < holeCount; i++) {
      const actualIndex = startIndex + i;
      const score = scores[actualIndex];
      if (score?.gross !== null && score.gross > 0) {
        grossTotal += score.gross;
      }
      if (score?.netScore !== null) {
        netTotal += score.netScore;
      }
      const points = calculatePointsForHole(i);
      if (points !== null) {
        pointsTotal += points;
      }
    }
    
    return { grossTotal, netTotal, pointsTotal };
  };

  const totals = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-600 max-w-2xl w-full p-3 sm:p-6 overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white pr-3">
            {player.displayName}
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
          <table className="w-full border-separate border-spacing-1 text-xs sm:text-sm min-w-[400px]">
            <thead>
              <tr>
                <th className="px-2 py-2 text-center bg-gray-100 dark:bg-gray-800">Hole</th>
                {course && <th className="px-2 py-2 text-center bg-gray-100 dark:bg-gray-800">Par</th>}
                <th className="px-2 py-2 text-center bg-gray-100 dark:bg-gray-800">Gross</th>
                <th className="px-2 py-2 text-center bg-gray-100 dark:bg-gray-800">Net</th>
                <th className="px-2 py-2 text-center font-bold text-green-600 dark:text-green-400 bg-gray-100 dark:bg-gray-800">Points</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: holeCount }).map((_, displayIndex) => {
                const holeIndex = startIndex + displayIndex;
                const actualIndex = startIndex + displayIndex;
                const hole = course?.holes?.[holeIndex];
                const par = hole?.par || "?";
                const score = scores[actualIndex];
                const gross = score?.gross ?? null;
                const net = score?.netScore ?? null;
                const points = calculatePointsForHole(displayIndex);
                
                return (
                  <tr
                    key={displayIndex}
                    className="border-t border-gray-200 dark:border-gray-600"
                  >
                    <td className="px-2 py-2 text-center font-medium text-gray-900 dark:text-white">
                      {holeIndex + 1}
                    </td>
                    {course && (
                      <td className="px-2 py-2 text-center text-gray-600 dark:text-gray-300">
                        {par}
                      </td>
                    )}
                    <td className="px-2 py-2 text-center text-gray-900 dark:text-white">
                      {gross !== null && gross > 0 ? gross : "-"}
                    </td>
                    <td className="px-2 py-2 text-center text-gray-900 dark:text-white">
                      {net !== null ? net : "-"}
                    </td>
                    <td className={`px-2 py-2 text-center font-bold ${
                      points !== null && points > 0 
                        ? "text-green-600 dark:text-green-400" 
                        : "text-gray-600 dark:text-gray-400"
                    }`}>
                      {points !== null ? points : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-gray-700">
                <td className="px-2 py-3 font-bold text-gray-900 dark:text-white text-center" colSpan={course ? "2" : "1"}>
                  Total
                </td>
                <td className="px-2 py-3 text-center font-semibold text-gray-900 dark:text-white">
                  {totals.grossTotal}
                </td>
                <td className="px-2 py-3 text-center font-semibold text-gray-900 dark:text-white">
                  {totals.netTotal}
                </td>
                <td className="px-2 py-3 text-center font-bold text-green-600 dark:text-green-400">
                  {totals.pointsTotal} pts
                </td>
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

// Calculate American scoring points for a hole
function calculateAmericanPoints(allScores, currentPlayerId) {
  const numPlayers = allScores.length;
  
  // Sort by net score (lower is better for scoring)
  const sortedScores = [...allScores].sort((a, b) => a.net - b.net);
  
  // Find the current player's index in the sorted array
  const currentPlayerIndex = sortedScores.findIndex(s => s.userId === currentPlayerId);
  
  if (currentPlayerIndex === -1) return 0;
  
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


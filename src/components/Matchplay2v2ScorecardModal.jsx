import React from "react";
import { courses } from "../data/courses";

export default function Matchplay2v2ScorecardModal({ game, selectedTeam, onClose }) {
  if (!game || !selectedTeam) return null;

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

  // Get team player IDs
  const teamPlayerIds = selectedTeam.players.map(p => p.id || p.uid);
  const teamPlayers = players.filter(p => teamPlayerIds.includes(p.userId));

  // Calculate running totals (using gross scores for matchplay)
  const calculateTotals = () => {
    const totals = teamPlayers.map(() => ({ grossScore: 0, points: 0 }));
    
    for (let displayIndex = 0; displayIndex < holeCount; displayIndex++) {
      const actualIndex = startIndex + displayIndex;
      teamPlayers.forEach((p, playerIndex) => {
        const playerGrossScore = p.scores[actualIndex]?.gross ?? null;
        const playerPoints = p.scores[actualIndex]?.net ?? null;
        if (playerGrossScore !== null) totals[playerIndex].grossScore += playerGrossScore;
        if (playerPoints !== null) totals[playerIndex].points += playerPoints;
      });
    }
    
    return totals;
  };

  const totals = calculateTotals();

  // Get best ball for each hole (highest net score/stableford points)
  const getBestBallForHole = (displayIndex) => {
    const actualIndex = startIndex + displayIndex;
    const scores = teamPlayers.map(p => ({
      playerId: p.userId,
      net: p.scores[actualIndex]?.net ?? null,
      netScore: p.scores[actualIndex]?.netScore ?? null
    })).filter(s => s.net !== null);
    
    if (scores.length === 0) return null;
    
    // Best ball is the highest net (which contains stableford points)
    return scores.reduce((best, current) => 
      current.net > best.net ? current : best
    );
  };

  // Calculate running total for Best Ball column
  const calculateBestBallRunningTotal = () => {
    let runningTotal = 0;
    const runningTotals = [];
    
    for (let displayIndex = 0; displayIndex < holeCount; displayIndex++) {
      const bestBall = getBestBallForHole(displayIndex);
      if (bestBall) {
        runningTotal += bestBall.net;
      }
      runningTotals.push(runningTotal);
    }
    
    return runningTotals;
  };

  const bestBallRunningTotals = calculateBestBallRunningTotal();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-600 max-w-4xl w-full p-3 sm:p-6 overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white pr-3">
            {selectedTeam.name || selectedTeam.displayName}
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
          <table className="w-full border-separate border-spacing-1 text-xs sm:text-sm min-w-[600px]">
            <thead>
              <tr>
                <th className="px-1 py-2 text-center bg-gray-100 dark:bg-gray-800 w-12">Hole</th>
                {course && <th className="px-2 py-2 text-center bg-gray-100 dark:bg-gray-800">Par</th>}
                {course && <th className="px-2 py-2 text-center bg-gray-100 dark:bg-gray-800">S.I.</th>}
                {teamPlayers.map((p) => (
                  <th
                    key={p.userId}
                    className="px-2 py-2 text-center font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800"
                  >
                    {p.name}
                  </th>
                ))}
                <th className="px-2 py-2 text-center font-bold text-green-600 dark:text-green-400 bg-gray-100 dark:bg-gray-800">
                  Best Ball
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: holeCount }).map((_, displayIndex) => {
                const holeIndex = startIndex + displayIndex;
                const hole = course?.holes?.[holeIndex];
                const par = hole?.par || "?";
                const bestBall = getBestBallForHole(displayIndex);
                
                return (
                  <tr
                    key={displayIndex}
                    className="border-t border-gray-200 dark:border-gray-600"
                  >
                    <td className="px-1 py-2 text-center font-medium text-gray-900 dark:text-white">
                      {holeIndex + 1}
                    </td>
                    {course && (
                      <>
                        <td className="px-2 py-2 text-center text-gray-600 dark:text-gray-300">
                          {par}
                        </td>
                        <td className="px-2 py-2 text-center text-gray-600 dark:text-gray-300">
                          {hole?.strokeIndex ?? "?"}
                        </td>
                      </>
                    )}
                    {teamPlayers.map((p) => {
                      const actualIndex = startIndex + displayIndex;
                      const points = p.scores[actualIndex]?.net ?? null;
                      const actualGrossScore = p.scores[actualIndex]?.gross ?? null;
                      const isBestBall = bestBall && p.userId === bestBall.playerId;
                      
                      return (
                        <td
                          key={p.userId + holeIndex}
                          className={`px-2 py-2 text-center ${
                            isBestBall
                              ? "bg-green-300 dark:bg-green-800/70 font-bold rounded-lg border-2 border-green-600 dark:border-green-400 shadow-md"
                              : ""
                          }`}
                        >
                          {points !== null ? (
                            <div className={isBestBall ? "text-green-900 dark:text-green-100" : ""}>
                              <div className="font-bold">{points} pts</div>
                              {actualGrossScore !== null && (
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  Gross: {actualGrossScore}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30">
                      {bestBall ? `${bestBall.net} pts` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-gray-700">
                <td className="px-2 py-3 font-bold text-gray-900 dark:text-white" colSpan={course ? "3" : "1"}>
                  Total
                </td>
                {teamPlayers.map((p, idx) => (
                  <td key={p.userId + "total"} className="px-2 py-3 text-center">
                    <div className="text-gray-900 dark:text-white font-semibold">
                      {totals[idx].points} pts
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Gross: {totals[idx].grossScore}
                    </div>
                  </td>
                ))}
                    <td className="px-2 py-3 text-center font-bold text-green-600 dark:text-green-400">
                      {bestBallRunningTotals[holeCount - 1] || 0}
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


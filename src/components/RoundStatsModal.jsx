import React from "react";

export default function RoundStatsModal({ game, onClose }) {
  if (!game || !game.trackStats) {
    return null;
  }

  const course = game.course;
  const startIndex = game.nineType === "back" ? 9 : 0;
  const endIndex =
    game.holeCount === 9
      ? startIndex + 9
      : course?.holes?.length || 18;
  const displayedHoles = course?.holes?.slice(startIndex, endIndex) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Round Stats - {game.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-3xl leading-none focus:outline-none focus:ring-2 focus:ring-green-500 rounded-lg p-1"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {game.players && game.players.length > 0 ? (
            <div className="space-y-6">
              {game.players.map((player) => {
                const playerScores = (player.scores || []).slice(startIndex, endIndex);
                
                // Calculate totals
                const totalPutts = playerScores.reduce(
                  (sum, score) => sum + (score.putts || 0),
                  0
                );
                const firCount = playerScores.filter(
                  (score) => score.fir === true
                ).length;
                const girCount = playerScores.filter(
                  (score) => score.gir === true
                ).length;
                const holesPlayed = playerScores.filter(
                  (score) => score.gross !== null && score.gross !== undefined
                ).length;
                const firPercentage =
                  holesPlayed > 0 ? ((firCount / holesPlayed) * 100).toFixed(1) : 0;
                const girPercentage =
                  holesPlayed > 0 ? ((girCount / holesPlayed) * 100).toFixed(1) : 0;
                const avgPutts =
                  holesPlayed > 0
                    ? (totalPutts / holesPlayed).toFixed(2)
                    : 0;

                return (
                  <div
                    key={player.userId}
                    className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {player.name}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Total Putts</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {totalPutts}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Avg Putts/Hole</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {avgPutts}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">FIR%</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {firPercentage}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ({firCount}/{holesPlayed})
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">GIR%</div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            {girPercentage}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ({girCount}/{holesPlayed})
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-300 dark:border-gray-600">
                            <th className="text-left py-2 px-2 text-gray-700 dark:text-gray-300 font-semibold">
                              Hole
                            </th>
                            <th className="text-center py-2 px-2 text-gray-700 dark:text-gray-300 font-semibold">
                              Par
                            </th>
                            <th className="text-center py-2 px-2 text-gray-700 dark:text-gray-300 font-semibold">
                              FIR
                            </th>
                            <th className="text-center py-2 px-2 text-gray-700 dark:text-gray-300 font-semibold">
                              GIR
                            </th>
                            <th className="text-center py-2 px-2 text-gray-700 dark:text-gray-300 font-semibold">
                              Putts
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedHoles.map((hole, idx) => {
                            const score = playerScores[idx];
                            return (
                              <tr
                                key={idx}
                                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                              >
                                <td className="py-2 px-2 text-gray-900 dark:text-white font-medium">
                                  {startIndex + idx + 1}
                                </td>
                                <td className="py-2 px-2 text-center text-gray-700 dark:text-gray-300">
                                  {hole.par}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  {score?.fir === true ? (
                                    <span className="text-green-600 dark:text-green-400 font-semibold">
                                      ✓
                                    </span>
                                  ) : score?.fir === false ? (
                                    <span className="text-red-600 dark:text-red-400">✗</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  {score?.gir === true ? (
                                    <span className="text-green-600 dark:text-green-400 font-semibold">
                                      ✓
                                    </span>
                                  ) : score?.gir === false ? (
                                    <span className="text-red-600 dark:text-red-400">✗</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-center text-gray-900 dark:text-white">
                                  {score?.putts ?? "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              No players found
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-2xl font-semibold hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


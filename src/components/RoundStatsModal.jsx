import React from "react";

export default function RoundStatsModal({ game, onClose }) {
  if (!game || game.isFunGame) {
    return null;
  }

  const trackedPlayers = (game.players || []).filter(
    (player) => player.trackStats ?? game.trackStats ?? false
  );

  if (trackedPlayers.length === 0) {
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card card-elevated max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[var(--surface-card)] backdrop-blur border-b border-[var(--surface-card-border)] p-6 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-[var(--text-strong)]">
            Round Stats - {game.name}
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-strong)] text-3xl leading-none focus:outline-none rounded-lg p-1"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {trackedPlayers.length > 0 ? (
            <div className="space-y-6">
              {trackedPlayers.map((player) => {
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
                    className="rounded-2xl border border-[var(--surface-card-border)] bg-[var(--surface-muted)] p-4"
                  >
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-[var(--text-strong)] mb-2">
                        {player.name}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Total Putts</div>
                          <div className="text-lg font-black text-brand-600 dark:text-brand-300">
                            {totalPutts}
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)] text-xs uppercase tracking-wide">Avg Putts/Hole</div>
                          <div className="text-lg font-black text-brand-600 dark:text-brand-300">
                            {avgPutts}
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)] text-xs uppercase tracking-wide">FIR%</div>
                          <div className="text-lg font-black text-brand-600 dark:text-brand-300">
                            {firPercentage}%
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            ({firCount}/{holesPlayed})
                          </div>
                        </div>
                        <div>
                          <div className="text-[var(--text-muted)] text-xs uppercase tracking-wide">GIR%</div>
                          <div className="text-lg font-black text-brand-600 dark:text-brand-300">
                            {girPercentage}%
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            ({girCount}/{holesPlayed})
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm tabular-nums">
                        <thead>
                          <tr className="border-b border-[var(--surface-card-border)]">
                            <th className="text-left py-2 px-2 text-[var(--text-muted)] font-semibold">
                              Hole
                            </th>
                            <th className="text-center py-2 px-2 text-[var(--text-muted)] font-semibold">
                              Par
                            </th>
                            <th className="text-center py-2 px-2 text-[var(--text-muted)] font-semibold">
                              FIR
                            </th>
                            <th className="text-center py-2 px-2 text-[var(--text-muted)] font-semibold">
                              GIR
                            </th>
                            <th className="text-center py-2 px-2 text-[var(--text-muted)] font-semibold">
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
                                className="border-b border-[var(--surface-card-border)] hover:bg-[var(--surface-muted)]"
                              >
                                <td className="py-2 px-2 text-[var(--text-strong)] font-medium">
                                  {startIndex + idx + 1}
                                </td>
                                <td className="py-2 px-2 text-center text-[var(--text-muted)]">
                                  {hole.par}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  {score?.fir === true ? (
                                    <span className="text-brand-600 dark:text-brand-300 font-semibold">
                                      ✓
                                    </span>
                                  ) : score?.fir === false ? (
                                    <span className="text-red-600 dark:text-red-400">✗</span>
                                  ) : (
                                    <span className="text-[var(--text-muted)]">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  {score?.gir === true ? (
                                    <span className="text-brand-600 dark:text-brand-300 font-semibold">
                                      ✓
                                    </span>
                                  ) : score?.gir === false ? (
                                    <span className="text-red-600 dark:text-red-400">✗</span>
                                  ) : (
                                    <span className="text-[var(--text-muted)]">-</span>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-center text-[var(--text-strong)]">
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
            <div className="text-center py-8 text-[var(--text-muted)]">
              No players found
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-[var(--surface-card)] backdrop-blur border-t border-[var(--surface-card-border)] p-6 flex justify-center">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


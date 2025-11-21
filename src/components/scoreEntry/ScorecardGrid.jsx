import React from "react";
import WolfDecisionControls from "./WolfDecisionControls";

export default function ScorecardGrid({
  holes,
  scores,
  startIndex,
  trackStats,
  userId,
  isWolfFormat,
  wolfOrder,
  gamePlayers,
  wolfHoles,
  wolfDecisions,
  getWolfForHole,
  getPlayerById,
  getNonWolfPlayers,
  getGrossFor,
  onScoreChange,
  onStatsChange,
  onWolfDecisionChange,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {holes.map((hole, idx) => {
        const absIndex = startIndex + idx;
        const holeScores = scores[idx] || {};

        return (
          <div
            key={hole.holeNumber ?? absIndex}
            className={`flex flex-col items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-600 p-3 sm:p-4 w-full ${
              trackStats ? "min-h-[280px]" : "min-h-[160px]"
            }`}
          >
            <div className="text-center mb-2 sm:mb-3">
              <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                Hole {absIndex + 1}
              </div>

              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Par {hole.par} • S.I. {hole.strokeIndex}
              </div>

              {isWolfFormat && wolfOrder && wolfOrder.length === 3 && (
                <div className="mt-1 text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-medium">
                  Wolf: {getPlayerById(getWolfForHole(absIndex))?.name || "-"}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-2 sm:mb-3">
              <button
                type="button"
                onClick={() => {
                  const currentValue = parseInt(holeScores.gross ?? "", 10) || 0;
                  if (currentValue > 1) {
                    onScoreChange(absIndex, (currentValue - 1).toString());
                  }
                }}
                className="w-10 h-10 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg flex items-center justify-center font-bold text-xl sm:text-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                −
              </button>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={holeScores.gross ?? ""}
                onChange={(event) => onScoreChange(absIndex, event.target.value)}
                className="w-20 h-10 sm:w-16 sm:h-8 text-center border-2 border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 font-bold text-lg sm:text-base rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="-"
              />

              <button
                type="button"
                onClick={() => {
                  const currentValue = parseInt(holeScores.gross ?? "", 10) || 0;
                  if (currentValue < 15) {
                    onScoreChange(absIndex, (currentValue + 1).toString());
                  }
                }}
                className="w-10 h-10 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg flex items-center justify-center font-bold text-xl sm:text-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                +
              </button>
            </div>

            {!isWolfFormat && (
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 text-center leading-tight">
                <div>With Handicap: {holeScores.netScore ?? "-"}</div>
                <div>Points: {holeScores.net ?? "-"}</div>
              </div>
            )}

            {isWolfFormat && (
              <WolfDecisionControls
                absIndex={absIndex}
                userId={userId}
                gamePlayers={gamePlayers}
                getWolfForHole={getWolfForHole}
                getPlayerById={getPlayerById}
                getNonWolfPlayers={getNonWolfPlayers}
                getGrossFor={getGrossFor}
                wolfOrder={wolfOrder}
                wolfHoles={wolfHoles}
                wolfDecisions={wolfDecisions}
                onChange={onWolfDecisionChange}
              />
            )}

            {trackStats && (
              <div className="mt-3 space-y-3 w-full">
                {hole.par !== 3 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      FIR:
                    </span>
                    <input
                      type="checkbox"
                      checked={holeScores.fir === true}
                      onChange={(event) =>
                        onStatsChange(absIndex, "fir", event.target.checked)
                      }
                      className="w-7 h-7 text-green-600 dark:text-green-500 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    GIR:
                  </span>
                  <input
                    type="checkbox"
                    checked={holeScores.gir === true}
                    onChange={(event) =>
                      onStatsChange(absIndex, "gir", event.target.checked)
                    }
                    className="w-7 h-7 text-green-600 dark:text-green-500 bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">
                    Putts:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const currentPutts = holeScores.putts || 0;
                        if (currentPutts > 0) {
                          onStatsChange(absIndex, "putts", currentPutts - 1);
                        }
                      }}
                      className="w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-base font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                    >
                      −
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={holeScores.putts ?? ""}
                      onChange={(event) =>
                        onStatsChange(absIndex, "putts", event.target.value)
                      }
                      className="w-16 h-10 text-center border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-base font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const currentPutts = holeScores.putts || 0;
                        if (currentPutts < 10) {
                          onStatsChange(absIndex, "putts", currentPutts + 1);
                        }
                      }}
                      className="w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-base font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


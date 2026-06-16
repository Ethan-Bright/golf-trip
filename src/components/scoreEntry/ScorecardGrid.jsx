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
  getHoleLockState,
  firstUnenteredHoleIndex,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {holes.map((hole, idx) => {
        const absIndex = startIndex + idx;
        const holeScores = scores[idx] || {};
        const lockState = getHoleLockState
          ? getHoleLockState(absIndex)
          : { locked: false };
        const locked = Boolean(lockState?.locked);
        const lockReason = lockState?.reason;
        const isCurrent = firstUnenteredHoleIndex === absIndex;

        return (
          <div
            key={hole.holeNumber ?? absIndex}
            id={`hole-card-${absIndex}`}
            className={`card flex flex-col items-center p-3 sm:p-4 w-full ${
              trackStats ? "min-h-[280px]" : "min-h-[160px]"
            } ${isCurrent ? "ring-2 ring-brand-500 border-brand-500/50" : ""}`}
          >
            <div className="text-center mb-2 sm:mb-3">
              <div className="text-sm sm:text-base font-bold text-[var(--text-strong)]">
                Hole {absIndex + 1}
              </div>

              <div className="text-xs sm:text-sm text-[var(--text-muted)]">
                Par {hole.par} • S.I. {hole.strokeIndex}
              </div>

              {isWolfFormat && wolfOrder && wolfOrder.length === 3 && (
                <div className="mt-1 text-xs sm:text-sm text-brand-600 dark:text-brand-300 font-medium">
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
                disabled={locked}
                className={`w-11 h-11 sm:w-10 sm:h-10 bg-[var(--surface-muted)] text-[var(--text-strong)] border border-[var(--surface-card-border)] rounded-lg flex items-center justify-center font-bold text-xl hover:bg-brand-500/10 transition-colors ${
                  locked ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                −
              </button>

              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={holeScores.gross ?? ""}
                onChange={(event) => onScoreChange(absIndex, event.target.value)}
                disabled={locked}
                id={`hole-input-${absIndex}`}
                className={`input min-h-0 h-11 w-16 text-center text-lg font-bold bg-brand-500/15 border-brand-500/40 text-brand-600 dark:text-brand-300 focus:ring-2 focus:ring-brand-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  locked ? "opacity-60 cursor-not-allowed" : ""
                }`}
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
                disabled={locked}
                className={`w-11 h-11 sm:w-10 sm:h-10 bg-[var(--surface-muted)] text-[var(--text-strong)] border border-[var(--surface-card-border)] rounded-lg flex items-center justify-center font-bold text-xl hover:bg-brand-500/10 transition-colors ${
                  locked ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                +
              </button>
            </div>

            {locked && (
              <div className="text-[11px] sm:text-xs text-red-600 dark:text-red-400 text-center mb-2 leading-tight">
                {lockReason || "Locked until previous holes are entered."}
              </div>
            )}

            {!isWolfFormat && (
              <div className="text-xs sm:text-sm text-[var(--text-muted)] text-center leading-tight">
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
                    <span className="text-[var(--text-muted)] font-medium">
                      FIR:
                    </span>
                    <input
                      type="checkbox"
                      checked={holeScores.fir === true}
                      onChange={(event) =>
                        onStatsChange(absIndex, "fir", event.target.checked)
                      }
                    disabled={locked}
                    className={`w-7 h-7 text-brand-600 dark:text-brand-500 bg-[var(--surface-muted)] border-[var(--surface-card-border)] rounded focus:ring-2 focus:ring-brand-500 cursor-pointer ${
                      locked ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)] font-medium">
                    GIR:
                  </span>
                  <input
                    type="checkbox"
                    checked={holeScores.gir === true}
                    onChange={(event) =>
                      onStatsChange(absIndex, "gir", event.target.checked)
                    }
                    disabled={locked}
                    className={`w-7 h-7 text-brand-600 dark:text-brand-500 bg-[var(--surface-muted)] border-[var(--surface-card-border)] rounded focus:ring-2 focus:ring-brand-500 cursor-pointer ${
                      locked ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--text-muted)] font-medium">
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
                      disabled={locked}
                      className={`w-11 h-11 bg-[var(--surface-muted)] text-[var(--text-strong)] border border-[var(--surface-card-border)] rounded-lg text-base font-bold hover:bg-brand-500/10 transition-colors flex items-center justify-center ${
                        locked ? "opacity-50 cursor-not-allowed" : ""
                      }`}
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
                      disabled={locked}
                      className={`input min-h-0 w-16 h-11 text-center text-base font-semibold focus:ring-2 focus:ring-brand-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        locked ? "opacity-60 cursor-not-allowed" : ""
                      }`}
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
                      disabled={locked}
                      className={`w-11 h-11 bg-[var(--surface-muted)] text-[var(--text-strong)] border border-[var(--surface-card-border)] rounded-lg text-base font-bold hover:bg-brand-500/10 transition-colors flex items-center justify-center ${
                        locked ? "opacity-50 cursor-not-allowed" : ""
                      }`}
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


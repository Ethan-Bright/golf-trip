import React, { useMemo, useRef, useState } from "react";
import {
  TEAM_BORDER_COLOR,
  OPPONENT_BORDER_COLOR,
  buildColumnBorderClasses,
  buildScorecardGroups,
  buildGroupHighlightInfo,
} from "../utils/scorecardUtils";
import { shareScorecardAsImage } from "../utils/shareScorecard";

const getScoreMetric = (score) => {
  if (typeof score?.gross === "number") return score.gross;
  return null;
};

const getScoreDisplay = (score) => {
  if (typeof score?.gross === "number") return score.gross;
  return "-";
};

export default function MatchplayGrossScorecardModal({
  game,
  selectedTeam,
  onClose,
}) {
  if (!game || !selectedTeam) return null;

  const [isSharing, setIsSharing] = useState(false);
  const scorecardRef = useRef(null);

  const {
    leftGroup,
    rightGroup,
    allDisplayPlayers,
    teamDisplayName,
    opponentDisplayName,
    leftName,
    rightName,
    hasTeamGrouping,
  } = buildScorecardGroups(game, selectedTeam);

  if (
    !Array.isArray(game.players) ||
    game.players.length === 0 ||
    !allDisplayPlayers ||
    allDisplayPlayers.length === 0
  ) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto -webkit-overflow-scrolling-touch">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-3xl shadow-2xl border border-blue-500 dark:border-blue-400 max-w-md w-full p-6 overflow-y-auto max-h-[90vh]">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">
            {game.name}
          </h2>
          <p className="text-center text-gray-600 dark:text-gray-300 mb-4">
            No players found for this game.
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

  const holeCount = game.holeCount || 18;
  const nineType = game.nineType || "front";
  const startIndex = nineType === "back" ? 9 : 0;

  const holeSummaries = useMemo(() => {
    const summaries = [];
    let matchDiff = 0;
    let lastLabel = "—";
    let lockedWinStatus = null; // Track if match was won at any point

    for (let displayIndex = 0; displayIndex < holeCount; displayIndex++) {
      const actualHoleIndex = startIndex + displayIndex;

      const leftHighlight = buildGroupHighlightInfo(leftGroup, actualHoleIndex, {
        valueSelector: (player, index) =>
          getScoreMetric(player?.scores?.[index]),
      });
      const rightHighlight = buildGroupHighlightInfo(
        rightGroup,
        actualHoleIndex,
        {
          valueSelector: (player, index) =>
            getScoreMetric(player?.scores?.[index]),
        }
      );

      const leftBest = leftHighlight.best;
      const rightBest = rightHighlight.best;

      let winner = "none";

      if (leftBest != null && rightBest != null) {
        if (leftBest < rightBest) {
          matchDiff += 1;
          winner = "left";
        } else if (rightBest < leftBest) {
          matchDiff -= 1;
          winner = "right";
        } else {
          winner = "tie";
        }

        const holesRemaining = holeCount - (displayIndex + 1);
        const absMatchDiff = Math.abs(matchDiff);
        
        // Check if match is won (up by more than holes remaining) and not already locked
        if (absMatchDiff > holesRemaining && !lockedWinStatus) {
          // Match is won - lock this status
          if (matchDiff > 0) {
            lockedWinStatus = `${leftName} won ${absMatchDiff}-${holesRemaining}`;
            lastLabel = lockedWinStatus;
          } else {
            lockedWinStatus = `${rightName} won ${absMatchDiff}-${holesRemaining}`;
            lastLabel = lockedWinStatus;
          }
        } else if (lockedWinStatus) {
          // Match was already won - keep showing the locked status
          lastLabel = lockedWinStatus;
        } else if (matchDiff === 0) {
          lastLabel = "All Square";
        } else if (matchDiff > 0) {
          lastLabel = `${leftName} ${matchDiff} Up`;
        } else {
          lastLabel = `${rightName} ${absMatchDiff} Up`;
        }
      }

      const variant =
        leftBest == null || rightBest == null
          ? displayIndex === 0
            ? "waiting"
            : matchDiff === 0
            ? "even"
            : "leader"
          : matchDiff === 0
          ? "even"
          : "leader";

      summaries.push({
        displayIndex,
        actualHoleIndex,
        leftHighlight,
        rightHighlight,
        winner,
        status: {
          label:
            leftBest == null || rightBest == null
              ? displayIndex === 0
                ? "—"
                : lockedWinStatus || lastLabel
              : lockedWinStatus || lastLabel,
          variant,
          diff: matchDiff,
        },
      });
    }

    return summaries;
  }, [holeCount, startIndex, leftGroup, rightGroup, leftName, rightName]);

  const getMatchStatus = (displayIndex) =>
    holeSummaries[displayIndex]?.status ?? {
      label: "—",
      variant: "waiting",
      diff: 0,
    };

  const finalMatchStatus =
    holeSummaries[holeSummaries.length - 1]?.status ?? { label: "" };

  const totalSummary = useMemo(() => {
    const leftWins = holeSummaries.filter((h) => h.winner === "left").length;
    const rightWins = holeSummaries.filter((h) => h.winner === "right").length;
    const halves = holeSummaries.filter((h) => h.winner === "tie").length;

    return [
      { label: `${leftName} Holes Won`, value: leftWins },
      { label: `${rightName} Holes Won`, value: rightWins },
      { label: "Halved Holes", value: halves },
    ];
  }, [holeSummaries, leftName, rightName]);

  const playerTotals = useMemo(() => {
    return allDisplayPlayers.map((player) => {
      let grossTotal = 0;
      let hasGross = false;

      for (let i = startIndex; i < startIndex + holeCount; i++) {
        const score = player?.scores?.[i];
        if (typeof score?.gross === "number") {
          grossTotal += score.gross;
          hasGross = true;
        }
      }

      return hasGross ? grossTotal : null;
    });
  }, [allDisplayPlayers, holeCount, startIndex]);

  const handleShare = async () => {
    if (!scorecardRef.current) return;
    setIsSharing(true);
    try {
      const filename = `${game.name} - Match Play Gross Scorecard`;
      await shareScorecardAsImage(scorecardRef.current, filename);
    } catch (error) {
      console.error("Error sharing scorecard:", error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto -webkit-overflow-scrolling-touch">
      <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl sm:rounded-3xl shadow-2xl border border-blue-500 dark:border-blue-400 max-w-4xl w-full p-3 sm:p-6 overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white pr-3">
            {game.name}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="px-3 py-1.5 bg-green-600 dark:bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-green-400 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="Share scorecard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              {isSharing ? "Sharing..." : "Share"}
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl sm:text-3xl leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto -mx-3 sm:mx-0" ref={scorecardRef}>
          <table className="w-full border-collapse text-xs sm:text-sm min-w-[500px]">
            <thead>
              <tr>
                <th
                  className="px-2 py-1 text-left align-bottom border-2 border-solid border-blue-500 dark:border-blue-400 rounded-tl-lg"
                  rowSpan={hasTeamGrouping ? 2 : 1}
                >
                  Hole
                </th>
                {hasTeamGrouping ? (
                  <>
                    <th
                      colSpan={leftGroup.length}
                      className={`px-2 py-1 text-center font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-tl-lg border-2 border-b-0 ${TEAM_BORDER_COLOR}`}
                    >
                      {teamDisplayName}
                    </th>
                    <th
                      colSpan={rightGroup.length}
                      className={`px-2 py-1 text-center font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-tr-lg border-2 border-b-0 ${OPPONENT_BORDER_COLOR}`}
                    >
                      {opponentDisplayName}
                    </th>
                    <th
                      className="px-2 py-1 text-center font-semibold text-gray-900 dark:text-white align-bottom border-2 border-solid border-blue-500 dark:border-blue-400 rounded-tr-lg"
                      rowSpan={2}
                    >
                      Match Status
                    </th>
                  </>
                ) : (
                  <>
                    {allDisplayPlayers.map((p, idx) => (
                      <th
                        key={p.userId}
                        className={`px-2 py-1 text-center font-semibold text-gray-900 dark:text-white ${buildColumnBorderClasses(
                          "border-blue-500 dark:border-blue-400 border-solid",
                          idx,
                          allDisplayPlayers.length,
                          {
                            top: true,
                            bottom: false,
                            roundBottomLeft: false,
                            roundBottomRight: false,
                          }
                        )} ${idx === 0 && allDisplayPlayers.length === 2 ? "border-r-2" : ""}`}
                      >
                        {p.displayLabel || p.name}
                  </th>
                ))}
                    <th className="px-2 py-1 text-center font-semibold text-gray-900 dark:text-white border-2 border-solid border-blue-500 dark:border-blue-400 rounded-tr-lg">
                    Match Status
                  </th>
                  </>
                )}
              </tr>
              {hasTeamGrouping && (
                <tr>
                  {leftGroup.map((p, idx) => (
                    <th
                      key={`team-${p.userId}`}
                      className={`px-2 py-1 text-center font-semibold text-gray-900 dark:text-white ${buildColumnBorderClasses(
                        TEAM_BORDER_COLOR,
                        idx,
                        leftGroup.length,
                        { top: false, bottom: false }
                      )}`}
                    >
                      {p.displayLabel || p.name}
                    </th>
                  ))}
                  {rightGroup.map((p, idx) => (
                    <th
                      key={`opponent-${p.userId}`}
                      className={`px-2 py-1 text-center font-semibold text-gray-900 dark:text-white ${buildColumnBorderClasses(
                        OPPONENT_BORDER_COLOR,
                        idx,
                        rightGroup.length,
                        { top: false, bottom: false }
                      )}`}
                    >
                      {p.displayLabel || p.name}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {Array.from({ length: holeCount }).map((_, displayIndex) => {
                const summary = holeSummaries[displayIndex];
                const holeIndex = summary?.actualHoleIndex ?? startIndex + displayIndex;
                const hole = game.course?.holes?.[holeIndex];
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
                    {allDisplayPlayers.map((p, idx) => {
                      const score = p.scores?.[holeIndex];
                      const displayScore = getScoreDisplay(score);
                      const inLeftGroup = idx < leftGroup.length;
                      const groupIndex = inLeftGroup ? idx : idx - leftGroup.length;
                      const groupLength = inLeftGroup
                        ? leftGroup.length
                        : rightGroup.length;
                      const highlightInfo = inLeftGroup
                        ? summary?.leftHighlight
                        : summary?.rightHighlight;
                      const winnerSide = summary?.winner;
                      const isWinner =
                        winnerSide === (inLeftGroup ? "left" : "right") &&
                        highlightInfo?.tiedIds?.has(p.userId);
                      const isTie =
                        winnerSide === "tie" &&
                        highlightInfo?.tiedIds?.has(p.userId);

                      const highlightClass = isWinner
                        ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 font-bold rounded-lg"
                        : isTie
                        ? "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold rounded-lg"
                        : "text-gray-900 dark:text-white";

                      const borderClasses =
                        hasTeamGrouping && groupLength > 0
                          ? buildColumnBorderClasses(
                              inLeftGroup ? TEAM_BORDER_COLOR : OPPONENT_BORDER_COLOR,
                              groupIndex,
                              groupLength,
                              {
                                top: displayIndex === 0,
                                bottom: displayIndex === holeCount - 1,
                                roundBottomLeft:
                                  inLeftGroup &&
                                  displayIndex === holeCount - 1 &&
                                  groupIndex === 0,
                                roundBottomRight:
                                  !inLeftGroup &&
                                  displayIndex === holeCount - 1 &&
                                  groupIndex === groupLength - 1,
                              }
                            )
                          : buildColumnBorderClasses(
                              "border-blue-500 dark:border-blue-400 border-solid",
                              idx,
                              allDisplayPlayers.length,
                              {
                                top: displayIndex === 0,
                                bottom: displayIndex === holeCount - 1,
                                roundBottomLeft: false,
                                roundBottomRight: false,
                              }
                            );

                      return (
                        <td
                          key={`${p.userId}-${displayIndex}`}
                          className={`px-2 py-1 text-center ${highlightClass} ${borderClasses} ${!hasTeamGrouping && idx === 0 && allDisplayPlayers.length === 2 ? "border-r-2 border-blue-500 dark:border-blue-400" : ""}`}
                        >
                          {displayScore ?? "-"}
                        </td>
                      );
                    })}
                    <td
                      className={`px-2 py-1 text-center ${buildColumnBorderClasses(
                        "border-blue-500 dark:border-blue-400 border-solid",
                        0,
                        1,
                        {
                          top: displayIndex === 0,
                          bottom: displayIndex === holeCount - 1,
                          roundBottomRight: true,
                        }
                      )}`}
                    >
                      {(() => {
                        const matchData = getMatchStatus(displayIndex);
                        const baseClass =
                          matchData.variant === "leader"
                            ? "px-2 py-1 rounded-lg text-sm font-semibold bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200"
                            : matchData.variant === "even"
                            ? "px-2 py-1 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
                            : "px-2 py-1 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400";
                        return <span className={baseClass}>{matchData.label}</span>;
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50 dark:bg-blue-900/10 border-t-2 border-blue-500 dark:border-blue-400">
                <th
                  className={`px-2 py-2 text-left font-semibold text-gray-900 dark:text-white ${buildColumnBorderClasses(
                    "border-blue-500 dark:border-blue-400 border-solid",
                    0,
                    1,
                    { top: true, bottom: true, roundBottomLeft: true }
                  )}`}
                >
                  Total
                </th>
                {allDisplayPlayers.map((player, idx) => {
                  const total = playerTotals[idx];
                  const inLeftGroup = hasTeamGrouping ? idx < leftGroup.length : false;
                  const groupIndex = inLeftGroup ? idx : idx - leftGroup.length;
                  const groupLength = inLeftGroup ? leftGroup.length : rightGroup.length;
                  const borderClasses = hasTeamGrouping
                    ? buildColumnBorderClasses(
                        inLeftGroup ? TEAM_BORDER_COLOR : OPPONENT_BORDER_COLOR,
                        groupIndex,
                        groupLength,
                        {
                          top: true,
                          bottom: true,
                          roundBottomLeft: inLeftGroup && groupIndex === 0,
                          roundBottomRight:
                            !inLeftGroup && groupIndex === groupLength - 1,
                        }
                      )
                    : buildColumnBorderClasses(
                        "border-blue-500 dark:border-blue-400 border-solid",
                        idx,
                        allDisplayPlayers.length,
                        {
                          top: true,
                          bottom: true,
                          roundBottomLeft: idx === 0,
                          roundBottomRight: idx === allDisplayPlayers.length - 1,
                        }
                      );

                  return (
                    <td
                      key={`total-${player?.userId ?? idx}`}
                      className={`px-2 py-2 text-center font-semibold text-blue-800 dark:text-blue-200 ${borderClasses}`}
                    >
                      {typeof total === "number" ? total : "—"}
                    </td>
                  );
                })}
                <td
                  className={`px-2 py-2 text-center font-semibold text-blue-800 dark:text-blue-200 ${buildColumnBorderClasses(
                    "border-blue-500 dark:border-blue-400 border-solid",
                    0,
                    1,
                    { top: true, bottom: true, roundBottomRight: true }
                  )}`}
                >
                  {finalMatchStatus?.label || "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-3 text-sm text-blue-800 dark:text-blue-200 space-y-1">
          {totalSummary.map((entry, idx) => (
            <div key={`summary-${idx}`}>
              {entry.label}: {entry.value}
            </div>
          ))}
          {finalMatchStatus?.label && (
            <div>Final Result: {finalMatchStatus.label}</div>
          )}
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

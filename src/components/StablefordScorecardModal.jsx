import React, { useMemo, useState, useRef } from "react";
import { courses } from "../data/courses";
import {
  TEAM_BORDER_COLOR,
  buildColumnBorderClasses,
  formatGrossWithNet,
} from "../utils/scorecardUtils";
import { shareScorecardAsImage } from "../utils/shareScorecard";

const getStablefordPoints = (score) => {
  if (typeof score?.net === "number") return score.net;
  if (typeof score?.points === "number") return score.points;
  return null;
};

const getGrossScore = (score) => {
  if (typeof score?.gross === "number") return score.gross;
  return null;
};

export default function StablefordScorecardModal({ game, selectedTeam, onClose }) {
  const [isSharing, setIsSharing] = useState(false);
  const scorecardRef = useRef(null);
  if (!game || !selectedTeam) return null;

  const courseData = game.course || courses.find((c) => c.id === game.courseId);
  const players = game.players || [];
  const playerMap = new Map(players.map((p) => [p.userId, p]));

  const formatDisplayPlayer = (player, fallbackName) => {
    if (!player) return null;
    return {
      ...player,
      displayLabel: fallbackName || player.name || "Unknown Golfer",
    };
  };

  const selectedTeamRoster = Array.isArray(selectedTeam.players)
    ? selectedTeam.players
    : [];
  const selectedTeamPlayerIds = selectedTeamRoster
    .map((p) => p?.id || p?.uid)
    .filter(Boolean);

  const teamPlayers = selectedTeamPlayerIds
    .map((id) => {
      const gamePlayer = playerMap.get(id);
      if (!gamePlayer) return null;
      const rosterEntry = selectedTeamRoster.find(
        (p) => (p?.id || p?.uid) === id
      );
      return formatDisplayPlayer(
        gamePlayer,
        rosterEntry?.displayName || rosterEntry?.name
      );
    })
    .filter(Boolean);

  const displayPlayers = teamPlayers.length > 0 ? teamPlayers : [];

  if (!players || players.length === 0 || displayPlayers.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto -webkit-overflow-scrolling-touch">
        <div className="card card-elevated max-w-md w-full p-6 overflow-y-auto max-h-[90vh]">
          <h2 className="text-xl font-bold text-[var(--text-strong)] mb-4 text-center">
            {game.name}
          </h2>
          <p className="text-center text-[var(--text-muted)] mb-4">
            No players found for this game.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={onClose}
              className="btn btn-secondary btn-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const teamDisplayName =
    selectedTeam.name ||
    selectedTeam.displayName ||
    (displayPlayers.length > 1
      ? "Team"
      : displayPlayers[0]?.displayLabel || "Player");

  const holeCount = game.holeCount || 18;
  const nineType = game.nineType || "front";
  const startIndex = nineType === "back" ? 9 : 0;

  const hasTeamGrouping = displayPlayers.length > 1;

  const { runningTotals, bestPlayerIdsByHole } = useMemo(() => {
    const totals = [];
    const bestPlayerMap = new Map();
    let runningTotal = 0;

    for (let displayIndex = 0; displayIndex < holeCount; displayIndex++) {
      const actualHoleIndex = startIndex + displayIndex;
      
      let bestPoints = null;
      const bestPlayerIds = new Set();
      
      for (const player of displayPlayers) {
        const score = player?.scores?.[actualHoleIndex];
        const points = getStablefordPoints(score);
        if (typeof points === "number") {
          if (bestPoints === null || points > bestPoints) {
            bestPoints = points;
            bestPlayerIds.clear();
            bestPlayerIds.add(player.userId);
          } else if (points === bestPoints) {
            bestPlayerIds.add(player.userId);
          }
        }
      }

      if (typeof bestPoints === "number") {
        runningTotal += bestPoints;
      }
      totals.push(runningTotal);
      bestPlayerMap.set(displayIndex, bestPlayerIds);
    }

    return { runningTotals: totals, bestPlayerIdsByHole: bestPlayerMap };
  }, [holeCount, startIndex, displayPlayers]);

  const playerTotals = useMemo(() => {
    return displayPlayers.map((player) => {
      let points = 0;
      let gross = 0;
      let netScoreTotal = 0;
      for (let i = 0; i < holeCount; i++) {
        const actualIndex = startIndex + i;
        const score = player?.scores?.[actualIndex];
        const holePoints = getStablefordPoints(score);
        const holeGross = getGrossScore(score);
        const holeNetScore = typeof score?.netScore === "number" ? score.netScore : null;
        if (typeof holePoints === "number") points += holePoints;
        if (typeof holeGross === "number") gross += holeGross;
        if (typeof holeNetScore === "number") netScoreTotal += holeNetScore;
      }
      return { points, gross, netScore: netScoreTotal };
    });
  }, [displayPlayers, holeCount, startIndex]);

  const teamTotalPoints = useMemo(() => {
    if (displayPlayers.length === 1) {
      return playerTotals[0]?.points ?? 0;
    }
    return runningTotals[runningTotals.length - 1] ?? 0;
  }, [displayPlayers.length, playerTotals, runningTotals]);

  const handleShare = async () => {
    if (!game || displayPlayers.length === 0 || !scorecardRef.current) return;
    setIsSharing(true);
    try {
      const filename = `${game.name} - ${teamDisplayName} - Stableford`;
      await shareScorecardAsImage(scorecardRef.current, filename);
    } catch (error) {
      console.error("Error sharing scorecard:", error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto -webkit-overflow-scrolling-touch">
      <div className="card card-elevated max-w-4xl w-full p-3 sm:p-6 overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold text-[var(--text-strong)] pr-3">
            {game.name} - {teamDisplayName}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="btn btn-primary btn-sm"
              title="Share scorecard"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {isSharing ? "Sharing..." : "Share"}
            </button>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-strong)] text-2xl sm:text-3xl leading-none flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto -mx-3 sm:mx-0" ref={scorecardRef}>
          <table className="w-full border-collapse text-xs sm:text-sm min-w-[500px] bg-gray-900 text-white tabular-nums">
            <thead>
              <tr>
                <th
                  className="px-2 py-1 text-left align-bottom border-2 border-solid border-gray-700 rounded-tl-lg bg-gray-800 text-gray-300"
                  rowSpan={hasTeamGrouping ? 2 : 1}
                >
                  Hole
                </th>
                {hasTeamGrouping ? (
                  <>
                    <th
                      colSpan={displayPlayers.length}
                      className={`px-2 py-1 text-center font-semibold text-gray-100 bg-gray-800 rounded-tl-lg border-2 border-b-0 ${TEAM_BORDER_COLOR}`}
                    >
                      {teamDisplayName}
                    </th>
                    <th
                      className="px-2 py-1 text-center font-semibold text-gray-100 bg-gray-800 align-bottom border-2 border-solid border-gray-700 rounded-tr-lg"
                      rowSpan={2}
                    >
                      Running Total
                    </th>
                  </>
                ) : (
                  <>
                    <th className="px-2 py-1 text-center font-semibold text-gray-100 bg-gray-800 border-2 border-solid border-gray-700">
                      {displayPlayers[0]?.displayLabel || displayPlayers[0]?.name}
                    </th>
                    <th className="px-2 py-1 text-center font-semibold text-gray-100 bg-gray-800 border-2 border-solid border-gray-700 rounded-tr-lg">
                      Running Total
                    </th>
                  </>
                )}
              </tr>
              {hasTeamGrouping && (
                <tr>
                  {displayPlayers.map((p, idx) => (
                    <th
                      key={`team-${p.userId}`}
                      className={`px-2 py-1 text-center font-semibold text-gray-100 bg-gray-800 ${buildColumnBorderClasses(
                        TEAM_BORDER_COLOR,
                        idx,
                        displayPlayers.length,
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
                const holeIndex = startIndex + displayIndex;
                const hole = courseData?.holes?.[holeIndex];
                const par = hole?.par || "?";
                const runningTotal = runningTotals[displayIndex] ?? 0;

                return (
                  <tr
                    key={displayIndex}
                    className="border-t border-gray-700"
                  >
                    <td
                      className={`px-2 py-1 font-medium text-gray-100 ${buildColumnBorderClasses(
                        "border-gray-700 border-solid",
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
                        <span className="text-xs text-gray-400 ml-1">
                          Par {par}
                          {hole?.strokeIndex && (
                            <span className="ml-1">SI {hole.strokeIndex}</span>
                          )}
                        </span>
                      </div>
                    </td>
                    {displayPlayers.map((p, idx) => {
                      const score = p.scores?.[holeIndex];
                      const points = getStablefordPoints(score);
                      const gross = getGrossScore(score);
                      const netScore =
                        typeof score?.netScore === "number" ? score.netScore : null;
                      const grossWithNet =
                        typeof gross === "number"
                          ? formatGrossWithNet(gross, netScore) ?? `${gross}`
                          : null;

                      const isBestBall = hasTeamGrouping && bestPlayerIdsByHole.get(displayIndex)?.has(p.userId);
                      const isTie = isBestBall && (bestPlayerIdsByHole.get(displayIndex)?.size ?? 0) > 1;

                      const highlightClass = isBestBall
                        ? isTie
                          ? "bg-gray-700 text-gray-200 font-bold rounded-lg"
                          : "bg-emerald-500/20 text-emerald-400 font-bold rounded-lg"
                        : "text-gray-100";

                      const borderClasses =
                        hasTeamGrouping
                          ? buildColumnBorderClasses(
                              TEAM_BORDER_COLOR,
                              idx,
                              displayPlayers.length,
                              {
                                top: displayIndex === 0,
                                bottom: displayIndex === holeCount - 1,
                                roundBottomLeft:
                                  displayIndex === holeCount - 1 && idx === 0,
                                roundBottomRight:
                                  displayIndex === holeCount - 1 &&
                                  idx === displayPlayers.length - 1,
                              }
                            )
                          : "border-2 border-gray-700 border-solid";

                      const hasDisplay =
                        typeof points === "number" || typeof grossWithNet === "string";

                      return (
                        <td
                          key={`${p.userId}-${displayIndex}`}
                          className={`px-2 py-1 text-center ${highlightClass} ${borderClasses}`}
                        >
                          {hasDisplay ? (
                            <div className="space-y-0.5">
                              {grossWithNet && (
                                <div className="text-sm font-semibold">
                                  {grossWithNet}
                                </div>
                              )}
                              {typeof points === "number" && (
                                <div className="text-[10px] opacity-90">
                                  {points} pts
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td
                      className={`px-2 py-1 text-center font-semibold text-emerald-400 bg-gray-800 ${buildColumnBorderClasses(
                        "border-gray-700 border-solid",
                        0,
                        1,
                        {
                          top: displayIndex === 0,
                          bottom: displayIndex === holeCount - 1,
                          roundBottomRight: true,
                        }
                      )}`}
                    >
                      {runningTotal} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th
                  className="px-2 py-2 text-left font-semibold text-gray-100 bg-gray-800 border-2 border-gray-700 border-solid rounded-bl-lg"
                >
                  Total
                </th>
                {displayPlayers.map((player, idx) => {
                  const totals = playerTotals[idx];
                  const borderClasses =
                    hasTeamGrouping
                      ? buildColumnBorderClasses(
                          TEAM_BORDER_COLOR,
                          idx,
                          displayPlayers.length,
                          {
                            top: true,
                            bottom: true,
                            roundBottomLeft: idx === 0,
                            roundBottomRight: idx === displayPlayers.length - 1,
                          }
                        )
                      : "border-2 border-gray-700 border-solid";

                  const grossWithNet =
                    typeof totals.gross === "number"
                      ? formatGrossWithNet(totals.gross, totals.netScore) ??
                        `${totals.gross}`
                      : null;

                  return (
                    <td
                      key={`total-${player?.userId ?? idx}`}
                      className={`px-2 py-2 text-center font-semibold text-emerald-400 bg-gray-800 ${borderClasses}`}
                    >
                      <div className="space-y-0.5">
                        <div>{totals.points} pts</div>
                        {grossWithNet && (
                          <div className="text-[10px] text-emerald-300">
                            {grossWithNet}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center font-semibold text-emerald-400 bg-gray-800 border-2 border-gray-700 border-solid rounded-br-lg">
                  {teamTotalPoints} pts
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 sm:mt-6 flex justify-center px-3 sm:px-0">
          <button
            onClick={onClose}
            className="btn btn-secondary w-full sm:w-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

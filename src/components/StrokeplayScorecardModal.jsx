import React, { useRef, useState } from "react";
import { shareScorecardAsImage } from "../utils/shareScorecard";

const TEAM_BORDER_COLOR = "border-gray-700 border-solid";
const OPPONENT_BORDER_COLOR = "border-gray-700 border-solid";

function buildColumnBorderClasses(
  colorClass,
  index,
  groupLength,
  {
    top = false,
    bottom = false,
    roundBottomLeft = false,
    roundBottomRight = false,
  } = {}
) {
  if (groupLength === 0) return "";
  const classes = [
    colorClass,
    index === 0 ? "border-l-2" : "border-l-0",
    index === groupLength - 1 ? "border-r-2" : "border-r-0",
    top ? "border-t-2" : "border-t-0",
    bottom ? "border-b-2" : "border-b-0",
    "border-solid",
  ];
  if (bottom && roundBottomLeft && index === 0) {
    classes.push("rounded-bl-lg");
  }
  if (bottom && roundBottomRight && index === groupLength - 1) {
    classes.push("rounded-br-lg");
  }
  return classes.join(" ");
}

export default function StrokeplayScorecardModal({ game, selectedTeam, onClose }) {
  if (!game || !selectedTeam) return null;

  const [isSharing, setIsSharing] = useState(false);
  const scorecardRef = useRef(null);
  const handleShare = async () => {
    if (!scorecardRef.current) return;
    setIsSharing(true);
    try {
      const filename = `${game.name} - Stroke Play Scorecard`;
      await shareScorecardAsImage(scorecardRef.current, filename);
    } catch (error) {
      console.error("Error sharing scorecard:", error);
    } finally {
      setIsSharing(false);
    }
  };

  // Get ALL players in the game with their scores (for strokeplay, show both players)
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

  const opponentRoster = Array.isArray(selectedTeam.opponentPlayers)
    ? selectedTeam.opponentPlayers
    : [];

  const opponentPlayersFromRoster = opponentRoster
    .map((opponent) => {
      const opponentId = opponent?.id || opponent?.uid;
      if (!opponentId) return null;
      const gamePlayer = playerMap.get(opponentId);
      if (!gamePlayer) return null;
      return formatDisplayPlayer(
        gamePlayer,
        opponent.displayName || opponent.name
      );
    })
    .filter(Boolean);

  const fallbackOpponents = players
    .filter((p) => !selectedTeamPlayerIds.includes(p.userId))
    .map((p) => formatDisplayPlayer(p));

  const opponentPlayers =
    opponentPlayersFromRoster.length > 0
      ? opponentPlayersFromRoster
      : fallbackOpponents;

  const hasTeamGrouping =
    !selectedTeam.isSolo &&
    teamPlayers.length > 0 &&
    opponentPlayers.length > 0;

  const enrichedPlayers = players.map((p) => formatDisplayPlayer(p));

  const leftGroup =
    teamPlayers.length > 0
      ? teamPlayers
      : enrichedPlayers.slice(0, 1).filter(Boolean);

  const leftIdSet = new Set(leftGroup.map((p) => p.userId));

  const rightGroup =
    opponentPlayers.length > 0
      ? opponentPlayers
      : enrichedPlayers.filter((p) => !leftIdSet.has(p.userId));

  const combinedDisplay = [
    ...leftGroup,
    ...rightGroup.filter((p) => !leftIdSet.has(p.userId)),
  ];

  const allDisplayPlayers =
    combinedDisplay.length > 0 ? combinedDisplay : enrichedPlayers;

  const teamDisplayName =
    selectedTeam.name ||
    selectedTeam.displayName ||
    (teamPlayers.length > 1
      ? "Selected Team"
      : teamPlayers[0]?.displayLabel || "Player");
  const opponentDisplayName =
    selectedTeam.opponentDisplayName ||
    (opponentPlayers.length > 1
      ? "Opponents"
      : opponentPlayers[0]?.displayLabel || "Opponent");

  const leftName =
    teamPlayers.length > 1
      ? teamDisplayName
      : leftGroup[0]?.displayLabel || leftGroup[0]?.name || "Player 1";
  const rightName =
    opponentPlayers.length > 1
      ? opponentDisplayName
      : rightGroup[0]?.displayLabel || rightGroup[0]?.name || "Player 2";

  const bestGrossForGroup = (group, holeIndex) => {
    const values = group
      .map((player) => player?.scores?.[holeIndex]?.gross)
      .filter((val) => typeof val === "number");
    if (values.length === 0) return null;
    return Math.min(...values);
  };

  const buildGroupHighlightInfo = (group, holeIndex) => {
    const best = bestGrossForGroup(group, holeIndex);
    if (best == null) {
      return { best: null, tiedIds: new Set(), isTie: false };
    }
    const tiedIds = new Set(
      group
        .filter(
          (player) =>
            typeof player?.scores?.[holeIndex]?.gross === "number" &&
            player.scores[holeIndex].gross === best
        )
        .map((player) => player.userId)
    );
    return { best, tiedIds, isTie: tiedIds.size > 1 };
  };
  
  if (!players || players.length === 0) {
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

  // Determine which holes to display
  const holeCount = game.holeCount || 18;
  const nineType = game.nineType || "front";
  const startIndex = nineType === "back" ? 9 : 0;

  const playerTotals = allDisplayPlayers.map((player) => {
    const scores = player?.scores ?? [];
    let total = 0;
    for (let i = startIndex; i < startIndex + holeCount; i++) {
      const gross = scores[i]?.gross;
      if (typeof gross === "number") {
        total += gross;
      }
    }
    return total;
  });

  // Calculate match status after each hole with +/- formatting
  const calculateMatchStatus = (displayIndex) => {
    if (leftGroup.length === 0 || rightGroup.length === 0) {
      return { label: "—", variant: "waiting", diff: 0 };
    }

    let diff = 0;
    let holesPlayed = 0;

    for (let i = 0; i <= displayIndex; i++) {
      const actualHoleIndex = startIndex + i;
      const leftGross = bestGrossForGroup(leftGroup, actualHoleIndex);
      const rightGross = bestGrossForGroup(rightGroup, actualHoleIndex);
      if (leftGross == null || rightGross == null) continue;

      holesPlayed++;
      diff += rightGross - leftGross;
    }

    if (holesPlayed === 0) return { label: "—", variant: "waiting", diff: 0 };
    if (diff === 0) return { label: "Even", variant: "even", diff: 0 };

    if (diff > 0) {
      return {
        label: `${leftName} +${diff}`,
        variant: "leader",
        diff,
      };
    }

    return {
      label: `${rightName} +${Math.abs(diff)}`,
      variant: "leader",
      diff,
    };
  };

  const finalMatchStatus =
    holeCount > 0 ? calculateMatchStatus(holeCount - 1) : { label: "" };

  const totalSummary = hasTeamGrouping
    ? [
        {
          label: teamDisplayName,
          value: playerTotals
            .slice(0, leftGroup.length)
            .reduce((sum, val) => sum + val, 0),
        },
        {
          label: opponentDisplayName,
          value: playerTotals
            .slice(leftGroup.length)
            .reduce((sum, val) => sum + val, 0),
        },
      ]
    : allDisplayPlayers.map((player, idx) => ({
        label: player?.displayLabel || player?.name || "Player",
        value: playerTotals[idx] ?? 0,
      }));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto -webkit-overflow-scrolling-touch">
      <div className="card card-elevated max-w-4xl w-full p-3 sm:p-6 overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-base sm:text-xl font-bold text-[var(--text-strong)] pr-3">
            {game.name}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="btn btn-primary btn-sm"
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
                      colSpan={teamPlayers.length}
                      className={`px-2 py-1 text-center font-semibold text-gray-100 bg-gray-800 rounded-tl-lg border-2 border-b-0 ${TEAM_BORDER_COLOR}`}
                    >
                      {teamDisplayName}
                    </th>
                    <th
                      colSpan={opponentPlayers.length}
                      className={`px-2 py-1 text-center font-semibold text-gray-100 bg-gray-800 rounded-tr-lg border-2 border-b-0 ${OPPONENT_BORDER_COLOR}`}
                    >
                      {opponentDisplayName}
                    </th>
                    <th
                      className="px-2 py-1 text-center font-semibold text-gray-100 bg-gray-800 align-bottom border-2 border-solid border-gray-700 rounded-tr-lg"
                      rowSpan={2}
                    >
                      Match Status
                    </th>
                  </>
                ) : (
                  <>
                    {allDisplayPlayers.map((p) => (
                      <th
                        key={p.userId}
                        className="px-2 py-1 text-center font-semibold text-gray-100 bg-gray-800"
                      >
                        {p.displayLabel || p.name}
                      </th>
                    ))}
                    <th className="px-2 py-1 text-center font-semibold text-gray-100 bg-gray-800 border-2 border-solid border-gray-700">
                      Match Status
                    </th>
                  </>
                )}
              </tr>
              {hasTeamGrouping && (
                <tr>
                  {teamPlayers.map((p, idx) => (
                    <th
                      key={`team-${p.userId}`}
                      className={`px-2 py-1 text-center font-semibold text-gray-100 bg-gray-800 ${buildColumnBorderClasses(
                        TEAM_BORDER_COLOR,
                        idx,
                        teamPlayers.length,
                        { top: false, bottom: false }
                      )}`}
                    >
                      {p.displayLabel || p.name}
                    </th>
                  ))}
                  {opponentPlayers.map((p, idx) => (
                    <th
                      key={`opponent-${p.userId}`}
                      className={`px-2 py-1 text-center font-semibold text-gray-100 bg-gray-800 ${buildColumnBorderClasses(
                        OPPONENT_BORDER_COLOR,
                        idx,
                        opponentPlayers.length,
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
                const matchData = calculateMatchStatus(displayIndex);
                const hole = game.course?.holes?.[holeIndex];
                const par = hole?.par || "?";
                
                const leftHighlight = buildGroupHighlightInfo(
                  leftGroup,
                  holeIndex
                );
                const rightHighlight = buildGroupHighlightInfo(
                  rightGroup,
                  holeIndex
                );
                 
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
                        </span>
                      </div>
                    </td>
                    {allDisplayPlayers.map((p, idx) => {
                      const rawGross = p.scores?.[holeIndex]?.gross;
                      const grossScore =
                        typeof rawGross === "number" ? rawGross : "-";
                      const highlightState = (() => {
                        if (leftHighlight.tiedIds.has(p.userId)) {
                          return leftHighlight.isTie ? "tie" : "best";
                        }
                        if (rightHighlight.tiedIds.has(p.userId)) {
                          return rightHighlight.isTie ? "tie" : "best";
                        }
                        return null;
                      })();

                      const cellClass =
                        highlightState === "best"
                          ? "bg-emerald-500/20 text-emerald-400 font-bold rounded-lg"
                          : highlightState === "tie"
                          ? "bg-gray-700 text-gray-200 font-bold rounded-lg"
                          : "text-gray-100";

                      const isLeftGroup = idx < leftGroup.length;
                      const groupIndex = isLeftGroup
                        ? idx
                        : idx - leftGroup.length;
                      const groupLength = isLeftGroup
                        ? leftGroup.length
                        : rightGroup.length;

                      const borderClasses =
                        hasTeamGrouping && groupLength > 0
                          ? buildColumnBorderClasses(
                              TEAM_BORDER_COLOR,
                              groupIndex,
                              groupLength,
                              {
                                top: displayIndex === 0,
                                bottom: displayIndex === holeCount - 1,
                              }
                            )
                          : "";

                      return (
                        <td
                          key={p.userId + displayIndex}
                          className={`px-2 py-1 text-center ${cellClass} ${borderClasses}`}
                        >
                          {grossScore}
                        </td>
                      );
                    })}
                    <td
                      className={`px-2 py-1 text-center ${buildColumnBorderClasses(
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
                      {(() => {
                        const baseClass =
                          matchData.variant === "leader"
                            ? "px-2 py-1 rounded-lg text-sm font-semibold bg-emerald-500/20 text-emerald-400"
                            : matchData.variant === "even"
                            ? "px-2 py-1 rounded-lg text-sm font-medium bg-gray-700 text-gray-200"
                            : "px-2 py-1 rounded-lg text-sm font-medium bg-gray-800 text-gray-400";
                        return (
                          <span className={baseClass}>{matchData.label}</span>
                        );
                      })()}
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
              {allDisplayPlayers.map((player, idx) => {
                const total = playerTotals[idx] ?? 0;
                const isLeftGroup = idx < leftGroup.length;
                const groupIndex = isLeftGroup ? idx : idx - leftGroup.length;
                const groupLength = isLeftGroup
                  ? leftGroup.length
                  : rightGroup.length;
                const borderClasses =
                  hasTeamGrouping && groupLength > 0
                    ? buildColumnBorderClasses(
                        isLeftGroup
                          ? TEAM_BORDER_COLOR
                          : OPPONENT_BORDER_COLOR,
                        groupIndex,
                        groupLength,
                        {
                          top: true,
                          bottom: true,
                          roundBottomLeft: isLeftGroup && groupIndex === 0,
                          roundBottomRight:
                            !isLeftGroup && groupIndex === groupLength - 1,
                        }
                      )
                    : "border-2 border-gray-700 border-solid";

                return (
                  <td
                    key={`total-${player?.userId ?? idx}`}
                    className={`px-2 py-2 text-center font-semibold text-emerald-400 bg-gray-800 ${borderClasses}`}
                  >
                    {total}
                  </td>
                );
              })}
              <td className="px-2 py-2 text-center bg-gray-800 border-2 border-gray-700 border-solid rounded-br-lg" />
            </tr>
          </tfoot>
          </table>
        </div>

        <div className="mt-3 text-sm text-[var(--text-muted)] space-y-1">
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
            className="btn btn-secondary w-full sm:w-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
